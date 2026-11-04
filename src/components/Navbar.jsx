import { Link } from 'react-router-dom'
import { useCart } from '../context/CartContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import './Navbar.css'

export default function Navbar() {
  const { itemCount, openCart } = useCart()
  const { user, isAuthenticated, isAdmin, logout } = useAuth()

  return (
    <header className="navbar">
      <div className="container navbar-inner">
        <Link to="/" className="navbar-brand">
          Fishcommerce
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
              <span>{user.name}</span>
              <button type="button" onClick={logout} className="btn-logout">
                Logout
              </button>
            </div>
          ) : (
            <Link to="/auth" className="btn-login">
              Sign In
            </Link>
          )}
          <button type="button" onClick={openCart} className="btn-cart" aria-label="Open Cart">
            Cart ({itemCount})
          </button>
        </div>
      </div>
    </header>
  )
}
