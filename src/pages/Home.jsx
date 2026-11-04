import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import './Home.css'

export default function Home() {
  const canvasRef = useRef(null)

  // Floating ambient bubble particles
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let animationFrameId

    const resize = () => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }
    resize()
    window.addEventListener('resize', resize)

    // Generate bubbles
    const bubbleCount = 45
    const bubbles = Array.from({ length: bubbleCount }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      radius: Math.random() * 4 + 1.5,
      speedY: Math.random() * 0.8 + 0.3,
      speedX: (Math.random() - 0.5) * 0.3,
      opacity: Math.random() * 0.5 + 0.2,
      wobbleSpeed: Math.random() * 0.03 + 0.01,
      wobbleOffset: Math.random() * Math.PI * 2,
    }))

    let time = 0
    const render = () => {
      time += 1
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      bubbles.forEach((b) => {
        b.y -= b.speedY
        b.x += Math.sin(time * b.wobbleSpeed + b.wobbleOffset) * 0.4 + b.speedX

        // Reset when reaching top
        if (b.y < -10) {
          b.y = canvas.height + 10
          b.x = Math.random() * canvas.width
        }

        ctx.beginPath()
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255, 255, 255, ${b.opacity})`
        ctx.fill()

        // Highlight ring
        ctx.strokeStyle = `rgba(228, 213, 249, ${b.opacity * 0.6})`
        ctx.lineWidth = 0.75
        ctx.stroke()
      })

      animationFrameId = requestAnimationFrame(render)
    }

    render()

    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(animationFrameId)
    }
  }, [])

  return (
    <div className="home-container">
      <section className="hero-cinematic">
        {/* Background Video / Photorealistic Underwater Aquarium */}
        <div className="hero-media-wrapper">
          <video
            autoPlay
            loop
            muted
            playsInline
            poster="/images/hero-bg.jpg"
            className="hero-video"
          >
            <source src="/video/hero-fish.mp4" type="video/mp4" />
          </video>
          <div className="hero-overlay-gradient"></div>
        </div>

        {/* Ambient Rising Bubbles Layer */}
        <canvas ref={canvasRef} className="bubbles-canvas"></canvas>

        {/* Swimming Fish Motion Path (Gracefully swimming across the hero) */}
        <div className="swimming-fish-track" aria-hidden="true">
          <div className="swimming-fish-actor">
            <svg
              className="fish-vector"
              viewBox="0 0 160 90"
              width="150"
              height="85"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="bettaGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ff4588" stopOpacity="0.95" />
                  <stop offset="40%" stopColor="#9b51e0" stopOpacity="0.95" />
                  <stop offset="100%" stopColor="#4361ee" stopOpacity="0.9" />
                </linearGradient>
                <linearGradient id="finGlow" x1="0%" y1="50%" x2="100%" y2="50%">
                  <stop offset="0%" stopColor="#ff70a6" stopOpacity="0.8" />
                  <stop offset="60%" stopColor="#b5179e" stopOpacity="0.65" />
                  <stop offset="100%" stopColor="#3a0ca3" stopOpacity="0.1" />
                </linearGradient>
                <filter id="glowFilter" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="3.5" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Flowing Tail / Dorsal Fin with Flutter Animation */}
              <g className="fish-tail-group">
                <path
                  d="M45 45 C20 15, -10 20, 0 45 C-10 70, 20 75, 45 45 Z"
                  fill="url(#finGlow)"
                  filter="url(#glowFilter)"
                />
                <path
                  d="M50 45 C30 25, 5 30, 15 45 C5 60, 30 65, 50 45 Z"
                  fill="url(#finGlow)"
                />
              </g>

              {/* Flowing Dorsal & Ventral Fins */}
              <path
                className="fish-dorsal-fin"
                d="M60 36 C80 15, 110 18, 120 38 Z"
                fill="url(#finGlow)"
              />
              <path
                className="fish-ventral-fin"
                d="M70 54 C85 75, 115 70, 110 52 Z"
                fill="url(#finGlow)"
              />

              {/* Fish Torso */}
              <ellipse cx="90" cy="45" rx="42" ry="17" fill="url(#bettaGlow)" />

              {/* Head & Gills contour */}
              <path
                d="M115 36 C135 40, 138 48, 126 54 C118 52, 114 44, 115 36 Z"
                fill="#ff4588"
                opacity="0.6"
              />

              {/* Eye */}
              <circle cx="120" cy="42" r="3.5" fill="#ffffff" />
              <circle cx="121" cy="42" r="2" fill="#0d0b21" />
              <circle cx="122" cy="41" r="0.8" fill="#ffffff" />

              {/* Pectoral Fin Flutter */}
              <path
                className="fish-pectoral-fin"
                d="M102 46 C112 55, 96 64, 92 50 Z"
                fill="url(#finGlow)"
                opacity="0.85"
              />
            </svg>
          </div>
        </div>

        {/* Hero Content Layer */}
        <div className="container hero-content-container">
          <div className="hero-text-card">
            {/* Tagline Badge */}
            <div className="hero-badge">
              <span className="badge-icon">🌿</span>
              <span>Live Healthy. Swim Happy.</span>
            </div>

            {/* Main Headline */}
            <h1 className="hero-title">
              Bring Your <span className="title-highlight">Aquarium</span> to Life.
            </h1>

            {/* Subtitle */}
            <p className="hero-subtitle">
              Discover vibrant freshwater and marine fish, carefully selected for your aquarium.
              Find your perfect aquatic companions with expert care tips and compatibility guidance.
            </p>

            {/* Primary Action Buttons */}
            <div className="hero-cta-group">
              <Link to="/products" className="btn-explore-fish">
                <span className="cta-icon">🐟</span>
                <span>Explore Fish</span>
                <span className="cta-arrow">→</span>
              </Link>
              <Link to="/care" className="btn-explore-care">
                <span className="cta-icon">📖</span>
                <span>Explore Care Guides</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom soft ambient mist transition */}
        <div className="hero-bottom-mist"></div>
      </section>
    </div>
  )
}
