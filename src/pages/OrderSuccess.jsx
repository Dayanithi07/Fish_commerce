import { useState } from 'react'
import { useLocation, Link } from 'react-router-dom'
import { formatPrice } from '../utils/money.js'
import Modal from '../components/Modal.jsx'
import './OrderSuccess.css'

export default function OrderSuccess() {
  const { state } = useLocation()
  const order = state?.order
  const [showSuccessPopup, setShowSuccessPopup] = useState(Boolean(order))

  return (
    <div className="container order-success-page">
      <Modal
        isOpen={Boolean(order) && showSuccessPopup}
        onClose={() => setShowSuccessPopup(false)}
        title="Payment & Order Confirmation"
      >
        <p role="status">PAYMENT WAS SUCCESSFULLY</p>
        <p role="status">YOUR ORDER WAS ORDERED SUCCESSFULLY</p>
        <button type="button" className="btn-primary" onClick={() => setShowSuccessPopup(false)}>
          Continue
        </button>
      </Modal>
      <div className="success-card">
        <div className="success-icon">✓</div>
        <h1>Order Confirmed!</h1>
        {order ? (
          <>
            <p className="order-ref">Reference: <strong>{order.reference}</strong></p>
            <p>Thank you for choosing Fishcommerce, <strong>{order.customerName}</strong>. Your order is pending fulfillment.</p>

            <div className="order-details-box">
              <h3>Delivery Details</h3>
              <p>{order.street}, {order.city} {order.postalCode}</p>
              <p>Email: {order.customerEmail} | Phone: {order.customerPhone}</p>

              <h3 style={{ marginTop: '16px' }}>Items</h3>
              {order.items.map((item) => (
                <div key={item.productId} className="order-item-row">
                  <span>{item.name} × {item.quantity}</span>
                  <span>{formatPrice(item.price * item.quantity)}</span>
                </div>
              ))}
              <div className="order-total-row">
                <span>Total Paid:</span>
                <strong>{formatPrice(order.total)}</strong>
              </div>
              <p className="payment-confirmation">
                Paid online via {order.paymentProvider || 'Razorpay'} · {order.paymentStatus || 'Paid'}
              </p>
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
