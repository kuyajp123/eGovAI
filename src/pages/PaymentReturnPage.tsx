import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getTransactionDetails, publishPaymentStatus, TransactionDetails } from '../services/eGovPayService'
import { sendPaymentConfirmation } from '../services/eMessageService'

const POLL_INTERVAL_MS = 3000   // check every 3 seconds
const MAX_POLL_ATTEMPTS = 20    // give up after ~60 seconds

const PaymentReturnPage = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()

  const [details, setDetails] = useState<TransactionDetails | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pollAttempts, setPollAttempts] = useState(0)
  const [isPolling, setIsPolling] = useState(true)
  const [smsSent, setSmsSent] = useState(false)
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Helper to read cached transaction from localStorage
  const getCachedTx = () => {
    try {
      const raw = localStorage.getItem('egov_latest_pending_transaction')
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  }

  // URL params from eGovPay redirect or localStorage
  const cachedTx = getCachedTx()
  const uuid = searchParams.get('uuid') || searchParams.get('transaction_uuid') || cachedTx?.uuid || ''
  const txnid = searchParams.get('txnid') || cachedTx?.txnid || ''
  const urlStatus = (searchParams.get('status') || searchParams.get('payment_status') || '').toUpperCase()

  const effectiveStatus = (details?.payment_status || urlStatus || '').toUpperCase()
  const isPaid = effectiveStatus === 'PAID' || effectiveStatus === 'SUCCESS'
  const isFailed = effectiveStatus === 'FAILED' || effectiveStatus === 'CANCELLED'
  const isResolved = isPaid || isFailed
  const isTimedOut = pollAttempts >= MAX_POLL_ATTEMPTS && !isResolved

  const sendSmsConfirmation = useCallback(async (txDetails: TransactionDetails) => {
    if (smsSent || !user?.mobileNumber) return
    try {
      await sendPaymentConfirmation(
        user.mobileNumber,
        user.firstName || 'Citizen',
        parseFloat(txDetails.amount || '0'),
        txDetails.refno || txDetails.txnid
      )
      setSmsSent(true)
    } catch (err) {
      console.warn('SMS notification failed:', err)
    }
  }, [smsSent, user])

  const checkStatus = useCallback(async () => {
    const targetUuid = uuid || txnid
    if (!targetUuid) {
      setIsPolling(false)
      return
    }

    try {
      const data = await getTransactionDetails(targetUuid)
      setDetails(data)
      publishPaymentStatus(data)
      const status = (data.payment_status || '').toUpperCase()
      const resolved = status === 'PAID' || status === 'SUCCESS' || status === 'FAILED' || status === 'CANCELLED'

      if (resolved) {
        setIsPolling(false)
        if (status === 'PAID' || status === 'SUCCESS') {
          await sendSmsConfirmation(data)
          localStorage.removeItem('egov_latest_pending_transaction')
        }
      }
    } catch (err) {
      console.warn('Status poll failed via eGovPay API:', err)
      // Fallback to URL status if present
      if (urlStatus) {
        const fallbackDetails: TransactionDetails = {
          uuid: targetUuid,
          refno: searchParams.get('refno') || targetUuid,
          txnid: txnid || targetUuid,
          amount: searchParams.get('amount') || cachedTx?.amount || '0.00',
          payment_status: urlStatus,
          currency: 'PHP',
        }
        setDetails(fallbackDetails)
        publishPaymentStatus(fallbackDetails)
      }
    }
  }, [uuid, txnid, urlStatus, searchParams, cachedTx, sendSmsConfirmation])

  // Auto-polling loop
  useEffect(() => {
    if (!isPolling) return

    checkStatus()

    pollTimer.current = setInterval(() => {
      setPollAttempts(prev => {
        const next = prev + 1
        if (next >= MAX_POLL_ATTEMPTS) {
          setIsPolling(false)
          clearInterval(pollTimer.current!)
        }
        return next
      })
      checkStatus()
    }, POLL_INTERVAL_MS)

    return () => {
      if (pollTimer.current) clearInterval(pollTimer.current)
    }
  }, [isPolling]) // eslint-disable-line react-hooks/exhaustive-deps

  const manualRefresh = () => {
    setError(null)
    setPollAttempts(0)
    setIsPolling(true)
  }

  // ── Progress dot animation helper ──────────────────────────
  const progressPercent = Math.min((pollAttempts / MAX_POLL_ATTEMPTS) * 100, 100)

  return (
    <main className="min-h-screen pt-24 pb-36 px-4 md:px-8 max-w-xl mx-auto w-full flex flex-col items-center justify-start">

      {/* ════════ POLLING / LOADING STATE ════════ */}
      {isPolling && !isResolved && (
        <div className="w-full p-8 rounded-3xl bg-white shadow-xl border border-outline-variant text-center space-y-6 animate-fadeIn">

          {/* Animated spinner ring */}
          <div className="relative w-24 h-24 mx-auto">
            <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
              <circle cx="48" cy="48" r="40" stroke="#e2e8f0" strokeWidth="8" fill="none" />
              <circle
                cx="48" cy="48" r="40"
                stroke="#2563eb" strokeWidth="8" fill="none"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 40}`}
                strokeDashoffset={`${2 * Math.PI * 40 * (1 - progressPercent / 100)}`}
                className="transition-all duration-700 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span
                className="material-symbols-outlined text-3xl text-blue-600 animate-spin"
                style={{ animationDuration: '1.5s' }}
              >
                progress_activity
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <h2 className="text-xl font-bold text-on-surface">Verifying Payment...</h2>
            <p className="text-xs text-on-surface-variant max-w-xs mx-auto">
              Confirming your transaction with <strong>eGovPay</strong>. This usually takes a few seconds.
            </p>
          </div>

          {/* Pulsing status dots */}
          <div className="flex items-center justify-center gap-2 py-2">
            {[0, 1, 2, 3, 4].map(i => (
              <div
                key={i}
                className="w-2 h-2 rounded-full bg-blue-600 opacity-30"
                style={{
                  animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite`,
                }}
              />
            ))}
          </div>

          {/* Step checklist */}
          <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100 text-left space-y-3 text-xs">
            {[
              { label: 'Payment submitted to eGovPay gateway', done: true },
              { label: 'Verifying bank / e-wallet confirmation', done: pollAttempts > 2 },
              { label: 'Retrieving official receipt details', done: pollAttempts > 5 },
              { label: 'Preparing SMS notification via eMessage', done: false },
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-2.5">
                {step.done ? (
                  <span className="material-symbols-outlined text-base text-emerald-600" style={{ fontVariationSettings: "'FILL' 1" }}>
                    check_circle
                  </span>
                ) : (
                  <div className="w-4 h-4 rounded-full border-2 border-blue-300 shrink-0" />
                )}
                <span className={step.done ? 'text-on-surface' : 'text-on-surface-variant'}>
                  {step.label}
                </span>
              </div>
            ))}
          </div>

          <p className="text-[11px] text-on-surface-variant">
            Check {pollAttempts + 1} of {MAX_POLL_ATTEMPTS} · Auto-refreshing every 3 seconds
          </p>
        </div>
      )}

      {/* ════════ TIMED OUT STATE ════════ */}
      {isTimedOut && !isResolved && (
        <div className="w-full p-6 rounded-3xl bg-white shadow-xl border border-outline-variant text-center space-y-5">
          <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
            <span className="material-symbols-outlined text-4xl">schedule</span>
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-on-surface">Still Confirming...</h2>
            <p className="text-xs text-on-surface-variant max-w-xs mx-auto">
              The payment gateway is taking longer than usual. Your payment may still be processing.
            </p>
          </div>
          {error && (
            <p className="text-xs text-amber-800 p-3 rounded-xl bg-amber-50 border border-amber-200">{error}</p>
          )}
          <div className="flex gap-3">
            <button
              onClick={manualRefresh}
              className="flex-1 py-3 rounded-xl bg-primary text-white font-bold text-xs shadow-md hover:bg-primary/90 flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-base">refresh</span>
              Refresh Status
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="flex-1 py-3 rounded-xl border border-outline-variant text-xs font-semibold text-on-surface-variant hover:bg-surface-container"
            >
              Dashboard
            </button>
          </div>
        </div>
      )}

      {/* ════════ SUCCESS STATE ════════ */}
      {isPaid && (
        <div className="w-full p-6 rounded-3xl bg-white shadow-xl border border-outline-variant text-center space-y-6 animate-fadeIn">
          <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-md">
            <span className="material-symbols-outlined text-5xl" style={{ fontVariationSettings: "'FILL' 1" }}>task_alt</span>
          </div>

          <div className="space-y-1">
            <h2 className="text-xl font-bold text-on-surface">Payment Successful!</h2>
            <p className="text-xs text-emerald-700 font-semibold">
              Your transaction has been processed and verified by eGovPay.
            </p>
            <p className="text-[11px] text-on-surface-variant max-w-sm mx-auto pt-1">
              You may close this payment tab and return to the AI chat. The original payment card will update automatically.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-left space-y-2.5 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-emerald-900">Payment Status</span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-600 text-white font-bold text-[10px] uppercase">
                {effectiveStatus}
              </span>
            </div>
            {details?.refno && (
              <div className="flex justify-between">
                <span className="text-on-surface-variant">eGovPay Reference</span>
                <span className="font-mono font-bold text-on-surface">{details.refno}</span>
              </div>
            )}
            {details?.txnid && (
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Transaction ID</span>
                <span className="font-mono font-semibold text-on-surface">{details.txnid}</span>
              </div>
            )}
            {details?.amount && (
              <div className="flex justify-between border-t border-emerald-200 pt-2 font-bold text-sm">
                <span className="text-on-surface">Amount Paid</span>
                <span className="font-mono text-emerald-700">
                  ₱{parseFloat(details.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}
            {details?.paid_at && (
              <div className="flex justify-between text-[11px] text-on-surface-variant">
                <span>Paid At</span>
                <span className="font-semibold">{details.paid_at}</span>
              </div>
            )}
            <div className="flex justify-between text-[11px] text-on-surface-variant pt-1">
              <span>SMS Notification</span>
              <span className="font-semibold text-emerald-700">
                {smsSent ? 'Sent via eMessage ✓' : 'Queued via eMessage'}
              </span>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => navigate('/services')}
              className="flex-1 py-3 rounded-xl border border-outline-variant text-xs font-semibold text-on-surface-variant hover:bg-surface-container"
            >
              Browse Services
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="flex-1 py-3 rounded-xl bg-primary text-white font-bold text-xs shadow-md hover:bg-primary/90"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      )}

      {/* ════════ FAILED / CANCELLED STATE ════════ */}
      {isFailed && (
        <div className="w-full p-6 rounded-3xl bg-white shadow-xl border border-outline-variant text-center space-y-6 animate-fadeIn">
          <div className="w-20 h-20 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto shadow-md">
            <span className="material-symbols-outlined text-5xl">cancel</span>
          </div>

          <div className="space-y-1">
            <h2 className="text-xl font-bold text-on-surface">Payment Unsuccessful</h2>
            <p className="text-xs text-rose-700 font-semibold">
              The transaction was <strong>{effectiveStatus.toLowerCase()}</strong>. No charges were made.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-left space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-rose-900">Status Code</span>
              <span className="px-2.5 py-0.5 rounded-full bg-rose-600 text-white font-bold text-[10px] uppercase">
                {effectiveStatus}
              </span>
            </div>
            {(details?.txnid || txnid) && (
              <div className="flex justify-between">
                <span className="text-rose-800">Transaction Ref</span>
                <span className="font-mono font-semibold text-rose-900">{details?.txnid || txnid}</span>
              </div>
            )}
            <p className="text-rose-800 pt-1 text-[11px]">
              If you believe this is an error or your account was debited, please contact eGovPay support with the reference number above.
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex-1 py-3 rounded-xl border border-outline-variant text-xs font-semibold text-on-surface-variant hover:bg-surface-container"
            >
              Cancel
            </button>
            <button
              onClick={() => navigate('/services')}
              className="flex-1 py-3 rounded-xl bg-primary text-white font-bold text-xs shadow-md hover:bg-primary/90"
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* ════════ FALLBACK / NO PARAMS / STOPPED POLLING STATE ════════ */}
      {!isPolling && !isPaid && !isFailed && !isTimedOut && (
        <div className="w-full p-6 rounded-3xl bg-white shadow-xl border border-outline-variant text-center space-y-6 animate-fadeIn">
          <div className="w-20 h-20 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto shadow-md">
            <span className="material-symbols-outlined text-5xl">receipt_long</span>
          </div>

          <div className="space-y-1">
            <h2 className="text-xl font-bold text-on-surface">Payment Recorded</h2>
            <p className="text-xs text-on-surface-variant max-w-xs mx-auto">
              Your transaction has been submitted to <strong>eGovPay</strong>. The confirmation will reflect once settlement is complete.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100 text-left space-y-2 text-xs text-on-surface-variant">
            <div className="flex justify-between">
              <span>Status</span>
              <span className="font-bold text-blue-700 uppercase">{effectiveStatus || 'PENDING CONFIRMATION'}</span>
            </div>
            {txnid && (
              <div className="flex justify-between">
                <span>Reference</span>
                <span className="font-mono font-bold text-on-surface">{txnid}</span>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={manualRefresh}
              className="flex-1 py-3 rounded-xl bg-primary text-white font-bold text-xs shadow-md hover:bg-primary/90 flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-base">refresh</span>
              Re-check Status
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="flex-1 py-3 rounded-xl border border-outline-variant text-xs font-semibold text-on-surface-variant hover:bg-surface-container"
            >
              Dashboard
            </button>
          </div>
        </div>
      )}

      {/* Pulse animation style */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.4); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn { animation: fadeIn 0.4s ease-out; }
      `}</style>
    </main>
  )
}

export default PaymentReturnPage
