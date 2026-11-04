import { useOrders } from '../../context/OrderContext.jsx'
import { formatPrice } from '../../utils/money.js'
import './AdminOrders.css'

export default function AdminOrders({ view = 'pending' }) {
  const { activeOrders, deliveredOrders, updateOrderStatus } = useOrders()

  const displayedOrders = view === 'history' ? deliveredOrders : activeOrders

  const nextStepMap = {
    Pending: 'Confirmed',
    Confirmed: 'Shipped',
    Shipped: 'Delivered',
  }

  return (
    <div className="admin-orders-page">
      <h2>{view === 'history' ? 'Delivered Order History' : 'Active Orders'} ({displayedOrders.length})</h2>

      {displayedOrders.length === 0 ? (
        <p className="no-orders">No orders currently in this view.</p>
      ) : (
        <div className="orders-list">
          {displayedOrders.map((order) => (
            <div key={order.id} className="order-admin-card">
              <div className="order-admin-header">
                <div>
                  <span className="order-ref-badge">{order.reference}</span>
                  <span className="order-date">{new Date(order.createdAt).toLocaleString()}</span>
                </div>
                <div className="order-header-right">
                  <span className={`order-status-badge status--${order.status.toLowerCase()}`}>
                    {order.status}
                  </span>
                  {nextStepMap[order.status] && (
                    <button
                      type="button"
                      onClick={() => updateOrderStatus(order.id, nextStepMap[order.status])}
                      className="btn-status-advance"
                    >
                      Advance to {nextStepMap[order.status]} →
                    </button>
                  )}
                </div>
              </div>

              <div className="order-admin-body">
                <div className="customer-info-col">
                  <strong>Customer:</strong> {order.customerName} ({order.customerEmail}, {order.customerPhone})<br />
                  <strong>Shipping to:</strong> {order.street}, {order.city} {order.postalCode}
                  {order.notes && <p className="admin-order-notes"><em>Note: {order.notes}</em></p>}
                </div>
                <div className="items-info-col">
                  {order.items.map((item) => (
                    <div key={item.productId} className="order-sub-item">
                      <span>{item.name} × {item.quantity}</span>
                      <span>{formatPrice(item.price * item.quantity)}</span>
                    </div>
                  ))}
                  <div className="order-admin-total">
                    <span>Total:</span>
                    <strong>{formatPrice(order.total)}</strong>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
