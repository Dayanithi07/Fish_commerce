import { useState } from 'react'
import { Mail, Phone, Clock, MapPin, ShieldCheck, CheckCircle2, Send } from 'lucide-react'
import { useStoreSettings } from '../hooks/useStoreSettings.js'
import { useToast } from '../components/Toast.jsx'
import './Contact.css'

export default function Contact() {
  const { settings } = useStoreSettings()
  const { showToast } = useToast()

  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const rawWa = (settings.whatsapp_number || '').replace(/\D/g, '')
  const whatsappNumber = rawWa.length === 10 ? `91${rawWa}` : rawWa
  const whatsappHref = whatsappNumber.length >= 10
    ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent('Hi VP Aquarium, I need help with...')}`
    : null

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name || !form.email || !form.message) {
      showToast('Please fill in all required fields.', { type: 'error' })
      return
    }

    setSubmitting(true)
    try {
      const html = `
        <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 10px;">
          <h2 style="color: #0F172A; margin-top: 0;">New Customer Support Request</h2>
          <p><strong>Name:</strong> ${form.name}</p>
          <p><strong>Email:</strong> ${form.email}</p>
          <p><strong>Subject:</strong> ${form.subject || '(none)'}</p>
          <p><strong>Message:</strong></p>
          <blockquote style="border-left: 3px solid #0284C7; margin: 0; padding: 10px 16px; color: #334155; background: #f8fafc;">
            ${form.message.replace(/\n/g, '<br/>')}
          </blockquote>
          <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 20px 0;" />
          <p style="font-size: 12px; color: #94a3b8;">VP Aquarium Contact Form · Reply to: ${form.email}</p>
        </div>
      `
      await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: settings.support_email,
          subject: `[Support] ${form.subject || 'Customer enquiry'} — from ${form.name}`,
          html,
        }),
      })
      setSubmitted(true)
      setForm({ name: '', email: '', subject: '', message: '' })
      showToast('Message sent! We\'ll reply within 24 hours.', { type: 'success' })
    } catch {
      showToast('Failed to send. Please try WhatsApp instead.', { type: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="contact-page container">
      <div className="contact-header">
        <h1>Contact & Support</h1>
        <p>Have a question about your order, our fish, or delivery? We're here to help.</p>
      </div>

      <div className="contact-grid">
        {/* Left: Contact Info */}
        <div className="contact-info-card">
          <h2>Get in Touch</h2>

          {whatsappHref && (
            <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="whatsapp-contact-btn">
              <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Chat on WhatsApp
            </a>
          )}

          <div className="contact-detail-list">
            <div className="contact-detail-item">
              <span className="contact-icon"><Mail size={16} strokeWidth={1.75} /></span>
              <div>
                <strong>Email Support</strong>
                <a href={`mailto:${settings.support_email}`}>{settings.support_email}</a>
              </div>
            </div>
            <div className="contact-detail-item">
              <span className="contact-icon"><Phone size={16} strokeWidth={1.75} /></span>
              <div>
                <strong>Phone</strong>
                <a href={`tel:${settings.support_phone}`}>{settings.support_phone}</a>
              </div>
            </div>
            <div className="contact-detail-item">
              <span className="contact-icon"><Clock size={16} strokeWidth={1.75} /></span>
              <div>
                <strong>Support Hours</strong>
                <span>{settings.support_hours}</span>
              </div>
            </div>
            <div className="contact-detail-item">
              <span className="contact-icon"><MapPin size={16} strokeWidth={1.75} /></span>
              <div>
                <strong>Location</strong>
                <span>{settings.store_address}</span>
              </div>
            </div>
          </div>

          <div className="live-arrival-note">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <ShieldCheck size={18} strokeWidth={2} color="#059669" />
              <strong>100% Live Arrival Guarantee</strong>
            </div>
            <p>Record your unboxing on video. Claims accepted within 2 hours of delivery. We'll arrange a replacement or full refund.</p>
          </div>
        </div>

        {/* Right: Contact Form */}
        <div className="contact-form-card">
          <h2>Send a Message</h2>
          {submitted ? (
            <div className="contact-success">
              <CheckCircle2 size={44} color="#059669" strokeWidth={1.75} style={{ marginBottom: '12px' }} />
              <h3>Message Received!</h3>
              <p>We'll get back to you at <strong>{form.email || 'your email'}</strong> within 24 hours.</p>
              <button onClick={() => setSubmitted(false)} className="btn-primary">Send another message</button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="contact-form">
              <div className="form-group">
                <label>Full Name *</label>
                <input name="name" type="text" value={form.name} onChange={handleChange} placeholder="Your name" required />
              </div>
              <div className="form-group">
                <label>Email Address *</label>
                <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="you@example.com" required />
              </div>
              <div className="form-group">
                <label>Subject</label>
                <input name="subject" type="text" value={form.subject} onChange={handleChange} placeholder="e.g. Order query, delivery issue..." />
              </div>
              <div className="form-group">
                <label>Message *</label>
                <textarea
                  name="message"
                  value={form.message}
                  onChange={handleChange}
                  placeholder="Describe your query or issue in detail..."
                  rows={5}
                  required
                />
              </div>
              <button type="submit" className="btn-primary contact-submit-btn" disabled={submitting}>
                <Send size={15} strokeWidth={2} style={{ marginRight: '6px' }} />
                <span>{submitting ? 'Sending…' : 'Send Message'}</span>
              </button>
              <p className="contact-form-note">We reply within 24 hours on working days.</p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
