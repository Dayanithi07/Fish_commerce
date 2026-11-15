import { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useCart } from '../context/CartContext.jsx'
import { useOrders } from '../context/OrderContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { formatPrice } from '../utils/money.js'
import { STORE_NAME } from '../config.js'
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

  // Free safe climate delivery
  const activeSubtotal = directItem
    ? directItem.product.price * (directItem.quantity || 1)
    : subtotal
  const shipping = 0
  const total = activeSubtotal

  const storeName = STORE_NAME || 'VP Aquarium'

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

    await handleRazorpayPayment()
  }

  // Razorpay Standard Checkout Flow
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
        key: orderData.key_id || keyId,
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

          {/* Payment Section - Standard Razorpay Gateway */}
          <div className="payment-section">
            <h3 style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <span>2. Payment via Razorpay</span>
              <span className="payment-badge">Instant Verification</span>
            </h3>

            <div className="razorpay-checkout-box">
              <div className="razorpay-box-header">
                <strong style={{ fontSize: '14px', color: '#1e1b4b' }}>
                  Supported Payment Modes:
                </strong>
                <div className="razorpay-supported-badges">
                  <span className="rzp-badge">UPI / GPay / PhonePe</span>
                  <span className="rzp-badge">Credit / Debit Cards</span>
                  <span className="rzp-badge">Netbanking</span>
                  <span className="rzp-badge">Paytm / Wallets</span>
                </div>
              </div>
              <p className="razorpay-instruction">
                When you click <strong>"Proceed to Pay via Razorpay"</strong>, the secure checkout modal will open with your pre-filled contact details.
              </p>
              <div className="razorpay-security-note">
                🔒 256-Bit Encrypted · PCI-DSS Level 1 Certified · RBI Regulated
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="btn-primary btn-submit-order"
          >
            {submitting
              ? 'Opening Razorpay Secure Checkout...'
              : `Proceed to Pay via Razorpay (${formatPrice(total)})`}
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
