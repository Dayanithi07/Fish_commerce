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
   * Fetch all custom admins from Supabase DB (profiles + admin_invitations).
   * Falls back to localStorage if Supabase is not configured or fetch fails.
   */
  const fetchAdminsFromDB = useCallback(async () => {
    if (!isSupabaseConfigured) return

    try {
      const { data: profileAdmins, error: profileError } = await supabase
        .from('profiles')
        .select('id, name, email, status, created_at')
        .eq('role', 'admin')

      if (profileError) {
        console.warn('[AuthContext] profiles fetch error:', profileError.message)
      }

      const { data: invitations, error: invError } = await supabase
        .from('admin_invitations')
        .select('id, name, email, status, created_at')
        .neq('status', 'revoked')

      if (invError) {
        console.warn('[AuthContext] admin_invitations fetch error:', invError.message)
      }

      const profileEmails = new Set((profileAdmins || []).map((p) => p.email.toLowerCase()))

      const profileRows = (profileAdmins || [])
        .filter((p) => !ADMIN_EMAILS.includes(p.email.toLowerCase()))
        .map((p) => ({
          id: p.id,
          name: p.name,
          email: p.email.toLowerCase(),
          role: 'admin',
          status: p.status || 'active',
          invitedAt: p.created_at,
        }))

      const inviteRows = (invitations || [])
        .filter(
          (inv) =>
            !profileEmails.has(inv.email.toLowerCase()) &&
            !ADMIN_EMAILS.includes(inv.email.toLowerCase())
        )
        .map((inv) => ({
          id: inv.id,
          name: inv.name,
          email: inv.email.toLowerCase(),
          role: 'admin',
          status: inv.status === 'invited' ? 'invited' : inv.status,
          invitedAt: inv.created_at,
        }))

      const merged = [...profileRows, ...inviteRows]

      if (profileAdmins !== null || invitations !== null) {
        writeJSON('custom_admins', merged)
        setRegisteredAdmins(merged)
      }
    } catch (err) {
      console.warn('[AuthContext] fetchAdminsFromDB error:', err)
    }
  }, [])

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

      // 2. Record in admin_invitations table if Supabase is configured
      if (isSupabaseConfigured) {
        try {
          await supabase.from('admin_invitations').upsert(
            { name: trimmedName, email: trimmedEmail, status: 'invited' },
            { onConflict: 'email' }
          )
        } catch (err) {
          console.warn('[inviteAdmin] DB upsert warning:', err)
        }

        // 3. Send invitation email via Supabase Auth OTP — works for ANY email address
        try {
          const { error: otpError } = await supabase.auth.signInWithOtp({
            email: trimmedEmail,
            options: {
              emailRedirectTo: inviteLink,
              shouldCreateUser: true,
              data: { full_name: trimmedName, role: 'admin', is_admin_invite: true },
            },
          })
          if (otpError) {
            console.warn('[inviteAdmin] Supabase OTP warning:', otpError.message)
          }
        } catch (err) {
          console.warn('[inviteAdmin] Supabase OTP exception:', err)
        }
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

      // Update Supabase Auth user and profiles table
      if (isSupabaseConfigured) {
        try {
          // The user already has a Supabase Auth session from clicking the magic link.
          // Update their password and metadata (no new signup needed).
          const { data: updatedAuthUser, error: updateErr } = await supabase.auth.updateUser({
            password,
            data: { full_name: updatedAdminRecord.name, role: 'admin' },
          })

          if (updateErr) {
            // If no active session (e.g. link expired), fall back to signUp
            await supabase.auth.signUp({
              email: trimmedEmail,
              password,
              options: { data: { full_name: updatedAdminRecord.name, role: 'admin' } },
            })
          }

          // Ensure role is 'admin' in profiles table
          const authUserId = updatedAuthUser?.user?.id
          if (authUserId) {
            await supabase.from('profiles').upsert({
              id: authUserId,
              name: updatedAdminRecord.name,
              email: trimmedEmail,
              role: 'admin',
              status: 'active',
            }, { onConflict: 'id' })
          } else {
            await supabase.from('profiles')
              .update({ role: 'admin', status: 'active', name: updatedAdminRecord.name })
              .eq('email', trimmedEmail)
          }

          // Mark invitation as active
          await supabase.from('admin_invitations')
            .update({ status: 'active' })
            .eq('email', trimmedEmail)

          // Sign in with the new password to establish a fresh JWT session
          const { data: signInData } = await supabase.auth.signInWithPassword({
            email: trimmedEmail,
            password,
          })

          if (signInData?.user) {
            const profile = await syncProfile(signInData.user)
            return { ok: true, user: profile }
          }
        } catch (e) {
          console.warn('[completeAdminSetup] Supabase update warning:', e)
          // Fallback: local custom_admins guarantees offline admin access
        }
      }

      // Automatically authenticate as admin (local fallback)
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
    [syncProfile]
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
  const removeAdmin = useCallback(async (email) => {
    const trimmed = (email || '').toLowerCase().trim()
    if (ADMIN_EMAILS.includes(trimmed)) {
      return { ok: false, error: { message: 'Root system admins cannot be removed.' } }
    }
    const current = readJSON('custom_admins', [])
    const next = current.filter((a) => a.email.toLowerCase() !== trimmed)
    writeJSON('custom_admins', next)
    setRegisteredAdmins(next)

    if (isSupabaseConfigured) {
      try {
        await supabase.from('profiles').update({ role: 'customer' }).eq('email', trimmed)
        await supabase.from('admin_invitations').update({ status: 'revoked' }).eq('email', trimmed)
      } catch (err) {
        console.warn('[removeAdmin] DB update warning:', err)
      }
    }

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
      fetchAdminsFromDB,
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
      fetchAdminsFromDB,
    ]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
