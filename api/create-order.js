/**
 * Vercel Serverless Function: POST /api/create-order
 * Creates a standard Razorpay order.
 * Amount is received in paise (or calculated from INR cents). Minimum: 100 paise (₹1).
 */

import Razorpay from 'razorpay'

export default async function handler(req, res) {
  // CORS configuration
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  )

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' })
  }

  const key_id = (process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY_ID || '').trim()
  const key_secret = (process.env.RAZORPAY_KEY_SECRET || '').trim()

  if (!key_id || !key_secret) {
    return res.status(401).json({ error: 'Razorpay API credentials not configured on server.' })
  }

  const { amount, currency = 'INR', receipt, notes } = req.body || {}

  // Amount must be in paise and >= 100 paise (₹1.00)
  const numericAmount = Math.round(Number(amount))
  if (isNaN(numericAmount) || numericAmount < 100) {
    return res.status(400).json({ error: 'Invalid amount. Minimum amount is 100 paise (₹1.00).' })
  }

  try {
    const razorpay = new Razorpay({
      key_id,
      key_secret,
    })

    const options = {
      amount: numericAmount,
      currency,
      receipt: receipt || `rcpt_${Date.now()}`,
      notes: notes || {},
    }

    const order = await razorpay.orders.create(options)

    return res.status(200).json({
      order_id: order.id,
      key_id: key_id,
      amount: order.amount,
      currency: order.currency,
      receipt: order.receipt,
    })
  } catch (err) {
    console.error('[Razorpay create-order error]:', err)
    return res.status(500).json({
      error: err.error?.description || err.message || 'Failed to create Razorpay order.',
    })
  }
}
