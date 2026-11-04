// Supabase Auth context with Google OAuth and Role-Based Access Control
import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase.js'
import { DEMO_ADMIN } from '../config.js'
import { readJSON, writeJSON, removeKey } from '../utils/storage.js'
import { validateLogin, validateSignup } from '../utils/validators.js'

const AuthContext = createContext(null)

export const ADMIN_EMAILS = [
  'starboy1s2s3s3@gmail.com',
  'admin@fishcommerce.com',
]

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => readJSON('session', null))
  const [loading, setLoading] = useState(true)

  // Sync profile details from Supabase public.profiles or session
  const syncProfile = useCallback(async (sessionUser) => {
    if (!sessionUser) {
      setUser(null)
      removeKey('session')
      return null
    }

    const email = sessionUser.email?.toLowerCase() || ''
    const isSpecialAdmin = ADMIN_EMAILS.includes(email)

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

      // If Supabase is active, use Supabase Auth
      if (isSupabaseConfigured) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password,
        })

        if (error) {
          // If demo admin fallback requested and matches demo admin credentials
          if (
            trimmedEmail === DEMO_ADMIN.email.toLowerCase() &&
            password === DEMO_ADMIN.password
          ) {
            const adminUser = {
              id: 'admin_root',
              name: DEMO_ADMIN.name,
              email: DEMO_ADMIN.email,
              role: 'admin',
            }
            setUser(adminUser)
            writeJSON('session', adminUser)
            return { ok: true, user: adminUser }
          }

          return {
            ok: false,
            error: { code: 'AUTH_ERROR', message: error.message },
          }
        }

        const profile = await syncProfile(data.user)
        return { ok: true, user: profile }
      }

      // Fallback: Local demo simulation
      if (trimmedEmail === DEMO_ADMIN.email.toLowerCase() && password === DEMO_ADMIN.password) {
        const adminUser = {
          id: 'admin_root',
          name: DEMO_ADMIN.name,
          email: DEMO_ADMIN.email,
          role: 'admin',
        }
        setUser(adminUser)
        writeJSON('session', adminUser)
        return { ok: true, user: adminUser }
      }

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
        role: ADMIN_EMAILS.includes(found.email.toLowerCase()) ? 'admin' : 'customer',
      }
      setUser(authUser)
      writeJSON('session', authUser)
      return { ok: true, user: authUser }
    },
    [syncProfile]
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
        role: ADMIN_EMAILS.includes(trimmedEmail) ? 'admin' : 'customer',
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

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/products`,
      },
    })

    if (error) {
      return { ok: false, error: { message: error.message } }
    }
    return { ok: true, data }
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
    }),
    [user, loading, isAuthenticated, isAdmin, login, signup, signInWithGoogle, logout]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
