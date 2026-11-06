import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import './Videos.css'

const orderSteps = [
  {
    title: 'Choose fish or fish food',
    caption: 'Open Catalog to browse fish, or choose Fish Food to see aquarium foods.',
    screen: 'categories',
  },
  {
    title: 'Pick your products',
    caption: 'Open a product to see its details, then select Add to Cart.',
    screen: 'products',
  },
  {
    title: 'Review your cart',
    caption: 'Check the products and quantities in your cart, then continue to checkout.',
    screen: 'cart',
  },
  {
    title: 'Enter delivery details',
    caption: 'Fill in your contact and delivery information, then place your demo order.',
    screen: 'checkout',
  },
  {
    title: 'Your order is placed',
    caption: 'Keep the order confirmation details for your records.',
    screen: 'complete',
  },
]

function StorefrontScene({ screen }) {
  return (
    <div className={`tutorial-store tutorial-store--${screen}`} aria-hidden="true">
      <div className="tutorial-topbar">
        <span className="tutorial-brand"><span className="tutorial-brand-icon">◉</span> Fishcommerce</span>
        <span className="tutorial-nav">Catalog　 Fish Food　 Care Guide</span>
        <span className="tutorial-cart">🛒 Cart <b>2</b></span>
      </div>

      <div className="tutorial-store-content">
        {screen === 'categories' && (
          <>
            <p className="tutorial-kicker">WELCOME TO FISHCOMMERCE</p>
            <h3>What are you looking for?</h3>
            <div className="tutorial-choice-row">
              <div className="tutorial-choice tutorial-fish-choice">
                <span>🐠</span><strong>Shop Fish</strong><small>Explore the catalog</small>
              </div>
              <div className="tutorial-choice tutorial-food-choice">
                <span>🐟</span><strong>Fish Food</strong><small>Find food for your fish</small>
              </div>
            </div>
          </>
        )}

        {screen === 'products' && (
          <>
            <p className="tutorial-kicker">POPULAR IN THE STORE</p>
            <h3>Find your next favorite</h3>
            <div className="tutorial-product-row">
              <div className="tutorial-product">
                <span className="tutorial-product-art">🐠</span>
                <strong>Colorful tropical fish</strong>
                <small>View details　　₹249</small>
                <span className="tutorial-add-button">Add to Cart　＋</span>
              </div>
              <div className="tutorial-product">
                <span className="tutorial-product-art">🥣</span>
                <strong>Daily fish flakes</strong>
                <small>Fish Food　　₹99</small>
                <span className="tutorial-add-button">Add to Cart　＋</span>
              </div>
            </div>
          </>
        )}

        {screen === 'cart' && (
          <>
            <p className="tutorial-kicker">YOUR SHOPPING CART</p>
            <h3>Review before checkout</h3>
            <div className="tutorial-cart-panel">
              <div><span>🐠　Tropical fish</span><b>₹249</b></div>
              <div><span>🥣　Fish flakes　× 1</span><b>₹99</b></div>
              <div className="tutorial-cart-total"><span>Subtotal</span><b>₹348</b></div>
              <span className="tutorial-add-button">Continue to Checkout　→</span>
            </div>
          </>
        )}

        {screen === 'checkout' && (
          <>
            <p className="tutorial-kicker">ALMOST THERE</p>
            <h3>Delivery details</h3>
            <div className="tutorial-checkout-form">
              <span>Your name</span><span>Email address</span>
              <span>Phone number</span><span>Address</span>
              <b className="tutorial-place-order">Place Demo Order　✓</b>
            </div>
          </>
        )}

        {screen === 'complete' && (
          <div className="tutorial-success">
            <span className="tutorial-success-icon">✓</span>
            <p className="tutorial-kicker">ORDER CONFIRMED</p>
            <h3>Thanks for your order!</h3>
            <p>Your fish and food order is ready.</p>
            <span className="tutorial-add-button">View My Orders</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default function Videos() {
  const [activeStep, setActiveStep] = useState(0)
  const [isPlaying, setIsPlaying] = useState(true)
  const step = orderSteps[activeStep]

  useEffect(() => {
    if (!isPlaying) return undefined

    const timer = window.setInterval(() => {
      setActiveStep((current) => (current + 1) % orderSteps.length)
    }, 5000)

    return () => window.clearInterval(timer)
  }, [isPlaying])

  const goToStep = (index) => {
    setActiveStep((index + orderSteps.length) % orderSteps.length)
  }

  return (
    <div className="container videos-page">
      <header className="videos-header">
        <p className="videos-eyebrow">Fishcommerce video guide</p>
        <h1>How to Order Fish &amp; Food</h1>
        <p>Watch this quick guide to shop and place an order.</p>
      </header>

      <section className="order-video-card" aria-label="Animated ordering tutorial">
        <div className="order-video-player">
          <div className="tutorial-scene" key={step.screen}>
            <StorefrontScene screen={step.screen} />
          </div>
          <div className="tutorial-controls">
            <div className="tutorial-progress" aria-hidden="true">
              <span style={{ width: `${((activeStep + 1) / orderSteps.length) * 100}%` }} />
            </div>
            <div className="tutorial-control-row">
              <div className="tutorial-buttons">
                <button type="button" onClick={() => goToStep(activeStep - 1)} aria-label="Previous step">
                  ‹
                </button>
                <button
                  type="button"
                  onClick={() => setIsPlaying((playing) => !playing)}
                  aria-label={isPlaying ? 'Pause tutorial' : 'Play tutorial'}
                  aria-pressed={isPlaying}
                >
                  {isPlaying ? 'Ⅱ' : '▶'}
                </button>
                <button type="button" onClick={() => goToStep(activeStep + 1)} aria-label="Next step">
                  ›
                </button>
              </div>
              <span className="tutorial-step-count">STEP {activeStep + 1} / {orderSteps.length}</span>
            </div>
          </div>
        </div>

        <div className="order-video-content" aria-live="polite">
          <p className="videos-eyebrow">STEP {activeStep + 1}</p>
          <h2>{step.title}</h2>
          <p className="tutorial-caption">{step.caption}</p>
          <ol className="tutorial-step-list">
            {orderSteps.map((item, index) => (
              <li key={item.screen} className={index === activeStep ? 'is-current' : ''}>
                <button type="button" onClick={() => goToStep(index)}>
                  <span>{index + 1}</span>{item.title}
                </button>
              </li>
            ))}
          </ol>
          <Link to={step.screen === 'categories' ? '/products' : '/products?category=food'} className="btn-primary">
            {step.screen === 'categories' ? 'Start Shopping' : 'Shop Fish Food'}
          </Link>
        </div>
      </section>
    </div>
  )
}
