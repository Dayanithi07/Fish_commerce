// Supabase Auth context with Google OAuth, Multi-Admin Management, and Role-Based Access Control
import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase.js'
import { DEMO_ADMIN, SUPER_ADMIN } from '../config.js'
import { readJSON, writeJSON, removeKey } from '../utils/storage.js'
import { validateLogin, validateSignup } from '../utils/validators.js'

const AuthContext = createContext(null)

export const ADMIN_EMAILS = [
  SUPER_ADMIN.email.toLowerCase(),
  DEMO_ADMIN.email.toLowerCase(),
]

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => readJSON('session', null))
  const [loading, setLoading] = useState(true)

  // Secondary custom admins created via admin portal (excluding root SUPER_ADMIN / DEMO_ADMIN)
  const [registeredAdmins, setRegisteredAdmins] = useState(() => {
    return readJSON('custom_admins', []).filter(
      (a) => a?.email && !ADMIN_EMAILS.includes(a.email.toLowerCase())
    )
  })

  // Purge any accidental super-admin records from custom_admins on mount
  useEffect(() => {
    const rawCustom = readJSON('custom_admins', [])
    const cleaned = rawCustom.filter(
      (a) => a?.email && !ADMIN_EMAILS.includes(a.email.toLowerCase())
    )
    if (cleaned.length !== rawCustom.length) {
      writeJSON('custom_admins', cleaned)
      setRegisteredAdmins(cleaned)
    }
  }, [])

  // Sync profile details from Supabase public.profiles or session
  const syncProfile = useCallback(async (sessionUser) => {
    if (!sessionUser) {
      setUser(null)
      removeKey('session')
      return null
    }

    const email = sessionUser.email?.toLowerCase() || ''
    const customAdminList = readJSON('custom_admins', [])
    const isCustomAdmin = customAdminList.some((a) => a.email.toLowerCase() === email)
    const isMetadataAdmin = sessionUser.user_metadata?.role === 'admin'
    const isSpecialAdmin = ADMIN_EMAILS.includes(email) || isCustomAdmin || isMetadataAdmin

    let role = isSpecialAdmin ? 'admin' : 'customer'
    let name =
      sessionUser.user_metadata?.full_name ||
      sessionUser.user_metadata?.name ||
      email.split('@')[0] ||
      'Aquarist'

    // Try reading profile row if Supabase is active
    if (isSupabaseConfigured) {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('name, role')
          .eq('id', sessionUser.id)
          .maybeSingle()

        if (profile) {
          if (profile.name) name = profile.name
          if (profile.role) role = profile.role
        } else if (isSpecialAdmin) {
          // Ensure admin role recorded
          await supabase.from('profiles').upsert({
            id: sessionUser.id,
            name,
            email,
            role: 'admin',
          })
        }
      } catch (err) {
        console.warn('[AuthContext] Profile fetch warning:', err)
      }
    }

    // If verified as custom admin, cache in local custom_admins (strictly excluding SUPER_ADMIN / DEMO_ADMIN)
    if (role === 'admin' && !isCustomAdmin && !ADMIN_EMAILS.includes(email)) {
      const currentAdmins = readJSON('custom_admins', [])
      if (!currentAdmins.some((a) => a.email && a.email.toLowerCase() === email)) {
        writeJSON('custom_admins', [
          ...currentAdmins,
          { id: sessionUser.id, name, email, role: 'admin', status: 'active' },
        ])
      }
    }

    const userData = {
      id: sessionUser.id,
      name,
      email,
      role,
      avatarUrl: sessionUser.user_metadata?.avatar_url || null,
    }

    setUser(userData)
    writeJSON('session', userData)
    return userData
  }, [])

  // Initialize Supabase auth listener
  useEffect(() => {
    let mounted = true

    if (isSupabaseConfigured) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (mounted) {
          if (session?.user) {
            syncProfile(session.user)
          }
          setLoading(false)
        }
      })

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (_event, session) => {
        if (mounted) {
          if (session?.user) {
            await syncProfile(session.user)
          } else {
            setUser(null)
            removeKey('session')
          }
          setLoading(false)
        }
      })

      return () => {
        mounted = false
        subscription.unsubscribe()
      }
    } else {
      setLoading(false)
    }
  }, [syncProfile])

  const isAuthenticated = !!user
  const isAdmin = user?.role === 'admin'

  /**
   * Log in with Email & Password
   */
  const login = useCallback(
    async (email, password) => {
      const trimmedEmail = (email || '').trim().toLowerCase()

      const validation = validateLogin({ email: trimmedEmail, password })
      if (!validation.valid) {
        return {
          ok: false,
          error: { code: 'VALIDATION', message: 'Invalid credentials format', details: validation.errors },
        }
      }

      // 1. Check Super Admin credentials
      if (
        trimmedEmail === SUPER_ADMIN.email.toLowerCase() &&
        password === SUPER_ADMIN.password
      ) {
        const superAdminUser = {
          id: 'super_admin_dayanithi',
          name: SUPER_ADMIN.name,
          email: SUPER_ADMIN.email,
          role: 'admin',
          isSuperAdmin: true,
        }
        setUser(superAdminUser)
        writeJSON('session', superAdminUser)
        return { ok: true, user: superAdminUser }
      }

      // 2. Check Demo Admin credentials
      if (
        trimmedEmail === DEMO_ADMIN.email.toLowerCase() &&
        password === DEMO_ADMIN.password
      ) {
        const demoAdminUser = {
          id: 'demo_admin_staff',
          name: DEMO_ADMIN.name,
          email: DEMO_ADMIN.email,
          role: 'admin',
        }
        setUser(demoAdminUser)
        writeJSON('session', demoAdminUser)
        return { ok: true, user: demoAdminUser }
      }

      // 3. Check Custom Created Admins
      const customAdmins = readJSON('custom_admins', registeredAdmins)
      const foundCustomAdmin = customAdmins.find(
        (a) => a.email.toLowerCase() === trimmedEmail && a.password === password
      )
      if (foundCustomAdmin) {
        const customAdminUser = {
          id: foundCustomAdmin.id,
          name: foundCustomAdmin.name,
          email: foundCustomAdmin.email,
          role: 'admin',
        }
        setUser(customAdminUser)
        writeJSON('session', customAdminUser)
        return { ok: true, user: customAdminUser }
      }

      // 4. If Supabase is active, try Supabase Auth
      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email: trimmedEmail,
            password,
          })

          if (!error && data?.user) {
            const profile = await syncProfile(data.user)
            return { ok: true, user: profile }
          }

          // Surface specific Supabase auth errors (wrong password, email not confirmed, etc.)
          if (error) {
            const msg = error.message || ''
            if (
              msg.includes('Invalid login credentials') ||
              msg.includes('Email not confirmed')
            ) {
              return {
                ok: false,
                error: {
                  code: 'SUPABASE_AUTH',
                  message: msg.includes('Email not confirmed')
                    ? 'Please check your email inbox and confirm your account before signing in.'
                    : 'Incorrect email or password.',
                },
              }
            }
          }
        } catch (fetchErr) {
          // ERR_NAME_NOT_RESOLVED / network offline — fall through to local check
          console.warn('[login] Supabase unreachable, trying local fallback:', fetchErr.message)
        }
      }

      // 5. Fallback: Check local registered customer accounts
      const users = readJSON('users', [])
      const found = users.find((u) => u.email.toLowerCase() === trimmedEmail)
      if (!found || found.password !== password) {
        return {
          ok: false,
          error: { code: 'INVALID_CREDENTIALS', message: 'Incorrect email or password.' },
        }
      }

      const authUser = {
        id: found.id,
        name: found.name,
        email: found.email,
        role: found.role || 'customer',
      }
      setUser(authUser)
      writeJSON('session', authUser)
      return { ok: true, user: authUser }
    },
    [syncProfile, registeredAdmins]
  )

  /**
   * Sign up with Email & Password
   */
  const signup = useCallback(
    async (name, email, password) => {
      const trimmedEmail = (email || '').trim().toLowerCase()
      const trimmedName = (name || '').trim()

      const validation = validateSignup({ name: trimmedName, email: trimmedEmail, password })
      if (!validation.valid) {
        return {
          ok: false,
          error: { code: 'VALIDATION', message: 'Form validation failed', details: validation.errors },
        }
      }

      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabase.auth.signUp({
            email: trimmedEmail,
            password,
            options: {
              data: {
                full_name: trimmedName,
              },
            },
          })

          if (error) {
            // 429 Too Many Requests — rate limit
            if (error.status === 429 || error.message?.toLowerCase().includes('rate limit')) {
              return {
                ok: false,
                error: {
                  code: 'RATE_LIMITED',
                  message: 'Too many sign-up attempts. Please wait a few minutes and try again.',
                },
              }
            }
            return {
              ok: false,
              error: { code: 'AUTH_ERROR', message: error.message },
            }
          }

          if (data?.session && data?.user) {
            const profile = await syncProfile(data.user)
            return { ok: true, user: profile }
          }

          return {
            ok: true,
            message: 'Registration successful! Please check your email inbox to confirm your account before logging in.',
          }
        } catch (fetchErr) {
          // Network offline — fall through to local account creation
          console.warn('[signup] Supabase unreachable, using local fallback:', fetchErr.message)
        }
      }

      // Local fallback
      const users = readJSON('users', [])
      if (users.some((u) => u.email.toLowerCase() === trimmedEmail)) {
        return {
          ok: false,
          error: { code: 'EMAIL_TAKEN', message: 'An account with this email already exists.' },
        }
      }

      const newUserRecord = {
        id: 'usr_' + Date.now(),
        name: trimmedName,
        email: trimmedEmail,
        password,
        role: 'customer',
        createdAt: new Date().toISOString(),
      }

      writeJSON('users', [...users, newUserRecord])
      setUser(newUserRecord)
      writeJSON('session', newUserRecord)
      return { ok: true, user: newUserRecord }
    },
    [syncProfile]
  )

  /**
   * Feature: Invite a new administrator by email with secure setup link
   */
  const inviteAdmin = useCallback(
    async ({ name, email }) => {
      const trimmedEmail = (email || '').trim().toLowerCase()
      const trimmedName = (name || '').trim()

      if (!trimmedName || !trimmedEmail) {
        return { ok: false, error: { message: 'Admin name and email address are required.' } }
      }

      // Check duplicate
      const current = readJSON('custom_admins', [])
      if (
        current.some((a) => a.email.toLowerCase() === trimmedEmail) ||
        ADMIN_EMAILS.includes(trimmedEmail)
      ) {
        return { ok: false, error: { message: 'An administrator with this email already exists.' } }
      }

      const origin = typeof window !== 'undefined' ? window.location.origin : 'https://fish-commerce-omega.vercel.app'
      const inviteLink = `${origin}/auth?setup=admin&email=${encodeURIComponent(trimmedEmail)}&name=${encodeURIComponent(trimmedName)}`

      const newAdminRecord = {
        id: 'admin_' + Date.now(),
        name: trimmedName,
        email: trimmedEmail,
        role: 'admin',
        status: 'invited',
        invitedAt: new Date().toISOString(),
      }

      const updated = [newAdminRecord, ...current.filter((a) => !ADMIN_EMAILS.includes(a.email.toLowerCase()))]
      writeJSON('custom_admins', updated)
      setRegisteredAdmins(updated)

      // Send invitation email via /api/send-email
      const inviteHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 580px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
          <div style="background: linear-gradient(135deg, #3C1E5E, #6f3ff5); padding: 22px; border-radius: 8px; text-align: center; color: #ffffff; margin-bottom: 24px;">
            <h1 style="margin: 0; font-size: 24px; font-weight: 800;">VP Aquarium</h1>
            <p style="margin: 6px 0 0 0; opacity: 0.9; font-size: 14px;">Store Management Team Invitation</p>
          </div>
          <p style="font-size: 16px; color: #1e293b;">Hello <strong>${trimmedName}</strong>,</p>
          <p style="font-size: 15px; color: #475569; line-height: 1.6;">
            You have been invited by the VP Aquarium Store Administrator to join the store management team. As an administrator, you will have access to manage species, food catalog, and process customer orders.
          </p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${inviteLink}" style="background: #10B981; color: #ffffff; padding: 14px 28px; font-size: 15px; font-weight: 700; text-decoration: none; border-radius: 8px; display: inline-block; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.35);">
              Set Up Password & Access Portal →
            </a>
          </div>
          <p style="font-size: 13px; color: #64748b; line-height: 1.5;">
            Or copy and paste this link into your browser:<br/>
            <a href="${inviteLink}" style="color: #6f3ff5; word-break: break-all;">${inviteLink}</a>
          </p>
          <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 24px 0;" />
          <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 0;">
            VP Aquarium • Premium Pet Fish & Aquatics
          </p>
        </div>
      `

      try {
        await fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: trimmedEmail,
            subject: 'Admin Invitation: Join VP Aquarium Management Team',
            html: inviteHtml,
          }),
        })
      } catch (err) {
        console.warn('[inviteAdmin] Resend email warning:', err)
      }

      return { ok: true, admin: newAdminRecord, inviteLink }
    },
    []
  )

  /**
   * Feature: Complete admin invitation and configure password
   */
  const completeAdminSetup = useCallback(
    async ({ name, email, password }) => {
      const trimmedEmail = (email || '').trim().toLowerCase()
      const trimmedName = (name || '').trim()

      if (!password || password.length < 6) {
        return { ok: false, error: { message: 'Password must be at least 6 characters long.' } }
      }

      // Update in custom_admins
      const current = readJSON('custom_admins', [])
      const existing = current.find((a) => a.email.toLowerCase() === trimmedEmail)
      const updatedAdminRecord = {
        ...(existing || {}),
        id: existing?.id || 'admin_' + Date.now(),
        name: trimmedName || existing?.name || trimmedEmail.split('@')[0],
        email: trimmedEmail,
        password,
        role: 'admin',
        status: 'active',
        activatedAt: new Date().toISOString(),
      }

      const updated = [
        updatedAdminRecord,
        ...current.filter(
          (a) => a.email.toLowerCase() !== trimmedEmail && !ADMIN_EMAILS.includes(a.email.toLowerCase())
        ),
      ]
      writeJSON('custom_admins', updated)
      setRegisteredAdmins(updated)

      // Try creating in Supabase too
      if (isSupabaseConfigured) {
        try {
          const { data: signUpData } = await supabase.auth.signUp({
            email: trimmedEmail,
            password,
            options: {
              data: {
                full_name: updatedAdminRecord.name,
                role: 'admin',
              },
            },
          })
          if (signUpData?.user) {
            await supabase.from('profiles').upsert({
              id: signUpData.user.id,
              name: updatedAdminRecord.name,
              email: trimmedEmail,
              role: 'admin',
            })
          }
        } catch (e) {
          console.warn('[completeAdminSetup] Supabase sync note:', e)
        }
      }

      // Automatically authenticate as admin
      const adminSession = {
        id: updatedAdminRecord.id,
        name: updatedAdminRecord.name,
        email: updatedAdminRecord.email,
        role: 'admin',
        isCustomAdmin: true,
      }
      setUser(adminSession)
      writeJSON('session', adminSession)

      return { ok: true, user: adminSession }
    },
    []
  )

  /**
   * Backwards compatible addAdmin alias
   */
  const addAdmin = useCallback(
    async ({ name, email, password }) => {
      if (!password) {
        return inviteAdmin({ name, email })
      }
      const inv = await inviteAdmin({ name, email })
      if (!inv.ok) return inv
      return completeAdminSetup({ name, email, password })
    },
    [inviteAdmin, completeAdminSetup]
  )

  /**
   * Remove a custom admin
   */
  const removeAdmin = useCallback((email) => {
    const trimmed = (email || '').toLowerCase().trim()
    if (ADMIN_EMAILS.includes(trimmed)) {
      return { ok: false, error: { message: 'Root system admins cannot be removed.' } }
    }
    const current = readJSON('custom_admins', [])
    const next = current.filter((a) => a.email.toLowerCase() !== trimmed)
    writeJSON('custom_admins', next)
    setRegisteredAdmins(next)
    return { ok: true }
  }, [])

  /**
   * Sign in with Google (OAuth)
   */
  const signInWithGoogle = useCallback(async () => {
    if (!isSupabaseConfigured) {
      return {
        ok: false,
        error: {
          code: 'NOT_CONFIGURED',
          message: 'Supabase is not configured yet. Please configure VITE_SUPABASE_URL.',
        },
      }
    }

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/products`,
        },
      })

      if (error) {
        return {
          ok: false,
          error: {
            code: error.code || 'OAUTH_ERROR',
            message: error.message.includes('not enabled')
              ? 'Google Sign-In is not enabled in your Supabase Dashboard yet. Please enable the Google provider in Supabase Authentication -> Providers.'
              : error.message,
          },
        }
      }
      return { ok: true, data }
    } catch (err) {
      return {
        ok: false,
        error: {
          code: 'OAUTH_EXCEPTION',
          message: err.message || 'Failed to initiate Google OAuth.',
        },
      }
    }
  }, [])

  /**
   * Log out
   */
  const logout = useCallback(async () => {
    if (isSupabaseConfigured) {
      try {
        await supabase.auth.signOut()
      } catch (err) {
        console.warn('[AuthContext] Sign out warning:', err)
      }
    }
    setUser(null)
    removeKey('session')
  }, [])

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated,
      isAdmin,
      login,
      signup,
      signInWithGoogle,
      logout,
      inviteAdmin,
      completeAdminSetup,
      addAdmin,
      removeAdmin,
      registeredAdmins,
    }),
    [
      user,
      loading,
      isAuthenticated,
      isAdmin,
      login,
      signup,
      signInWithGoogle,
      logout,
      inviteAdmin,
      completeAdminSetup,
      addAdmin,
      removeAdmin,
      registeredAdmins,
    ]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
