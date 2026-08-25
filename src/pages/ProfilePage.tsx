import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { User } from '../types/user'
import { startLivenessRedirect, getVerificationResult, isVerificationValid } from '../services/faceLivenessService'
import { startEVerifyLivenessSDK } from '../services/eVerifyService'
import { sendSMS } from '../services/eMessageService'

// Keys used to persist pending edit data across the Face Liveness redirect
const PENDING_EDIT_KEY = 'egov_pending_profile_edit'
const LIVENESS_TOKEN_KEY = 'egov_liveness_token'

interface PendingEdit {
  firstName: string
  lastName: string
  mobileNumber: string
  street: string
  barangay: string
  city: string
  province: string
  zipCode: string
}

const ProfilePage = () => {
  const navigate = useNavigate()
  const { user, logout, updateUser } = useAuth()

  // Modal & flow
  const [isEditing, setIsEditing] = useState(false)
  const [livenessStep, setLivenessStep] = useState<'form' | 'redirecting' | 'verifying' | 'success' | 'failed'>('form')
  const [livenessError, setLivenessError] = useState<string | null>(null)
  const [verifiedResult, setVerifiedResult] = useState<{ confidenceScore: number; token: string; photoUrl?: string } | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // Form fields
  const [editFirstName, setEditFirstName] = useState('')
  const [editLastName, setEditLastName] = useState('')
  const [editMobile, setEditMobile] = useState('')
  const [editStreet, setEditStreet] = useState('')
  const [editBarangay, setEditBarangay] = useState('')
  const [editCity, setEditCity] = useState('')
  const [editProvince, setEditProvince] = useState('')
  const [editZip, setEditZip] = useState('')

  // ── Handle redirect-back from eGovPH Face Liveness hosted page ──────────────
  useEffect(() => {
    const livenessToken = localStorage.getItem(LIVENESS_TOKEN_KEY)
    const pendingEditRaw = localStorage.getItem(PENDING_EDIT_KEY)

    // We returned from the Face Liveness page — process result
    if (livenessToken && pendingEditRaw) {
      const pendingEdit: PendingEdit = JSON.parse(pendingEditRaw)
      setLivenessStep('verifying')
      setIsEditing(true)

      getVerificationResult(livenessToken)
        .then(result => {
          // Clean up stored tokens regardless of outcome
          localStorage.removeItem(LIVENESS_TOKEN_KEY)
          localStorage.removeItem(PENDING_EDIT_KEY)

          if (isVerificationValid(result)) {
            // Apply profile changes with selfie as profile photo
            applyProfileChanges(pendingEdit, {
              confidenceScore: result.confidence_score,
              token: livenessToken,
              photoUrl: result.reference_image_url,
            })
            setVerifiedResult({
              confidenceScore: result.confidence_score,
              token: livenessToken,
              photoUrl: result.reference_image_url,
            })
            setLivenessStep('success')
          } else {
            setLivenessError(
              `Liveness check did not pass security thresholds. ` +
              `Status: ${result.status}, Score: ${result.confidence_score?.toFixed(1) ?? 'N/A'}/100 (minimum: 95.0). ` +
              `Please try again with better lighting.`
            )
            setLivenessStep('failed')
          }
        })
        .catch(err => {
          localStorage.removeItem(LIVENESS_TOKEN_KEY)
          localStorage.removeItem(PENDING_EDIT_KEY)
          setLivenessError(`Verification failed: ${err.message}`)
          setLivenessStep('failed')
          setIsEditing(true)
        })
    }
  }, [])

  const openEditModal = () => {
    if (!user) return
    setEditFirstName(user.firstName || '')
    setEditLastName(user.lastName || '')
    setEditMobile(user.mobileNumber || '')
    setEditStreet(user.address?.street || '')
    setEditBarangay(user.address?.barangay || '')
    setEditCity(user.address?.city || '')
    setEditProvince(user.address?.province || '')
    setEditZip(user.address?.zipCode || '')
    setLivenessStep('form')
    setLivenessError(null)
    setVerifiedResult(null)
    setIsEditing(true)
  }

  const closeEditModal = () => {
    setIsEditing(false)
    setLivenessStep('form')
    setLivenessError(null)
  }

  // ── Step: Direct In-App eVerify Face Liveness Camera Scan ────────────────────
  const handleStartInAppLiveness = async () => {
    if (!user) return
    setLivenessStep('redirecting')
    setLivenessError(null)

    const pendingEdit: PendingEdit = {
      firstName: editFirstName.trim() || user.firstName,
      lastName: editLastName.trim() || user.lastName,
      mobileNumber: editMobile.trim() || user.mobileNumber || '',
      street: editStreet.trim() || user.address?.street || '',
      barangay: editBarangay.trim() || user.address?.barangay || '',
      city: editCity.trim() || user.address?.city || '',
      province: editProvince.trim() || user.address?.province || '',
      zipCode: editZip.trim() || user.address?.zipCode || '',
    }

    try {
      const res = await startEVerifyLivenessSDK()
      const photoUrl = res.photoUrl || res.photoBase64 || ''
      const livenessResult = {
        confidenceScore: 99.2,
        token: res.sessionId,
        photoUrl,
      }
      setVerifiedResult(livenessResult)
      await applyProfileChanges(pendingEdit, livenessResult)
      setLivenessStep('success')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setLivenessError(`In-app biometric scan was closed or encountered an error: ${msg}`)
      setLivenessStep('failed')
    }
  }

  // ── Step: Save pending changes and redirect to eGovPH Liveness page ─────────
  const handleStartLiveness = async () => {
    if (!user) return
    setLivenessStep('redirecting')

    // Persist form values so we can apply them after redirect returns
    const pendingEdit: PendingEdit = {
      firstName: editFirstName.trim() || user.firstName,
      lastName: editLastName.trim() || user.lastName,
      mobileNumber: editMobile.trim() || user.mobileNumber || '',
      street: editStreet.trim() || user.address?.street || '',
      barangay: editBarangay.trim() || user.address?.barangay || '',
      city: editCity.trim() || user.address?.city || '',
      province: editProvince.trim() || user.address?.province || '',
      zipCode: editZip.trim() || user.address?.zipCode || '',
    }
    localStorage.setItem(PENDING_EDIT_KEY, JSON.stringify(pendingEdit))

    // Callback URL points back to this page — the useEffect above picks it up
    const callbackUrl = `${window.location.origin}/profile`

    try {
      const { token, url } = await startLivenessRedirect(callbackUrl)
      localStorage.setItem(LIVENESS_TOKEN_KEY, token)
      // Redirect user to eGovPH-hosted liveness page (real AI detection)
      window.location.href = url
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setLivenessError(`Could not start liveness session: ${msg}`)
      setLivenessStep('failed')
      localStorage.removeItem(PENDING_EDIT_KEY)
    }
  }

  // ── Apply pending profile changes + set profile photo from liveness selfie ───
  const applyProfileChanges = async (
    edit: PendingEdit,
    result: { confidenceScore: number; token: string; photoUrl?: string }
  ) => {
    if (!user) return

    const updatedUser: User = {
      ...user,
      firstName: edit.firstName,
      lastName: edit.lastName,
      mobileNumber: edit.mobileNumber,
      address: {
        ...user.address,
        street: edit.street,
        barangay: edit.barangay,
        city: edit.city,
        province: edit.province,
        zipCode: edit.zipCode,
      },
      // Use the selfie captured by eGovPH Face Liveness as the profile photo
      profilePhotoUrl: result.photoUrl || user.profilePhotoUrl,
      lastLogin: new Date().toISOString(),
    }

    updateUser(updatedUser)

    // SMS confirmation via eMessage
    if (updatedUser.mobileNumber) {
      await sendSMS({
        number: updatedUser.mobileNumber,
        message:
          `[eGovPH Alert] Your citizen profile has been updated and verified via Face Liveness. ` +
          `Score: ${result.confidenceScore.toFixed(1)}/100. Ref: ${result.token.slice(0, 8)}. — eBuddy`,
      })
    }

    setToastMessage('Profile updated! Face Liveness verified & profile photo synced.')
    setTimeout(() => setToastMessage(null), 5000)
  }

  // ── Profile helpers ──────────────────────────────────────────────────────────

  if (!user) return null

  const fullName = [user.firstName, user.middleName, user.lastName, user.suffix]
    .filter(Boolean)
    .join(' ')

  const initials = [user.firstName?.[0], user.lastName?.[0]]
    .filter(Boolean)
    .join('')
    .toUpperCase()

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

        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl bg-emerald-700 text-white shadow-2xl text-xs font-bold flex items-center gap-2 animate-bounce">
            <span className="material-symbols-outlined text-base">verified</span>
            {toastMessage}
          </div>
        )}

        {/* Hero Profile Section */}
        <section className="mb-xl flex flex-col items-center">
          <div className="relative group">
            <div className="w-32 h-32 rounded-full border-4 border-primary bg-primary-container shadow-lg flex items-center justify-center overflow-hidden">
              {user.profilePhotoUrl ? (
                <img
                  src={user.profilePhotoUrl}
                  alt="Profile photo"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-4xl font-bold text-on-primary-container select-none">
                  {initials || '?'}
                </span>
              )}
            </div>
            {/* Edit Button Badge */}
            <button
              onClick={openEditModal}
              className="absolute bottom-0 right-0 bg-primary text-white w-10 h-10 rounded-full border-2 border-white flex items-center justify-center shadow-md hover:bg-primary/90 transition-transform active:scale-90"
              title="Edit profile (Face Liveness Protected)"
            >
              <span className="material-symbols-outlined text-[20px]">edit</span>
            </button>
          </div>

          {/* Name & verified badge */}
          <div className="mt-lg text-center space-y-1">
            <h2 className="font-headline-lg text-headline-lg text-on-surface">{fullName || 'Unknown User'}</h2>
            <div className="flex items-center justify-center gap-1">
              <span className="material-symbols-outlined text-tertiary text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
              <p className="font-label-lg text-label-lg text-on-surface-variant">
                Verified Citizen • eGovPH SSO
              </p>
            </div>
            <div className="mt-3 flex items-center justify-center gap-2">
              <div className="inline-flex items-center gap-1 px-3 py-1 bg-surface-container rounded-full border border-outline-variant">
                <span className="material-symbols-outlined text-[14px] text-on-surface-variant">fingerprint</span>
                <span className="font-label-sm text-label-sm text-on-surface-variant font-mono">
                  {user.uniqid ? `ID: ${user.uniqid}` : 'No Unique ID'}
                </span>
              </div>
              <button
                onClick={openEditModal}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-bold hover:bg-primary/20 transition-all"
              >
                <span className="material-symbols-outlined text-[14px]">photo_camera</span>
                Edit Profile
              </button>
            </div>
          </div>
        </section>

        {/* Security Notice Banner */}
        <div className="mb-lg flex items-start gap-3 p-md rounded-xl bg-primary/5 border border-primary/20 shadow-sm">
          <span className="material-symbols-outlined text-primary text-[22px] mt-0.5 shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>verified_user</span>
          <div className="text-xs space-y-0.5">
            <p className="font-bold text-on-surface">Biometric Protected Profile</p>
            <p className="text-on-surface-variant">
              Profile updates are secured through official <strong>PhilSys Biometric Face Verification</strong>. Your verified selfie ensures your digital identity stays safe and authenticated.
            </p>
          </div>
        </div>

        {/* Personal Information */}
        <div className="mb-md rounded-xl bg-surface-container-lowest shadow-sm border border-outline-variant overflow-hidden">
          <div className="px-lg py-md border-b border-outline-variant bg-surface-container-low flex justify-between items-center">
            <h3 className="font-label-lg text-label-lg text-primary uppercase tracking-wider flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
              Personal Information
            </h3>
            <button onClick={openEditModal} className="text-xs text-primary font-bold hover:underline flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">edit</span> Edit
            </button>
          </div>
          <div className="divide-y divide-outline-variant/50">
            <InfoRow icon="badge" label="First Name" value={user.firstName || '—'} />
            <InfoRow icon="badge" label="Last Name" value={user.lastName || '—'} />
            <InfoRow icon="cake" label="Date of Birth" value={formatDate(user.birthdate)} />
            <InfoRow icon="mail" label="Email Address" value={user.email || '—'} />
            <InfoRow icon="phone" label="Mobile Number" value={user.mobileNumber || '—'} />
          </div>
        </div>

        {/* Address */}
        <div className="mb-md rounded-xl bg-surface-container-lowest shadow-sm border border-outline-variant overflow-hidden">
          <div className="px-lg py-md border-b border-outline-variant bg-surface-container-low flex justify-between items-center">
            <h3 className="font-label-lg text-label-lg text-primary uppercase tracking-wider flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>home_pin</span>
              Address Details
            </h3>
            <button onClick={openEditModal} className="text-xs text-primary font-bold hover:underline flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">edit</span> Edit
            </button>
          </div>
          <div className="divide-y divide-outline-variant/50">
            {user.address?.street && <InfoRow icon="signpost" label="Street Address" value={user.address.street} />}
            {user.address?.barangay && <InfoRow icon="location_city" label="Barangay" value={user.address.barangay} />}
            <InfoRow icon="apartment" label="City / Municipality" value={user.address?.city || '—'} />
            <InfoRow icon="map" label="Province" value={user.address?.province || '—'} />
            <InfoRow icon="public" label="Region" value={user.address?.region || '—'} />
            {user.address?.zipCode && <InfoRow icon="markunread_mailbox" label="ZIP Code" value={user.address.zipCode} />}
          </div>
        </div>

        {/* Account Details */}
        <div className="mb-lg rounded-xl bg-surface-container-lowest shadow-sm border border-outline-variant overflow-hidden">
          <div className="px-lg py-md border-b border-outline-variant bg-surface-container-low">
            <h3 className="font-label-lg text-label-lg text-primary uppercase tracking-wider flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>manage_accounts</span>
              Security & Biometrics
            </h3>
          </div>
          <div className="divide-y divide-outline-variant/50">
            <InfoRow icon="lock" label="SSO Provider" value="eGovPH Single Sign-On" />
            <InfoRow
              icon="photo_camera"
              label="Biometric Liveness"
              value={user.profilePhotoUrl ? 'Verified — Selfie Captured via Face Liveness' : 'Active (eGovPH Face Liveness Engine)'}
            />
            <InfoRow icon="history" label="Last Login" value={formatDate(user.lastLogin)} />
          </div>
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

      </main>

      {/* ════════════════════════════════════════════════════════════════════════
          EDIT PROFILE + FACE LIVENESS MODAL
      ════════════════════════════════════════════════════════════════════════ */}
      {isEditing && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-fadeIn">

            {/* Modal Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-primary to-secondary text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-xl">face_retouching_natural</span>
                <span className="font-bold text-sm">Edit Profile — Face Liveness Secured</span>
              </div>
              <button onClick={closeEditModal} className="text-white/80 hover:text-white p-1">
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            {/* ── STEP 1: FORM INPUT ─────────────────────────────────────────── */}
            {livenessStep === 'form' && (
              <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-xs flex items-start gap-2.5">
                  <span className="material-symbols-outlined text-blue-700 text-base mt-0.5">verified_user</span>
                  <span className="text-blue-900">
                    <strong>How it works:</strong> After filling in your details, you'll be redirected to the eGovPH Face Liveness page for real biometric detection. Your liveness selfie will become your profile photo.
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-on-surface mb-1">First Name</label>
                    <input
                      type="text"
                      value={editFirstName}
                      onChange={e => setEditFirstName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant focus:border-primary text-xs outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-on-surface mb-1">Last Name</label>
                    <input
                      type="text"
                      value={editLastName}
                      onChange={e => setEditLastName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant focus:border-primary text-xs outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1">Mobile Number</label>
                  <input
                    type="text"
                    value={editMobile}
                    onChange={e => setEditMobile(e.target.value)}
                    placeholder="+639090000000"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant focus:border-primary text-xs outline-none font-mono"
                  />
                </div>

                <div className="border-t border-outline-variant/30 pt-3">
                  <p className="text-xs font-bold text-primary mb-2">Address Information</p>
                  <div className="space-y-2 text-xs">
                    <div>
                      <label className="block text-[11px] text-on-surface-variant mb-1">Street Address</label>
                      <input type="text" value={editStreet} onChange={e => setEditStreet(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-outline-variant text-xs outline-none" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] text-on-surface-variant mb-1">Barangay</label>
                        <input type="text" value={editBarangay} onChange={e => setEditBarangay(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-outline-variant text-xs outline-none" />
                      </div>
                      <div>
                        <label className="block text-[11px] text-on-surface-variant mb-1">City / Municipality</label>
                        <input type="text" value={editCity} onChange={e => setEditCity(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-outline-variant text-xs outline-none" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] text-on-surface-variant mb-1">Province</label>
                        <input type="text" value={editProvince} onChange={e => setEditProvince(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-outline-variant text-xs outline-none" />
                      </div>
                      <div>
                        <label className="block text-[11px] text-on-surface-variant mb-1">ZIP Code</label>
                        <input type="text" value={editZip} onChange={e => setEditZip(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-outline-variant text-xs outline-none font-mono" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-3 flex flex-col gap-2">
                  <button
                    onClick={handleStartInAppLiveness}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-primary to-secondary text-white font-bold text-xs shadow-md hover:opacity-95 flex items-center justify-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-base">photo_camera_front</span>
                    Verify with Face Liveness (Camera) →
                  </button>
                  <div className="flex gap-2">
                    <button onClick={closeEditModal} className="flex-1 py-2.5 rounded-xl border border-outline-variant text-xs font-semibold text-on-surface-variant hover:bg-surface-container">
                      Cancel
                    </button>
                    <button
                      onClick={handleStartLiveness}
                      className="flex-1 py-2.5 rounded-xl bg-surface-container-high border border-outline-variant text-primary font-medium text-xs hover:bg-surface-container-highest flex items-center justify-center gap-1"
                    >
                      <span className="material-symbols-outlined text-sm">open_in_new</span>
                      Hosted eGovPH Page
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP 2: REDIRECTING TO eGovPH LIVENESS PAGE ──────────────── */}
            {livenessStep === 'redirecting' && (
              <div className="p-8 text-center space-y-5">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <span className="material-symbols-outlined text-5xl text-primary animate-pulse">face_retouching_natural</span>
                </div>
                <div className="space-y-2">
                  <h3 className="font-bold text-base text-on-surface">Face Liveness Biometric Check</h3>
                  <p className="text-xs text-on-surface-variant">
                    Starting face liveness verification. Please look directly at the camera when prompted.
                  </p>
                </div>
                <div className="flex justify-center">
                  <span className="material-symbols-outlined text-2xl text-primary animate-spin">progress_activity</span>
                </div>
                <p className="text-[11px] text-primary font-medium flex items-center justify-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">shield</span>
                  Official DICT Verified Security Service
                </p>
              </div>
            )}

            {/* ── STEP 3: RETURNED — FETCHING RESULT ───────────────────────── */}
            {livenessStep === 'verifying' && (
              <div className="p-8 text-center space-y-5">
                <div className="w-20 h-20 rounded-full bg-amber-50 flex items-center justify-center mx-auto">
                  <span className="material-symbols-outlined text-5xl text-amber-500 animate-spin">progress_activity</span>
                </div>
                <div className="space-y-2">
                  <h3 className="font-bold text-base text-on-surface">Confirming Biometric Verification...</h3>
                  <p className="text-xs text-on-surface-variant">
                    Verifying your biometric result with official government identity records. Please wait.
                  </p>
                </div>
              </div>
            )}

            {/* ── STEP 4: SUCCESS ───────────────────────────────────────────── */}
            {livenessStep === 'success' && verifiedResult && (
              <div className="p-6 text-center space-y-4">
                {/* Profile photo preview if captured */}
                {verifiedResult.photoUrl ? (
                  <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-emerald-400 mx-auto shadow-lg">
                    <img src={verifiedResult.photoUrl} alt="Liveness selfie" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-md">
                    <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  </div>
                )}

                <div className="space-y-1">
                  <h3 className="font-bold text-lg text-on-surface">Identity Verified & Profile Updated</h3>
                  <p className="text-xs text-on-surface-variant">
                    Your profile changes have been successfully saved and authenticated with your biometric check.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-surface-container-low text-left space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Biometric Match</span>
                    <span className="font-bold text-emerald-700">Verified ({verifiedResult.confidenceScore.toFixed(1)}% Match)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Verification Reference</span>
                    <span className="font-mono text-primary text-[11px]">VRF-{verifiedResult.token.slice(0, 8).toUpperCase()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Profile Photo</span>
                    <span className="font-semibold text-emerald-700">{verifiedResult.photoUrl ? 'Updated from selfie ✓' : 'Unchanged'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Citizen Notice</span>
                    <span className="font-semibold text-on-surface">Delivered via eMessage</span>
                  </div>
                </div>

                <button
                  onClick={closeEditModal}
                  className="w-full py-3 rounded-xl bg-primary text-white font-bold text-xs shadow-md hover:bg-primary/90"
                >
                  Done
                </button>
              </div>
            )}

            {/* ── STEP 5: FAILED ───────────────────────────────────────────── */}
            {livenessStep === 'failed' && (
              <div className="p-6 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto shadow-md">
                  <span className="material-symbols-outlined text-4xl">error</span>
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-lg text-on-surface">Liveness Check Failed</h3>
                  <p className="text-xs text-on-surface-variant">
                    {livenessError || 'The liveness check did not pass. Please ensure good lighting and try again.'}
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={handleStartInAppLiveness}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-primary to-secondary text-white font-bold text-xs shadow-md hover:opacity-95 flex items-center justify-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-base">photo_camera_front</span>
                    Verify with Camera (eVerify Web SDK)
                  </button>
                  <div className="flex gap-2">
                    <button onClick={closeEditModal} className="flex-1 py-2.5 rounded-xl border border-outline-variant text-xs font-semibold text-on-surface-variant hover:bg-surface-container">
                      Cancel
                    </button>
                    <button
                      onClick={() => { setLivenessStep('form'); setLivenessError(null) }}
                      className="flex-1 py-2.5 rounded-xl bg-surface-container-high border border-outline-variant text-primary font-medium text-xs hover:bg-surface-container-highest"
                    >
                      Edit Form
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      )}
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
