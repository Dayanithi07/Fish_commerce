import { Link } from 'react-router-dom'
import { formatPrice } from '../utils/money.js'
import { useCart } from '../context/CartContext.jsx'
import './ProductCard.css'

export default function ProductCard({ product }) {
  const { addToCart } = useCart()

  if (!product) return null

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
        <button
          type="button"
          disabled={!product.isAvailable || product.stock <= 0}
          onClick={() => addToCart(product.id, 1)}
          className="btn-primary btn-add-card"
        >
          {product.stock <= 0 ? 'Out of Stock' : 'Add to Cart'}
        </button>
      </div>
    </div>
  )
}
