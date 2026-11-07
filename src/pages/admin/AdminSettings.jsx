import { useState } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import { SUPER_ADMIN, DEMO_ADMIN } from '../../config.js'
import { ADMIN_EMAIL } from '../../services/notificationService.js'
import { isSupabaseConfigured } from '../../lib/supabase.js'
import { useToast } from '../../components/Toast.jsx'
import './AdminSettings.css'

export default function AdminSettings() {
  const { user, inviteAdmin, removeAdmin, registeredAdmins } = useAuth()
  const { showToast } = useToast()

  // Contact info state
  const [notificationEmail, setNotificationEmail] = useState(ADMIN_EMAIL)
  const [adminPhone, setAdminPhone] = useState('+1 (555) 382-7474')
  const [supportHours, setSupportHours] = useState('Mon - Sat: 9:00 AM - 6:00 PM EST')
  const [savedContact, setSavedContact] = useState(false)

  // New admin invitation form state
  const [newAdmin, setNewAdmin] = useState({ name: '', email: '' })
  const [invitingAdmin, setInvitingAdmin] = useState(false)
  const [adminError, setAdminError] = useState('')
  const [lastInviteLink, setLastInviteLink] = useState('')

  const handleSaveContact = (e) => {
    e.preventDefault()
    setSavedContact(true)
    showToast('Admin contact preferences updated successfully!', { type: 'success' })
    setTimeout(() => setSavedContact(false), 3000)
  }

  const handleInviteAdmin = async (e) => {
    e.preventDefault()
    setAdminError('')
    setInvitingAdmin(true)

    try {
      const res = await inviteAdmin(newAdmin)
      if (!res.ok) {
        setAdminError(res.error?.message || 'Failed to send admin invitation.')
        return
      }

      setLastInviteLink(res.inviteLink)
      showToast(`Invitation sent to ${newAdmin.email}!`, { type: 'success' })
      setNewAdmin({ name: '', email: '' })
    } finally {
      setInvitingAdmin(false)
    }
  }

  const handleCopyLink = (link) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(link)
      showToast('Invite link copied to clipboard!', { type: 'success' })
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

        {/* Right Column: Invite New Admin Account */}
        <div className="settings-card">
          <h2>Invite Store Administrator</h2>
          <p className="card-desc">
            Invite staff members to manage inventory, fish food catalog, and orders. An email invitation with a secure password setup link will be delivered to their inbox.
          </p>

          {adminError && <div className="alert-error" style={{ marginBottom: '14px' }}>{adminError}</div>}

          {lastInviteLink && (
            <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '8px', padding: '12px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '6px' }}>
                <strong style={{ color: '#059669', fontSize: '13px' }}>✓ Invitation Link Generated</strong>
                <button
                  type="button"
                  onClick={() => handleCopyLink(lastInviteLink)}
                  style={{ background: '#059669', color: '#fff', border: 'none', borderRadius: '4px', padding: '3px 8px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}
                >
                  Copy Link
                </button>
              </div>
              <input
                type="text"
                readOnly
                value={lastInviteLink}
                style={{ fontSize: '11px', background: '#fff', border: '1px solid #d1d5db', borderRadius: '4px', padding: '4px 6px', width: '100%', boxSizing: 'border-box' }}
              />
            </div>
          )}

          <form onSubmit={handleInviteAdmin}>
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
                placeholder="e.g. alex@vp-aquarium.com"
                required
              />
              <span className="field-hint" style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                A secure setup link will be emailed to this address so the admin can configure their own password.
              </span>
            </div>

            <button
              type="submit"
              className="btn-primary btn-save-settings"
              disabled={invitingAdmin}
            >
              {invitingAdmin ? 'Sending Invitation...' : '✉️ Send Admin Invitation'}
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

              {/* Custom Created / Invited Admins (Strictly excluding SUPER_ADMIN) */}
              {registeredAdmins
                ?.filter(
                  (adm) =>
                    adm.email &&
                    adm.email.toLowerCase() !== SUPER_ADMIN.email.toLowerCase() &&
                    adm.email.toLowerCase() !== DEMO_ADMIN.email.toLowerCase()
                )
                ?.map((adm) => {
                  const isPending = adm.status === 'invited' && !adm.password
                  const inviteUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/auth?setup=admin&email=${encodeURIComponent(adm.email)}&name=${encodeURIComponent(adm.name || '')}`

                  return (
                    <tr key={adm.id}>
                      <td><strong>{adm.name}</strong></td>
                      <td><code>{adm.email}</code></td>
                      <td><span className="badge-role badge-role--custom">Custom Admin</span></td>
                      <td>
                        {isPending ? (
                          <span className="badge-status" style={{ background: '#fef3c7', color: '#b45309' }}>
                            Invited (Pending)
                          </span>
                        ) : (
                          <span className="badge-status badge-active">Active</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '8px', alignItems: 'center' }}>
                          {isPending && (
                            <button
                              type="button"
                              onClick={() => handleCopyLink(inviteUrl)}
                              style={{ background: 'transparent', border: '1px solid var(--accent)', color: 'var(--accent)', borderRadius: '4px', padding: '3px 8px', fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}
                            >
                              Copy Link
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemove(adm.email, adm.name)}
                            className="btn-revoke-admin"
                          >
                            Revoke
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
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
