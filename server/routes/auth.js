import { Router } from 'express'
import { db } from '../db/database.js'
import { DEMO_ADMIN } from '../../src/config.js'
import { newId } from '../../src/utils/id.js'
import { validateLogin, validateSignup } from '../../src/utils/validators.js'
import { requireAuth } from '../middleware/auth.js'

export const authRouter = Router()

// POST /api/auth/login
authRouter.post('/login', (req, res) => {
  const { email, password } = req.body
  const trimmedEmail = (email || '').trim().toLowerCase()

  const validation = validateLogin({ email: trimmedEmail, password })
  if (!validation.valid) {
    return res.status(400).json({
      ok: false,
      error: { code: 'VALIDATION', message: 'Invalid credentials format', details: validation.errors },
    })
  }

  // 1. Check Demo Admin
  if (trimmedEmail === DEMO_ADMIN.email.toLowerCase() && password === DEMO_ADMIN.password) {
    const adminUser = {
      id: 'admin_root',
      name: DEMO_ADMIN.name,
      email: DEMO_ADMIN.email,
      role: 'admin',
    }
    const token = `${adminUser.id}:${adminUser.role}`
    return res.json({ ok: true, user: adminUser, token })
  }

  // 2. Check registered users
  const user = db.findUserByEmail(trimmedEmail)
  if (!user || user.password !== password) {
    return res.status(401).json({
      ok: false,
      error: { code: 'INVALID_CREDENTIALS', message: 'Incorrect email or password.' },
    })
  }

  const safeUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role || 'customer',
  }
  const token = `${safeUser.id}:${safeUser.role}`
  res.json({ ok: true, user: safeUser, token })
})

// POST /api/auth/signup
authRouter.post('/signup', (req, res) => {
  const { name, email, password } = req.body
  const trimmedEmail = (email || '').trim().toLowerCase()
  const trimmedName = (name || '').trim()

  const validation = validateSignup({ name: trimmedName, email: trimmedEmail, password })
  if (!validation.valid) {
    return res.status(400).json({
      ok: false,
      error: { code: 'VALIDATION', message: 'Validation failed', details: validation.errors },
    })
  }

  if (trimmedEmail === DEMO_ADMIN.email.toLowerCase() || db.findUserByEmail(trimmedEmail)) {
    return res.status(409).json({
      ok: false,
      error: { code: 'EMAIL_TAKEN', message: 'An account with this email already exists.' },
    })
  }

  const newUser = {
    id: newId(),
    name: trimmedName,
    email: trimmedEmail,
    password,
    role: 'customer',
    createdAt: new Date().toISOString(),
  }

  db.createUser(newUser)

  const safeUser = {
    id: newUser.id,
    name: newUser.name,
    email: newUser.email,
    role: newUser.role,
  }
  const token = `${safeUser.id}:${safeUser.role}`
  res.status(201).json({ ok: true, user: safeUser, token })
})

// GET /api/auth/me
authRouter.get('/me', requireAuth, (req, res) => {
  const safeUser = {
    id: req.user.id,
    name: req.user.name,
    email: req.user.email,
    role: req.user.role,
  }
  res.json({ ok: true, user: safeUser })
})
