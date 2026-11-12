import './PolicyPages.css'
import { useStoreSettings } from '../hooks/useStoreSettings.js'

export default function RefundPolicy() {
  const { settings } = useStoreSettings()

  return (
    <div className="policy-page container">
      <div className="policy-card">
        <h1>Refund & Cancellation Policy</h1>
        <p className="policy-updated">Last Updated: November 2026</p>

        <div className="policy-highlight-banner">
          <h3>🐟 100% Live Arrival Guarantee (D.O.A. Policy)</h3>
          <p>
            We take utmost care in climate-controlled oxygen packing for all our livestock. In the unfortunate event that any fish arrives Dead on Arrival (D.O.A.), we guarantee an immediate replacement or full refund under the terms below.
          </p>
        </div>

        <section>
          <h2>1. Live Arrival Guarantee Requirements</h2>
          <p>To claim under our Live Arrival Guarantee:</p>
          <ol>
            <li>
              <strong>Record an Unboxing Video:</strong> Please record a continuous, unedited video of the parcel unboxing showing the shipping label and the intact, unopened fish bag.
            </li>
            <li>
              <strong>2-Hour Reporting Window:</strong> Send the unboxing video and clear photographs to our support team via WhatsApp (<strong>+{settings.whatsapp_number}</strong>) or email (<strong>{settings.support_email}</strong>) within <strong>2 hours of confirmed delivery</strong>.
            </li>
            <li>
              <strong>Resolution:</strong> Once verified, we will issue a 100% refund for the deceased specimen(s) or dispatch a replacement with our next shipment without extra livestock charge.
            </li>
          </ol>
        </section>

        <section>
          <h2>2. Order Cancellations</h2>
          <ul>
            <li>
              <strong>Prior to Packing:</strong> Orders can be cancelled free of charge if requested before the fish have entered our 24-hour pre-dispatch fasting and packaging quarantine.
            </li>
            <li>
              <strong>After Packing / Dispatch:</strong> Once live animals are packaged with oxygen and handed over to express priority couriers, cancellations cannot be accepted.
            </li>
          </ul>
        </section>

        <section>
          <h2>3. Non-Live Goods (Food & Accessories)</h2>
          <p>
            Dry aquarium food and equipment can be returned within <strong>7 days</strong> of delivery if unopened, sealed, and in original packaging. Return shipping costs for change-of-mind returns are borne by the customer.
          </p>
        </section>

        <section>
          <h2>4. Refund Processing Timelines</h2>
          <p>
            Approved refunds are credited back to the original payment source (UPI account or bank card) within <strong>3 to 5 business days</strong> from approval.
          </p>
        </section>
      </div>
    </div>
  )
}
