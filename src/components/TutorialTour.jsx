import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import './TutorialTour.css'

const TOUR_STEPS = [
  {
    badge: 'Welcome',
    icon: '🐟',
    title: 'Welcome to VP Aquarium!',
    description:
      'Discover healthy, hand-raised pet fish, vibrant freshwater species, and premium aquarium foods delivered with expert acclimation care support.',
    highlight: 'header',
    tip: 'Tip: You can replay this tour anytime from the footer or navbar!',
  },
  {
    badge: 'Explore Products',
    icon: '🥣',
    title: 'Live Fish & Specialized Food',
    description:
      'Easily navigate between our live freshwater species (Betta, Tetras, Guppies) and our dedicated Fish Food section with targeted nutritional feeds.',
    highlight: 'nav-categories',
    tip: 'Click "Fish Food" in the menu to filter only aquarium feeds and pellets.',
  },
  {
    badge: 'Smart Steppers & Direct Buy',
    icon: '⚡',
    title: 'Quantity Stepper & 1-Tap Buy',
    description:
      'Use interactive [-] [+] steppers right on product cards. Want just one species immediately? Hit "⚡ Place Order" on any product page to buy only that item without touching your existing cart!',
    highlight: 'stepper-feature',
    tip: 'Single-item direct orders keep your regular cart safe and separate.',
  },
  {
    badge: 'Quick Cart',
    icon: '🛒',
    title: 'Instant Cart Drawer',
    description:
      'Tap the floating cart button anytime to inspect your items, update fish quantities, and proceed to our fast, streamlined checkout.',
    highlight: 'cart-drawer',
    tip: 'Your cart items are automatically saved in your browser.',
  },
  {
    badge: 'Payment & Delivery',
    icon: '📱',
    title: 'Free Delivery & 1-Tap UPI QR',
    description:
      'Zero shipping fees on all orders! Pay effortlessly via GPay, PhonePe, Paytm, or UPI QR code, enter your 12-digit UTR reference, and instantly download your tax invoice.',
    highlight: 'payment-upi',
    tip: 'Your shipping address is securely remembered for subsequent checkouts.',
  },
]

export default function TutorialTour() {
  const [isOpen, setIsOpen] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const navigate = useNavigate()

  // Auto-launch for first-time visitors after a gentle 1.2s delay
  useEffect(() => {
    const hasCompleted = localStorage.getItem('vp_tour_completed')
    if (!hasCompleted) {
      const timer = setTimeout(() => {
        setIsOpen(true)
      }, 1200)
      return () => clearTimeout(timer)
    }
  }, [])

  // Global event listener so user or buttons can trigger the tour anytime
  useEffect(() => {
    const handleTriggerTour = () => {
      setCurrentStep(0)
      setIsOpen(true)
    }
    window.addEventListener('start-vp-tour', handleTriggerTour)
    return () => window.removeEventListener('start-vp-tour', handleTriggerTour)
  }, [])

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') handleClose()
      if (e.key === 'ArrowRight' || e.key === 'Enter') handleNext()
      if (e.key === 'ArrowLeft') handleBack()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, currentStep])

  const handleClose = () => {
    localStorage.setItem('vp_tour_completed', 'true')
    setIsOpen(false)
  }

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1)
    } else {
      handleClose()
      navigate('/products')
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1)
    }
  }

  if (!isOpen) return null

  const step = TOUR_STEPS[currentStep]
  const isLast = currentStep === TOUR_STEPS.length - 1

  return (
    <div className="vp-tour-overlay" role="dialog" aria-modal="true" aria-label="Store Guide Tour">
      <div className="vp-tour-backdrop" onClick={handleClose} />

      <div className="vp-tour-card">
        {/* Top Header */}
        <div className="vp-tour-card-header">
          <span className="vp-tour-badge">
            <span className="vp-tour-pulse-dot" />
            {step.badge}
          </span>
          <button
            type="button"
            className="vp-tour-btn-close"
            onClick={handleClose}
            aria-label="Skip Tour"
          >
            ✕
          </button>
        </div>

        {/* Hero Icon & Title */}
        <div className="vp-tour-visual">
          <div className="vp-tour-icon-wrap">{step.icon}</div>
        </div>

        <h3 className="vp-tour-title">{step.title}</h3>
        <p className="vp-tour-desc">{step.description}</p>

        {step.tip && (
          <div className="vp-tour-tip">
            <span className="vp-tour-tip-icon">💡</span>
            <span className="vp-tour-tip-text">{step.tip}</span>
          </div>
        )}

        {/* Progress Dots */}
        <div className="vp-tour-dots">
          {TOUR_STEPS.map((_, idx) => (
            <button
              key={idx}
              type="button"
              className={`vp-tour-dot ${idx === currentStep ? 'active' : ''}`}
              onClick={() => setCurrentStep(idx)}
              aria-label={`Go to step ${idx + 1}`}
            />
          ))}
        </div>

        {/* Action Controls */}
        <div className="vp-tour-footer">
          <button
            type="button"
            className="vp-tour-btn-skip"
            onClick={handleClose}
          >
            Skip
          </button>

          <div className="vp-tour-nav-btns">
            {currentStep > 0 && (
              <button
                type="button"
                className="vp-tour-btn-back"
                onClick={handleBack}
              >
                ← Back
              </button>
            )}
            <button
              type="button"
              className="btn-primary vp-tour-btn-next"
              onClick={handleNext}
            >
              {isLast ? 'Start Shopping 🚀' : 'Next →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
