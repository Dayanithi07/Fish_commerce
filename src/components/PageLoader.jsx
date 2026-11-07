import './PageLoader.css'

export default function PageLoader({ text = 'Loading VP Aquarium...' }) {
  return (
    <div className="vp-page-loader" role="status" aria-live="polite">
      <div className="vp-page-spinner">
        <div className="vp-page-ring"></div>
        <div className="vp-page-fish">🐟</div>
      </div>
      <p className="vp-page-text">{text}</p>
    </div>
  )
}
