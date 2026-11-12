import './PolicyPages.css'
import { useStoreSettings } from '../hooks/useStoreSettings.js'

export default function Privacy() {
  const { settings } = useStoreSettings()

  return (
    <div className="policy-page container">
      <div className="policy-card">
        <h1>Privacy Policy</h1>
        <p className="policy-updated">Last Updated: November 2026</p>

        <section>
          <h2>1. Information We Collect</h2>
          <p>
            When you interact with <strong>{settings.store_name}</strong>, place an order, or create an account, we collect necessary customer details:
          </p>
          <ul>
            <li>Contact details: Name, email address, phone number for delivery notifications.</li>
            <li>Shipping address & landmark for accurate live courier dispatch.</li>
            <li>Order and payment transaction identifiers (UPI UTR / Gateway Order IDs).</li>
          </ul>
        </section>

        <section>
          <h2>2. How We Use Your Data</h2>
          <p>Your personal information is used exclusively to:</p>
          <ul>
            <li>Fulfill, pack, and coordinate livestock delivery with trusted courier services.</li>
            <li>Send order confirmation invoices, live tracking links, and customer support alerts.</li>
            <li>Authenticate user accounts and store admin privileges.</li>
          </ul>
        </section>

        <section>
          <h2>3. Payment Security</h2>
          <p>
            We do not store credit card numbers, debit card PINs, or UPI MPINs on our servers. All digital transactions are processed securely through certified, RBI-compliant payment gateways adhering to PCI-DSS standards with end-to-end encryption.
          </p>
        </section>

        <section>
          <h2>4. Data Sharing & Third Parties</h2>
          <p>
            We strictly do not sell, rent, or trade your personal data. Data is shared solely with certified courier and logistics partners for shipment fulfillment, and notification services (such as transactional email and SMS).
          </p>
        </section>

        <section>
          <h2>5. Your Rights & Contact</h2>
          <p>
            You may request access to, correction of, or deletion of your account data at any time by contacting our privacy officer at:
            <br />
            <strong>Email:</strong> {settings.support_email}
          </p>
        </section>
      </div>
    </div>
  )
}
