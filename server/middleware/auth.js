import { db } from '../db/database.js'

export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader) {
    return res.status(401).json({ ok: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } })
  }

  const token = authHeader.replace(/^Bearer\s+/i, '')
  // Demo token format: "userId:role"
  const [userId] = token.split(':')
  const user = db.findUserById(userId)

  if (!user) {
    return res.status(401).json({ ok: false, error: { code: 'UNAUTHORIZED', message: 'Invalid session' } })
  }

  req.user = user
  next()
}

export function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ ok: false, error: { code: 'FORBIDDEN', message: 'Admin access required' } })
    }
    next()
  })
}
