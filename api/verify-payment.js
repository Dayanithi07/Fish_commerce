/**
 * Vercel Serverless Function: POST /api/verify-payment
 * Verifies Razorpay HMAC SHA256 payment signature.
 * Formula: HMAC-SHA256(order_id + "|" + payment_id, RAZORPAY_KEY_SECRET)
 */

import crypto from 'crypto'

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

  const key_secret = process.env.RAZORPAY_KEY_SECRET || ''

  if (!key_secret) {
    return res.status(500).json({ error: 'RAZORPAY_KEY_SECRET not configured on server.' })
  }

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {}

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({
      success: false,
      error: 'Missing required parameters: razorpay_order_id, razorpay_payment_id, and razorpay_signature are required.',
    })
  }

  try {
    const bodyToSign = `${razorpay_order_id}|${razorpay_payment_id}`
    const expectedSignature = crypto
      .createHmac('sha256', key_secret)
      .update(bodyToSign)
      .digest('hex')

    const isMatch = expectedSignature === razorpay_signature

    if (!isMatch) {
      console.warn('[Razorpay verify-payment] Signature mismatch:', {
        expected: expectedSignature,
        received: razorpay_signature,
      })
      return res.status(400).json({
        success: false,
        error: 'Payment verification failed: Signature mismatch.',
      })
    }

    return res.status(200).json({
      success: true,
      message: 'Payment signature verified successfully.',
      order_id: razorpay_order_id,
      payment_id: razorpay_payment_id,
    })
  } catch (err) {
    console.error('[Razorpay verify-payment error]:', err)
    return res.status(500).json({
      success: false,
      error: err.message || 'Server error during payment verification.',
    })
  }
}
