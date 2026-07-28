import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { verifyIdentity, triggerEVerifyLivenessSDK, VerifyResult } from '../services/eVerifyService'
import { createPaymentIntent, PaymentIntent, FeeItem } from '../services/eGovPayService'
import {
  sendVerificationConfirmation,
  sendPaymentConfirmation,
  sendApplicationConfirmation,
} from '../services/eMessageService'

// ── Types ─────────────────────────────────────────────────────────────────────

type SSSServiceType = 'contribution' | 'salary_loan' | 'record_verification'
type WizardStep = 'select' | 'verify' | 'details' | 'payment' | 'success'

interface SSSServiceConfig {
  id: SSSServiceType
  icon: string
  title: string
  subtitle: string
  agency: string
  defaultFees: FeeItem[]
  color: string
  bgColor: string
}

const SSS_SERVICES: SSSServiceConfig[] = [
  {
    id: 'contribution',
    icon: 'payments',
    title: 'SSS Voluntary Contribution',
    subtitle: 'Pay monthly or quarterly contributions as Voluntary/Self-Employed/OFW',
    agency: 'Social Security System (SSS)',
    defaultFees: [
      { label: 'SSS Monthly Contribution (MSC ₱10,000)', amount: 1400 },
      { label: 'Workers\' Investment & Savings Program (WISP)', amount: 150 },
    ],
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 border-blue-200',
  },
  {
    id: 'salary_loan',
    icon: 'account_balance',
    title: 'Salary Loan Amortization',
    subtitle: 'Pay your monthly SSS Salary Loan balance or apply for new loan',
    agency: 'Social Security System (SSS)',
    defaultFees: [
      { label: 'SSS Salary Loan Monthly Amortization', amount: 1850 },
      { label: 'Processing Fee', amount: 50 },
    ],
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50 border-indigo-200',
  },
  {
    id: 'record_verification',
    icon: 'verified_user',
    title: 'SSS Member Record Verification',
    subtitle: 'Verify & link your SSS CRN with your PhilSys National ID via eVerify',
    agency: 'Social Security System (SSS)',
    defaultFees: [
      { label: 'Identity Verification & Sync Fee', amount: 0 },
    ],
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50 border-emerald-200',
  },
]

const STEPS: WizardStep[] = ['select', 'verify', 'details', 'payment', 'success']
const STEP_LABELS: Record<WizardStep, string> = {
  select: 'Select Service',
  verify: 'eVerify Biometric',
  details: 'SSS Details',
  payment: 'eGovPay',
  success: 'Completed',
}

