import { useLocation, Link } from 'react-router-dom'
import { formatPrice } from '../utils/money.js'
import './OrderSuccess.css'

export default function OrderSuccess() {
  const { state } = useLocation()
  const order = state?.order

  return (
    <div className="container order-success-page">
      <div className="success-card">
        <div className="success-icon">✓</div>
        <h1>Order Confirmed!</h1>
        {order ? (
          <>
            <p className="order-ref">Reference: <strong>{order.reference}</strong></p>
            <p>Thank you for choosing VP Aquarium, <strong>{order.customerName}</strong>. Your order is pending fulfillment.</p>

            <div className="order-details-box">
              <h3 style={{ marginTop: '16px' }}>Payment & Delivery Details</h3>
              <p><strong>Shipping to:</strong> {order.street}, {order.city} {order.postalCode}</p>
              <p><strong>Contact:</strong> {order.customerEmail} | {order.customerPhone}</p>
              {order.paymentMethod && (
                <p><strong>Payment Method:</strong> {order.paymentMethod}</p>
              )}
              {order.paymentRef && order.paymentRef !== 'COD' && (
                <p><strong>Transaction UTR / Ref:</strong> <code>{order.paymentRef}</code></p>
              )}

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
