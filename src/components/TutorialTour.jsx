import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Fish, Utensils, Zap, ShoppingCart, CreditCard, Sparkles, X } from 'lucide-react'
import './TutorialTour.css'

const TOUR_STEPS = [
  {
    badge: 'Welcome',
    icon: Fish,
    title: 'Welcome to VP Aquarium',
    description:
      'Discover healthy, hand-raised pet fish, vibrant freshwater species, and premium aquarium foods delivered with expert acclimation care support.',
    highlight: 'header',
    tip: 'You can replay this tour anytime from the footer or navbar.',
  },
  {
    badge: 'Explore Products',
    icon: Utensils,
    title: 'Live Fish & Specialized Food',
    description:
      'Easily navigate between our live freshwater species (Betta, Tetras, Guppies) and our dedicated Fish Food section with targeted nutritional feeds.',
    highlight: 'nav-categories',
    tip: 'Click "Fish Food" in the menu to filter only aquarium feeds and pellets.',
  },
  {
    badge: 'Smart Steppers & Direct Buy',
    icon: Zap,
    title: 'Quantity Stepper & Direct Buy',
    description:
      'Use interactive quantity steppers right on product cards. Want just one species immediately? Hit "Place Order" on any product page to buy only that item without touching your existing cart.',
    highlight: 'stepper-feature',
    tip: 'Single-item direct orders keep your regular cart safe and separate.',
  },
  {
    badge: 'Quick Cart',
    icon: ShoppingCart,
    title: 'Instant Cart Drawer',
    description:
      'Tap the cart button anytime to inspect your items, update fish quantities, and proceed to our fast, streamlined checkout.',
    highlight: 'cart-drawer',
    tip: 'Your cart items are automatically saved in your browser.',
  },
  {
    badge: 'Payment & Delivery',
    icon: CreditCard,
    title: 'Free Delivery & Secure Checkout',
    description:
      'Zero shipping fees on all orders! Pay effortlessly via UPI, Cards, Netbanking or Wallets with RBI-regulated Razorpay checkout, and instantly download your tax invoice.',
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

  // Listen for manual trigger (from footer link or navbar button)
  useEffect(() => {
    const handleStartTour = () => {
      setCurrentStep(0)
      setIsOpen(true)
    }
    window.addEventListener('start-vp-tour', handleStartTour)
    return () => window.removeEventListener('start-vp-tour', handleStartTour)
  }, [])

  // Lock body scroll when modal is active
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen) return null

  const step = TOUR_STEPS[currentStep]
  const isLast = currentStep === TOUR_STEPS.length - 1
  const StepIcon = step.icon

  const handleNext = () => {
    if (isLast) {
      handleComplete()
    } else {
      setCurrentStep((prev) => prev + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1)
    }
  }

  const handleClose = () => {
    setIsOpen(false)
    localStorage.setItem('vp_tour_completed', 'true')
  }

  const handleComplete = () => {
    handleClose()
    navigate('/products')
  }

  return (
    <div className="vp-tour-overlay" role="dialog" aria-modal="true" aria-label="Store Guide">
      <div className="vp-tour-backdrop" onClick={handleClose} />
      <div className="vp-tour-card">
        {/* Top Header Badge & Close */}
        <div className="vp-tour-header">
          <span className="vp-tour-step-badge">
            {step.badge} · {currentStep + 1} of {TOUR_STEPS.length}
          </span>
          <button
            type="button"
            className="vp-tour-close-btn"
            onClick={handleClose}
            aria-label="Skip Tour"
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        {/* Hero Icon & Title */}
        <div className="vp-tour-visual">
          <div className="vp-tour-icon-wrap">
            <StepIcon size={26} strokeWidth={1.75} color="var(--accent)" />
          </div>
        </div>

        <h3 className="vp-tour-title">{step.title}</h3>
        <p className="vp-tour-desc">{step.description}</p>

        {step.tip && (
          <div className="vp-tour-tip">
            <Sparkles size={14} strokeWidth={1.75} className="vp-tour-tip-icon" />
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
              {isLast ? 'Start Shopping' : 'Next →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
