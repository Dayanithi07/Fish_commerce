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

  // Payment method selection: 'razorpay' (default standard gateway) or 'upi_manual'
  const [paymentMethod, setPaymentMethod] = useState('razorpay')
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

  // Store & UPI Configuration
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

  // Helper to persist contact & delivery details to localStorage
  const saveCheckoutDetails = () => {
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
  }

  // Common order finalization helper
  const finalizeOrder = async (orderPayload) => {
    const res = await placeOrder(orderPayload)
    if (!res.ok) {
      if (res.error?.details) {
        setErrors(res.error.details)
      } else {
        alert(res.error?.message || 'Failed to place order in database.')
      }
      return false
    }

    saveCheckoutDetails()
    navigate('/order-success', { state: { order: res.order } })
    return true
  }

  // Form submission dispatcher
  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrors({})

    // Basic shipping info validation
    if (!formData.name?.trim()) {
      setErrors((p) => ({ ...p, customerName: 'Full Name is required.' }))
      return
    }
    if (!formData.email?.trim()) {
      setErrors((p) => ({ ...p, customerEmail: 'Valid Email is required.' }))
      return
    }
    if (!formData.phone?.trim()) {
      setErrors((p) => ({ ...p, customerPhone: 'Phone number is required.' }))
      return
    }
    if (!formData.street?.trim()) {
      setErrors((p) => ({ ...p, street: 'Street address is required.' }))
      return
    }
    if (!formData.city?.trim()) {
      setErrors((p) => ({ ...p, city: 'City is required.' }))
      return
    }
    if (!formData.postalCode?.trim()) {
      setErrors((p) => ({ ...p, postalCode: 'PIN code is required.' }))
      return
    }

    if (paymentMethod === 'razorpay') {
      await handleRazorpayPayment()
    } else {
      await handleManualUpiPayment()
    }
  }

  // 1. Razorpay Standard Checkout Flow
  const handleRazorpayPayment = async () => {
    const keyId = import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_U03LOsD9tLnsmu'

    if (typeof window.Razorpay === 'undefined') {
      alert('Razorpay Checkout SDK is still loading or blocked. Please refresh the page or try UPI QR.')
      return
    }

    setSubmitting(true)

    // Calculate amount in paise (1 INR = 100 paise). Total is in INR.
    const amountInPaise = Math.max(100, Math.round(total * 100))
    const receiptId = `rcpt_${Date.now().toString().slice(-8)}`

    try {
      // Step 1: Call Backend /api/create-order
      const createRes = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amountInPaise,
          currency: 'INR',
          receipt: receiptId,
          notes: {
            customer_name: formData.name,
            customer_email: formData.email,
            customer_phone: formData.phone,
          },
        }),
      })

      const orderData = await createRes.json()

      if (!createRes.ok || !orderData.order_id) {
        throw new Error(orderData.error || 'Failed to initialize payment with Razorpay.')
      }

      // Step 2: Open Razorpay Standard Checkout Modal
      const options = {
        key: keyId,
        amount: orderData.amount,
        currency: orderData.currency || 'INR',
        name: storeName,
        description: 'Live Pet Fish & Aquarium Supplies',
        image: '/images/logo.svg',
        order_id: orderData.order_id,
        prefill: {
          name: formData.name,
          email: formData.email,
          contact: formData.phone,
        },
        theme: {
          color: '#6F3FF5', // Brand purple
        },
        handler: async function (response) {
          // Step 3: Send verification payload to /api/verify-payment
          try {
            const verifyRes = await fetch('/api/verify-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            })

            const verifyData = await verifyRes.json()

            if (!verifyRes.ok || !verifyData.success) {
              setSubmitting(false)
              alert(verifyData.error || 'Payment verification failed. Please contact support.')
              return
            }

            // Signature verified successfully -> Record order in database
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
              paymentMethod: 'Razorpay (Cards/UPI/Netbanking)',
              paymentRef: response.razorpay_payment_id,
            }

            await finalizeOrder(orderPayload)
          } catch (verifyErr) {
            setSubmitting(false)
            alert('Verification network error: ' + (verifyErr.message || 'Please contact support.'))
          }
        },
        modal: {
          ondismiss: function () {
            setSubmitting(false)
          },
        },
      }

      const rzpInstance = new window.Razorpay(options)

      rzpInstance.on('payment.failed', function (resp) {
        setSubmitting(false)
        const reason = resp.error?.description || resp.error?.reason || 'Payment could not be processed.'
        alert(`Payment Failed: ${reason}`)
      })

      rzpInstance.open()
    } catch (err) {
      setSubmitting(false)
      alert(err.message || 'Failed to start payment. Please try again.')
    }
  }

  // 2. Manual Store UPI Reference Flow
  const handleManualUpiPayment = async () => {
    setSubmitting(true)

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
      paymentMethod: 'Direct UPI (QR / App)',
      paymentRef: cleanUtr,
    }

    try {
      await finalizeOrder(orderPayload)
    } finally {
      setSubmitting(false)
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

          {/* Payment Method Selector */}
          <div className="payment-section">
            <h3>
              2. Select Payment Method
              <span className="payment-badge">Secure 256-bit Encrypted</span>
            </h3>

            <div className="payment-methods-grid">
              {/* Option A: Razorpay Standard Checkout */}
              <label
                className={`payment-method-card ${paymentMethod === 'razorpay' ? 'selected' : ''}`}
                onClick={() => setPaymentMethod('razorpay')}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="razorpay"
                  checked={paymentMethod === 'razorpay'}
                  onChange={() => setPaymentMethod('razorpay')}
                  className="payment-method-radio"
                />
                <div className="payment-method-info">
                  <span className="payment-method-title">
                    ⚡ Razorpay Gateway
                  </span>
                  <span className="payment-method-desc">
                    Instant automated verification via UPI, GPay, PhonePe, Cards & Netbanking.
                  </span>
                </div>
              </label>

              {/* Option B: Direct UPI QR / Manual Transfer */}
              <label
                className={`payment-method-card ${paymentMethod === 'upi_manual' ? 'selected' : ''}`}
                onClick={() => setPaymentMethod('upi_manual')}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="upi_manual"
                  checked={paymentMethod === 'upi_manual'}
                  onChange={() => setPaymentMethod('upi_manual')}
                  className="payment-method-radio"
                />
                <div className="payment-method-info">
                  <span className="payment-method-title">
                    📱 Direct UPI QR Code
                  </span>
                  <span className="payment-method-desc">
                    Scan store QR code directly and provide the 12-digit UTR receipt number.
                  </span>
                </div>
              </label>
            </div>

            {/* Razorpay Information Box */}
            {paymentMethod === 'razorpay' && (
              <div className="razorpay-checkout-box">
                <div className="razorpay-box-header">
                  <strong style={{ fontSize: '14px', color: '#1e1b4b' }}>
                    Supported Payment Options:
                  </strong>
                  <div className="razorpay-supported-badges">
                    <span className="rzp-badge">UPI / GPay / PhonePe</span>
                    <span className="rzp-badge">Credit / Debit Cards</span>
                    <span className="rzp-badge">Netbanking</span>
                    <span className="rzp-badge">Paytm / Wallets</span>
                  </div>
                </div>
                <p className="razorpay-instruction">
                  Clicking <strong>"Pay via Razorpay"</strong> below will open the official Razorpay checkout window. Your payment will be verified cryptographically and confirmed automatically.
                </p>
                <div className="razorpay-security-note">
                  🔒 PCI-DSS Level 1 Certified & RBI Regulated Gateway
                </div>
              </div>
            )}

            {/* Direct UPI QR Transfer Box */}
            {paymentMethod === 'upi_manual' && (
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
                      required={paymentMethod === 'upi_manual'}
                    />
                    {errors.upiRef && <span className="field-error">{errors.upiRef}</span>}
                    <small className="field-hint">
                      Enter the 12-digit UTR/Ref from your UPI app receipt to confirm your live livestock dispatch.
                    </small>
                  </div>
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
              ? 'Processing Payment...'
              : paymentMethod === 'razorpay'
              ? `⚡ Pay via Razorpay (${formatPrice(total)})`
              : `Confirm & Place Order (${formatPrice(total)})`}
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
