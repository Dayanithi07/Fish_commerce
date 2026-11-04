import { Router } from 'express'
import { db } from '../db/database.js'
import { validateCheckout } from '../../src/utils/validators.js'
import { newId, newOrderReference } from '../../src/utils/id.js'
import { toCents, fromCents, lineTotal, sumMoney } from '../../src/utils/money.js'
import { SHIPPING_FLAT } from '../../src/config.js'
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
  const { items, customer, address, notes = '' } = req.body

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ ok: false, error: { code: 'EMPTY_CART', message: 'Cart items cannot be empty' } })
  }

  const validation = validateCheckout({
    customerName: customer?.name,
    customerEmail: customer?.email,
    customerPhone: customer?.phone,
    street: address?.street,
    city: address?.city,
    postalCode: address?.postalCode,
    notes,
  })

  if (!validation.valid) {
    return res.status(400).json({
      ok: false,
      error: { code: 'VALIDATION', message: 'Please correct checkout errors', details: validation.errors },
    })
  }

  // Stock verification & line item build
  const orderItems = []
  for (const item of items) {
    const prod = db.getProductById(item.productId)
    if (!prod) {
      return res.status(400).json({
        ok: false,
        error: { code: 'PRODUCT_NOT_FOUND', message: `Product ${item.productId} not found.` },
      })
    }
    if (prod.stock < item.quantity) {
      return res.status(409).json({
        ok: false,
        error: {
          code: 'OUT_OF_STOCK',
          message: `Insufficient stock for ${prod.name} (available: ${prod.stock}).`,
        },
      })
    }
    orderItems.push({
      productId: prod.id,
      name: prod.name,
      price: prod.price,
      quantity: item.quantity,
      image: prod.image,
    })
  }

  // Decrement stock atomically
  for (const item of items) {
    const prod = db.getProductById(item.productId)
    db.updateProduct(prod.id, { stock: prod.stock - item.quantity })
  }

  const subtotal = sumMoney(orderItems.map((i) => lineTotal(i.price, i.quantity)))
  const shipping = SHIPPING_FLAT
  const total = fromCents(toCents(subtotal) + toCents(shipping))
  const now = new Date().toISOString()
  const reference = newOrderReference()

  const newOrder = {
    id: newId(),
    reference,
    userId: req.user?.id || null,
    customerName: customer.name.trim(),
    customerEmail: customer.email.trim().toLowerCase(),
    customerPhone: customer.phone.trim(),
    street: address.street.trim(),
    city: address.city.trim(),
    postalCode: address.postalCode.trim(),
    notes: notes ? notes.trim() : '',
    items: orderItems,
    subtotal,
    shipping,
    total,
    status: 'Pending',
    timeline: [{ status: 'Pending', at: now }],
    createdAt: now,
    updatedAt: now,
  }

  const saved = db.createOrder(newOrder)
  res.status(201).json({ ok: true, order: saved })
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
