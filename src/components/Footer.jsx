import { Link } from 'react-router-dom'
import './Footer.css'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <p>© 2026 VP Aquarium. Hand-raised, premium pet fish delivered safely across India.</p>
        <div className="footer-links">
          <Link to="/about">About Us</Link>
          <Link to="/contact">Contact Support</Link>
          <Link to="/shipping-policy">Shipping & Delivery</Link>
          <Link to="/refund-policy">Refund & D.O.A.</Link>
          <Link to="/terms">Terms</Link>
          <Link to="/privacy">Privacy</Link>
        </div>
      </div>
    </footer>
  )
}
