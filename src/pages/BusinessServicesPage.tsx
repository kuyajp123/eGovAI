import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { verifyIdentity, VerifyResult } from '../services/eVerifyService'
import {
  createPaymentIntent,
  PaymentIntent,
  FeeItem,
  getBusinessPermitFees,
  getTaxFees,
} from '../services/eGovPayService'
import {
  sendVerificationConfirmation,
  sendPaymentConfirmation,
  sendApplicationConfirmation,
} from '../services/eMessageService'

// ── Types ─────────────────────────────────────────────────────────────────────

type ServiceType = 'business_new' | 'business_renewal' | 'tax_real' | 'tax_community' | 'tax_professional'
type WizardStep = 'select' | 'verify' | 'details' | 'payment' | 'success'

interface ServiceConfig {
  id: ServiceType
  icon: string
  title: string
  subtitle: string
  agency: string
  feeType: string
  color: string
  bgColor: string
}

const SERVICES: ServiceConfig[] = [
  {
    id: 'business_new',
    icon: 'add_business',
    title: 'New Business Permit',
    subtitle: 'Register a new business with your LGU',
    agency: 'City/Municipal Business Permit & Licensing Office',
    feeType: 'new',
    color: 'text-primary',
    bgColor: 'bg-primary-container/20',
  },
  {
    id: 'business_renewal',
    icon: 'autorenew',
    title: 'Business Permit Renewal',
    subtitle: 'Renew your existing annual business permit',
    agency: 'City/Municipal Business Permit & Licensing Office',
    feeType: 'renewal',
    color: 'text-secondary',
    bgColor: 'bg-secondary-container/20',
  },
  {
    id: 'tax_real',
    icon: 'home_work',
    title: 'Real Property Tax',
    subtitle: 'Pay annual real property tax for land & buildings',
    agency: 'City/Municipal Treasurer\'s Office',
    feeType: 'real_property',
    color: 'text-tertiary',
    bgColor: 'bg-tertiary-fixed-dim/20',
  },
  {
    id: 'tax_community',
    icon: 'badge',
    title: 'Community Tax Certificate',
    subtitle: 'Obtain or renew your Cedula / CTC',
    agency: 'Barangay / City Treasurer\'s Office',
    feeType: 'community',
    color: 'text-primary',
    bgColor: 'bg-primary-container/20',
  },
  {
    id: 'tax_professional',
    icon: 'school',
    title: 'Professional Tax Receipt',
    subtitle: 'Annual PTR for licensed professionals',
    agency: 'City/Municipal Treasurer\'s Office',
    feeType: 'professional',
    color: 'text-secondary',
    bgColor: 'bg-secondary-container/20',
  },
]

// ── Component ─────────────────────────────────────────────────────────────────

