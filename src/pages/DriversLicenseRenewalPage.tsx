import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { verifyIdentity, triggerEVerifyLivenessSDK, VerifyResult } from '../services/eVerifyService'
import { createLivenessSession } from '../services/faceLivenessService'
import { createPaymentIntent, PaymentIntent } from '../services/eGovPayService'
import {
  sendVerificationConfirmation,
  sendPaymentConfirmation,
  sendApplicationConfirmation,
} from '../services/eMessageService'

type WizardStep = 'info' | 'verify' | 'details' | 'payment' | 'success'

const LTO_FEES = [
  { label: 'Driver\'s License Renewal Fee', amount: 585 },
  { label: 'Computer Fee', amount: 67.63 },
  { label: 'Violation Reduction Program (VRP)', amount: 450 },
  { label: 'Road Safety Fund', amount: 150 },
]

const STEPS: WizardStep[] = ['info', 'verify', 'details', 'payment', 'success']
const STEP_LABELS: Record<WizardStep, string> = {
  info: 'Requirements',
  verify: 'eVerify ID',
  details: 'Details',
  payment: 'eGovPay',
  success: 'Complete',
}

const REQUIREMENTS = [
  {
    icon: 'badge',
    title: 'Original Driver\'s License',
    desc: 'Your current valid or recently expired license',
  },
  {
    icon: 'assignment',
    title: 'Application Form (ADL)',
    desc: 'Accomplished Application for Driver\'s License — available at LTO or LTMS portal',
  },
  {
    icon: 'medical_information',
    title: 'Electronic Medical Certificate',
    desc: 'From an LTO-accredited physician, transmitted electronically to LTO system',
  },
  {
    icon: 'science',
    title: 'Drug Test Result (Negative)',
    desc: 'From an LTO-accredited drug testing center, electronically transmitted',
  },
  {
    icon: 'school',
    title: 'CDE Certificate',
    desc: 'Comprehensive Driver\'s Education certificate via LTMS portal or LTO centers',
  },
  {
    icon: 'fingerprint',
    title: 'Valid Government ID',
    desc: 'Passport, UMID, PhilSys, or any valid government-issued ID',
  },
]

const LICENSE_TYPES = [
  'Non-Professional (A)',
  'Non-Professional (B)',
  'Non-Professional (C)',
  'Professional (1)',
  'Professional (2)',
  'Professional (3)',
]

