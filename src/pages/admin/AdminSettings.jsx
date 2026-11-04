import { useState } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import { SUPER_ADMIN, DEMO_ADMIN } from '../../config.js'
import { ADMIN_EMAIL } from '../../services/notificationService.js'
import { isSupabaseConfigured } from '../../lib/supabase.js'
import { useToast } from '../../components/Toast.jsx'
import './AdminSettings.css'

export default function AdminSettings() {
  const { user, addAdmin, removeAdmin, registeredAdmins } = useAuth()
  const { showToast } = useToast()

  // Contact info state
  const [notificationEmail, setNotificationEmail] = useState(ADMIN_EMAIL)
  const [adminPhone, setAdminPhone] = useState('+1 (555) 382-7474')
  const [supportHours, setSupportHours] = useState('Mon - Sat: 9:00 AM - 6:00 PM EST')
  const [savedContact, setSavedContact] = useState(false)

  // New admin form state
  const [newAdmin, setNewAdmin] = useState({ name: '', email: '', password: '' })
  const [creatingAdmin, setCreatingAdmin] = useState(false)
  const [adminError, setAdminError] = useState('')

  const handleSaveContact = (e) => {
    e.preventDefault()
    setSavedContact(true)
    showToast('Admin contact preferences updated successfully!', { type: 'success' })
    setTimeout(() => setSavedContact(false), 3000)
  }

  const handleCreateAdmin = async (e) => {
    e.preventDefault()
    setAdminError('')
    setCreatingAdmin(true)

    try {
      const res = await addAdmin(newAdmin)
      if (!res.ok) {
        setAdminError(res.error?.message || 'Failed to create admin.')
        return
      }

      showToast(`Admin account created for ${newAdmin.name}!`, { type: 'success' })
      setNewAdmin({ name: '', email: '', password: '' })
    } finally {
      setCreatingAdmin(false)
    }
  }

  const handleRemove = (email, name) => {
    if (window.confirm(`Are you sure you want to revoke admin privileges for ${name} (${email})?`)) {
      const res = removeAdmin(email)
      if (res.ok) {
        showToast(`Revoked admin access for ${name}.`, { type: 'info' })
      } else {
        showToast(res.error?.message || 'Could not remove admin.', { type: 'error' })
      }
    }
  }

  return (
    <div className="admin-settings-page">
      <div className="settings-header">
        <h1>Admin Control & Notification Center</h1>
        <p>Manage store administrators, credentials, email notification relays, and database connections.</p>
      </div>

      <div className="settings-grid">
        {/* Left Column: Admin Profile & Contact Info */}
        <div className="settings-card">
          <h2>Store Administrator Info</h2>
          <p className="card-desc">
            Primary administrative contact displayed on customer order summaries and store support channels.
          </p>

          <form onSubmit={handleSaveContact}>
            <div className="form-group">
              <label>Authenticated Admin Email (Current Session)</label>
              <div className="verified-email-field">
                <input
                  type="email"
                  value={user?.email || 'starboy1s2s3s3@gmail.com'}
                  disabled
                  className="input-disabled"
                />
                <span className="badge-verified">Verified Admin</span>
              </div>
            </div>

            <div className="form-group">
              <label>Order Alert Notification Email (Resend)</label>
              <input
                type="email"
                value={notificationEmail}
                onChange={(e) => setNotificationEmail(e.target.value)}
                placeholder="alerts@fishcommerce.com"
                required
              />
              <span className="field-hint">
                All customer orders trigger an automated full-details email alert to this address.
              </span>
            </div>

            <div className="form-group">
              <label>Public Support Phone Number</label>
              <input
                type="text"
                value={adminPhone}
                onChange={(e) => setAdminPhone(e.target.value)}
                placeholder="+1 (555) 000-0000"
              />
            </div>

            <div className="form-group">
              <label>Operating & Dispatch Support Hours</label>
              <input
                type="text"
                value={supportHours}
                onChange={(e) => setSupportHours(e.target.value)}
                placeholder="Mon - Fri: 9:00 AM - 5:00 PM"
              />
            </div>

            <button type="submit" className="btn-primary btn-save-settings">
              {savedContact ? 'Saved ✓' : 'Save Changes'}
            </button>
          </form>
        </div>

        {/* Right Column: Add New Admin Account */}
        <div className="settings-card">
          <h2>Add New Store Administrator</h2>
          <p className="card-desc">
            Authorize new store managers with custom login credentials. New admins gain access to inventory and order fulfillment.
          </p>

          {adminError && <div className="alert-error" style={{ marginBottom: '14px' }}>{adminError}</div>}

          <form onSubmit={handleCreateAdmin}>
            <div className="form-group">
              <label>Admin Full Name</label>
              <input
                type="text"
                value={newAdmin.name}
                onChange={(e) => setNewAdmin((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="e.g. Alex Henderson"
                required
              />
            </div>

            <div className="form-group">
              <label>Admin Email Address</label>
              <input
                type="email"
                value={newAdmin.email}
                onChange={(e) => setNewAdmin((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="e.g. alex@fishcommerce.com"
                required
              />
            </div>

            <div className="form-group">
              <label>Set Secure Password (min 6 characters)</label>
              <input
                type="password"
                value={newAdmin.password}
                onChange={(e) => setNewAdmin((prev) => ({ ...prev, password: e.target.value }))}
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              className="btn-primary btn-save-settings"
              disabled={creatingAdmin}
            >
              {creatingAdmin ? 'Creating...' : '+ Create Admin Account'}
            </button>
          </form>
        </div>
      </div>

      {/* Full-Width Section: Active Administrators Roster */}
      <div className="settings-card" style={{ marginTop: '24px' }}>
        <h2>Active Store Administrators</h2>
        <p className="card-desc">Staff accounts authorized to manage products, pricing, and order dispatch.</p>

        <div className="admin-roster-table-wrap">
          <table className="admin-roster-table">
            <thead>
              <tr>
                <th>Admin Name</th>
                <th>Email Address</th>
                <th>Access Level</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {/* Super Admin */}
              <tr>
                <td><strong>{SUPER_ADMIN.name}</strong></td>
                <td><code>{SUPER_ADMIN.email}</code></td>
                <td><span className="badge-role badge-role--super">Super Admin</span></td>
                <td><span className="badge-status badge-active">Active</span></td>
                <td style={{ textAlign: 'right', color: 'var(--text-muted)', fontSize: '12px' }}>Protected</td>
              </tr>

              {/* Demo Admin */}
              <tr>
                <td><strong>{DEMO_ADMIN.name}</strong></td>
                <td><code>{DEMO_ADMIN.email}</code></td>
                <td><span className="badge-role badge-role--staff">Staff Admin</span></td>
                <td><span className="badge-status badge-active">Active</span></td>
                <td style={{ textAlign: 'right', color: 'var(--text-muted)', fontSize: '12px' }}>System Default</td>
              </tr>

              {/* Custom Created Admins */}
              {registeredAdmins?.map((adm) => (
                <tr key={adm.id}>
                  <td><strong>{adm.name}</strong></td>
                  <td><code>{adm.email}</code></td>
                  <td><span className="badge-role badge-role--custom">Custom Admin</span></td>
                  <td><span className="badge-status badge-active">Active</span></td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      type="button"
                      onClick={() => handleRemove(adm.email, adm.name)}
                      className="btn-revoke-admin"
                    >
                      Revoke Access
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Integration & Provider Status */}
      <div className="settings-card" style={{ marginTop: '24px' }}>
        <h2>Services & Integrations Health</h2>
        <p className="card-desc">Real-time status of backend, authentication, and notification relays.</p>

        <div className="integration-status-list">
          <div className="integration-item">
            <div className="integration-info">
              <strong>Gmail / Google OAuth</strong>
              <p>Sign-in via Google (Must be toggled ON in Supabase Dashboard &gt; Authentication &gt; Providers &gt; Google)</p>
            </div>
            <span className="badge-status badge-active">Configured in Code</span>
          </div>

          <div className="integration-item">
            <div className="integration-info">
              <strong>Supabase PostgreSQL Database</strong>
              <p>Relational storage with 14 live species and atomic checkout RPC</p>
            </div>
            <span className={`badge-status ${isSupabaseConfigured ? 'badge-active' : 'badge-pending'}`}>
              {isSupabaseConfigured ? 'Connected (Live)' : 'Pending'}
            </span>
          </div>

          <div className="integration-item">
            <div className="integration-info">
              <strong>Resend Transactional Email Relay</strong>
              <p>Automated confirmation emails to customer and alerts to {ADMIN_EMAIL}</p>
            </div>
            <span className="badge-status badge-active">API Active</span>
          </div>
        </div>
      </div>
    </div>
  )
}
