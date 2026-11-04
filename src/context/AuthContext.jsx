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

  // Secondary admins created via admin portal
  const [registeredAdmins, setRegisteredAdmins] = useState(() => {
    return readJSON('custom_admins', [])
  })

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
    const isSpecialAdmin = ADMIN_EMAILS.includes(email) || isCustomAdmin

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
        const { data, error } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password,
        })

        if (!error && data?.user) {
          const profile = await syncProfile(data.user)
          return { ok: true, user: profile }
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
          return {
            ok: false,
            error: { code: 'AUTH_ERROR', message: error.message },
          }
        }

        if (data?.user) {
          const profile = await syncProfile(data.user)
          return { ok: true, user: profile }
        }

        return {
          ok: true,
          message: 'Please check your email inbox to verify your account.',
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
   * Feature: Add a new admin from the admin page
   */
  const addAdmin = useCallback(
    async ({ name, email, password }) => {
      const trimmedEmail = (email || '').trim().toLowerCase()
      const trimmedName = (name || '').trim()

      if (!trimmedName || !trimmedEmail || !password) {
        return { ok: false, error: { message: 'All fields are required.' } }
      }

      if (password.length < 6) {
        return { ok: false, error: { message: 'Admin password must be at least 6 characters.' } }
      }

      // Check duplicate
      const current = readJSON('custom_admins', [])
      if (
        current.some((a) => a.email.toLowerCase() === trimmedEmail) ||
        ADMIN_EMAILS.includes(trimmedEmail)
      ) {
        return { ok: false, error: { message: 'An admin with this email already exists.' } }
      }

      const newAdminRecord = {
        id: 'admin_' + Date.now(),
        name: trimmedName,
        email: trimmedEmail,
        password,
        role: 'admin',
        createdAt: new Date().toISOString(),
      }

      const updated = [newAdminRecord, ...current]
      writeJSON('custom_admins', updated)
      setRegisteredAdmins(updated)

      // Try creating in Supabase too
      if (isSupabaseConfigured) {
        try {
          await supabase.auth.signUp({
            email: trimmedEmail,
            password,
            options: {
              data: {
                full_name: trimmedName,
                role: 'admin',
              },
            },
          })
        } catch (e) {
          console.warn('[addAdmin] Supabase signup note:', e)
        }
      }

      return { ok: true, admin: newAdminRecord }
    },
    []
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