const DriversLicenseRenewalPage = () => {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [step, setStep] = useState<WizardStep>('info')
  const [verifying, setVerifying] = useState(false)
  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null)
  const [verifyError, setVerifyError] = useState<string | null>(null)
  const [paying, setPaying] = useState(false)
  const [paymentIntent, setPaymentIntent] = useState<PaymentIntent | null>(null)
  const [licenseType, setLicenseType] = useState('Non-Professional (B)')
  const [licenseNumber, setLicenseNumber] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [hasMedCert, setHasMedCert] = useState(false)
  const [hasDrugTest, setHasDrugTest] = useState(false)
  const [hasCDE, setHasCDE] = useState(false)
  const trackingId = `LTO-${Date.now().toString(36).toUpperCase()}`
  const totalFees = LTO_FEES.reduce((s, f) => s + f.amount, 0)
  const citizenName = user
    ? [user.firstName, user.middleName, user.lastName].filter(Boolean).join(' ')
    : 'Citizen'
  const stepIndex = STEPS.indexOf(step)
  const detailsReady = licenseNumber.trim() && expiryDate && hasMedCert && hasDrugTest && hasCDE

  const handleVerify = async () => {
    setVerifying(true)
    setVerifyError(null)
    try {
      let livenessSessionId = ''

      // Try launching the eVerify Face Liveness Web SDK
      try {
        livenessSessionId = await triggerEVerifyLivenessSDK()
      } catch (sdkErr) {
        console.warn('eVerify Web SDK popup error or skipped:', sdkErr)
        livenessSessionId = localStorage.getItem('egov_liveness_token') || ''
      }

      if (!livenessSessionId) {
        try {
          const session = await createLivenessSession({ action: 'close', delay: 3000 })
          livenessSessionId = session.token
        } catch {
          livenessSessionId = ''
        }
      }

      if (!livenessSessionId) {
        throw new Error('Face Liveness Session Required: Please complete biometric verification.')
      }

      const result = await verifyIdentity({
        firstName: user?.firstName || '',
        middleName: user?.middleName || '',
        lastName: user?.lastName || '',
        suffix: user?.suffix || '',
        birthDate: user?.birthdate || '1990-01-01',
        faceLivenessSessionId: livenessSessionId,
      })
      setVerifyResult(result)
      if (result.verified && user?.mobileNumber) {
        await sendVerificationConfirmation(user.mobileNumber, user.firstName || 'Citizen')
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Identity verification failed. Please try again.'
      setVerifyError(msg)
    } finally {
      setVerifying(false)
    }
  }

  const handleProceedToPayment = async () => {
    setPaying(true)
    try {
      const intent = await createPaymentIntent({
        amount: totalFees,
        description: `Driver's License Renewal — ${citizenName} | License: ${licenseNumber} | Ref: ${trackingId}`,
        citizenName,
        citizenEmail: user?.email,
        citizenMobile: user?.mobileNumber,
      })
      setPaymentIntent(intent)
      setStep('payment')
    } catch {
      alert('Unable to create payment intent. Please try again.')
    } finally {
      setPaying(false)
    }
  }

  const handleCompletePayment = async () => {
    if (!paymentIntent) return
    setPaying(true)
    await new Promise(r => setTimeout(r, 2000))
    if (user?.mobileNumber) {
      await sendPaymentConfirmation(user.mobileNumber, user.firstName || 'Citizen', totalFees, paymentIntent.referenceNumber)
      await sendApplicationConfirmation(user.mobileNumber, user.firstName || 'Citizen', "Driver's License Renewal", trackingId)
    }
    setPaying(false)
    setStep('success')
  }

  return (
    <main className="min-h-screen pt-20 pb-36 px-4 md:px-8 max-w-3xl mx-auto w-full">

      {/* ── Page Header ─────────────────────────────────────── */}
      <div className="mb-8 text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/10 text-secondary border border-secondary/20 text-xs font-bold">
          <span className="material-symbols-outlined text-base">directions_car</span>
          Land Transportation Office (LTO)
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-on-surface">Driver's License Renewal</h1>
        <p className="text-sm text-on-surface-variant max-w-lg mx-auto">
          Renew your Philippine driver's license online — powered by eVerify, eGovPay, and eMessage.
        </p>
      </div>

      {/* ── Progress Bar ─────────────────────────────────────── */}
      <div className="mb-8">
        <div className="flex items-center">
          {STEPS.map((s, i) => (
            <div key={s} className={`flex items-center ${i < STEPS.length - 1 ? 'flex-1' : ''}`}>
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                  i < stepIndex ? 'bg-secondary border-secondary text-white'
                  : i === stepIndex ? 'bg-secondary-container border-secondary text-secondary'
                  : 'bg-white border-outline-variant text-on-surface-variant'
                }`}>
                  {i < stepIndex
                    ? <span className="material-symbols-outlined text-sm">check</span>
                    : i + 1}
                </div>
                <span className={`text-[10px] mt-1 font-semibold hidden sm:block ${i === stepIndex ? 'text-secondary' : 'text-on-surface-variant'}`}>
                  {STEP_LABELS[s]}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`h-0.5 flex-1 mx-1 rounded ${i < stepIndex ? 'bg-secondary' : 'bg-outline-variant/40'}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ════════ STEP 1 — REQUIREMENTS INFO ════════ */}
      {step === 'info' && (
        <div className="space-y-5">
          {/* AI Summary banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-secondary/10 to-primary/5 border border-secondary/20 flex items-start gap-3">
            <span className="material-symbols-outlined text-secondary text-2xl mt-0.5 shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>smart_toy</span>
            <div className="text-sm text-on-surface-variant space-y-1">
              <p className="font-bold text-on-surface text-sm">What the AI found for you</p>
              <p>Driver's licenses are now valid for <strong>10 years</strong> (no violations) or <strong>5 years</strong> (with violations). You can renew up to <strong>60 days before expiry</strong>.</p>
            </div>
          </div>

          {/* Requirements grid */}
          <div className="bg-white rounded-2xl border border-outline-variant/40 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-outline-variant/20 flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary text-xl">checklist</span>
              <h2 className="font-bold text-on-surface">Requirements Checklist</h2>
            </div>
            <div className="divide-y divide-outline-variant/20">
              {REQUIREMENTS.map((req, i) => (
                <div key={i} className="flex items-start gap-4 px-5 py-4">
                  <div className="w-10 h-10 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-xl">{req.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-on-surface text-sm">{req.title}</p>
                    <p className="text-xs text-on-surface-variant mt-0.5 leading-relaxed">{req.desc}</p>
                  </div>
                  <span className="material-symbols-outlined text-outline/40 text-xl shrink-0 mt-1">radio_button_unchecked</span>
                </div>
              ))}
            </div>
          </div>

          {/* Fee preview */}
          <div className="bg-white rounded-2xl border border-outline-variant/40 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-outline-variant/20 flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary text-xl">receipt_long</span>
              <h2 className="font-bold text-on-surface">Estimated Fees</h2>
            </div>
            <div className="divide-y divide-outline-variant/20">
              {LTO_FEES.map((f, i) => (
                <div key={i} className="flex justify-between items-center px-5 py-3 text-sm">
                  <span className="text-on-surface-variant">{f.label}</span>
                  <span className="font-semibold text-on-surface">₱{f.amount.toLocaleString()}</span>
                </div>
              ))}
            </div>
            <div className="px-5 py-4 bg-secondary/5 border-t border-secondary/20 flex justify-between font-bold text-base">
              <span>Total Due</span>
              <span className="text-secondary">₱{totalFees.toLocaleString()}</span>
            </div>
          </div>

          {/* Important notes */}
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1.5">
            <p className="font-bold flex items-center gap-1.5"><span className="material-symbols-outlined text-base">info</span>Important Notes</p>
            <p>• Renew your license before its expiration date to avoid penalties.</p>
            <p>• The medical certificate and drug test results must be submitted electronically to LTO's system.</p>
            <p>• Complete the CDE online validation exam at the <strong>LTMS portal</strong> before your appointment.</p>
            <p>• Visit any LTO Licensing Center or District Office for photo and signature capture.</p>
          </div>

          <button
            onClick={() => setStep('verify')}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-secondary to-primary text-white font-bold text-sm shadow-lg hover:opacity-95 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-lg">arrow_forward</span>
            I Have All Requirements — Continue
          </button>
        </div>
      )}

      {/* ════════ STEP 2 — eVERIFY ════════ */}
      {step === 'verify' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-outline-variant/40 shadow-sm space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl">verified_user</span>
              </div>
              <div>
                <h2 className="font-bold text-on-surface">Identity Verification Required</h2>
                <p className="text-xs text-on-surface-variant">Required before any LTO government transaction.</p>
              </div>
            </div>

            {/* Pre-filled SSO data */}
            <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/30 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-secondary">
                <span className="material-symbols-outlined text-base">shield</span>
                Powered by PhilSys National ID — eVerify
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                {[
                  { label: 'Citizen Name', value: citizenName },
                  { label: 'eGovPH ID', value: user?.uniqid ? user.uniqid.slice(0, 12) + '…' : '—' },
                  { label: 'Mobile No.', value: user?.mobileNumber || '—' },
                  { label: 'Date of Birth', value: user?.birthdate ? new Date(user.birthdate).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }) : '—' },
                ].map(item => (
                  <div key={item.label} className="p-2.5 rounded-lg bg-white border border-outline-variant/20">
                    <span className="text-[10px] text-on-surface-variant block">{item.label}</span>
                    <span className="font-semibold text-on-surface truncate block">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {!verifyResult ? (
              <button onClick={handleVerify} disabled={verifying}
                className="w-full py-4 rounded-xl bg-secondary text-white font-bold text-sm shadow-lg hover:bg-secondary/90 disabled:opacity-60 flex items-center justify-center gap-2 transition-all">
                {verifying
                  ? <><span className="material-symbols-outlined animate-spin text-xl">progress_activity</span>Verifying with PhilSys…</>
                  : <><span className="material-symbols-outlined text-xl">fingerprint</span>Verify My Identity (eVerify)</>}
              </button>
            ) : (
              <div className={`p-4 rounded-xl ${verifyResult.verified ? 'bg-emerald-50 border border-emerald-300' : 'bg-error-container border border-error/30'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`material-symbols-outlined text-xl ${verifyResult.verified ? 'text-emerald-600' : 'text-error'}`} style={{ fontVariationSettings: "'FILL' 1" }}>
                    {verifyResult.verified ? 'verified' : 'cancel'}
                  </span>
                  <span className="font-bold text-sm">{verifyResult.verified ? 'Identity Verified ✓' : 'Verification Failed'}</span>
                </div>
                <p className="text-xs text-on-surface-variant">{verifyResult.message}</p>
                <p className="text-[10px] font-mono text-outline mt-1">Ref: {verifyResult.verificationId}</p>
                {verifyResult.verified && user?.mobileNumber && (
                  <p className="text-xs text-emerald-700 mt-2 flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">sms</span>
                    SMS confirmation sent to {user.mobileNumber}
                  </p>
                )}
              </div>
            )}
            {verifyError && <p className="text-xs text-error font-medium">{verifyError}</p>}
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep('info')} className="flex-1 py-3 rounded-xl border border-outline-variant text-on-surface-variant font-semibold text-sm hover:bg-surface-container transition-colors">← Back</button>
            {verifyResult?.verified && (
              <button onClick={() => setStep('details')} className="flex-1 py-3 rounded-xl bg-secondary text-white font-bold text-sm shadow-md hover:bg-secondary/90 transition-colors">Proceed to Details →</button>
            )}
          </div>
        </div>
      )}

      {/* ════════ STEP 3 — LICENSE DETAILS ════════ */}
      {step === 'details' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-outline-variant/40 shadow-sm space-y-5">
            <h2 className="font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary">directions_car</span>
              Driver's License Renewal Details
            </h2>

            {/* Applicant name */}
            <div className="p-3.5 rounded-xl bg-secondary/5 border border-secondary/20 text-xs flex items-center gap-2 text-on-surface-variant">
              <span className="material-symbols-outlined text-secondary text-base">account_circle</span>
              <span>Applicant: <strong className="text-on-surface">{citizenName}</strong></span>
              <span className="ml-auto text-tertiary font-semibold">eVerify ✓</span>
            </div>

            <div><label className="block text-xs font-bold text-on-surface mb-1.5">License Type</label>
              <select value={licenseType} onChange={e => setLicenseType(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-outline-variant focus:border-secondary outline-none text-sm bg-white">
                {LICENSE_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>

            <div><label className="block text-xs font-bold text-on-surface mb-1.5">Current License Number <span className="text-error">*</span></label>
              <input type="text" required placeholder="e.g. N01-12-345678" value={licenseNumber} onChange={e => setLicenseNumber(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-outline-variant focus:border-secondary focus:ring-2 focus:ring-secondary/20 outline-none text-sm"/>
            </div>

            <div><label className="block text-xs font-bold text-on-surface mb-1.5">Current License Expiry Date</label>
              <input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-outline-variant focus:border-secondary focus:ring-2 focus:ring-secondary/20 outline-none text-sm"/>
            </div>

            {/* Requirement confirmations */}
            <div className="border-t border-outline-variant/30 pt-4 space-y-3">
              <p className="text-xs font-bold text-on-surface uppercase tracking-wider">Confirm Submitted Requirements</p>
              {[
                { state: hasMedCert, setter: setHasMedCert, label: 'Electronic Medical Certificate (submitted electronically)' },
                { state: hasDrugTest, setter: setHasDrugTest, label: 'Negative Drug Test Result (submitted electronically)' },
                { state: hasCDE, setter: setHasCDE, label: 'CDE Certificate (Comprehensive Driver\'s Education)' },
              ].map((item, i) => (
                <label key={i} className="flex items-center gap-3 p-3 rounded-xl border border-outline-variant/40 hover:border-secondary/40 cursor-pointer transition-colors">
                  <input type="checkbox" checked={item.state} onChange={e => item.setter(e.target.checked)} className="w-5 h-5 accent-secondary rounded"/>
                  <span className="text-xs text-on-surface">{item.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep('verify')} className="flex-1 py-3 rounded-xl border border-outline-variant text-on-surface-variant font-semibold text-sm hover:bg-surface-container transition-colors">← Back</button>
            <button onClick={handleProceedToPayment} disabled={paying || !detailsReady} className="flex-1 py-3 rounded-xl bg-secondary text-white font-bold text-sm shadow-md hover:bg-secondary/90 disabled:opacity-50 flex items-center justify-center gap-2 transition-all">
              {paying ? <><span className="material-symbols-outlined animate-spin">progress_activity</span> Preparing…</> : <>Proceed to Payment →</>}
            </button>
          </div>
        </div>
      )}

      {/* ════════ STEP 4 — PAYMENT ════════ */}
      {step === 'payment' && paymentIntent && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-outline-variant/40 shadow-sm space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-tertiary/10 text-tertiary flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>lock</span>
              </div>
              <div>
                <h2 className="font-bold text-on-surface">Secure Government Payment</h2>
                <p className="text-xs text-on-surface-variant">Powered by eGovPay — PCI-DSS compliant</p>
              </div>
            </div>

            <div className="rounded-xl bg-gradient-to-br from-secondary to-primary p-5 text-white space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs text-white/70">Service</p>
                  <p className="font-bold text-sm">Driver's License Renewal</p>
                  <p className="text-xs text-white/70 mt-0.5">{licenseType}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-white/70">Amount Due</p>
                  <p className="font-bold text-2xl">₱{totalFees.toLocaleString()}</p>
                </div>
              </div>
              <div className="border-t border-white/20 pt-3 grid grid-cols-2 gap-3 text-xs">
                <div><p className="text-white/70">Payment ID</p><p className="font-mono">{paymentIntent.paymentId}</p></div>
                <div><p className="text-white/70">Reference No.</p><p className="font-mono">{paymentIntent.referenceNumber}</p></div>
                <div><p className="text-white/70">Payee</p><p className="font-semibold">{citizenName}</p></div>
                <div><p className="text-white/70">Expires</p><p>{new Date(paymentIntent.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p></div>
              </div>
            </div>

            {/* Fee breakdown */}
            <div className="rounded-xl bg-surface-container-low border border-outline-variant/30 overflow-hidden">
              <div className="divide-y divide-outline-variant/20">
                {LTO_FEES.map((f, i) => (
                  <div key={i} className="flex justify-between px-4 py-2.5 text-xs">
                    <span className="text-on-surface-variant">{f.label}</span>
                    <span className="font-semibold">₱{f.amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between px-4 py-3 border-t border-outline-variant/30 bg-surface-container font-bold text-sm">
                <span>Total</span><span className="text-secondary">₱{totalFees.toLocaleString()}</span>
              </div>
            </div>

            <div className="flex items-start gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200">
              <span className="material-symbols-outlined text-emerald-600 text-base mt-0.5">verified_user</span>
              <p className="text-xs text-emerald-800">Identity verified via <strong>eVerify</strong>. Payment encrypted and processed through <strong>eGovPay</strong>.</p>
            </div>

            <button onClick={handleCompletePayment} disabled={paying} className="w-full py-4 rounded-xl bg-gradient-to-r from-secondary to-primary text-white font-bold text-sm shadow-xl hover:opacity-95 active:scale-99 disabled:opacity-60 flex items-center justify-center gap-2 transition-all">
              {paying
                ? <><span className="material-symbols-outlined animate-spin">progress_activity</span>Processing Payment…</>
                : <><span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>payments</span>Pay ₱{totalFees.toLocaleString()} Now</>}
            </button>
          </div>
          <button onClick={() => setStep('details')} className="w-full py-3 rounded-xl border border-outline-variant text-on-surface-variant font-semibold text-sm hover:bg-surface-container transition-colors">← Back to Details</button>
        </div>
      )}

      {/* ════════ STEP 5 — SUCCESS ════════ */}
      {step === 'success' && (
        <div className="space-y-6 text-center">
          <div className="w-24 h-24 rounded-full bg-emerald-100 flex items-center justify-center mx-auto shadow-lg">
            <span className="material-symbols-outlined text-5xl text-emerald-600" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
          </div>
          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-on-surface">Payment Successful!</h2>
            <p className="text-sm text-on-surface-variant">Your Driver's License Renewal has been submitted to LTO.</p>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-outline-variant/40 shadow-sm text-left space-y-4">
            <h3 className="font-bold text-on-surface text-sm">Transaction Summary</h3>
            <div className="space-y-2.5">
              {[
                { label: 'Tracking ID', value: trackingId, mono: true },
                { label: 'Reference No.', value: paymentIntent?.referenceNumber || '—', mono: true },
                { label: 'Applicant', value: citizenName },
                { label: 'License Type', value: licenseType },
                { label: 'License No.', value: licenseNumber || '—' },
                { label: 'Amount Paid', value: `₱${totalFees.toLocaleString()}` },
                { label: 'Processed', value: new Date().toLocaleString() },
              ].map(item => (
                <div key={item.label} className="flex justify-between items-center text-xs py-2 border-b border-outline-variant/20 last:border-0">
                  <span className="text-on-surface-variant">{item.label}</span>
                  <span className={`font-semibold text-on-surface ${item.mono ? 'font-mono text-secondary' : ''}`}>{item.value}</span>
                </div>
              ))}
            </div>
            {user?.mobileNumber && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-secondary/5 border border-secondary/15 text-xs">
                <span className="material-symbols-outlined text-secondary text-base">sms</span>
                <span className="text-on-surface-variant">Confirmation SMS sent to <strong>{user.mobileNumber}</strong> via eMessage.</span>
              </div>
            )}
          </div>

          <div className="bg-surface-container-low rounded-2xl p-5 text-left border border-outline-variant/30 space-y-3">
            <h3 className="font-bold text-xs text-on-surface uppercase tracking-wider">What happens next?</h3>
            {[
              { icon: 'assignment_turned_in', text: 'Your renewal application is now being processed by the LTO.' },
              { icon: 'directions_car', text: 'Visit any LTO Licensing Center for photo and signature capture to complete issuance.' },
              { icon: 'notifications', text: 'You will receive SMS updates on your registered mobile number.' },
              { icon: 'article', text: 'Your new license will be ready for pickup at your chosen LTO branch.' },
            ].map((n, i) => (
              <div key={i} className="flex items-start gap-3 text-xs text-on-surface-variant">
                <span className="material-symbols-outlined text-secondary text-base mt-0.5">{n.icon}</span>
                <span>{n.text}</span>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button onClick={() => navigate('/activity')} className="flex-1 py-3 rounded-xl border border-outline-variant font-semibold text-sm text-on-surface-variant hover:bg-surface-container transition-colors">
              View Activity
            </button>
            <button onClick={() => navigate('/home')} className="flex-1 py-3 rounded-xl bg-secondary text-white font-bold text-sm shadow-md hover:bg-secondary/90 transition-colors">
              Back to AI Chat
            </button>
          </div>
        </div>
      )}

    </main>
  )
}

export default DriversLicenseRenewalPage
