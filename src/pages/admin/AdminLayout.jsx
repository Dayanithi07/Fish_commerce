import { useEffect } from 'react'
import { Outlet, NavLink, Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { useOrders } from '../../context/OrderContext.jsx'
import { useToast } from '../../components/Toast.jsx'
import './AdminLayout.css'

export default function AdminLayout() {
  const { isAuthenticated, isAdmin, logout } = useAuth()
  const { latestIncoming, pendingCount } = useOrders()
  const { showToast } = useToast()

  // Cross-tab order notification (FR-ADM-03)
  useEffect(() => {
    if (latestIncoming) {
      showToast(`New order received! [${latestIncoming.reference}]`, { type: 'info' })
    }
  }, [latestIncoming, showToast])

  // Route guard
  if (!isAuthenticated || !isAdmin) {
    return <Navigate to="/auth" replace />
  }

  return (
    <div className="admin-layout">
      <header className="admin-bar">
        <div className="container admin-bar-inner">
          <div className="admin-title-wrap">
            <span className="admin-icon">⚙️</span>
            <span className="admin-title">Admin Management Portal</span>
          </div>

          <nav className="admin-nav">
            <NavLink to="/admin/products" className={({ isActive }) => (isActive ? 'active' : '')}>
              Inventory Products
            </NavLink>
            <NavLink to="/admin/orders" end className={({ isActive }) => (isActive ? 'active' : '')}>
              Active Orders {pendingCount > 0 && <span className="counter-pill">{pendingCount}</span>}
            </NavLink>
            <NavLink to="/admin/orders/history" className={({ isActive }) => (isActive ? 'active' : '')}>
              Delivered History
            </NavLink>
            <NavLink to="/admin/settings" className={({ isActive }) => (isActive ? 'active' : '')}>
              ⚙ Contact & Settings
            </NavLink>
          </nav>

          <div className="admin-user-controls">
            <NavLink to="/" className="admin-store-link">
              ← Storefront
            </NavLink>
            <button type="button" onClick={logout} className="btn-admin-logout">
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="container admin-content">
        <Outlet />
      </main>
    </div>
  )
}
