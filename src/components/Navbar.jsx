import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useCart } from '../context/CartContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import './Navbar.css'

export default function Navbar() {
  const { itemCount, openCart } = useCart()
  const { user, isAuthenticated, isAdmin, logout } = useAuth()
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const isHome = location.pathname === '/'

  const closeMenu = () => setMobileMenuOpen(false)

  return (
    <header className={`navbar-wrapper ${isHome ? 'navbar--hero' : 'navbar--standard'}`}>
      <div className="container">
        <div className="navbar-glass-pill">
          {/* Brand Logo */}
          <Link to="/" className="navbar-brand" onClick={closeMenu}>
            <span className="brand-icon">🐟</span>
            <span>Fishcommerce</span>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="navbar-links">
            <Link to="/products">Catalog</Link>
            <Link to="/care">Care Guide</Link>
            <Link to="/about">About</Link>
            {isAuthenticated && !isAdmin && (
              <Link to="/orders">My Orders</Link>
            )}
            {isAdmin && (
              <Link to="/admin/products" className="admin-link">
                Admin Portal
              </Link>
            )}
          </nav>

          {/* Right Action Area */}
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

            {/* Cart Button: Hidden on Home/Hero, visible on all other pages */}
            {!isHome && (
              <button
                type="button"
                onClick={openCart}
                className="btn-cart-pill"
                aria-label="Open Cart"
              >
                <span className="cart-icon">🛒</span>
                <span>Cart ({itemCount})</span>
              </button>
            )}

            {/* Mobile Hamburger Toggle Button */}
            <button
              type="button"
              className="navbar-hamburger"
              aria-label="Toggle Navigation Menu"
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen((prev) => !prev)}
            >
              <span className={`bar ${mobileMenuOpen ? 'open' : ''}`}></span>
              <span className={`bar ${mobileMenuOpen ? 'open' : ''}`}></span>
              <span className={`bar ${mobileMenuOpen ? 'open' : ''}`}></span>
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="mobile-menu-drawer">
            <nav className="mobile-links">
              <Link to="/" onClick={closeMenu}>Home</Link>
              <Link to="/products" onClick={closeMenu}>Catalog</Link>
              <Link to="/care" onClick={closeMenu}>Care Guide</Link>
              <Link to="/about" onClick={closeMenu}>About</Link>
              {isAuthenticated && !isAdmin && (
                <Link to="/orders" onClick={closeMenu}>My Orders</Link>
              )}
              {isAdmin && (
                <Link to="/admin/products" onClick={closeMenu} className="admin-link">
                  Admin Portal
                </Link>
              )}
              {!isHome && (
                <button
                  type="button"
                  onClick={() => {
                    closeMenu()
                    openCart()
                  }}
                  className="btn-cart-pill mobile-cart-btn"
                >
                  <span className="cart-icon">🛒</span>
                  <span>View Cart ({itemCount})</span>
                </button>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}
