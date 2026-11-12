import './PolicyPages.css'
import { useStoreSettings } from '../hooks/useStoreSettings.js'

export default function ShippingPolicy() {
  const { settings } = useStoreSettings()

  return (
    <div className="policy-page container">
      <div className="policy-card">
        <h1>Shipping & Delivery Policy</h1>
        <p className="policy-updated">Last Updated: November 2026</p>

        <section>
          <h2>1. Free Delivery on All Orders</h2>
          <p>
            At <strong>{settings.store_name}</strong>, we offer <strong>Free Delivery & Safe Packaging</strong> across all eligible service pincodes in India. There are no hidden packaging or handling charges at checkout.
          </p>
        </section>

        <section>
          <h2>2. Specialized Live Animal Packaging</h2>
          <p>Every aquatic companion is shipped using professional biological transport standards:</p>
          <ul>
            <li>Heavy-duty 50-micron leak-proof breathable plastic bags filled with medical-grade pure oxygen.</li>
            <li>Custom insulated thermocol / EPS boxes designed to buffer external temperature fluctuations.</li>
            <li>Temperature cooling packs or heating gel packs adjusted based on regional seasonal weather.</li>
            <li>Stress-reducing acclimation conditioning minerals infused in the transport water.</li>
          </ul>
        </section>

        <section>
          <h2>3. Dispatch Days & Schedule</h2>
          <p>
            To prevent packages from being delayed at transit hubs over the weekend, we dispatch live animals on:
          </p>
          <div className="shipping-schedule-card">
            <p><strong>Primary Dispatch Days:</strong> Every Monday, Tuesday, and Wednesday.</p>
            <p><strong>Transit Time:</strong> 24 to 48 hours via Priority Air Courier (Bluedart / DTDC Express / Professional Couriers).</p>
            <p>Orders received Thursday through Sunday are queued for dispatch on Monday to guarantee direct, non-stop transit.</p>
          </div>
        </section>

        <section>
          <h2>4. Tracking & Delivery Updates</h2>
          <p>
            Once dispatched, a live tracking link along with courier AWB numbers are communicated directly to your phone number and registered email address. Please ensure someone is available at the delivery location to receive and acclimate the fish immediately upon arrival.
          </p>
        </section>

        <section>
          <h2>5. Pincode Availability & Weather Holds</h2>
          <p>
            In instances of severe climatic weather (such as extreme heatwaves, cyclones, or heavy monsoons), dispatch may be temporarily placed on weather hold to protect animal welfare. You will be notified in advance regarding the updated dispatch date.
          </p>
        </section>
      </div>
    </div>
  )
}
