import { Link } from 'react-router-dom'
import { useCart } from '../context/CartContext.jsx'
import { formatPrice } from '../utils/money.js'
import './CartDrawer.css'

export default function CartDrawer() {
  const { isOpen, closeCart, lines, updateQuantity, removeFromCart, subtotal } = useCart()

  if (!isOpen) return null

  return (
    <div className="cart-drawer-overlay" onClick={closeCart}>
      <aside className="cart-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="cart-drawer-header">
          <h2>Your Cart</h2>
          <button type="button" onClick={closeCart} className="cart-drawer-close">
            ×
          </button>
        </div>

        <div className="cart-drawer-items">
          {lines.length === 0 ? (
            <p className="cart-empty">Your cart is empty.</p>
          ) : (
            lines.map(({ product, quantity, lineTotal }) => (
              <div key={product.id} className="cart-drawer-item">
                <div className="item-details">
                  <h4>{product.name}</h4>
                  <p>{formatPrice(product.price)} each</p>
                  <div className="item-qty-row">
                    <button type="button" onClick={() => updateQuantity(product.id, quantity - 1)}>-</button>
                    <span>{quantity}</span>
                    <button type="button" onClick={() => updateQuantity(product.id, quantity + 1)}>+</button>
                    <button type="button" onClick={() => removeFromCart(product.id)} className="btn-remove">Remove</button>
                  </div>
                </div>
                <div className="item-total">
                  {formatPrice(lineTotal)}
                </div>
              </div>
            ))
          )}
        </div>

        {lines.length > 0 && (
          <div className="cart-drawer-footer">
            <div className="subtotal-row">
              <span>Subtotal:</span>
              <strong>{formatPrice(subtotal)}</strong>
            </div>
            <Link to="/checkout" onClick={closeCart} className="btn-primary btn-checkout">
              Proceed to Checkout
            </Link>
          </div>
        )}
      </aside>
    </div>
  )
}
