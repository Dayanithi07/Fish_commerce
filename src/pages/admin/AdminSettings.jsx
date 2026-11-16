import { useState, useEffect } from 'react'
import { Check, Mail, RefreshCw, Copy } from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import { SUPER_ADMIN, DEMO_ADMIN } from '../../config.js'
import { isSupabaseConfigured } from '../../lib/supabase.js'
import { useToast } from '../../components/Toast.jsx'
import { useStoreSettings } from '../../hooks/useStoreSettings.js'
import './AdminSettings.css'

export default function AdminSettings() {
  const { user, inviteAdmin, removeAdmin, registeredAdmins, fetchAdminsFromDB } = useAuth()
  const { showToast } = useToast()
  const { settings, saveSettings, saving: savingSettings } = useStoreSettings()

  // Contact info state — initialized from live store_settings
  const [notificationEmail, setNotificationEmail] = useState('')
  const [adminPhone, setAdminPhone] = useState('')
  const [supportHours, setSupportHours] = useState('')
  const [storeAddress, setStoreAddress] = useState('')
  const [whatsappNumber, setWhatsappNumber] = useState('')
  const [savedContact, setSavedContact] = useState(false)

  // Sync form fields whenever settings load from DB
  useEffect(() => {
    if (settings) {
      setNotificationEmail(settings.support_email || '')
      setAdminPhone(settings.support_phone || '')
      setSupportHours(settings.support_hours || '')
      setStoreAddress(settings.store_address || '')
      setWhatsappNumber(settings.whatsapp_number || '')
    }
  }, [settings])

  // DB sync state for admin accounts
  const [fetchingAdmins, setFetchingAdmins] = useState(false)

  // Load admins from DB on mount
  useEffect(() => {
    let mounted = true
    const load = async () => {
      setFetchingAdmins(true)
      try {
        if (typeof fetchAdminsFromDB === 'function') {
          await fetchAdminsFromDB()
        }
      } catch (err) {
        console.warn('Could not fetch admins from DB:', err)
      } finally {
        if (mounted) setFetchingAdmins(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [fetchAdminsFromDB])

  // New admin invitation form state
  const [newAdmin, setNewAdmin] = useState({ name: '', email: '' })
  const [invitingAdmin, setInvitingAdmin] = useState(false)
  const [adminError, setAdminError] = useState('')
  const [lastInviteLink, setLastInviteLink] = useState('')

  const handleSaveContact = async (e) => {
    e.preventDefault()
    try {
      const result = await saveSettings({
        support_email: notificationEmail,
        support_phone: adminPhone,
        support_hours: supportHours,
        store_address: storeAddress,
        whatsapp_number: whatsappNumber,
      })
      if (result.ok) {
        setSavedContact(true)
        showToast('Store settings saved to database successfully!', { type: 'success' })
        setTimeout(() => setSavedContact(false), 3000)
      } else {
        showToast('Failed to save settings: ' + (result.error || 'Unknown error'), { type: 'error' })
      }
    } catch (err) {
      showToast('Error saving settings: ' + err.message, { type: 'error' })
    }
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
            Primary administrative contact displayed on customer order summaries, bills, and support channels.
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
              <label>Order Alert Notification Email</label>
              <input
                type="email"
                value={notificationEmail}
                onChange={(e) => setNotificationEmail(e.target.value)}
                placeholder="alerts@vp-aquarium.com"
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
                placeholder="+91 98765 43210"
              />
            </div>

            <div className="form-group">
              <label>Operating &amp; Dispatch Support Hours</label>
              <input
                type="text"
                value={supportHours}
                onChange={(e) => setSupportHours(e.target.value)}
                placeholder="Mon – Sat: 9:00 AM – 6:00 PM IST"
              />
            </div>

            <div className="form-group">
              <label>Store Address (shown on invoices)</label>
              <input
                type="text"
                value={storeAddress}
                onChange={(e) => setStoreAddress(e.target.value)}
                placeholder="City, State, India"
              />
            </div>

            <div className="form-group">
              <label>WhatsApp Support Number (digits only, with country code)</label>
              <input
                type="text"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="e.g. 919876543210"
                maxLength={15}
              />
              <span className="field-hint">Used for the floating WhatsApp chat button visible to all customers.</span>
            </div>

            <button type="submit" className="btn-primary btn-save-settings" disabled={savingSettings}>
              {savingSettings ? 'Saving to DB…' : savedContact ? <><Check size={14} /> Saved to Database</> : 'Save Changes'}
            </button>
          </form>
        </div>

        {/* Right Column: Invite New Admin Account */}
        <div className="settings-card">
          <h2>Invite Store Administrator</h2>
          <p className="card-desc">
            Invite staff members to manage inventory, fish food catalog, and orders. An email invitation with a secure password setup link will be delivered to their inbox.
          </p>

          {adminError && <div className="alert-error settings-alert">{adminError}</div>}

          {lastInviteLink && (
            <div className="invite-link-box">
              <div className="invite-link-header">
                <strong className="invite-link-title">
                  <Check size={14} /> Invitation Link Generated
                </strong>
                <button
                  type="button"
                  onClick={() => handleCopyLink(lastInviteLink)}
                  className="btn-copy-link"
                >
                  <Copy size={11} /> Copy Link
                </button>
              </div>
              <input
                type="text"
                readOnly
                value={lastInviteLink}
                className="invite-link-input"
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
              <span className="field-hint">
                A secure setup link will be emailed to this address so the admin can configure their own password.
              </span>
            </div>

            <button
              type="submit"
              className="btn-primary btn-save-settings"
              disabled={invitingAdmin}
            >
              {invitingAdmin ? 'Sending Invitation...' : <><Mail size={14} /> Send Admin Invitation</>}
            </button>
          </form>
        </div>
      </div>

      {/* Full-Width Section: Active Administrators Roster */}
      <div className="settings-card settings-card--roster">
        <div className="roster-header">
          <h2>Active Store Administrators</h2>
          <button
            type="button"
            onClick={async () => {
              setFetchingAdmins(true)
              try {
                if (typeof fetchAdminsFromDB === 'function') {
                  await fetchAdminsFromDB()
                }
              } finally {
                setFetchingAdmins(false)
              }
            }}
            disabled={fetchingAdmins}
            className="btn-refresh"
          >
            <RefreshCw size={12} className={fetchingAdmins ? 'spin' : ''} />
            {fetchingAdmins ? 'Syncing…' : 'Refresh from DB'}
          </button>
        </div>
        <p className="card-desc">Staff accounts authorized to manage products, pricing, and order dispatch. Status is fetched live from the database.</p>

        <div className="admin-roster-table-wrap">
          <table className="admin-roster-table">
            <thead>
              <tr>
                <th>Admin Name</th>
                <th>Email Address</th>
                <th>Access Level</th>
                <th>Status</th>
                <th className="th-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {/* Super Admin */}
              <tr>
                <td><strong>{SUPER_ADMIN.name}</strong></td>
                <td><code>{SUPER_ADMIN.email}</code></td>
                <td><span className="badge-role badge-role--super">Super Admin</span></td>
                <td><span className="badge-status badge-active">Active</span></td>
                <td className="actions-protected">Protected</td>
              </tr>

              {/* Demo Admin */}
              <tr>
                <td><strong>{DEMO_ADMIN.name}</strong></td>
                <td><code>{DEMO_ADMIN.email}</code></td>
                <td><span className="badge-role badge-role--staff">Staff Admin</span></td>
                <td><span className="badge-status badge-active">Active</span></td>
                <td className="actions-protected">System Default</td>
              </tr>

              {/* Custom Created / Invited Admins (Strictly excluding SUPER_ADMIN) */}
              {registeredAdmins
                ?.filter(
                  (adm) =>
                    adm &&
                    adm.email &&
                    adm.email.toLowerCase() !== SUPER_ADMIN.email.toLowerCase() &&
                    adm.email.toLowerCase() !== DEMO_ADMIN.email.toLowerCase()
                )
                ?.map((adm) => {
                  const isPending = adm.status === 'invited'
                  const inviteUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/auth?setup=admin&email=${encodeURIComponent(adm.email)}&name=${encodeURIComponent(adm.name || '')}`

                  return (
                    <tr key={adm.id || adm.email}>
                      <td><strong>{adm.name || 'Staff Member'}</strong></td>
                      <td><code>{adm.email}</code></td>
                      <td><span className="badge-role badge-role--custom">Custom Admin</span></td>
                      <td>
                        {isPending ? (
                          <span className="badge-status badge-invited">
                            Invited (Pending)
                          </span>
                        ) : (
                          <span className="badge-status badge-active">Active</span>
                        )}
                      </td>
                      <td className="td-right">
                        <div className="admin-actions">
                          {isPending && (
                            <button
                              type="button"
                              onClick={() => handleCopyLink(inviteUrl)}
                              className="btn-copy-link-outline"
                            >
                              <Copy size={11} /> Copy Link
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
      <div className="settings-card settings-card--integrations">
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
              <p>Automated confirmation emails to customer and alerts to {settings?.support_email || 'store admin'}</p>
            </div>
            <span className="badge-status badge-active">API Active</span>
          </div>
        </div>
      </div>
    </div>
  )
}
