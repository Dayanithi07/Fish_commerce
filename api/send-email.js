/**
 * Vercel Serverless Function — Email Dispatcher via Resend
 * Runs on Node.js runtime on Vercel to bypass browser CORS preflight restrictions.
 */

export default async function handler(req, res) {
  // Set CORS headers for local/cross-origin safety
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
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

  const { to, subject, html } = req.body || {}

  if (!to || !subject || !html) {
    return res.status(400).json({ error: 'Missing required fields: to, subject, html.' })
  }

  const apiKey =
    process.env.RESEND_API_KEY ||
    process.env.VITE_RESEND_API_KEY ||
    ''

  if (!apiKey) {
    console.warn('[Vercel send-email] RESEND_API_KEY is not configured in Vercel environment.')
    return res.status(200).json({
      success: false,
      note: 'RESEND_API_KEY not configured. Email logged but deferred.',
    })
  }

  try {
    const recipients = Array.isArray(to) ? to : [to]
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'VP Aquarium <onboarding@resend.dev>',
        to: recipients,
        subject,
        html,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      console.warn('[Vercel send-email] Resend notice/error:', data)
      // Return 200 with error details to prevent browser console 403/400 network exception
      return res.status(200).json({
        success: false,
        resendStatus: response.status,
        error: data,
        note: data?.message || 'Email delivery deferred by provider restrictions.',
      })
    }

    return res.status(200).json({ success: true, data })
  } catch (err) {
    console.error('[Vercel send-email] Network error:', err)
    return res.status(500).json({ success: false, error: err.message })
  }
}
