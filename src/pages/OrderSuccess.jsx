import { useLocation, Link } from 'react-router-dom'
import { formatPrice } from '../utils/money.js'
import './OrderSuccess.css'

export default function OrderSuccess() {
  const { state } = useLocation()
  const order = state?.order

  // Trigger browser print dialog (Save as PDF on mobile & desktop)
  const handlePrint = () => {
    window.print()
  }

  // Generate downloadable self-contained HTML invoice file
  const handleDownloadInvoice = () => {
    if (!order) return

    const orderDate = new Date(order.createdAt || Date.now()).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

    const itemsRows = (order.items || [])
      .map(
        (it, idx) => `
        <tr>
          <td style="padding: 10px 12px; border-bottom: 1px solid #ede7f8;">${idx + 1}</td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #ede7f8; font-weight: 600; color: #2d1a4d;">${it.name}</td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #ede7f8; text-align: center;">${it.quantity}</td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #ede7f8; text-align: right;">${formatPrice(it.price)}</td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #ede7f8; text-align: right; font-weight: 700; color: #6F3FF5;">${formatPrice(it.price * it.quantity)}</td>
        </tr>
      `
      )
      .join('')

    const invoiceHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Invoice - ${order.reference} | VP Aquarium</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 32px; background: #ffffff; color: #2d1a4d; }
          .invoice-card { max-width: 720px; margin: 0 auto; border: 1px solid #e2d9f3; border-radius: 12px; padding: 32px; box-shadow: 0 4px 18px rgba(111,63,245,0.06); }
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #ede7f8; padding-bottom: 20px; margin-bottom: 24px; }
          .brand-title { font-size: 26px; font-weight: 800; color: #6F3FF5; margin: 0 0 4px; }
          .brand-sub { font-size: 13px; color: #6a5a82; margin: 0; }
          .invoice-tag { text-align: right; }
          .invoice-number { font-size: 18px; font-weight: 700; color: #2d1a4d; margin: 0 0 4px; }
          .invoice-date { font-size: 13px; color: #6a5a82; margin: 0; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px; }
          .info-block h4 { margin: 0 0 8px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: #8e7ea8; }
          .info-block p { margin: 0 0 4px; font-size: 14px; line-height: 1.5; color: #3c2a5c; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
          th { background: #f7f3fd; color: #5a4b75; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; padding: 10px 12px; text-align: left; }
          .totals-table { width: 280px; margin-left: auto; margin-bottom: 24px; }
          .totals-table td { padding: 6px 12px; font-size: 14px; }
          .totals-table .grand-total { font-size: 18px; font-weight: 800; color: #6F3FF5; border-top: 2px dashed #ede7f8; }
          .payment-badge { background: #e6f9f0; border: 1px solid #10b981; color: #065f46; padding: 12px 16px; border-radius: 8px; margin-bottom: 24px; font-size: 14px; }
          .acclimation-box { background: #fbf9ff; border: 1px solid #ede7f8; border-radius: 8px; padding: 14px 18px; font-size: 12px; color: #6a5a82; line-height: 1.6; }
          .footer-note { text-align: center; font-size: 12px; color: #9c8fb5; margin-top: 28px; }
        </style>
      </head>
      <body>
        <div class="invoice-card">
          <div class="header">
            <div>
              <h1 class="brand-title">🐠 VP Aquarium</h1>
              <p class="brand-sub">Premium Pet Fish & Live Aquatic Care</p>
              <p class="brand-sub">Support: starboy1s2s3s3@gmail.com</p>
            </div>
            <div class="invoice-tag">
              <h2 class="invoice-number">TAX INVOICE</h2>
              <p class="invoice-date">Ref: <strong>${order.reference}</strong></p>
              <p class="invoice-date">Date: ${orderDate}</p>
            </div>
          </div>

          <div class="info-grid">
            <div class="info-block">
              <h4>Billed & Shipped To</h4>
              <p><strong>${order.customerName}</strong></p>
              <p>${order.street}</p>
              <p>${order.city} - ${order.postalCode}</p>
              <p>Email: ${order.customerEmail}</p>
              <p>Phone: ${order.customerPhone}</p>
            </div>
            <div class="info-block">
              <h4>Payment & Settlement Details</h4>
              <p><strong>Payment Mode:</strong> ${order.paymentMethod || 'UPI Payment'}</p>
              <p><strong>Store UPI:</strong> ganesh123madesh@okaxis</p>
              ${order.paymentRef ? `<p><strong>UPI UTR / Ref:</strong> <code>${order.paymentRef}</code></p>` : ''}
              <p><strong>Status:</strong> <span style="color: #10b981; font-weight: 700;">Verified (Pending Dispatch)</span></p>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 32px;">#</th>
                <th>Item Description</th>
                <th style="text-align: center;">Qty</th>
                <th style="text-align: right;">Unit Price</th>
                <th style="text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRows}
            </tbody>
          </table>

          <table class="totals-table">
            <tr>
              <td>Subtotal:</td>
              <td style="text-align: right; font-weight: 600;">${formatPrice(order.subtotal)}</td>
            </tr>
            <tr>
              <td>Delivery & Packaging:</td>
              <td style="text-align: right; font-weight: 700; color: #10b981;">FREE</td>
            </tr>
            <tr class="grand-total">
              <td>Total Paid:</td>
              <td style="text-align: right;">${formatPrice(order.total)}</td>
            </tr>
          </table>

          <div class="payment-badge">
            ✓ <strong>Payment Confirmed via UPI:</strong> Thank you for your purchase with VP Aquarium. Your companion is being acclimated and prepared for safe dispatch.
          </div>

          <div class="acclimation-box">
            <strong>Acclimation Instructions Upon Delivery:</strong>
            <br />
            1. Float the sealed transport bag in your aquarium for 15 minutes to equalize water temperature.
            <br />
            2. Slowly introduce small amounts of tank water into the bag over 20-30 minutes before release.
            <br />
            3. <strong>100% Live Arrival Guarantee:</strong> Please record unboxing video. Claims honored within 2 hours of live arrival.
          </div>

          <p class="footer-note">VP Aquarium Inc. · Thank you for supporting ethical pet fishkeeping!</p>
        </div>
      </body>
      </html>
    `

    const blob = new Blob([invoiceHtml], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `VP-Aquarium-Invoice-${order.reference}.html`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="container order-success-page">
      <div className="success-card">
        <div className="success-icon">✓</div>
        <h1>Order Confirmed!</h1>
        {order ? (
          <>
            <p className="order-ref">Reference: <strong>{order.reference}</strong></p>
            <p>Thank you for choosing VP Aquarium, <strong>{order.customerName}</strong>. Your order is pending fulfillment.</p>

            <div className="order-details-box printable-invoice-section">
              <div className="invoice-header-row">
                <div>
                  <h3 style={{ margin: 0, color: 'var(--accent)' }}>🐠 VP Aquarium</h3>
                  <small style={{ color: 'var(--text-secondary)' }}>Official Livestock Order Bill</small>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <strong>{order.reference}</strong>
                  <br />
                  <small style={{ color: 'var(--text-secondary)' }}>
                    {new Date(order.createdAt || Date.now()).toLocaleDateString('en-IN')}
                  </small>
                </div>
              </div>

              <div className="invoice-divider" />

              <h4 className="invoice-subhead">Delivery & Payment Details</h4>
              <p><strong>Shipping to:</strong> {order.street}, {order.city} - {order.postalCode}</p>
              <p><strong>Contact:</strong> {order.customerEmail} | {order.customerPhone}</p>
              <p><strong>Payment Mode:</strong> {order.paymentMethod || 'UPI Payment'} (ganesh123madesh@okaxis)</p>
              {order.paymentRef && (
                <p><strong>UPI UTR / Reference No.:</strong> <code className="utr-code">{order.paymentRef}</code></p>
              )}

              <div className="invoice-divider" />

              <h4 className="invoice-subhead">Ordered Items</h4>
              {order.items.map((item) => (
                <div key={item.productId} className="order-item-row">
                  <span>{item.name} × {item.quantity}</span>
                  <strong>{formatPrice(item.price * item.quantity)}</strong>
                </div>
              ))}
              <div className="order-item-row" style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                <span>Delivery & Climate Packaging:</span>
                <span style={{ color: '#10b981', fontWeight: '700' }}>FREE</span>
              </div>
              <div className="order-total-row">
                <span>Total Paid:</span>
                <strong>{formatPrice(order.total)}</strong>
              </div>
            </div>

            {/* Bill Actions */}
            <div className="invoice-actions-row">
              <button
                type="button"
                onClick={handlePrint}
                className="btn-print-bill"
                title="Print or Save as PDF"
              >
                🖨️ Print / Save as PDF
              </button>
              <button
                type="button"
                onClick={handleDownloadInvoice}
                className="btn-download-bill"
                title="Download HTML Invoice Slip"
              >
                📥 Download Invoice (.html)
              </button>
            </div>
          </>
        ) : (
          <p>Your order was received successfully.</p>
        )}

        <div className="success-actions">
          <Link to="/products" className="btn-primary">Continue Shopping</Link>
        </div>
      </div>
    </div>
  )
}
