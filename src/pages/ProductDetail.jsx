import { useParams, Link, useNavigate } from 'react-router-dom'
import { useProducts } from '../context/ProductContext.jsx'
import { useCart } from '../context/CartContext.jsx'
import { formatPrice } from '../utils/money.js'
import './ProductDetail.css'

export default function ProductDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { getProductById } = useProducts()
  const { items, addToCart, updateQuantity } = useCart()

  const product = getProductById(id)

  if (!product) {
    return (
      <div className="container product-not-found">
        <h2>Product Not Found</h2>
        <p>The item you are looking for does not exist or has been removed.</p>
        <Link to="/products" className="btn-primary">Back to Catalog</Link>
      </div>
    )
  }

  const isFood = product.productType === 'food'

  // Cart item quantity check
  const cartItem = items.find((it) => it.productId === product.id)
  const cartQty = cartItem?.quantity || 0

  const handlePlaceOrder = () => {
    // When purchasing directly from product page, check out this product ALONE!
    const checkoutQuantity = cartQty > 0 ? cartQty : 1
    navigate('/checkout', {
      state: {
        directItem: {
          product,
          quantity: checkoutQuantity,
        },
      },
    })
  }

  return (
    <div className="container product-detail-page">
      <div className="detail-grid">
        <div className="detail-media">
          <img src={product.image} alt={product.name} className="detail-img" />
        </div>
        <div className="detail-info">
          <div className="detail-badges">
            <span className="badge badge--water">
              {isFood ? 'Fish Food' : product.waterType}
            </span>
            {!isFood && product.careLevel && (
              <span className="badge badge--care">{product.careLevel}</span>
            )}
            {product.badges?.map((b) => (
              <span key={b} className="badge badge--custom">{b}</span>
            ))}
          </div>

          <h1>{product.name}</h1>
          <p className="detail-price">{formatPrice(product.price)}</p>
          <p className="detail-desc">{product.description}</p>

          <div className="spec-table">
            {!isFood && product.temperament && (
              <div className="spec-row">
                <span>Temperament:</span>
                <strong>{product.temperament}</strong>
              </div>
            )}
            {!isFood && product.minTankSize && (
              <div className="spec-row">
                <span>Minimum Tank:</span>
                <strong>{product.minTankSize} Gallons</strong>
              </div>
            )}
            <div className="spec-row">
              <span>{isFood ? 'Food Type:' : 'Diet:'}</span>
              <strong>{product.diet || 'Aquarium Feed'}</strong>
            </div>
            <div className="spec-row">
              <span>Stock Status:</span>
              <strong className={product.stock > 0 ? 'stock-ok' : 'stock-out'}>
                {product.stock > 0 ? `${product.stock} available` : 'Out of Stock'}
              </strong>
            </div>
          </div>

          <div className="detail-actions">
            {cartQty === 0 ? (
              <button
                type="button"
                disabled={!product.isAvailable || product.stock <= 0}
                onClick={() => addToCart(product.id, 1)}
                className="btn-primary btn-add-large"
              >
                {product.stock <= 0 ? 'Out of Stock' : '+ Add to Cart'}
              </button>
            ) : (
              <div className="detail-qty-stepper">
                <button
                  type="button"
                  className="btn-stepper-btn detail-stepper-btn"
                  onClick={() => updateQuantity(product.id, cartQty - 1)}
                  aria-label="Decrease quantity"
                >
                  −
                </button>
                <span className="stepper-qty-val detail-stepper-val">{cartQty} in Cart</span>
                <button
                  type="button"
                  className="btn-stepper-btn detail-stepper-btn"
                  disabled={cartQty >= product.stock}
                  onClick={() => updateQuantity(product.id, cartQty + 1)}
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>
            )}

            <button
              type="button"
              disabled={!product.isAvailable || product.stock <= 0}
              onClick={handlePlaceOrder}
              className="btn-place-order-large"
            >
              ⚡ Place Order
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
