import { useState, useRef, useEffect } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useCart } from '../context/CartContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import LogoSVG from './LogoSVG.jsx'
import './Navbar.css'

export default function Navbar() {
  const { itemCount, openCart } = useCart()
  const { user, isAuthenticated, isAdmin, logout } = useAuth()
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const drawerRef = useRef(null)

  const isHome = location.pathname === '/'

  const closeMenu = () => setMobileMenuOpen(false)

  // Close drawer when clicking outside
  useEffect(() => {
    if (!mobileMenuOpen) return
    function handleOutside(e) {
      if (drawerRef.current && !drawerRef.current.contains(e.target)) {
        closeMenu()
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [mobileMenuOpen])

  return (
    <header className={`navbar-wrapper ${isHome ? 'navbar--hero' : 'navbar--standard'}`}>
      <div className="container" ref={drawerRef}>
        <div className="navbar-glass-pill">
          {/* Brand Logo */}
          <Link to="/" className="navbar-brand" onClick={closeMenu}>
            <LogoSVG size={32} className="brand-logo-svg" />
            <span>Fishcommerce</span>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="navbar-links">
            <NavLink to="/" end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              Home
            </NavLink>
            <NavLink to="/products" end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              Catalog
            </NavLink>
            <NavLink
              to="/products?category=food"
              className={({ isActive }) => {
                const isFoodActive =
                  location.pathname === '/products' &&
                  new URLSearchParams(location.search).get('category') === 'food'
                return `nav-link ${isFoodActive ? 'active' : ''}`
              }}
            >
              Fish Food
            </NavLink>
            <NavLink to="/care" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              Care Guide
            </NavLink>
            <NavLink to="/about" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              About
            </NavLink>
            {isAuthenticated && !isAdmin && (
              <NavLink to="/orders" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                My Orders
              </NavLink>
            )}
            {isAdmin && (
              <NavLink to="/admin/products" className={({ isActive }) => `admin-link ${isActive ? 'active' : ''}`}>
                Admin Portal
              </NavLink>
            )}
          </nav>

          {/* Right Action Area */}
          <div className="navbar-actions">
            {/* Cart Button — always visible on non-home pages (desktop) */}
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

            {/* Sign In / Profile — desktop only; on mobile shown inside drawer */}
            <div className="desktop-auth">
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
            </div>

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

        {/* Mobile Dropdown Menu — shows user profile + logout only; nav is in BottomNav */}
        {mobileMenuOpen && (
          <div className="mobile-menu-drawer">
            {/* User profile section at top */}
            {isAuthenticated ? (
              <div className="drawer-profile">
                <div className="drawer-avatar">
                  {user.name?.charAt(0).toUpperCase()}
                </div>
                <div className="drawer-user-info">
                  <span className="drawer-user-name">{user.name}</span>
                  <span className="drawer-user-email">{user.email}</span>
                </div>
              </div>
            ) : (
              <Link to="/auth" onClick={closeMenu} className="drawer-signin-btn">
                Sign In / Create Account
              </Link>
            )}

            <div className="drawer-divider" />

            {/* Quick nav links for things not in bottom bar */}
            <nav className="mobile-links">
              <NavLink to="/about" onClick={closeMenu} className={({ isActive }) => `mobile-link ${isActive ? 'active' : ''}`}>
                About
              </NavLink>
              {isAuthenticated && !isAdmin && (
                <NavLink to="/orders" onClick={closeMenu} className={({ isActive }) => `mobile-link ${isActive ? 'active' : ''}`}>
                  My Orders
                </NavLink>
              )}
              {isAdmin && (
                <NavLink to="/admin/products" onClick={closeMenu} className={({ isActive }) => `admin-link mobile-link ${isActive ? 'active' : ''}`}>
                  Admin Portal
                </NavLink>
              )}
            </nav>

            {/* Logout at the bottom of drawer */}
            {isAuthenticated && (
              <>
                <div className="drawer-divider" />
                <button
                  type="button"
                  className="drawer-logout-btn"
                  onClick={() => { logout(); closeMenu() }}
                >
                  <span>🚪</span> Logout
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  )
}