const BusinessServicesPage = () => {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [step, setStep] = useState<WizardStep>('select')
  const [selectedService, setSelectedService] = useState<ServiceConfig | null>(null)

  // Step 2 — Verify
  const [verifying, setVerifying] = useState(false)
  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null)
  const [verifyError, setVerifyError] = useState<string | null>(null)

  // Step 3 — Details
  const [businessName, setBusinessName] = useState('')
  const [businessAddress, setBusinessAddress] = useState(
    user ? [user.address?.barangay, user.address?.city, user.address?.province].filter(Boolean).join(', ') : ''
  )
  const [businessType, setBusinessType] = useState('Retail / Sari-Sari Store')
  const [tin, setTin] = useState('')
  const [propertyAddress, setPropertyAddress] = useState('')
  const [fees, setFees] = useState<FeeItem[]>([])

  // Step 4 — Payment
  const [paying, setPaying] = useState(false)
  const [paymentIntent, setPaymentIntent] = useState<PaymentIntent | null>(null)
  const [, setPaymentDone] = useState(false)

  // Step 5 — Success
  const [trackingId] = useState(`TRK-${Date.now().toString(36).toUpperCase()}`)

  // ── Helpers ─────────────────────────────────────────────────────────────────

  const citizenName = user
    ? [user.firstName, user.middleName, user.lastName].filter(Boolean).join(' ')
    : 'Citizen'

  const totalFees = fees.reduce((s, f) => s + f.amount, 0)

  const isBusinessService = (s: ServiceConfig | null) =>
    s?.id === 'business_new' || s?.id === 'business_renewal'

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleSelectService = (svc: ServiceConfig) => {
    setSelectedService(svc)
    const feeList = svc.id.startsWith('business')
      ? getBusinessPermitFees(svc.feeType)
      : getTaxFees(svc.feeType)
    setFees(feeList)
    setStep('verify')
  }

  const handleVerify = async () => {
    setVerifying(true)
    setVerifyError(null)
    try {
      const result = await verifyIdentity({
        uniqid: user?.uniqid || user?.id,
        mobileNumber: user?.mobileNumber,
        firstName: user?.firstName,
        lastName: user?.lastName,
        birthdate: user?.birthdate,
      })
      setVerifyResult(result)

      if (result.verified && user?.mobileNumber) {
        await sendVerificationConfirmation(user.mobileNumber, user.firstName || 'Citizen')
      }
    } catch {
      setVerifyError('Identity verification failed. Please try again.')
    } finally {
      setVerifying(false)
    }
  }

  const handleProceedToDetails = () => setStep('details')

  const handleProceedToPayment = async () => {
    if (!selectedService) return
    setPaying(true)
    try {
      const intent = await createPaymentIntent({
        amount: totalFees,
        description: `${selectedService.title} — ${citizenName}`,
        citizenName,
        citizenEmail: user?.email,
        citizenMobile: user?.mobileNumber,
        metadata: {
          service_type: selectedService.id,
          tracking_id: trackingId,
          tin: tin,
        },
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
    if (!paymentIntent || !selectedService) return
    setPaying(true)

    // Simulate payment completion (in production: open paymentIntent.paymentUrl, then poll status)
    await new Promise(r => setTimeout(r, 2000))
    setPaymentDone(true)

    // Send SMS confirmations
    if (user?.mobileNumber) {
      await sendPaymentConfirmation(
        user.mobileNumber,
        user.firstName || 'Citizen',
        totalFees,
        paymentIntent.referenceNumber
      )
      await sendApplicationConfirmation(
        user.mobileNumber,
        user.firstName || 'Citizen',
        selectedService.title,
        trackingId
      )
    }

    setPaying(false)
    setStep('success')
  }

  const reset = () => {
    setStep('select')
    setSelectedService(null)
    setVerifyResult(null)
    setVerifyError(null)
    setPaymentIntent(null)
    setPaymentDone(false)
    setBusinessName('')
    setTin('')
    setPropertyAddress('')
  }

  // ── Step progress indicator ──────────────────────────────────────────────────

  const STEPS = ['select', 'verify', 'details', 'payment', 'success']
  const stepIndex = STEPS.indexOf(step)

  const stepLabels: Record<WizardStep, string> = {
    select: 'Service',
    verify: 'eVerify ID',
    details: 'Details',
    payment: 'eGovPay',
    success: 'Complete',
  }

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen pt-20 pb-36 px-4 md:px-8 max-w-3xl mx-auto w-full">

      {/* ── Page Header ──────────────────────────────────────── */}
      <div className="mb-8 text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-bold">
          <span className="material-symbols-outlined text-base">account_balance</span>
          eGovPH Business & Tax Services
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-on-surface">
          Business Permits & Tax Payments
        </h1>
        <p className="text-sm text-on-surface-variant max-w-lg mx-auto">
          Verified, secure government transactions — powered by eVerify, eGovPay, and eMessage.
        </p>
      </div>

      {/* ── Progress Bar ─────────────────────────────────────── */}
      {step !== 'select' && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center flex-1">
                <div className={`flex flex-col items-center ${i < STEPS.length - 1 ? 'flex-1' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                    i < stepIndex
                      ? 'bg-primary border-primary text-white'
                      : i === stepIndex
                      ? 'bg-primary-container border-primary text-primary'
                      : 'bg-white border-outline-variant text-on-surface-variant'
                  }`}>
                    {i < stepIndex
                      ? <span className="material-symbols-outlined text-sm">check</span>
                      : i + 1}
                  </div>
                  <span className={`text-[10px] mt-1 font-semibold hidden sm:block ${i === stepIndex ? 'text-primary' : 'text-on-surface-variant'}`}>
                    {stepLabels[s as WizardStep]}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`h-0.5 flex-1 mx-1 rounded ${i < stepIndex ? 'bg-primary' : 'bg-outline-variant/40'}`} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
          STEP 1 — SELECT SERVICE
      ════════════════════════════════════════════════════════ */}
      {step === 'select' && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-on-surface">What service do you need?</h2>
          {SERVICES.map(svc => (
            <button
              key={svc.id}
              onClick={() => handleSelectService(svc)}
              className="w-full p-5 rounded-2xl bg-white border border-outline-variant/40 hover:border-primary/50 hover:shadow-md shadow-sm text-left flex items-center gap-4 group transition-all"
            >
              <div className={`w-12 h-12 rounded-xl ${svc.bgColor} ${svc.color} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}>
                <span className="material-symbols-outlined text-2xl">{svc.icon}</span>
              </div>
              <div className="flex-grow">
                <h3 className="font-bold text-on-surface group-hover:text-primary transition-colors">{svc.title}</h3>
                <p className="text-xs text-on-surface-variant mt-0.5">{svc.subtitle}</p>
                <p className="text-[11px] text-outline mt-1">{svc.agency}</p>
              </div>
              <span className="material-symbols-outlined text-outline group-hover:text-primary group-hover:translate-x-1 transition-all">
                chevron_right
              </span>
            </button>
          ))}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
          STEP 2 — IDENTITY VERIFICATION (eVerify)
      ════════════════════════════════════════════════════════ */}
      {step === 'verify' && (
        <div className="space-y-6">
          {/* Header */}
          <div className="bg-white rounded-2xl p-6 border border-outline-variant/40 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl">verified_user</span>
              </div>
              <div>
                <h2 className="font-bold text-on-surface">Identity Verification Required</h2>
                <p className="text-xs text-on-surface-variant">
                  Required by law before any government financial transaction.
                </p>
              </div>
            </div>

            {/* eVerify info card */}
            <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/30 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-primary">
                <span className="material-symbols-outlined text-base">shield</span>
                Powered by PhilSys National ID eVerify
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                {[
                  { label: 'Citizen Name', value: citizenName || '—' },
                  { label: 'eGovPH ID', value: user?.uniqid ? user.uniqid.slice(0, 12) + '…' : '—' },
                  { label: 'Mobile No.', value: user?.mobileNumber || '—' },
                  { label: 'Service', value: selectedService?.title || '—' },
                ].map(item => (
                  <div key={item.label} className="p-2.5 rounded-lg bg-white border border-outline-variant/20">
                    <span className="text-[10px] text-on-surface-variant block">{item.label}</span>
                    <span className="font-semibold text-on-surface truncate block">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Verify button / result */}
            {!verifyResult ? (
              <button
                onClick={handleVerify}
                disabled={verifying}
                className="w-full py-4 rounded-xl bg-primary text-white font-bold text-sm shadow-lg hover:bg-primary/90 disabled:opacity-60 flex items-center justify-center gap-2 transition-all"
              >
                {verifying ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-xl">progress_activity</span>
                    Verifying with PhilSys…
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-xl">fingerprint</span>
                    Verify My Identity (eVerify)
                  </>
                )}
              </button>
            ) : (
              <div className={`p-4 rounded-xl ${verifyResult.verified ? 'bg-emerald-50 border border-emerald-300' : 'bg-error-container border border-error/30'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`material-symbols-outlined text-xl ${verifyResult.verified ? 'text-emerald-600' : 'text-error'}`}
                    style={{ fontVariationSettings: "'FILL' 1" }}>
                    {verifyResult.verified ? 'verified' : 'cancel'}
                  </span>
                  <span className="font-bold text-sm">
                    {verifyResult.verified ? 'Identity Verified ✓' : 'Verification Failed'}
                  </span>
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

            {verifyError && (
              <p className="text-xs text-error font-medium">{verifyError}</p>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <button onClick={() => setStep('select')} className="flex-1 py-3 rounded-xl border border-outline-variant text-on-surface-variant font-semibold text-sm hover:bg-surface-container transition-colors">
              ← Back
            </button>
            {verifyResult?.verified && (
              <button
                onClick={handleProceedToDetails}
                className="flex-1 py-3 rounded-xl bg-primary text-white font-bold text-sm shadow-md hover:bg-primary/90 transition-colors"
              >
                Proceed to Details →
              </button>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
          STEP 3 — APPLICATION DETAILS
      ════════════════════════════════════════════════════════ */}
      {step === 'details' && selectedService && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-outline-variant/40 shadow-sm space-y-5">
            <h2 className="font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">{selectedService.icon}</span>
              {selectedService.title} — Application Details
            </h2>

            {/* Pre-filled citizen info */}
            <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/20 text-xs flex items-center gap-2 text-on-surface-variant">
              <span className="material-symbols-outlined text-primary text-base">account_circle</span>
              <span>Applicant: <strong className="text-on-surface">{citizenName}</strong></span>
              <span className="ml-auto text-tertiary font-semibold">eVerify ✓</span>
            </div>

            {isBusinessService(selectedService) ? (
              <>
                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1.5">Business Name <span className="text-error">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Juan's General Merchandise"
                    value={businessName}
                    onChange={e => setBusinessName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1.5">Business Address</label>
                  <input
                    type="text"
                    value={businessAddress}
                    onChange={e => setBusinessAddress(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1.5">Nature of Business</label>
                  <select
                    value={businessType}
                    onChange={e => setBusinessType(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-outline-variant focus:border-primary outline-none text-sm bg-white"
                  >
                    {['Retail / Sari-Sari Store', 'Food & Beverage', 'Services / Repair Shop', 'Manufacturing', 'Real Estate', 'IT / Tech Services', 'Healthcare', 'Education', 'Construction', 'Other'].map(t => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1.5">TIN (Tax Identification Number)</label>
                  <input
                    type="text"
                    placeholder="000-000-000-000"
                    value={tin}
                    onChange={e => setTin(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm"
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1.5">
                    {selectedService.id === 'tax_real' ? 'Property Address' : 'Address / Location'}
                    <span className="text-error"> *</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Lot 5 Blk 3, Barangay San Jose, Quezon City"
                    value={propertyAddress}
                    onChange={e => setPropertyAddress(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm"
                  />
                </div>
                {selectedService.id === 'tax_professional' && (
                  <div>
                    <label className="block text-xs font-bold text-on-surface mb-1.5">PRC License Number</label>
                    <input
                      type="text"
                      placeholder="e.g. 0123456"
                      value={tin}
                      onChange={e => setTin(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm"
                    />
                  </div>
                )}
              </>
            )}

            {/* Fee Summary */}
            <div className="rounded-xl bg-surface-container-low border border-outline-variant/30 overflow-hidden">
              <div className="px-4 py-3 border-b border-outline-variant/20 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-base">receipt_long</span>
                <span className="text-xs font-bold text-on-surface">Fee Breakdown</span>
              </div>
              <div className="divide-y divide-outline-variant/20">
                {fees.map((fee, i) => (
                  <div key={i} className="px-4 py-2.5 flex justify-between text-xs">
                    <span className="text-on-surface-variant">{fee.label}</span>
                    <span className="font-semibold text-on-surface">₱{fee.amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>
              <div className="px-4 py-3 border-t border-outline-variant/30 flex justify-between font-bold text-sm bg-surface-container">
                <span>Total Amount Due</span>
                <span className="text-primary text-base">₱{totalFees.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep('verify')} className="flex-1 py-3 rounded-xl border border-outline-variant text-on-surface-variant font-semibold text-sm hover:bg-surface-container transition-colors">
              ← Back
            </button>
            <button
              onClick={handleProceedToPayment}
              disabled={paying || (isBusinessService(selectedService) && !businessName.trim())}
              className="flex-1 py-3 rounded-xl bg-primary text-white font-bold text-sm shadow-md hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
            >
              {paying ? (
                <><span className="material-symbols-outlined animate-spin">progress_activity</span> Preparing…</>
              ) : (
                <>Proceed to Payment →</>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
          STEP 4 — PAYMENT (eGovPay)
      ════════════════════════════════════════════════════════ */}
      {step === 'payment' && paymentIntent && (
        <div className="space-y-6">
          {/* Secure Payment Header */}
          <div className="bg-white rounded-2xl p-6 border border-outline-variant/40 shadow-sm space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-tertiary/10 text-tertiary flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                  lock
                </span>
              </div>
              <div>
                <h2 className="font-bold text-on-surface">Secure Government Payment</h2>
                <p className="text-xs text-on-surface-variant">Powered by eGovPay — PCI-DSS compliant</p>
              </div>
            </div>

            {/* Payment details card */}
            <div className="rounded-xl bg-gradient-to-br from-primary to-secondary p-5 text-white space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs text-white/70">Service</p>
                  <p className="font-bold text-sm">{selectedService?.title}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-white/70">Amount Due</p>
                  <p className="font-bold text-2xl">₱{totalFees.toLocaleString()}</p>
                </div>
              </div>
              <div className="border-t border-white/20 pt-3 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-white/70">Payment ID</p>
                  <p className="font-mono">{paymentIntent.paymentId}</p>
                </div>
                <div>
                  <p className="text-white/70">Reference No.</p>
                  <p className="font-mono">{paymentIntent.referenceNumber}</p>
                </div>
                <div>
                  <p className="text-white/70">Payee</p>
                  <p className="font-semibold">{citizenName}</p>
                </div>
                <div>
                  <p className="text-white/70">Expires</p>
                  <p>{new Date(paymentIntent.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>
            </div>

            {/* Payment methods */}
            <div>
              <p className="text-xs font-bold text-on-surface mb-2">Accepted Payment Methods</p>
              <div className="flex flex-wrap gap-2">
                {['GCash', 'Maya', 'BancNet', 'Credit Card', 'OTC Banks', 'UnionBank'].map(m => (
                  <span key={m} className="px-3 py-1.5 rounded-full text-xs border border-outline-variant/40 bg-surface-container font-medium text-on-surface-variant">
                    {m}
                  </span>
                ))}
              </div>
            </div>

            {/* Security notice */}
            <div className="flex items-start gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200">
              <span className="material-symbols-outlined text-emerald-600 text-base mt-0.5">verified_user</span>
              <p className="text-xs text-emerald-800">
                Your identity is verified via <strong>eVerify</strong>. This payment is encrypted and processed securely through the <strong>eGovPay</strong> national payment infrastructure.
              </p>
            </div>

            {/* Payment CTA */}
            <button
              onClick={handleCompletePayment}
              disabled={paying}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-primary to-secondary text-white font-bold text-sm shadow-xl hover:opacity-95 active:scale-99 disabled:opacity-60 flex items-center justify-center gap-2 transition-all"
            >
              {paying ? (
                <><span className="material-symbols-outlined animate-spin">progress_activity</span>Processing Payment…</>
              ) : (
                <><span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>payments</span>Pay ₱{totalFees.toLocaleString()} Now</>
              )}
            </button>
          </div>

          <button onClick={() => setStep('details')} className="w-full py-3 rounded-xl border border-outline-variant text-on-surface-variant font-semibold text-sm hover:bg-surface-container transition-colors">
            ← Back to Details
          </button>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
          STEP 5 — SUCCESS
      ════════════════════════════════════════════════════════ */}
      {step === 'success' && (
        <div className="space-y-6 text-center">
          {/* Animated success badge */}
          <div className="w-24 h-24 rounded-full bg-emerald-100 flex items-center justify-center mx-auto shadow-lg">
            <span className="material-symbols-outlined text-5xl text-emerald-600" style={{ fontVariationSettings: "'FILL' 1" }}>
              check_circle
            </span>
          </div>

          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-on-surface">Payment Successful!</h2>
            <p className="text-sm text-on-surface-variant">
              Your {selectedService?.title} application has been submitted.
            </p>
          </div>

          {/* Summary card */}
          <div className="bg-white rounded-2xl p-6 border border-outline-variant/40 shadow-sm text-left space-y-4">
            <h3 className="font-bold text-on-surface text-sm">Transaction Summary</h3>
            <div className="space-y-2.5">
              {[
                { label: 'Tracking ID', value: trackingId, mono: true },
                { label: 'Reference No.', value: paymentIntent?.referenceNumber || '—', mono: true },
                { label: 'Service', value: selectedService?.title || '—' },
                { label: 'Agency', value: selectedService?.agency || '—' },
                { label: 'Amount Paid', value: `₱${totalFees.toLocaleString()}` },
                { label: 'Processed', value: new Date().toLocaleString() },
              ].map(item => (
                <div key={item.label} className="flex justify-between items-center text-xs py-2 border-b border-outline-variant/20 last:border-0">
                  <span className="text-on-surface-variant">{item.label}</span>
                  <span className={`font-semibold text-on-surface ${item.mono ? 'font-mono text-primary' : ''}`}>{item.value}</span>
                </div>
              ))}
            </div>

            {/* SMS notice */}
            {user?.mobileNumber && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-primary/5 border border-primary/15 text-xs">
                <span className="material-symbols-outlined text-primary text-base">sms</span>
                <span className="text-on-surface-variant">
                  Confirmation SMS sent to <strong>{user.mobileNumber}</strong> via eMessage.
                </span>
              </div>
            )}
          </div>

          {/* Next steps */}
          <div className="bg-surface-container-low rounded-2xl p-5 text-left border border-outline-variant/30 space-y-3">
            <h3 className="font-bold text-xs text-on-surface uppercase tracking-wider">What happens next?</h3>
            {[
              { icon: 'assignment_turned_in', text: 'Your application is now being processed by the assigned agency.' },
              { icon: 'notifications', text: 'You will receive SMS updates on your mobile number.' },
              { icon: 'article', text: 'Your official permit/receipt will be ready for pickup at the city hall or sent digitally.' },
            ].map((n, i) => (
              <div key={i} className="flex items-start gap-3 text-xs text-on-surface-variant">
                <span className="material-symbols-outlined text-primary text-base mt-0.5">{n.icon}</span>
                <span>{n.text}</span>
              </div>
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/activity')}
              className="flex-1 py-3 rounded-xl border border-outline-variant font-semibold text-sm text-on-surface-variant hover:bg-surface-container transition-colors"
            >
              View My Activity
            </button>
            <button
              onClick={reset}
              className="flex-1 py-3 rounded-xl bg-primary text-white font-bold text-sm shadow-md hover:bg-primary/90 transition-colors"
            >
              New Transaction
            </button>
          </div>
        </div>
      )}

    </main>
  )
}

export default BusinessServicesPage
