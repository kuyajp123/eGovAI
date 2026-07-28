import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const ProfilePage = () => {
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  if (!user) return null

  // Build full name
  const fullName = [user.firstName, user.middleName, user.lastName, user.suffix]
    .filter(Boolean)
    .join(' ')

  // Build initials for avatar fallback
  const initials = [user.firstName?.[0], user.lastName?.[0]]
    .filter(Boolean)
    .join('')
    .toUpperCase()

  // Format dates
  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A'
    try {
      return new Date(dateStr).toLocaleDateString('en-PH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    } catch {
      return dateStr
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/', { replace: true })
  }

  return (
    <>
      <main className="px-margin-mobile pt-lg pb-24 max-w-2xl mx-auto">

        {/* Hero Profile Section */}
        <section className="mb-xl flex flex-col items-center">
          {/* Avatar */}
          <div className="relative group">
            <div className="w-32 h-32 rounded-full border-4 border-primary bg-primary-container shadow-lg flex items-center justify-center overflow-hidden">
              <span className="text-4xl font-bold text-on-primary-container select-none">
                {initials || '?'}
              </span>
            </div>
            {/* eGovPH lock badge */}
            <div className="absolute bottom-0 right-0 bg-tertiary text-on-tertiary w-10 h-10 rounded-full border-2 border-white flex items-center justify-center shadow-md" title="Profile managed by eGovPH">
              <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>lock</span>
            </div>
          </div>

          {/* Name & verified badge */}
          <div className="mt-lg text-center">
            <h2 className="font-headline-lg text-headline-lg text-on-surface">{fullName || 'Unknown User'}</h2>
            <div className="flex items-center justify-center gap-1 mt-1">
              <span className="material-symbols-outlined text-tertiary text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
              <p className="font-label-lg text-label-lg text-on-surface-variant">
                Verified via eGovPH SSO
              </p>
            </div>
            {/* Uniqid chip */}
            <div className="mt-3 inline-flex items-center gap-1 px-3 py-1 bg-surface-container rounded-full border border-outline-variant">
              <span className="material-symbols-outlined text-[14px] text-on-surface-variant">fingerprint</span>
              <span className="font-label-sm text-label-sm text-on-surface-variant font-mono">
                {user.uniqid ? `ID: ${user.uniqid}` : 'No Unique ID'}
              </span>
            </div>
          </div>
        </section>

        {/* Profile locked notice */}
        <div className="mb-lg flex items-start gap-3 p-md rounded-xl bg-secondary-container border border-secondary/20">
          <span className="material-symbols-outlined text-secondary text-[20px] mt-0.5 shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>shield_lock</span>
          <p className="font-body-sm text-body-sm text-on-secondary-container">
            Your profile is managed by <strong>eGovPH</strong>. To update your information, visit the official eGovPH portal.
          </p>
        </div>

        {/* Personal Information */}
        <div className="mb-md rounded-xl bg-surface-container-lowest shadow-sm border border-outline-variant overflow-hidden">
          <div className="px-lg py-md border-b border-outline-variant bg-surface-container-low">
            <h3 className="font-label-lg text-label-lg text-primary uppercase tracking-wider flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
              Personal Information
            </h3>
          </div>
          <div className="divide-y divide-outline-variant/50">
            <InfoRow icon="badge" label="Full Name" value={fullName || '—'} />
            <InfoRow icon="cake" label="Date of Birth" value={formatDate(user.birthdate)} />
            <InfoRow icon="mail" label="Email Address" value={user.email || '—'} />
            <InfoRow icon="phone" label="Mobile Number" value={user.mobileNumber || '—'} />
          </div>
        </div>

        {/* Address */}
        <div className="mb-md rounded-xl bg-surface-container-lowest shadow-sm border border-outline-variant overflow-hidden">
          <div className="px-lg py-md border-b border-outline-variant bg-surface-container-low">
            <h3 className="font-label-lg text-label-lg text-primary uppercase tracking-wider flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>home_pin</span>
              Address
            </h3>
          </div>
          <div className="divide-y divide-outline-variant/50">
            {user.address?.street && <InfoRow icon="signpost" label="Street" value={user.address.street} />}
            {user.address?.barangay && <InfoRow icon="location_city" label="Barangay" value={user.address.barangay} />}
            <InfoRow icon="apartment" label="City / Municipality" value={user.address?.city || '—'} />
            <InfoRow icon="map" label="Province" value={user.address?.province || '—'} />
            <InfoRow icon="public" label="Region" value={user.address?.region || '—'} />
            {user.address?.zipCode && <InfoRow icon="markunread_mailbox" label="ZIP Code" value={user.address.zipCode} />}
          </div>
        </div>

        {/* Account Info */}
        <div className="mb-lg rounded-xl bg-surface-container-lowest shadow-sm border border-outline-variant overflow-hidden">
          <div className="px-lg py-md border-b border-outline-variant bg-surface-container-low">
            <h3 className="font-label-lg text-label-lg text-primary uppercase tracking-wider flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>manage_accounts</span>
              Account Details
            </h3>
          </div>
          <div className="divide-y divide-outline-variant/50">
            <InfoRow icon="login" label="SSO Provider" value="eGovPH" />
            <InfoRow icon="calendar_today" label="Member Since" value={formatDate(user.registeredAt)} />
            <InfoRow icon="history" label="Last Login" value={formatDate(user.lastLogin)} />
          </div>
        </div>

        {/* Bento Grid Actions */}
        <div className="grid grid-cols-2 gap-md mb-lg">
          <button className="flex flex-col p-lg rounded-xl bg-surface-container-lowest shadow-sm border border-outline-variant text-left hover:bg-surface-container-low transition-colors active:scale-95">
            <div className="w-12 h-12 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center mb-md">
              <span className="material-symbols-outlined text-[28px]">badge</span>
            </div>
            <h3 className="font-title-lg text-title-lg mb-xs">National ID</h3>
            <p className="font-body-md text-body-md text-on-surface-variant flex items-center gap-1">
              <span className="text-tertiary font-bold">Linked</span> via eGovPH
            </p>
          </button>
          <button className="flex flex-col p-lg rounded-xl bg-surface-container-lowest shadow-sm border border-outline-variant text-left hover:bg-surface-container-low transition-colors active:scale-95">
            <div className="w-12 h-12 rounded-full bg-tertiary-container text-on-tertiary-container flex items-center justify-center mb-md">
              <span className="material-symbols-outlined text-[28px]">security</span>
            </div>
            <h3 className="font-title-lg text-title-lg mb-xs">Security</h3>
            <p className="font-body-md text-body-md text-on-surface-variant">2FA & Biometrics</p>
          </button>
        </div>

        {/* Logout */}
        <div className="mt-xl">
          <button
            onClick={handleLogout}
            className="w-full h-touch-target flex items-center justify-center gap-sm font-label-lg text-label-lg text-error border-2 border-error rounded-full hover:bg-error-container transition-all active:scale-95"
          >
            <span className="material-symbols-outlined">logout</span>
            Sign Out
          </button>
        </div>

        {/* Footer */}
        <footer className="mt-xl py-lg border-t border-outline-variant flex flex-col items-center opacity-60">
          <p className="font-label-sm text-label-sm text-center">
            Version 4.2.1-stable • Data encrypted via AES-256<br />
            © 2024 National Government Agency
          </p>
        </footer>

      </main>
    </>
  )
}

// Reusable info row component
const InfoRow = ({ icon, label, value }: { icon: string; label: string; value: string }) => (
  <div className="flex items-center gap-md px-lg py-sm">
    <span className="material-symbols-outlined text-[20px] text-on-surface-variant shrink-0">{icon}</span>
    <div className="flex-1 min-w-0">
      <p className="font-label-sm text-label-sm text-on-surface-variant">{label}</p>
      <p className="font-body-md text-body-md text-on-surface truncate">{value}</p>
    </div>
  </div>
)

export default ProfilePage
