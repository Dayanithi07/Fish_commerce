import { Router } from 'express'
import { db } from '../db/database.js'
import { validateProduct } from '../../src/utils/validators.js'
import { requireAdmin } from '../middleware/auth.js'

export const productRouter = Router()

// GET /api/products
productRouter.get('/', (req, res) => {
  const { waterType, careLevel, temperament, isAvailable, search } = req.query
  const products = db.getProducts({ waterType, careLevel, temperament, isAvailable, search })
  res.json({ ok: true, products })
})

// GET /api/products/:id
productRouter.get('/:id', (req, res) => {
  const product = db.getProductById(req.params.id)
  if (!product) {
    return res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: 'Product not found' } })
  }
  res.json({ ok: true, product })
})

// POST /api/products (Admin)
productRouter.post('/', requireAdmin, (req, res) => {
  const existing = db.getProducts()
  const validation = validateProduct(req.body, existing)

  if (!validation.valid) {
    return res.status(400).json({
      ok: false,
      error: { code: 'VALIDATION', message: 'Validation failed', details: validation.errors },
    })
  }

  const slug = (req.body.name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
  const id = slug || `prod_${Date.now()}`

  const now = new Date().toISOString()
  const newProduct = {
    id,
    name: req.body.name.trim(),
    price: Number(req.body.price),
    image: req.body.image.trim(),
    waterType: req.body.waterType || 'Freshwater',
    careLevel: req.body.careLevel || 'Beginner',
    temperament: req.body.temperament || 'Peaceful',
    minTankSize: Number(req.body.minTankSize),
    diet: req.body.diet || 'Flakes',
    description: req.body.description.trim(),
    stock: Number(req.body.stock),
    isAvailable: req.body.isAvailable !== undefined ? req.body.isAvailable : true,
    badges: Array.isArray(req.body.badges) ? req.body.badges : [],
    createdAt: now,
    updatedAt: now,
  }

  const saved = db.createProduct(newProduct)
  res.status(201).json({ ok: true, product: saved })
})

// PATCH /api/products/:id (Admin)
productRouter.patch('/:id', requireAdmin, (req, res) => {
  const existing = db.getProductById(req.params.id)
  if (!existing) {
    return res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: 'Product not found' } })
  }

  const merged = { ...existing, ...req.body, id: req.params.id }
  const allProducts = db.getProducts()
  const validation = validateProduct(merged, allProducts)

  if (!validation.valid) {
    return res.status(400).json({
      ok: false,
      error: { code: 'VALIDATION', message: 'Validation failed', details: validation.errors },
    })
  }

  const updated = db.updateProduct(req.params.id, req.body)
  res.json({ ok: true, product: updated })
})

// DELETE /api/products/:id (Admin)
productRouter.delete('/:id', requireAdmin, (req, res) => {
  const success = db.deleteProduct(req.params.id)
  if (!success) {
    return res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: 'Product not found' } })
  }
  res.json({ ok: true })
})

// POST /api/products/reset (Admin)
productRouter.post('/reset', requireAdmin, (req, res) => {
  db.seed()
  res.json({ ok: true, message: 'Products reset to seed data' })
})
