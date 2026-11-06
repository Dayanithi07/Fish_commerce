import { Router } from 'express'
import { db } from '../db/database.js'
import { requireAdmin } from '../middleware/auth.js'

export const orderRouter = Router()

const ALLOWED_TRANSITIONS = {
  Pending: ['Confirmed'],
  Confirmed: ['Shipped'],
  Shipped: ['Delivered'],
  Delivered: [],
}

// GET /api/orders (Admin)
orderRouter.get('/', requireAdmin, (req, res) => {
  const { status } = req.query
  const orders = db.getOrders(status)
  res.json({ ok: true, orders })
})

// GET /api/orders/:id
orderRouter.get('/:id', (req, res) => {
  const idOrRef = req.params.id
  let order = db.getOrderById(idOrRef)
  if (!order) {
    const all = db.getOrders()
    order = all.find((o) => o.reference.toUpperCase() === idOrRef.toUpperCase())
  }

  if (!order) {
    return res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: 'Order not found' } })
  }
  res.json({ ok: true, order })
})

// POST /api/orders (Customer checkout)
orderRouter.post('/', (req, res) => {
  res.status(403).json({
    ok: false,
    error: {
      code: 'PAYMENT_REQUIRED',
      message: 'Orders must be placed after successful online payment.',
    },
  })
})

// PATCH /api/orders/:id/status (Admin)
orderRouter.patch('/:id/status', requireAdmin, (req, res) => {
  const { status: nextStatus } = req.body
  const order = db.getOrderById(req.params.id)

  if (!order) {
    return res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: 'Order not found' } })
  }

  const allowed = ALLOWED_TRANSITIONS[order.status] || []
  if (!allowed.includes(nextStatus)) {
    return res.status(400).json({
      ok: false,
      error: {
        code: 'INVALID_TRANSITION',
        message: `Status cannot transition from ${order.status} to ${nextStatus}`,
      },
    })
  }

  const updated = db.updateOrderStatus(req.params.id, nextStatus)
  res.json({ ok: true, order: updated })
})
