import './PolicyPages.css'
import { useStoreSettings } from '../hooks/useStoreSettings.js'

export default function Terms() {
  const { settings } = useStoreSettings()

  return (
    <div className="policy-page container">
      <div className="policy-card">
        <h1>Terms & Conditions</h1>
        <p className="policy-updated">Last Updated: November 2026</p>

        <section>
          <h2>1. Introduction</h2>
          <p>
            Welcome to <strong>{settings.store_name}</strong>. By accessing our website, purchasing live livestock, aquarium equipment, or fish food products, you agree to be bound by these Terms and Conditions. Please review them carefully before placing an order.
          </p>
        </section>

        <section>
          <h2>2. Live Animal & Product Eligibility</h2>
          <p>
            Our ornamental fish, aquatic pets, and invertebrates are hand-raised, quarantined, and inspected for peak health prior to dispatch. Customers must ensure their aquariums are cycled and prepared with adequate water volume, filtration, and water parameters suitable for the species ordered.
          </p>
        </section>

        <section>
          <h2>3. Pricing & Payment</h2>
          <p>
            All prices listed are in Indian Rupees (₹ INR). We accept instant UPI payments, Netbanking, Credit/Debit cards, and verified digital payment methods via our secure payment gateway. We reserve the right to correct pricing errors or cancel orders resulting from typographical inaccuracies.
          </p>
        </section>

        <section>
          <h2>4. Livestock Shipping & Dispatch</h2>
          <p>
            Due to the delicate nature of live pet fish, dispatch schedules depend on weather and transport logistics to guarantee safe delivery. Please refer to our <strong>Shipping & Delivery Policy</strong> for comprehensive dispatch schedules and acclimation guidelines.
          </p>
        </section>

        <section>
          <h2>5. Limitation of Liability</h2>
          <p>
            {settings.store_name} shall not be held liable for losses occurring after successful acclimation and delivery of livestock into improper tank environments, mixed with aggressive species, or exposed to inappropriate water conditions.
          </p>
        </section>

        <section>
          <h2>6. Contact & Grievance Redressal</h2>
          <p>
            For any queries or formal notices concerning these terms, please contact:
            <br />
            <strong>Email:</strong> {settings.support_email}
            <br />
            <strong>Phone:</strong> {settings.support_phone}
            <br />
            <strong>Operating Location:</strong> {settings.store_address}
          </p>
        </section>
      </div>
    </div>
  )
}
