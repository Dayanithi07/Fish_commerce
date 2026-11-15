import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import './Home.css'

export default function Home() {
  return (
    <div className="home-container">
      <section className="hero-cinematic">
        {/* Serene Underwater Video Background */}
        <div className="hero-media-wrapper">
          <video
            autoPlay
            loop
            muted
            playsInline
            className="hero-video"
          >
            <source src="/video/hero-fish.mp4" type="video/mp4" />
          </video>
          <div className="hero-overlay-gradient"></div>
        </div>

        {/* Hero Content Layer */}
        <div className="container hero-content-container">
          <div className="hero-text-card">
            {/* Crisp High-Contrast Headline */}
            <h1 className="hero-title">
              Bring Your Aquarium to Life.
            </h1>

            {/* Subtitle */}
            <p className="hero-subtitle">
              Discover healthy freshwater and marine fish, hand-selected for thriving aquariums.
              Find your ideal aquatic companions with expert care and compatibility guidance.
            </p>

            {/* Primary Action Buttons */}
            <div className="hero-cta-group">
              <Link to="/products" className="btn-explore-fish">
                <span>Explore Fish</span>
                <ArrowRight size={16} strokeWidth={2} className="cta-arrow" />
              </Link>
              <Link to="/care" className="btn-explore-care">
                <span>Care Guides</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom soft ambient transition to page background */}
        <div className="hero-bottom-mist"></div>
      </section>
    </div>
  )
}
