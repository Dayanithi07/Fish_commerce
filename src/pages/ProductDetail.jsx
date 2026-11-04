import { useParams, Link } from 'react-router-dom'
import { useProducts } from '../context/ProductContext.jsx'
import { useCart } from '../context/CartContext.jsx'
import { formatPrice } from '../utils/money.js'
import './ProductDetail.css'

export default function ProductDetail() {
  const { id } = useParams()
  const { getProductById } = useProducts()
  const { addToCart } = useCart()

  const product = getProductById(id)

  if (!product) {
    return (
      <div className="container product-not-found">
        <h2>Product Not Found</h2>
        <p>The fish you are looking for does not exist or has been removed.</p>
        <Link to="/products" className="btn-primary">Back to Catalog</Link>
      </div>
    )
  }

  return (
    <div className="container product-detail-page">
      <div className="detail-grid">
        <div className="detail-media">
          <img src={product.image} alt={product.name} className="detail-img" />
        </div>
        <div className="detail-info">
          <div className="detail-badges">
            <span className="badge badge--water">{product.waterType}</span>
            <span className="badge badge--care">{product.careLevel}</span>
          </div>
          <h1>{product.name}</h1>
          <p className="detail-price">{formatPrice(product.price)}</p>
          <p className="detail-desc">{product.description}</p>

          <div className="spec-table">
            <div className="spec-row">
              <span>Temperament:</span>
              <strong>{product.temperament}</strong>
            </div>
            <div className="spec-row">
              <span>Minimum Tank:</span>
              <strong>{product.minTankSize} Gallons</strong>
            </div>
            <div className="spec-row">
              <span>Diet:</span>
              <strong>{product.diet}</strong>
            </div>
            <div className="spec-row">
              <span>Stock Status:</span>
              <strong className={product.stock > 0 ? 'stock-ok' : 'stock-out'}>
                {product.stock > 0 ? `${product.stock} available` : 'Out of Stock'}
              </strong>
            </div>
          </div>

          <div className="detail-actions">
            <button
              type="button"
              disabled={!product.isAvailable || product.stock <= 0}
              onClick={() => addToCart(product.id, 1)}
              className="btn-primary btn-add-large"
            >
              {product.stock <= 0 ? 'Out of Stock' : 'Add to Cart'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
