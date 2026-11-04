import './Care.css'

export default function Care() {
  return (
    <div className="container care-page">
      <h1>Aquarium Care & Acclimation Guide</h1>
      <div className="care-card">
        <h3>1. The Floating Bag Method (Drip Acclimation)</h3>
        <p>Float the sealed fish bag in your aquarium for 15 minutes to equalize water temperature before introducing tank water incrementally.</p>
      </div>
      <div className="care-card">
        <h3>2. Nitrogen Cycle & Water Parameters</h3>
        <p>Ensure your tank is fully cycled. Test ammonia (0 ppm), nitrite (0 ppm), and nitrates (&lt;20 ppm) before introducing livestock.</p>
      </div>
      <div className="care-card">
        <h3>3. Feeding & Dietary Routines</h3>
        <p>Feed only what fish can consume within 2 minutes. High quality sinking pellets for bottom dwellers and micro flakes for schooling tetras.</p>
      </div>
    </div>
  )
}
