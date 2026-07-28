import { useAuth } from '../context/AuthContext'

const ProfilePage = () => {
  const { user } = useAuth()

  if (!user) return null

  const fullName = `${user.firstName} ${user.middleName ? user.middleName + ' ' : ''}${user.lastName}${user.suffix ? ' ' + user.suffix : ''}`

  return (
    <div className="pt-24 px-margin-mobile max-w-2xl mx-auto pb-32">
      {/* Profile locked notice */}
      <div className="bg-primary-container/30 border border-primary-container p-4 rounded-xl mb-6 flex gap-3">
        <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
          lock
        </span>
        <div className="flex-1">
          <h4 className="font-bold text-on-surface">Profile Locked</h4>
          <p className="text-sm text-on-surface-variant">
            This profile is managed by eGovPH. To update your information, please visit the eGovPH portal.
          </p>
        </div>
      </div>

      <section className="flex flex-col items-center mb-12">
        <div className="w-32 h-32 rounded-full border-4 border-primary p-1 bg-white shadow-lg overflow-hidden relative">
          <div className="w-full h-full rounded-full bg-primary-container flex items-center justify-center text-on-primary-container text-4xl font-bold">
            {user.firstName.charAt(0)}{user.lastName.charAt(0)}
          </div>
        </div>
        <h2 className="text-2xl font-bold mt-4">{fullName}</h2>
        <div className="flex items-center gap-1 mt-1 text-tertiary">
          <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
            verified
          </span>
          <span className="font-bold text-sm">Verified via eGovPH</span>
        </div>
      </section>

      {/* User Information */}
      <div className="bg-white p-6 rounded-xl border border-outline-variant shadow-sm mb-4">
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">person</span>
          Personal Information
        </h3>
        <div className="space-y-4">
          <div>
            <p className="text-xs text-on-surface-variant uppercase font-bold">Email</p>
            <p className="font-medium">{user.email}</p>
          </div>
          <div>
            <p className="text-xs text-on-surface-variant uppercase font-bold">Mobile Number</p>
            <p className="font-medium">{user.mobileNumber}</p>
          </div>
          <div>
            <p className="text-xs text-on-surface-variant uppercase font-bold">Date of Birth</p>
            <p className="font-medium">{new Date(user.birthdate).toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-xs text-on-surface-variant uppercase font-bold">Address</p>
            <p className="font-medium">
              {user.address.street && `${user.address.street}, `}
              {user.address.barangay && `${user.address.barangay}, `}
              {user.address.city}, {user.address.province}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button className="p-6 rounded-xl bg-white border border-outline-variant text-left hover:bg-surface-container transition-all shadow-sm">
          <span className="material-symbols-outlined text-primary mb-2">badge</span>
          <h4 className="font-bold">National ID</h4>
          <p className="text-sm text-on-surface-variant">**** 8291</p>
        </button>

        <button className="p-6 rounded-xl bg-white border border-outline-variant text-left hover:bg-surface-container transition-all shadow-sm">
          <span className="material-symbols-outlined text-secondary mb-2">security</span>
          <h4 className="font-bold">Security Settings</h4>
          <p className="text-sm text-on-surface-variant">2FA & Biometrics</p>
        </button>
      </div>
    </div>
  )
}

export default ProfilePage
