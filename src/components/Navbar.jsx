import { useState } from 'react'
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

  const isHome = location.pathname === '/'

  const closeMenu = () => setMobileMenuOpen(false)

  return (
    <header className={`navbar-wrapper ${isHome ? 'navbar--hero' : 'navbar--standard'}`}>
      <div className="container">
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
            <NavLink to="/products" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              Catalog
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
              <NavLink to="/" end onClick={closeMenu} className={({ isActive }) => `mobile-link ${isActive ? 'active' : ''}`}>
                Home
              </NavLink>
              <NavLink to="/products" onClick={closeMenu} className={({ isActive }) => `mobile-link ${isActive ? 'active' : ''}`}>
                Catalog
              </NavLink>
              <NavLink to="/care" onClick={closeMenu} className={({ isActive }) => `mobile-link ${isActive ? 'active' : ''}`}>
                Care Guide
              </NavLink>
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
