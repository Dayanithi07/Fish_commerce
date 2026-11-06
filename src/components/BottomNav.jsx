import { useLocation } from 'react-router-dom'
import { NavLink } from 'react-router-dom'
import { useCart } from '../context/CartContext.jsx'
import './BottomNav.css'

export default function BottomNav() {
  const { itemCount, openCart } = useCart()
  const location = useLocation()

  // Fish Food tab is "active" when on /products?category=food
  const isFoodActive =
    location.pathname === '/products' &&
    new URLSearchParams(location.search).get('category') === 'food'

  // Catalog tab is active when on /products but NOT food
  const isCatalogActive =
    location.pathname === '/products' && !isFoodActive

  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile Bottom Navigation">
      {/* 1. Home */}
      <NavLink
        to="/"
        end
        className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
      >
        <span className="bottom-nav-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        </span>
        <span className="bottom-nav-label">Home</span>
      </NavLink>

      {/* 2. Catalog (fish only — no ?category=food) */}
      <NavLink
        to="/products"
        className={() => `bottom-nav-item ${isCatalogActive ? 'active' : ''}`}
      >
        <span className="bottom-nav-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <path d="M16 10a4 4 0 0 1-8 0" />
          </svg>
        </span>
        <span className="bottom-nav-label">Catalog</span>
      </NavLink>

      {/* 3. Fish Food */}
      <NavLink
        to="/products?category=food"
        className={() => `bottom-nav-item food-tab ${isFoodActive ? 'active' : ''}`}
      >
        <span className="bottom-nav-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
            <path d="M8 12s.5-3 4-3 4 3 4 3" />
            <path d="M9 17c0 0 1-1 3-1s3 1 3 1" />
            <line x1="9" y1="9" x2="9.01" y2="9" />
            <line x1="15" y1="9" x2="15.01" y2="9" />
          </svg>
        </span>
        <span className="bottom-nav-label">Food</span>
      </NavLink>

      {/* 4. Care Guide */}
      <NavLink
        to="/care"
        className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
      >
        <span className="bottom-nav-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
          </svg>
        </span>
        <span className="bottom-nav-label">Care</span>
      </NavLink>

      {/* 5. Cart (replaces About) */}
      <button
        type="button"
        onClick={openCart}
        className="bottom-nav-item bottom-nav-btn"
        aria-label={`Open Cart (${itemCount} items)`}
      >
        <span className="bottom-nav-icon cart-icon-wrap">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="9" cy="21" r="1" />
            <circle cx="20" cy="21" r="1" />
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
          </svg>
          {itemCount > 0 && <span className="bottom-nav-badge">{itemCount}</span>}
        </span>
        <span className="bottom-nav-label">Cart</span>
      </button>
    </nav>
  )
}