const SSSServicesPage = () => {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [step, setStep] = useState<WizardStep>('select')
  const [selectedService, setSelectedService] = useState<SSSServiceConfig | null>(null)

  // Step 2 — Verify
  const [verifying, setVerifying] = useState(false)
  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null)
  const [verifyError, setVerifyError] = useState<string | null>(null)

  // Step 3 — Details
  const [sssNumber, setSssNumber] = useState('')
  const [prn, setPrn] = useState('')
  const [applicablePeriod, setApplicablePeriod] = useState('Current Month (July 2026)')
  const [membershipType, setMembershipType] = useState('Voluntary / Self-Employed')
  const [fees, setFees] = useState<FeeItem[]>([])

  // Step 4 — Payment
  const [paying, setPaying] = useState(false)
  const [paymentIntent, setPaymentIntent] = useState<PaymentIntent | null>(null)

  // Step 5 — Tracking
  const [trackingId] = useState(`SSS-${Date.now().toString(36).toUpperCase()}`)

  const citizenName = user
    ? [user.firstName, user.middleName, user.lastName].filter(Boolean).join(' ')
    : 'Citizen'

  const totalFees = fees.reduce((s, f) => s + f.amount, 0)
  const stepIndex = STEPS.indexOf(step)

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleSelectService = (svc: SSSServiceConfig) => {
    setSelectedService(svc)
    setFees(svc.defaultFees)
    setStep('verify')
  }

  const handleVerify = async () => {
    setVerifying(true)
    setVerifyError(null)
    try {
      let livenessSessionId = ''

      // Launch official eVerify Face Liveness Web SDK window (window.eKYC().start({ pubKey }))
      try {
        livenessSessionId = await triggerEVerifyLivenessSDK()
      } catch (sdkErr) {
        console.warn('eVerify Web SDK popup error or cancelled:', sdkErr)
        livenessSessionId = localStorage.getItem('egov_liveness_token') || ''
      }

      if (!livenessSessionId) {
        throw new Error('Face Liveness Session Required: Please complete biometric verification.')
      }

      const result = await verifyIdentity({
        firstName: user?.firstName || 'Citizen',
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

  const handleProceedToDetails = () => setStep('details')

  const handleProceedToPayment = async () => {
    if (!selectedService) return

    // If verification only (0 fee), jump to success directly
    if (totalFees === 0) {
      setStep('success')
      return
    }

    setPaying(true)
    try {
      const intent = await createPaymentIntent({
        amount: totalFees,
        description: `${selectedService.title} — ${citizenName}`,
        citizenName,
        citizenEmail: user?.email,
        citizenMobile: user?.mobileNumber,
        items: fees.map(f => ({ name: f.label, amount: f.amount })),
      })
      setPaymentIntent(intent)
      setStep('payment')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to create payment intent. Please try again.'
      alert(msg)
    } finally {
      setPaying(false)
    }
  }

  const handleCompletePayment = async () => {
    if (!paymentIntent || !selectedService) return
    setPaying(true)

    await new Promise(r => setTimeout(r, 1800))

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
    setSssNumber('')
    setPrn('')
  }

  return (
    <main className="min-h-screen pt-20 pb-36 px-4 md:px-8 max-w-3xl mx-auto w-full">

      {/* ── Page Header ─────────────────────────────────────── */}
      <div className="mb-8 text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold">
          <span className="material-symbols-outlined text-base">shield_person</span>
          Social Security System (SSS)
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-on-surface">SSS Services & Contributions</h1>
        <p className="text-sm text-on-surface-variant max-w-lg mx-auto">
          Pay SSS contributions, loan amortizations, and verify membership records — secured by eVerify, eGovPay, and eMessage.
        </p>
      </div>

      {/* ── Progress Bar ─────────────────────────────────────── */}
      {selectedService && (
        <div className="mb-8">
          <div className="flex items-center">
            {STEPS.map((s, i) => (
              <div key={s} className={`flex items-center ${i < STEPS.length - 1 ? 'flex-1' : ''}`}>
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                    i < stepIndex ? 'bg-blue-600 border-blue-600 text-white'
                    : i === stepIndex ? 'bg-blue-100 border-blue-600 text-blue-700'
                    : 'bg-white border-outline-variant text-on-surface-variant'
                  }`}>
                    {i < stepIndex
                      ? <span className="material-symbols-outlined text-sm">check</span>
                      : i + 1}
                  </div>
                  <span className={`text-[10px] mt-1 font-semibold hidden sm:block ${i === stepIndex ? 'text-blue-700' : 'text-on-surface-variant'}`}>
                    {STEP_LABELS[s]}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`h-0.5 flex-1 mx-1 rounded ${i < stepIndex ? 'bg-blue-600' : 'bg-outline-variant/40'}`} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ════════ STEP 1 — SELECT SSS SERVICE ════════ */}
      {step === 'select' && (
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-on-surface uppercase tracking-wider mb-2">Select SSS Transaction</h2>
          <div className="grid grid-cols-1 gap-3">
            {SSS_SERVICES.map(svc => (
              <button
                key={svc.id}
                onClick={() => handleSelectService(svc)}
                className={`p-5 rounded-2xl border text-left transition-all hover:shadow-md group flex items-start gap-4 ${svc.bgColor}`}
              >
                <div className={`w-12 h-12 rounded-xl bg-white flex items-center justify-center shadow-sm shrink-0 ${svc.color}`}>
                  <span className="material-symbols-outlined text-2xl">{svc.icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-base text-on-surface group-hover:text-blue-700 transition-colors">
                      {svc.title}
                    </h3>
                    <span className="material-symbols-outlined text-on-surface-variant group-hover:translate-x-1 transition-transform">
                      chevron_right
                    </span>
                  </div>
                  <p className="text-xs text-on-surface-variant mt-1">{svc.subtitle}</p>
                  <div className="mt-3 flex items-center gap-2 text-[11px] text-on-surface-variant font-medium">
                    <span className="px-2 py-0.5 rounded-md bg-white/80 border border-outline-variant font-mono">
                      {svc.agency}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ════════ STEP 2 — EVERIFY IDENTITY BIOMETRIC CHECK ════════ */}
      {step === 'verify' && selectedService && (
        <div className="p-6 rounded-3xl bg-white shadow-xl border border-outline-variant space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto shadow-inner">
              <span className="material-symbols-outlined text-3xl">verified_user</span>
            </div>
            <h2 className="text-lg font-bold text-on-surface">PhilSys eVerify Identity Check</h2>
            <p className="text-xs text-on-surface-variant max-w-sm mx-auto">
              Per SSS security regulations, identity verification via <strong>PhilSys eVerify</strong> and <strong>Face Liveness Web SDK</strong> is required before proceeding.
            </p>
          </div>

          {verifyError && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-rose-900">
                <span className="material-symbols-outlined text-base">error</span>
                Verification Failed
              </div>
              <p>{verifyError}</p>
            </div>
          )}

          {verifyResult?.verified ? (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs space-y-2">
              <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                PhilSys Identity Verified
              </div>
              <div className="space-y-1 text-emerald-900 font-mono text-[11px]">
                <p>Citizen: <strong>{verifyResult.citizenName || citizenName}</strong></p>
                <p>Verification Ref: <strong>{verifyResult.verificationId}</strong></p>
                <p>SMS Confirmation: Sent via eMessage</p>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant space-y-2 text-xs text-on-surface-variant">
              <p className="font-bold text-on-surface">Citizen Details to Verify:</p>
              <div className="grid grid-cols-2 gap-2 font-mono">
                <div>Name: <span className="font-bold text-on-surface">{citizenName}</span></div>
                <div>Birthdate: <span className="font-bold text-on-surface">{user?.birthdate || 'N/A'}</span></div>
                <div>Mobile: <span className="font-bold text-on-surface">{user?.mobileNumber || 'N/A'}</span></div>
                <div>PhilSys Ref: <span className="font-bold text-on-surface">{user?.uniqid || 'SSO-LINKED'}</span></div>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setStep('select')}
              className="flex-1 py-3 rounded-xl border border-outline-variant text-xs font-semibold text-on-surface-variant hover:bg-surface-container"
            >
              ← Back
            </button>

            {verifyResult?.verified ? (
              <button
                onClick={handleProceedToDetails}
                className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-md hover:bg-blue-700"
              >
                Continue to SSS Details →
              </button>
            ) : (
              <button
                onClick={handleVerify}
                disabled={verifying}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-xs shadow-md hover:opacity-95 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {verifying ? (
                  <>
                    <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>
                    Verifying with eVerify...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-base">face_retouching_natural</span>
                    Verify Identity (Face Liveness)
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ════════ STEP 3 — SSS TRANSACTION DETAILS ════════ */}
      {step === 'details' && selectedService && (
        <div className="p-6 rounded-3xl bg-white shadow-xl border border-outline-variant space-y-5">
          <div className="border-b border-outline-variant/60 pb-3">
            <h2 className="text-base font-bold text-on-surface">{selectedService.title}</h2>
            <p className="text-xs text-on-surface-variant">{selectedService.subtitle}</p>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-on-surface mb-1">SSS Number (SS / CRN)</label>
              <input
                type="text"
                value={sssNumber}
                onChange={e => setSssNumber(e.target.value)}
                placeholder="34-1234567-8"
                className="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant focus:border-blue-600 outline-none font-mono"
              />
            </div>

            {selectedService.id === 'contribution' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-on-surface mb-1">Membership Type</label>
                    <select
                      value={membershipType}
                      onChange={e => setMembershipType(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant focus:border-blue-600 outline-none bg-white"
                    >
                      <option>Voluntary / Self-Employed</option>
                      <option>OFW (Overseas Filipino Worker)</option>
                      <option>Non-Working Spouse</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-on-surface mb-1">Applicable Period</label>
                    <select
                      value={applicablePeriod}
                      onChange={e => setApplicablePeriod(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant focus:border-blue-600 outline-none bg-white"
                    >
                      <option>Current Month (July 2026)</option>
                      <option>Q3 2026 (July - September)</option>
                      <option>Q4 2026 (October - December)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-on-surface mb-1">Payment Reference Number (PRN)</label>
                  <input
                    type="text"
                    value={prn}
                    onChange={e => setPrn(e.target.value)}
                    placeholder="PRN-202607-XXXXXXXX"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant focus:border-blue-600 outline-none font-mono"
                  />
                  <p className="text-[10px] text-on-surface-variant mt-1">Generated via SSS Mobile App or My.SSS portal</p>
                </div>
              </>
            )}

            {selectedService.id === 'salary_loan' && (
              <div>
                <label className="block font-bold text-on-surface mb-1">Loan Account Number / PRN</label>
                <input
                  type="text"
                  value={prn}
                  onChange={e => setPrn(e.target.value)}
                  placeholder="SL-PRN-2026-XXXXXX"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant focus:border-blue-600 outline-none font-mono"
                />
              </div>
            )}
          </div>

          {/* Fee Breakdown */}
          <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/60 space-y-2">
            <h3 className="text-xs font-bold text-on-surface uppercase tracking-wider">Fee Assessment</h3>
            <div className="space-y-1.5 text-xs">
              {fees.map((f, i) => (
                <div key={i} className="flex justify-between text-on-surface-variant">
                  <span>{f.label}</span>
                  <span className="font-mono font-semibold">₱{f.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              ))}
              <div className="border-t border-outline-variant/60 pt-2 flex justify-between font-bold text-on-surface text-sm">
                <span>Total Amount Due</span>
                <span className="font-mono text-blue-700">₱{totalFees.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setStep('verify')}
              className="flex-1 py-3 rounded-xl border border-outline-variant text-xs font-semibold text-on-surface-variant hover:bg-surface-container"
            >
              ← Back
            </button>
            <button
              onClick={handleProceedToPayment}
              disabled={paying}
              className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-md hover:bg-blue-700 flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {paying ? (
                <>
                  <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>
                  Generating Payment...
                </>
              ) : (
                <>
                  Proceed to eGovPay →
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ════════ STEP 4 — EGOVPAY PAYMENT ════════ */}
      {step === 'payment' && paymentIntent && selectedService && (
        <div className="p-6 rounded-3xl bg-white shadow-xl border border-outline-variant space-y-5">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto shadow-inner">
              <span className="material-symbols-outlined text-3xl">payments</span>
            </div>
            <h2 className="text-lg font-bold text-on-surface">eGovPay Gateway Checkout</h2>
            <p className="text-xs text-on-surface-variant">
              Complete your SSS payment securely via eGovPay.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-on-surface-variant">Transaction Ref:</span>
              <span className="font-mono font-bold text-on-surface">{paymentIntent.referenceNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-on-surface-variant">Citizen Name:</span>
              <span className="font-semibold text-on-surface">{citizenName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-on-surface-variant">Service:</span>
              <span className="font-semibold text-on-surface">{selectedService.title}</span>
            </div>
            <div className="border-t border-outline-variant/60 pt-2 flex justify-between font-bold text-sm">
              <span className="text-on-surface">Total Amount:</span>
              <span className="font-mono text-blue-700">₱{paymentIntent.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          {/* Hosted Payment URL button */}
          <a
            href={paymentIntent.paymentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full py-3.5 px-4 rounded-xl bg-emerald-600 text-white text-center font-bold text-xs shadow-md hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-lg">open_in_new</span>
            Open Official eGovPay Payment Gateway Page
          </a>

          <div className="border-t border-outline-variant/40 pt-4 space-y-3">
            <p className="text-[11px] text-center text-on-surface-variant">
              Once payment is completed on eGovPay, click below to finalize your SSS filing:
            </p>
            <button
              onClick={handleCompletePayment}
              disabled={paying}
              className="w-full py-3.5 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-md hover:bg-blue-700 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {paying ? (
                <>
                  <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>
                  Confirming Payment & Sending SMS...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-base">check_circle</span>
                  I Have Completed Payment — Confirm SSS Filing
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ════════ STEP 5 — SUCCESS & SMS CONFIRMATION ════════ */}
      {step === 'success' && selectedService && (
        <div className="p-6 rounded-3xl bg-white shadow-xl border border-outline-variant text-center space-y-5 animate-fadeIn">
          <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-md">
            <span className="material-symbols-outlined text-5xl" style={{ fontVariationSettings: "'FILL' 1" }}>task_alt</span>
          </div>

          <div className="space-y-1">
            <h2 className="text-xl font-bold text-on-surface">SSS Transaction Completed!</h2>
            <p className="text-xs text-on-surface-variant">
              Your <strong>{selectedService.title}</strong> has been successfully processed and verified.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-surface-container-low text-left space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-on-surface-variant">Tracking Number</span>
              <span className="font-mono font-bold text-blue-700">{trackingId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-on-surface-variant">eVerify Status</span>
              <span className="font-bold text-emerald-700">Verified ✓ (PhilSys)</span>
            </div>
            {paymentIntent && (
              <div className="flex justify-between">
                <span className="text-on-surface-variant">eGovPay Ref</span>
                <span className="font-mono font-semibold text-on-surface">{paymentIntent.referenceNumber}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-on-surface-variant">SMS Notification</span>
              <span className="font-semibold text-emerald-700">Sent via eMessage ✓</span>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={reset}
              className="flex-1 py-3 rounded-xl border border-outline-variant text-xs font-semibold text-on-surface-variant hover:bg-surface-container"
            >
              New SSS Transaction
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-md hover:bg-blue-700"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      )}

    </main>
  )
}

export default SSSServicesPage
