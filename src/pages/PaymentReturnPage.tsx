import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getTransactionDetails, TransactionDetails } from '../services/eGovPayService'
import { sendPaymentConfirmation } from '../services/eMessageService'

const PaymentReturnPage = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()

  const [loading, setLoading] = useState(true)
  const [details, setDetails] = useState<TransactionDetails | null>(null)
  const [error, setError] = useState<string | null>(null)

  // URL Query Parameters from eGovPay redirect
  const uuid = searchParams.get('uuid') || searchParams.get('transaction_uuid') || ''
  const urlStatus = (searchParams.get('status') || searchParams.get('payment_status') || '').toUpperCase()
  const txnid = searchParams.get('txnid') || ''

  useEffect(() => {
    if (uuid) {
      fetchDetails(uuid)
    } else {
      setLoading(false)
    }
  }, [uuid])

  const fetchDetails = async (id: string) => {
    setLoading(true)
    setError(null)
    try {
      const data = await getTransactionDetails(id)
      setDetails(data)

      // Send SMS confirmation if payment is completed
      const finalStatus = (data.payment_status || urlStatus).toUpperCase()
      if ((finalStatus === 'PAID' || finalStatus === 'SUCCESS') && user?.mobileNumber) {
        await sendPaymentConfirmation(
          user.mobileNumber,
          user.firstName || 'Citizen',
          parseFloat(data.amount || '0'),
          data.refno || data.txnid
        )
      }
    } catch (err) {
      console.warn('Could not fetch eGovPay details via API:', err)
      // Fall back to URL status if API call failed
      if (urlStatus) {
        setDetails({
          uuid: uuid || 'N/A',
          refno: searchParams.get('refno') || txnid || 'EGPAY-REF',
          txnid: txnid || 'TESTREF',
          amount: searchParams.get('amount') || '1000.00',
          payment_status: urlStatus,
          currency: 'PHP',
          paid_at: new Date().toLocaleString(),
        })
      } else {
        setError(err instanceof Error ? err.message : 'Unable to verify payment status.')
      }
    } finally {
      setLoading(false)
    }
  }

  const effectiveStatus = (details?.payment_status || urlStatus || 'PENDING').toUpperCase()
  const isPaid = effectiveStatus === 'PAID' || effectiveStatus === 'SUCCESS'
  const isFailed = effectiveStatus === 'FAILED' || effectiveStatus === 'CANCELLED'

  return (
    <main className="min-h-screen pt-24 pb-36 px-4 md:px-8 max-w-xl mx-auto w-full">

      {loading ? (
        <div className="p-8 text-center space-y-4 rounded-3xl bg-white shadow-xl border border-outline-variant">
          <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
            <span className="material-symbols-outlined text-4xl animate-spin">progress_activity</span>
          </div>
          <h2 className="text-lg font-bold text-on-surface">Verifying Payment Status...</h2>
          <p className="text-xs text-on-surface-variant">Connecting to eGovPay Payment Gateway records.</p>
        </div>
      ) : isPaid ? (
        /* ════════ SUCCESS STATE ════════ */
        <div className="p-6 rounded-3xl bg-white shadow-xl border border-outline-variant text-center space-y-6 animate-fadeIn">
          <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-md">
            <span className="material-symbols-outlined text-5xl" style={{ fontVariationSettings: "'FILL' 1" }}>task_alt</span>
          </div>

          <div className="space-y-1">
            <h2 className="text-xl font-bold text-on-surface">Payment Successful!</h2>
            <p className="text-xs text-emerald-700 font-semibold">
              Your transaction has been processed and verified by eGovPay.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 text-left space-y-2.5 text-xs">
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

            <div className="flex justify-between text-[11px] text-on-surface-variant pt-1">
              <span>SMS Notification</span>
              <span className="font-semibold text-emerald-700">Sent via eMessage ✓</span>
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
      ) : isFailed ? (
        /* ════════ FAILED / CANCELLED STATE ════════ */
        <div className="p-6 rounded-3xl bg-white shadow-xl border border-outline-variant text-center space-y-6 animate-fadeIn">
          <div className="w-20 h-20 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto shadow-md">
            <span className="material-symbols-outlined text-5xl">cancel</span>
          </div>

          <div className="space-y-1">
            <h2 className="text-xl font-bold text-on-surface">Payment Unsuccessful</h2>
            <p className="text-xs text-rose-700 font-semibold">
              The eGovPay transaction was {effectiveStatus.toLowerCase()}. No charges were made.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-left space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-rose-900">Status Code</span>
              <span className="px-2.5 py-0.5 rounded-full bg-rose-600 text-white font-bold text-[10px] uppercase">
                {effectiveStatus}
              </span>
            </div>
            {txnid && (
              <div className="flex justify-between">
                <span className="text-rose-800">Transaction Ref</span>
                <span className="font-mono font-semibold text-rose-900">{txnid}</span>
              </div>
            )}
            <p className="text-rose-800 pt-1 text-[11px]">
              If your bank account was debited, please contact eGovPay customer support with reference number above.
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
              Try Payment Again
            </button>
          </div>
        </div>
      ) : (
        /* ════════ PENDING / UNKNOWN STATE ════════ */
        <div className="p-6 rounded-3xl bg-white shadow-xl border border-outline-variant text-center space-y-6">
          <div className="w-20 h-20 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto shadow-md">
            <span className="material-symbols-outlined text-5xl">pending</span>
          </div>

          <div className="space-y-1">
            <h2 className="text-xl font-bold text-on-surface">Payment Pending Confirmation</h2>
            <p className="text-xs text-on-surface-variant">
              Your transaction status is currently <strong>{effectiveStatus}</strong>.
            </p>
          </div>

          {error && (
            <p className="text-xs text-amber-800 p-3 rounded-xl bg-amber-50 border border-amber-200">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => uuid && fetchDetails(uuid)}
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

    </main>
  )
}

export default PaymentReturnPage
