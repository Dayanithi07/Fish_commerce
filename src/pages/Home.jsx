import { Link } from 'react-router-dom'
import { useProducts } from '../context/ProductContext.jsx'
import ProductCard from '../components/ProductCard.jsx'
import './Home.css'

export default function Home() {
  const { availableProducts } = useProducts()
  const featured = availableProducts.slice(0, 4)

  return (
    <div className="home-page">
      <section className="hero container">
        <div className="hero-content">
          <h1>Healthy, Hand-Raised Pet Fish Delivered to Your Door</h1>
          <p>
            Ethically bred freshwater and marine species with complete tank setup and water compatibility guidance.
          </p>
          <div className="hero-actions">
            <Link to="/products" className="btn-primary">
              Explore Catalog
            </Link>
            <Link to="/care" className="btn-care">
              View Care Guide
            </Link>
          </div>
        </div>
      </section>

      <section className="featured container">
        <h2>Featured Species</h2>
        <div className="products-grid">
          {featured.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>
    </div>
  )
}
