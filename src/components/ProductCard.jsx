import { Link } from 'react-router-dom'
import { formatPrice } from '../utils/money.js'
import { useCart } from '../context/CartContext.jsx'
import './ProductCard.css'

export default function ProductCard({ product }) {
  const { items, addToCart, updateQuantity } = useCart()

  if (!product) return null

  const cartItem = items.find((it) => it.productId === product.id)
  const cartQty = cartItem?.quantity || 0

  return (
    <div className="product-card">
      <Link to={`/products/${product.id}`} className="product-card-image-link">
        <img src={product.image} alt={product.name} className="product-card-img" />
      </Link>
      <div className="product-card-body">
        <div className="product-badges">
          <span className="badge badge--water">
            {product.productType === 'food' ? 'Fish Food' : product.waterType}
          </span>
          {product.badges?.map((b) => (
            <span key={b} className="badge badge--custom">{b}</span>
          ))}
        </div>
        <h3 className="product-title">
          <Link to={`/products/${product.id}`}>{product.name}</Link>
        </h3>
        <p className="product-price">{formatPrice(product.price)}</p>

        {cartQty === 0 ? (
          <button
            type="button"
            disabled={!product.isAvailable || product.stock <= 0}
            onClick={() => addToCart(product.id, 1)}
            className="btn-primary btn-add-card"
          >
            {product.stock <= 0 ? 'Out of Stock' : '+ Add'}
          </button>
        ) : (
          <div className="card-qty-stepper">
            <button
              type="button"
              className="btn-stepper-btn"
              onClick={() => updateQuantity(product.id, cartQty - 1)}
              aria-label="Decrease quantity"
            >
              −
            </button>
            <span className="stepper-qty-val">{cartQty}</span>
            <button
              type="button"
              className="btn-stepper-btn"
              disabled={cartQty >= product.stock}
              onClick={() => updateQuantity(product.id, cartQty + 1)}
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
