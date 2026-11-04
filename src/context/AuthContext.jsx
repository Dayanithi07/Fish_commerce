// Auth context and state. Owner: A3 (Data and State).
// Implements contract in SYSTEM_ARCHITECTURE.md section 6.2.
import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { DEMO_ADMIN } from '../config.js'
import { readJSON, writeJSON, removeKey } from '../utils/storage.js'
import { newId } from '../utils/id.js'
import { validateLogin, validateSignup } from '../utils/validators.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  // Session is stored under fc_session
  const [user, setUser] = useState(() => {
    return readJSON('session', null)
  })

  // Keep localStorage updated if user changes
  useEffect(() => {
    if (user) {
      writeJSON('session', user)
    } else {
      removeKey('session')
    }
  }, [user])

  const isAuthenticated = !!user
  const isAdmin = user?.role === 'admin'

  /**
   * Log in user or admin.
   * Admin check happens first against DEMO_ADMIN.
   */
  const login = useCallback((email, password) => {
    const trimmedEmail = (email || '').trim().toLowerCase()

    const validation = validateLogin({ email: trimmedEmail, password })
    if (!validation.valid) {
      return {
        ok: false,
        error: { code: 'VALIDATION', message: 'Invalid credentials format', details: validation.errors },
      }
    }

    // 1. Check Demo Admin
    if (trimmedEmail === DEMO_ADMIN.email.toLowerCase() && password === DEMO_ADMIN.password) {
      const adminUser = {
        id: 'admin_root',
        name: DEMO_ADMIN.name,
        email: DEMO_ADMIN.email,
        role: 'admin',
      }
      setUser(adminUser)
      return { ok: true, user: adminUser }
    }

    // 2. Check registered users in storage
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
    return { ok: true, user: authUser }
  }, [])

  /**
   * Sign up a new customer.
   */
  const signup = useCallback((name, email, password) => {
    const trimmedEmail = (email || '').trim().toLowerCase()
    const trimmedName = (name || '').trim()

    const validation = validateSignup({ name: trimmedName, email: trimmedEmail, password })
    if (!validation.valid) {
      return {
        ok: false,
        error: { code: 'VALIDATION', message: 'Form validation failed', details: validation.errors },
      }
    }

    // Cannot take admin email
    if (trimmedEmail === DEMO_ADMIN.email.toLowerCase()) {
      return {
        ok: false,
        error: { code: 'EMAIL_TAKEN', message: 'This email is already in use.' },
      }
    }

    const users = readJSON('users', [])
    if (users.some((u) => u.email.toLowerCase() === trimmedEmail)) {
      return {
        ok: false,
        error: { code: 'EMAIL_TAKEN', message: 'An account with this email already exists.' },
      }
    }

    const newUserRecord = {
      id: newId(),
      name: trimmedName,
      email: trimmedEmail,
      password, // In this client-side demo, password stored in localStorage
      role: 'customer',
      createdAt: new Date().toISOString(),
    }

    const updatedUsers = [...users, newUserRecord]
    writeJSON('users', updatedUsers)

    const sessionUser = {
      id: newUserRecord.id,
      name: newUserRecord.name,
      email: newUserRecord.email,
      role: 'customer',
    }
    setUser(sessionUser)

    return { ok: true, user: sessionUser }
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    removeKey('session')
  }, [])

  const value = useMemo(
    () => ({
      user,
      isAuthenticated,
      isAdmin,
      login,
      signup,
      logout,
    }),
    [user, isAuthenticated, isAdmin, login, signup, logout]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (ctx === null) {
    throw new Error('useAuth must be used inside <AuthProvider>')
  }
  return ctx
}
