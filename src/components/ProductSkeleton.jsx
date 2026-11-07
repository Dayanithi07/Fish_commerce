import './ProductSkeleton.css'

export default function ProductSkeleton({ count = 6 }) {
  const items = Array.from({ length: count }, (_, i) => i)

  return (
    <div className="products-grid skeleton-grid" aria-busy="true" aria-label="Loading products">
      {items.map((key) => (
        <div key={key} className="product-skeleton-card">
          <div className="skeleton-image-wrapper">
            <div className="skeleton-shimmer"></div>
          </div>
          <div className="skeleton-body">
            <div className="skeleton-badges">
              <span className="skeleton-badge skeleton-pill"></span>
              <span className="skeleton-badge skeleton-pill"></span>
            </div>
            <div className="skeleton-line skeleton-title"></div>
            <div className="skeleton-line skeleton-desc"></div>
            <div className="skeleton-footer">
              <div className="skeleton-line skeleton-price"></div>
              <div className="skeleton-btn"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
