import { useMemo, useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Package, Phone, Mail, Search } from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import { useOrders } from '../../context/OrderContext.jsx'
import { formatPrice } from '../../utils/money.js'
import './MyOrders.css'

export default function MyOrders() {
  const { user, isAuthenticated } = useAuth()
  const { getUserOrders, getOrderByReference, fetchOrderByReference } = useOrders()
  const [searchParams] = useSearchParams()
  const [guestLookupRef, setGuestLookupRef] = useState('')
  const [lookupResult, setLookupResult] = useState(null)
  const [lookupSearched, setLookupSearched] = useState(false)
  const [isSearching, setIsSearching] = useState(false)

  const refQuery = searchParams.get('ref')

  // Auto-lookup if ?ref= is present in URL
  useEffect(() => {
    if (refQuery && refQuery.trim()) {
      const cleanRef = refQuery.trim().toUpperCase()
      setGuestLookupRef(cleanRef)
      setLookupSearched(true)

      const syncFound = getOrderByReference(cleanRef)
      if (syncFound) {
        setLookupResult(syncFound)
      } else if (fetchOrderByReference) {
        setIsSearching(true)
        fetchOrderByReference(cleanRef)
          .then((res) => setLookupResult(res || null))
          .finally(() => setIsSearching(false))
      }
    }
  }, [refQuery, getOrderByReference, fetchOrderByReference])

  const myOrders = useMemo(() => {
    if (!isAuthenticated || !user) return []
    return getUserOrders(user.id, user.email)
  }, [isAuthenticated, user, getUserOrders])

  const handleLookup = async (e) => {
    e.preventDefault()
    if (!guestLookupRef.trim()) return
    const cleanRef = guestLookupRef.trim().toUpperCase()
    setLookupSearched(true)

    const syncFound = getOrderByReference(cleanRef)
    if (syncFound) {
      setLookupResult(syncFound)
      return
    }

    if (fetchOrderByReference) {
      setIsSearching(true)
      try {
        const res = await fetchOrderByReference(cleanRef)
        setLookupResult(res || null)
      } finally {
        setIsSearching(false)
      }
    } else {
      setLookupResult(null)
    }
  }

  return (
    <div className="container my-orders-page">
      <div className="orders-header">
        <h1>My Order Details & History</h1>
        <p>Track your live fish deliveries and view historical purchases.</p>
      </div>

      {/* Prominently display tracked order if referenced or searched */}
      {lookupResult && (
        <div className="lookup-result-section" style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <h3 style={{ margin: 0, fontSize: '15px', color: 'var(--accent, #0284c7)' }}>
              Tracked Order: <code>{lookupResult.reference}</code>
            </h3>
            <button
              type="button"
              onClick={() => { setLookupResult(null); setLookupSearched(false); setGuestLookupRef(''); }}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted, #64748b)', cursor: 'pointer', fontSize: '13px', textDecoration: 'underline' }}
            >
              Clear Filter
            </button>
          </div>
          <OrderCard order={lookupResult} />
        </div>
      )}

      {!isAuthenticated ? (
        <div className="guest-lookup-card">
          <h3>Guest Order Tracking</h3>
          <p>Sign in to view your full order history, or look up an order using your reference number (e.g. <code>FC-20261104-XXXX</code>):</p>
          <form onSubmit={handleLookup} className="lookup-form">
            <input
              type="text"
              placeholder="Enter Order Reference (e.g. FC-20261104-A7K3)"
              value={guestLookupRef}
              onChange={(e) => setGuestLookupRef(e.target.value)}
              className="lookup-input"
            />
            <button type="submit" className="btn-primary" disabled={isSearching}>
              {isSearching ? 'Searching...' : 'Track Order'}
            </button>
            <Link to="/auth" className="btn-secondary" style={{ textDecoration: 'none' }}>
              Sign In to Account
            </Link>
          </form>

          {lookupSearched && !isSearching && !lookupResult && (
            <div className="lookup-result-section">
              <div className="no-order-found">
                No order found matching reference "<strong>{guestLookupRef}</strong>". Please verify your reference number.
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="user-orders-list">
          {myOrders.length === 0 && !lookupResult ? (
            <div className="empty-orders-state">
              <Package size={44} strokeWidth={1.5} color="var(--text-muted)" style={{ marginBottom: '8px' }} />
              <h3>No Orders Found Yet</h3>
              <p>You haven't placed any fish orders with this account yet.</p>
              <Link to="/products" className="btn-primary" style={{ marginTop: '16px' }}>
                Explore Fish Catalog
              </Link>
            </div>
          ) : (
            myOrders
              .filter((o) => !lookupResult || o.id !== lookupResult.id)
              .map((order) => <OrderCard key={order.id} order={order} />)
          )}
        </div>
      )}
    </div>
  )
}

function OrderCard({ order }) {
  const statusSteps = ['Pending', 'Confirmed', 'Shipped', 'Delivered']
  const currentStepIdx = statusSteps.indexOf(order.status)

  return (
    <div className="customer-order-card">
      <div className="order-top-bar">
        <div className="order-identity">
          <span className="order-label">Order Reference</span>
          <span className="order-ref-number">{order.reference}</span>
          <span className="order-date-text">
            Placed on {new Date(order.createdAt).toLocaleDateString()} at{' '}
            {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        <div className="order-status-pill-wrap">
          <span className={`status-badge status--${order.status.toLowerCase()}`}>
            {order.status}
          </span>
        </div>
      </div>

      {/* Progress tracker */}
      <div className="order-progress-stepper">
        {statusSteps.map((step, idx) => {
          const isPassed = idx <= currentStepIdx
          const isCurrent = idx === currentStepIdx
          return (
            <div key={step} className={`step-item ${isPassed ? 'completed' : ''} ${isCurrent ? 'current' : ''}`}>
              <div className="step-circle">{isPassed ? '✓' : idx + 1}</div>
              <span className="step-name">{step}</span>
            </div>
          )
        })}
      </div>

      <div className="order-card-body">
        {/* Items list */}
        <div className="order-items-column">
          <h4>Items Ordered ({order.items.reduce((s, i) => s + i.quantity, 0)})</h4>
          <div className="order-items-grid">
            {order.items.map((item, idx) => (
              <div key={idx} className="order-line-item">
                <img src={item.image || '/images/placeholder.svg'} alt={item.name} className="line-item-thumb" />
                <div className="line-item-info">
                  <span className="line-item-name">{item.name}</span>
                  <span className="line-item-qty">Quantity: {item.quantity} × {formatPrice(item.price)}</span>
                </div>
                <span className="line-item-subtotal">
                  {formatPrice(item.price * item.quantity)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Shipping & Payment summary */}
        <div className="order-summary-column">
          <h4>Shipping Address</h4>
          <div className="shipping-address-text">
            <strong>{order.customerName}</strong><br />
            {order.street}<br />
            {order.city}, {order.postalCode}<br />
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
              <Phone size={13} strokeWidth={1.5} />
              <span>{order.customerPhone}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
              <Mail size={13} strokeWidth={1.5} />
              <span>{order.customerEmail}</span>
            </div>
          </div>
          {order.notes && (
            <p className="order-notes-box">
              <strong>Delivery Notes:</strong> {order.notes}
            </p>
          )}

          <div className="order-financials">
            <div className="fin-row">
              <span>Subtotal</span>
              <span>{formatPrice(order.subtotal)}</span>
            </div>
            <div className="fin-row">
              <span>Flat Shipping</span>
              <span>{formatPrice(order.shipping)}</span>
            </div>
            <div className="fin-row fin-total">
              <span>Total</span>
              <strong>{formatPrice(order.total)}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
