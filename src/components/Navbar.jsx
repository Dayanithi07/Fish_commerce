import { Link } from 'react-router-dom'
import { useCart } from '../context/CartContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import './Navbar.css'

export default function Navbar() {
  const { itemCount, openCart } = useCart()
  const { user, isAuthenticated, isAdmin, logout } = useAuth()

  return (
    <header className="navbar-wrapper">
      <div className="container">
        <div className="navbar-glass-pill">
          <Link to="/" className="navbar-brand">
            <span className="brand-icon">🐟</span>
            <span>Fishcommerce</span>
          </Link>
          <nav className="navbar-links">
            <Link to="/products">Catalog</Link>
            <Link to="/care">Care Guide</Link>
            <Link to="/about">About</Link>
            {isAdmin && <Link to="/admin/products" className="admin-link">Admin Portal</Link>}
          </nav>
          <div className="navbar-actions">
            {isAuthenticated ? (
              <div className="user-profile">
                <span className="user-name">{user.name}</span>
                <button type="button" onClick={logout} className="btn-logout">
                  Logout
                </button>
              </div>
            ) : (
              <Link to="/auth" className="btn-login">
                Sign In
              </Link>
            )}
            <button type="button" onClick={openCart} className="btn-cart-pill" aria-label="Open Cart">
              <span className="cart-icon">🛒</span>
              <span>Cart ({itemCount})</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
