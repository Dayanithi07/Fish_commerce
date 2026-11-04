import express from 'express'
import cors from 'cors'
import { productRouter } from './routes/products.js'
import { orderRouter } from './routes/orders.js'
import { authRouter } from './routes/auth.js'

const app = express()
const PORT = process.env.PORT || 5000

app.use(cors())
app.use(express.json())

// Health check
app.get('/api/health', (req, res) => {
  res.json({ ok: true, status: 'healthy', timestamp: new Date().toISOString() })
})

// Route groups matching DATABASE_SCHEMA.md Section 12 REST surface
app.use('/api/products', productRouter)
app.use('/api/orders', orderRouter)
app.use('/api/auth', authRouter)

// Global error handler
app.use((err, req, res, next) => {
  console.error('API Error:', err)
  res.status(500).json({ ok: false, error: { code: 'INTERNAL_ERROR', message: err.message || 'Server error' } })
})

app.listen(PORT, () => {
  console.log(`Fishcommerce REST API running at http://localhost:${PORT}`)
})
