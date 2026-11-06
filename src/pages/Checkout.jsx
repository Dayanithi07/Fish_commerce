import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useCart } from '../context/CartContext.jsx'
import { useOrders } from '../context/OrderContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { formatPrice, toCents } from '../utils/money.js'
import { SHIPPING_FLAT } from '../config.js'
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

  const [errors, setErrors] = useState({})
  const [paymentError, setPaymentError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (lines.length === 0) {
    return (
      <div className="container checkout-empty">
        <h2>Your Cart is Empty</h2>
        <p>Add some fish to your cart before proceeding to checkout.</p>
        <Link to="/products" className="btn-primary">Browse Catalog</Link>
      </div>
    )
  }

  const shipping = SHIPPING_FLAT
  const total = subtotal + shipping

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (submitting) return
    setSubmitting(true)
    setErrors({})
    setPaymentError('')

    const orderPayload = {
      items: lines.map((l) => ({ productId: l.product.id, quantity: l.quantity })),
      expectedTotalCents: toCents(total),
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
    }

    try {
      const res = await placeOrder(orderPayload)
      if (!res.ok) {
        if (res.error?.details) {
          setErrors(res.error.details)
        } else {
          setPaymentError(res.error?.message || 'Unable to complete online payment.')
        }
        return
      }

      navigate('/order-success', { state: { order: res.order } })
    } catch (error) {
      setPaymentError(error.message || 'Unable to complete online payment. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="container checkout-page">
      <h1>Checkout</h1>
      <div className="checkout-layout">
        <form className="checkout-form" onSubmit={handleSubmit}>
          <h3>Contact & Shipping Details</h3>

          <div className="form-group">
            <label htmlFor="name">Full Name</label>
            <input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              className={errors.customerName ? 'input-error' : ''}
            />
            {errors.customerName && <span className="field-error">{errors.customerName}</span>}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                className={errors.customerEmail ? 'input-error' : ''}
              />
              {errors.customerEmail && <span className="field-error">{errors.customerEmail}</span>}
            </div>
            <div className="form-group">
              <label htmlFor="phone">Phone</label>
              <input
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                className={errors.customerPhone ? 'input-error' : ''}
              />
              {errors.customerPhone && <span className="field-error">{errors.customerPhone}</span>}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="street">Address</label>
            <input
              id="street"
              name="street"
              type="text"
              value={formData.street}
              onChange={handleChange}
              className={errors.street ? 'input-error' : ''}
            />
            {errors.street && <span className="field-error">{errors.street}</span>}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="city">City</label>
              <input
                id="city"
                name="city"
                type="text"
                value={formData.city}
                onChange={handleChange}
                className={errors.city ? 'input-error' : ''}
              />
              {errors.city && <span className="field-error">{errors.city}</span>}
            </div>
            <div className="form-group">
              <label htmlFor="postalCode">Postal Code</label>
              <input
                id="postalCode"
                name="postalCode"
                type="text"
                value={formData.postalCode}
                onChange={handleChange}
                className={errors.postalCode ? 'input-error' : ''}
              />
              {errors.postalCode && <span className="field-error">{errors.postalCode}</span>}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="notes">Delivery Notes (Optional)</label>
            <textarea
              id="notes"
              name="notes"
              rows={3}
              value={formData.notes}
              onChange={handleChange}
            />
          </div>

          <div className="payment-notice">
            <h3>Payment</h3>
            <p>Online payment only. Secure checkout is provided by Razorpay. Cash on delivery is not available.</p>
          </div>
          {paymentError && <p className="payment-error" role="alert">{paymentError}</p>}

          <button type="submit" disabled={submitting} className="btn-primary btn-submit-order">
            {submitting ? 'Processing Payment...' : 'Pay Online'}
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
              <span>Flat Shipping:</span>
              <span>{formatPrice(shipping)}</span>
            </div>
            <div className="summary-row total-row">
              <span>Total:</span>
              <strong>{formatPrice(total)}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
