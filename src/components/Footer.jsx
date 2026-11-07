import './Footer.css'

export default function Footer() {
  const handleStartTour = () => {
    window.dispatchEvent(new CustomEvent('start-vp-tour'))
  }

  return (
    <footer className="footer">
      <div className="container footer-inner">
        <p>© 2026 VP Aquarium. Hand-raised, premium pet fish delivered safely.</p>
        <button
          type="button"
          onClick={handleStartTour}
          className="btn-tour-footer"
          aria-label="Take Store Tour"
        >
          💡 Take Store Tour
        </button>
      </div>
    </footer>
  )
}
