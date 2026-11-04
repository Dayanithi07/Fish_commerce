/**
 * Notification Service — Sends Order Confirmation & Admin Notification
 * Powered by Resend API.
 */

const RESEND_API_KEY = import.meta.env.VITE_RESEND_API_KEY || ''
export const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || 'starboy1s2s3s3@gmail.com'

/**
 * Format currency helper
 */
function fmt(cents) {
  return `$${(cents / 100).toFixed(2)}`
}

/**
 * Send order confirmation to customer and full details alert to admin
 */
export async function sendOrderNotifications(order) {
  if (!order) return { success: false, error: 'No order provided' }

  const itemsHtml = order.items
    ?.map(
      (item) => `
      <tr style="border-bottom: 1px solid #f0edf9;">
        <td style="padding: 10px 0; color: #2d1a4d; font-weight: 600;">${item.name}</td>
        <td style="padding: 10px 0; text-align: center; color: #5a4b75;">x${item.quantity}</td>
        <td style="padding: 10px 0; text-align: right; color: #6F3FF5; font-weight: 700;">${fmt(
          item.priceCents * item.quantity
        )}</td>
      </tr>
    `
    )
    .join('')

  const baseEmailTemplate = (headline, recipientNote) => `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8" /></head>
    <body style="font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f7f4fc; margin: 0; padding: 24px; color: #2d1a4d;">
      <div style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(111,63,245,0.08); border: 1px solid #ede7f8;">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #3C1E5E 0%, #6F3FF5 100%); padding: 32px 28px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">🐠 Fishcommerce</h1>
          <p style="color: #e0d5fa; margin: 8px 0 0; font-size: 14px;">Healthy, Hand-Raised Aquatic Companions</p>
        </div>

        <!-- Body -->
        <div style="padding: 28px;">
          <h2 style="color: #2d1a4d; margin-top: 0; font-size: 20px;">${headline}</h2>
          <p style="color: #6a5a82; line-height: 1.5; font-size: 14px;">${recipientNote}</p>

          <div style="background: #fbf9ff; border: 1px solid #ede7f8; border-radius: 12px; padding: 16px 20px; margin: 20px 0;">
            <p style="margin: 0 0 6px; font-size: 13px; color: #8876a3;">ORDER REFERENCE</p>
            <p style="margin: 0; font-size: 18px; font-weight: 800; color: #6F3FF5; letter-spacing: 0.5px;">${order.reference}</p>
          </div>

          <!-- Items Table -->
          <h3 style="font-size: 15px; color: #2d1a4d; margin: 24px 0 10px; border-bottom: 2px solid #ede7f8; padding-bottom: 8px;">Order Summary</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <thead>
              <tr style="color: #8876a3; font-size: 12px; text-transform: uppercase;">
                <th style="text-align: left; padding-bottom: 8px;">Species</th>
                <th style="text-align: center; padding-bottom: 8px;">Qty</th>
                <th style="text-align: right; padding-bottom: 8px;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <!-- Totals -->
          <div style="margin-top: 18px; border-top: 1px solid #ede7f8; padding-top: 14px; font-size: 14px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 6px; color: #6a5a82;">
              <span>Subtotal:</span>
              <span style="font-weight: 600;">${fmt(order.subtotalCents)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 6px; color: #6a5a82;">
              <span>Safe Climate-Controlled Shipping:</span>
              <span style="font-weight: 600;">${fmt(order.shippingCents)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-top: 10px; padding-top: 10px; border-top: 2px dashed #ede7f8; font-size: 17px; font-weight: 800; color: #2d1a4d;">
              <span>Total Paid:</span>
              <span style="color: #6F3FF5;">${fmt(order.totalCents)}</span>
            </div>
          </div>

          <!-- Delivery Address -->
          <h3 style="font-size: 15px; color: #2d1a4d; margin: 26px 0 10px; border-bottom: 2px solid #ede7f8; padding-bottom: 8px;">Delivery Details</h3>
          <p style="margin: 4px 0; font-size: 14px; color: #43335e;"><strong>Name:</strong> ${order.customerName}</p>
          <p style="margin: 4px 0; font-size: 14px; color: #43335e;"><strong>Email:</strong> ${order.customerEmail}</p>
          <p style="margin: 4px 0; font-size: 14px; color: #43335e;"><strong>Phone:</strong> ${order.customerPhone}</p>
          <p style="margin: 4px 0; font-size: 14px; color: #43335e;"><strong>Address:</strong> ${order.street}, ${order.city} ${order.postalCode}</p>
          ${order.notes ? `<p style="margin: 4px 0; font-size: 14px; color: #43335e;"><strong>Delivery Notes:</strong> ${order.notes}</p>` : ''}
        </div>

        <!-- Footer -->
        <div style="background: #fbf9ff; border-top: 1px solid #ede7f8; padding: 20px 28px; text-align: center; font-size: 12px; color: #9a8bb3;">
          <p style="margin: 0 0 6px;">Fishcommerce Inc. — Ethical Fishkeeping & Aquaria Experts</p>
          <p style="margin: 0;">Need help? Reply directly to this email or visit our store.</p>
        </div>
      </div>
    </body>
    </html>
  `

  const customerHtml = baseEmailTemplate(
    'Thank you for your order! 🌊',
    `We have received your order <strong>${order.reference}</strong> and our aquatic specialists are preparing your companions for safe, climate-controlled dispatch.`
  )

  const adminHtml = baseEmailTemplate(
    `🚨 New Order Received: ${order.reference}`,
    `An order has just been placed on Fishcommerce by <strong>${order.customerName}</strong> (${order.customerEmail}). Full order and dispatch details below:`
  )

  const sendEmail = async (to, subject, html) => {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Fishcommerce <onboarding@resend.dev>',
          to: [to],
          subject: subject,
          html: html,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        console.warn(`[Resend Error to ${to}]:`, data)
        return { success: false, error: data }
      }
      return { success: true, data }
    } catch (err) {
      console.warn(`[Resend Network Error to ${to}]:`, err)
      return { success: false, error: err.message }
    }
  }

  // Trigger both emails concurrently
  const [customerResult, adminResult] = await Promise.allSettled([
    sendEmail(
      order.customerEmail,
      `Order Confirmation - ${order.reference} | Fishcommerce`,
      customerHtml
    ),
    sendEmail(
      ADMIN_EMAIL,
      `[ADMIN ALERT] New Order ${order.reference} from ${order.customerName} (${fmt(order.totalCents)})`,
      adminHtml
    ),
  ])

  return {
    customerNotification: customerResult,
    adminNotification: adminResult,
  }
}
