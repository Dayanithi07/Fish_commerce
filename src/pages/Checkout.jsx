import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useCart } from '../context/CartContext.jsx'
import { useOrders } from '../context/OrderContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { formatPrice } from '../utils/money.js'
import { SHIPPING_FLAT, STORE_NAME, STORE_UPI_ID } from '../config.js'
import './Checkout.css'

export default function Checkout() {
  const { lines, subtotal } = useCart()
  const { placeOrder } = useOrders()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: '',
    street: '',
    city: '',
    postalCode: '',
    notes: '',
  })

  const [paymentMethod, setPaymentMethod] = useState('upi') // 'upi' | 'cod'
  const [upiRef, setUpiRef] = useState('')
  const [copied, setCopied] = useState(false)
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  if (lines.length === 0) {
    return (
      <div className="container checkout-empty">
        <h2>Your Cart is Empty</h2>
        <p>Add some fish or food to your cart before proceeding to checkout.</p>
        <Link to="/products" className="btn-primary">Browse Catalog</Link>
      </div>
    )
  }

  const shipping = SHIPPING_FLAT
  const total = subtotal + shipping

  // UPI configuration
  const upiId = STORE_UPI_ID || 'dayanithi2507@okaxis'
  const storeName = STORE_NAME || 'Fishcommerce Aquatics'
  const upiUrl = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(storeName)}&am=${total}&cu=INR&tn=${encodeURIComponent('Fishcommerce Live Livestock')}`
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

    const orderPayload = {
      items: lines.map((l) => ({ productId: l.product.id, quantity: l.quantity })),
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
      paymentMethod: paymentMethod === 'upi' ? 'UPI QR Code / Apps' : 'Cash on Delivery (COD)',
      paymentRef: paymentMethod === 'upi' ? upiRef.trim() : 'COD',
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

      navigate('/order-success', { state: { order: res.order } })
    } catch (err) {
      setSubmitting(false)
      alert(err.message || 'An unexpected error occurred.')
    }
  }

  return (
    <div className="container checkout-page">
      <h1>Checkout & Payment</h1>
      <div className="checkout-layout">
        <form className="checkout-form" onSubmit={handleSubmit}>
          <h3>1. Contact & Shipping Details</h3>

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
            />
            {errors.customerName && <span className="field-error">{errors.customerName}</span>}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="email">Email Address (for tracking)</label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="you@gmail.com"
                className={errors.customerEmail ? 'input-error' : ''}
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
              placeholder="e.g. Please ring bell twice or leave with security."
            />
          </div>

          {/* Payment Method Selector */}
          <div className="payment-section">
            <h3>2. Select Payment Method</h3>
            <div className="payment-options">
              <label className={`payment-pill ${paymentMethod === 'upi' ? 'active' : ''}`}>
                <input
                  type="radio"
                  name="paymentMethod"
                  value="upi"
                  checked={paymentMethod === 'upi'}
                  onChange={() => setPaymentMethod('upi')}
                />
                <div className="payment-pill-content">
                  <div className="payment-pill-title">
                    <span className="payment-badge">Instant</span>
                    📱 UPI (QR Code, GPay, PhonePe, Paytm)
                  </div>
                  <span className="payment-pill-desc">Scan dynamic QR code or open UPI app directly</span>
                </div>
              </label>

              <label className={`payment-pill ${paymentMethod === 'cod' ? 'active' : ''}`}>
                <input
                  type="radio"
                  name="paymentMethod"
                  value="cod"
                  checked={paymentMethod === 'cod'}
                  onChange={() => setPaymentMethod('cod')}
                />
                <div className="payment-pill-content">
                  <div className="payment-pill-title">
                    💵 Cash on Delivery (COD)
                  </div>
                  <span className="payment-pill-desc">Pay upon live package arrival at your doorstep</span>
                </div>
              </label>
            </div>

            {/* UPI Details Box */}
            {paymentMethod === 'upi' && (
              <div className="upi-payment-box">
                <div className="upi-qr-wrap">
                  <img
                    src={qrCodeUrl}
                    alt="UPI Payment QR Code"
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
                    ⚡ Open UPI App (GPay / PhonePe / Paytm)
                  </a>

                  <div className="form-group utr-group">
                    <label htmlFor="upiRef">
                      UPI Reference / UTR Number <em>(Optional / recommended after payment)</em>
                    </label>
                    <input
                      id="upiRef"
                      name="upiRef"
                      type="text"
                      value={upiRef}
                      onChange={(e) => setUpiRef(e.target.value)}
                      placeholder="e.g. 431289104812"
                      maxLength={20}
                    />
                    <small className="field-hint">
                      Found on your Google Pay / PhonePe transaction receipt for instant priority dispatch.
                    </small>
                  </div>
                </div>
              </div>
            )}

            {/* COD Details Box */}
            {paymentMethod === 'cod' && (
              <div className="cod-details-box">
                <div className="cod-icon">🚚</div>
                <div className="cod-text">
                  <strong>Cash / UPI on Live Arrival</strong>
                  <p>
                    Your healthy fish are packaged in insulated, oxygenated bags with temperature control.
                    Pay <strong>{formatPrice(total)}</strong> in cash or via UPI to the delivery executive when the package arrives.
                  </p>
                </div>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="btn-primary btn-submit-order"
          >
            {submitting
              ? 'Processing Order...'
              : paymentMethod === 'upi'
              ? `Confirm & Place Order (${formatPrice(total)})`
              : `Place COD Order (${formatPrice(total)})`}
          </button>
        </form>

        <div className="checkout-summary">
          <h3>Order Summary</h3>
          <div className="summary-items">
            {lines.map(({ product, quantity, lineTotal }) => (
              <div key={product.id} className="summary-item">
                <span>{product.name} × {quantity}</span>
                <strong>{formatPrice(lineTotal)}</strong>
              </div>
            ))}
          </div>
          <div className="summary-totals">
            <div className="summary-row">
              <span>Subtotal:</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            <div className="summary-row">
              <span>Safe Climate Shipping:</span>
              <span>{formatPrice(shipping)}</span>
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
          </div>
        </div>
      </div>
    </div>
  )
}
