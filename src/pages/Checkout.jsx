import { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useCart } from '../context/CartContext.jsx'
import { useOrders } from '../context/OrderContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { formatPrice } from '../utils/money.js'
import { STORE_NAME, STORE_UPI_ID } from '../config.js'
import './Checkout.css'

export default function Checkout() {
  const { lines, subtotal } = useCart()
  const { placeOrder } = useOrders()
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // If user placed order directly from a specific product page, checkout that product alone!
  const directItem = location.state?.directItem

  const activeLines = directItem
    ? [
        {
          product: directItem.product,
          quantity: directItem.quantity || 1,
          lineTotal: directItem.product.price * (directItem.quantity || 1),
        },
      ]
    : lines

  // Load auto-filled saved details from previous checkout (fully editable)
  const [formData, setFormData] = useState(() => {
    let saved = {}
    try {
      saved = JSON.parse(localStorage.getItem('vp_saved_checkout_details') || '{}')
    } catch {
      saved = {}
    }
    return {
      name: saved.name || user?.name || '',
      email: saved.email || user?.email || '',
      phone: saved.phone || '',
      street: saved.street || '',
      city: saved.city || '',
      postalCode: saved.postalCode || '',
      notes: saved.notes || '',
    }
  })

  const [hasSavedDetails] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('vp_saved_checkout_details') || '{}')
      return !!(saved.street || saved.phone)
    } catch {
      return false
    }
  })

  const [upiRef, setUpiRef] = useState('')
  const [copied, setCopied] = useState(false)
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  if (activeLines.length === 0) {
    return (
      <div className="container checkout-empty">
        <h2>Your Cart is Empty</h2>
        <p>Add some fish or food to your cart before proceeding to checkout.</p>
        <Link to="/products" className="btn-primary">Browse Catalog</Link>
      </div>
    )
  }

  // Shipping cost removed — Free delivery
  const activeSubtotal = directItem
    ? directItem.product.price * (directItem.quantity || 1)
    : subtotal
  const shipping = 0
  const total = activeSubtotal

  // Verified Store UPI Configuration
  const upiId = STORE_UPI_ID || 'ganesh123madesh@okaxis'
  const storeName = STORE_NAME || 'VP Aquarium'
  const upiUrl = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(storeName)}&am=${total}&cu=INR&tn=${encodeURIComponent('VP Aquarium Live Livestock')}`
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(upiUrl)}`

  const handleCopyUpi = () => {
    navigator.clipboard?.writeText(upiId)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setErrors({})

    // Validate UPI Transaction Reference / UTR (Standard Indian 12-digit numeric reference)
    const cleanUtr = upiRef.trim().replace(/\s+/g, '')
    if (!cleanUtr || !/^\d{12}$/.test(cleanUtr)) {
      setSubmitting(false)
      setErrors((prev) => ({
        ...prev,
        upiRef: 'Please enter the valid 12-digit numeric UPI UTR / Transaction Reference number from your payment app.',
      }))
      return
    }

    const orderPayload = {
      items: activeLines.map((l) => ({ productId: l.product.id, quantity: l.quantity })),
      customer: {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
      },
      address: {
        street: formData.street,
        city: formData.city,
        postalCode: formData.postalCode,
      },
      notes: formData.notes,
      paymentMethod: 'UPI (QR Code / Apps)',
      paymentRef: cleanUtr,
    }

    try {
      const res = await placeOrder(orderPayload)
      setSubmitting(false)

      if (!res.ok) {
        if (res.error?.details) {
          setErrors(res.error.details)
        } else {
          alert(res.error?.message || 'Failed to place order')
        }
        return
      }

      // Persist user's contact & delivery details so next checkout is auto-filled and editable
      try {
        localStorage.setItem(
          'vp_saved_checkout_details',
          JSON.stringify({
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            street: formData.street,
            city: formData.city,
            postalCode: formData.postalCode,
            notes: formData.notes,
          })
        )
      } catch (storageErr) {
        console.warn('Could not save checkout details to localStorage', storageErr)
      }

      navigate('/order-success', { state: { order: res.order } })
    } catch (err) {
      setSubmitting(false)
      alert(err.message || 'An unexpected error occurred.')
    }
  }

  return (
    <div className="container checkout-page">
      <h1>Checkout & Payment</h1>
      {directItem && (
        <div style={{ marginBottom: '16px', fontSize: '14px', color: 'var(--accent)', fontWeight: '600' }}>
          ⚡ Direct Buy: Checking out only <strong>{directItem.product.name}</strong> (Qty: {directItem.quantity || 1})
        </div>
      )}
      <div className="checkout-layout">
        <form className="checkout-form" onSubmit={handleSubmit}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
            <h3 style={{ margin: 0 }}>1. Contact & Shipping Details</h3>
            {hasSavedDetails && (
              <span style={{ fontSize: '11px', background: 'rgba(16, 185, 129, 0.1)', color: '#059669', padding: '3px 8px', borderRadius: '6px', fontWeight: '600' }}>
                ✓ Autofilled from previous order (Editable)
              </span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="name">Full Name</label>
            <input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g. Dayanithi"
              className={errors.customerName ? 'input-error' : ''}
              required
            />
            {errors.customerName && <span className="field-error">{errors.customerName}</span>}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="email">Email Address (for order & bill)</label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="you@gmail.com"
                className={errors.customerEmail ? 'input-error' : ''}
                required
              />
              {errors.customerEmail && <span className="field-error">{errors.customerEmail}</span>}
            </div>
            <div className="form-group">
              <label htmlFor="phone">Phone Number (delivery updates)</label>
              <input
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                placeholder="e.g. 9876543210"
                className={errors.customerPhone ? 'input-error' : ''}
                required
              />
              {errors.customerPhone && <span className="field-error">{errors.customerPhone}</span>}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="street">Street Address & Landmark</label>
            <input
              id="street"
              name="street"
              type="text"
              value={formData.street}
              onChange={handleChange}
              placeholder="Flat / House No., Colony / Street"
              className={errors.street ? 'input-error' : ''}
              required
            />
            {errors.street && <span className="field-error">{errors.street}</span>}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="city">City / District</label>
              <input
                id="city"
                name="city"
                type="text"
                value={formData.city}
                onChange={handleChange}
                placeholder="e.g. Chennai"
                className={errors.city ? 'input-error' : ''}
                required
              />
              {errors.city && <span className="field-error">{errors.city}</span>}
            </div>
            <div className="form-group">
              <label htmlFor="postalCode">PIN Code</label>
              <input
                id="postalCode"
                name="postalCode"
                type="text"
                value={formData.postalCode}
                onChange={handleChange}
                placeholder="6-digit PIN code"
                className={errors.postalCode ? 'input-error' : ''}
                required
              />
              {errors.postalCode && <span className="field-error">{errors.postalCode}</span>}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="notes">Delivery & Acclimation Instructions (Optional)</label>
            <textarea
              id="notes"
              name="notes"
              rows={2}
              value={formData.notes}
              onChange={handleChange}
              placeholder="e.g. Please call before delivery or leave with security."
            />
          </div>

          {/* Dedicated UPI Payment Section */}
          <div className="payment-section">
            <h3>
              2. Instant UPI Payment
              <span className="payment-badge">0% Fees · Instant Settlement</span>
            </h3>

            <div className="upi-payment-box">
              <div className="upi-qr-wrap">
                <img
                  src={qrCodeUrl}
                  alt="Scan to Pay via UPI"
                  className="upi-qr-image"
                  width={180}
                  height={180}
                />
                <span className="upi-scan-hint">Scan with GPay, PhonePe, Paytm, BHIM</span>
              </div>

              <div className="upi-details-pane">
                <div className="upi-id-card">
                  <span className="upi-label">Store UPI ID:</span>
                  <div className="upi-copy-row">
                    <code className="upi-address">{upiId}</code>
                    <button
                      type="button"
                      onClick={handleCopyUpi}
                      className="btn-copy-upi"
                    >
                      {copied ? '✓ Copied' : 'Copy'}
                    </button>
                  </div>
                </div>

                <div className="upi-amount-row">
                  <span>Pay Exact Amount:</span>
                  <strong className="upi-amount-value">{formatPrice(total)}</strong>
                </div>

                {/* One-tap UPI deep link button for Mobile */}
                <a
                  href={upiUrl}
                  className="btn-open-upi-app"
                >
                  ⚡ Open in UPI App (GPay / PhonePe / Paytm)
                </a>

                <div className="form-group utr-group">
                  <label htmlFor="upiRef">
                    12-Digit UPI Transaction UTR / Ref No. <span className="required">*</span>
                  </label>
                  <input
                    id="upiRef"
                    name="upiRef"
                    type="text"
                    value={upiRef}
                    onChange={(e) => {
                      setUpiRef(e.target.value)
                      if (errors.upiRef) setErrors((prev) => ({ ...prev, upiRef: null }))
                    }}
                    placeholder="e.g. 431289104812"
                    maxLength={20}
                    className={errors.upiRef ? 'input-error' : ''}
                    required
                  />
                  {errors.upiRef && <span className="field-error">{errors.upiRef}</span>}
                  <small className="field-hint">
                    Enter the 12-digit UTR/Ref from your UPI app receipt to confirm your live livestock dispatch.
                  </small>
                </div>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="btn-primary btn-submit-order"
          >
            {submitting ? 'Verifying & Placing Order...' : `Confirm & Place Order (${formatPrice(total)})`}
          </button>
        </form>

        <div className="checkout-summary">
          <h3>Order Summary</h3>
          <div className="summary-items">
            {activeLines.map(({ product, quantity, lineTotal }) => (
              <div key={product.id} className="summary-item">
                <span>{product.name} × {quantity}</span>
                <strong>{formatPrice(lineTotal)}</strong>
              </div>
            ))}
          </div>
          <div className="summary-totals">
            <div className="summary-row">
              <span>Subtotal:</span>
              <span>{formatPrice(activeSubtotal)}</span>
            </div>
            <div className="summary-row">
              <span>Safe Climate Delivery:</span>
              <span style={{ color: '#10b981', fontWeight: '700' }}>FREE</span>
            </div>
            <div className="summary-row total-row">
              <span>Grand Total:</span>
              <strong className="grand-total-highlight">{formatPrice(total)}</strong>
            </div>
          </div>

          <div className="checkout-perks">
            <div className="perk-item">
              <span className="perk-icon">🛡️</span>
              <span>100% Live Arrival Guarantee</span>
            </div>
            <div className="perk-item">
              <span className="perk-icon">📦</span>
              <span>Insulated Oxygen-Packed Transport</span>
            </div>
            <div className="perk-item">
              <span className="perk-icon">⚡</span>
              <span>Instant WhatsApp & Email Order Updates</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
