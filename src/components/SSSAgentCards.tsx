import { PaymentIntent } from '../services/eGovPayService'
import {
  SSSAgentPrompt,
  SSSAgentState,
  SSSTransactionDraft,
  buildSSSTransactionDraft,
} from '../services/aiSSSAgentService'
import {
  SSS_APPLICABLE_PERIODS,
  SSS_MEMBERSHIP_TYPES,
  SSS_SERVICES,
  maskSSSNumber,
} from '../services/sssService'

interface SSSAgentPromptCardProps {
  prompt: SSSAgentPrompt
  citizenName: string
  busy: boolean
  onReply: (message: string) => void
  onVerifyIdentity: () => void
  onCancel: () => void
}

const stageLabels: Record<SSSAgentState['stage'], string> = {
  service: 'Select service',
  identity: 'Identity verification',
  sss_number: 'SSS number / CRN',
  membership: 'Membership type',
  period: 'Payment period',
  prn: 'Payment reference',
  review: 'Review',
  payment: 'eGovPay',
}

export const SSSAgentPromptCard = ({
  prompt,
  citizenName,
  busy,
  onReply,
  onVerifyIdentity,
  onCancel,
}: SSSAgentPromptCardProps) => (
  <div className="mt-4 p-3.5 rounded-xl bg-indigo-50 border border-indigo-200 space-y-3">
    <div className="flex items-center justify-between gap-2">
      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-800 flex items-center gap-1.5">
        <span className="material-symbols-outlined text-sm">support_agent</span>
        SSS Agent · {stageLabels[prompt.stage]}
      </span>
      <span className="text-[10px] font-semibold text-amber-700">Not submitted</span>
    </div>

    {prompt.stage === 'service' && (
      <div className="grid grid-cols-1 gap-2">
        {SSS_SERVICES.map(service => (
          <button
            key={service.id}
            type="button"
            onClick={() => onReply(service.title)}
            disabled={busy}
            className="w-full px-3 py-2.5 rounded-lg bg-white border border-indigo-200 text-left hover:bg-indigo-100 disabled:opacity-50 flex items-center gap-2.5"
          >
            <span className={`material-symbols-outlined text-lg ${service.color}`}>{service.icon}</span>
            <span className="min-w-0">
              <span className="block text-xs font-bold text-on-surface">{service.title}</span>
              <span className="block text-[10px] text-on-surface-variant mt-0.5">{service.subtitle}</span>
            </span>
          </button>
        ))}
      </div>
    )}

    {prompt.stage === 'identity' && (
      <div className="space-y-2.5">
        <div className="p-3 rounded-lg bg-white border border-indigo-100 text-[11px] text-on-surface-variant">
          Identity to verify: <strong className="text-on-surface">{citizenName}</strong>. The official eVerify window will request camera access for face liveness.
        </div>
        <button
          type="button"
          onClick={onVerifyIdentity}
          disabled={busy}
          className="w-full px-3 py-2.5 rounded-lg bg-indigo-600 text-white font-semibold text-xs flex items-center justify-center gap-1.5 disabled:opacity-50"
        >
          <span className={`material-symbols-outlined text-base ${busy ? 'animate-spin' : ''}`}>
            {busy ? 'progress_activity' : 'face_retouching_natural'}
          </span>
          {busy ? 'Verifying with PhilSys eVerify...' : 'Verify Identity (Face Liveness)'}
        </button>
      </div>
    )}

    {prompt.stage === 'membership' && (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {SSS_MEMBERSHIP_TYPES.map(type => (
          <button
            key={type}
            type="button"
            onClick={() => onReply(type)}
            disabled={busy}
            className="px-2.5 py-2.5 rounded-lg bg-white border border-indigo-200 text-on-surface font-semibold text-[11px] hover:bg-indigo-100 disabled:opacity-50"
          >
            {type}
          </button>
        ))}
      </div>
    )}

    {prompt.stage === 'period' && (
      <div className="grid grid-cols-1 gap-2">
        {SSS_APPLICABLE_PERIODS.map(period => (
          <button
            key={period}
            type="button"
            onClick={() => onReply(period)}
            disabled={busy}
            className="px-3 py-2.5 rounded-lg bg-white border border-indigo-200 text-on-surface font-semibold text-[11px] text-left hover:bg-indigo-100 disabled:opacity-50"
          >
            {period}
          </button>
        ))}
      </div>
    )}

    {(prompt.stage === 'sss_number' || prompt.stage === 'prn') && (
      <div className="p-3 rounded-lg bg-white border border-indigo-100 text-[11px] text-on-surface-variant flex items-start gap-2">
        <span className="material-symbols-outlined text-base text-indigo-600">keyboard</span>
        <span>Type your answer in the chat field below. Never provide a password, OTP, PIN, or card details.</span>
      </div>
    )}

    <button
      type="button"
      onClick={onCancel}
      disabled={busy}
      className="text-[11px] text-on-surface-variant hover:text-error font-semibold disabled:opacity-50"
    >
      Cancel SSS transaction
    </button>
  </div>
)

interface SSSTransactionReviewCardProps {
  state: SSSAgentState
  active: boolean
  busy: boolean
  onUpdate: (updates: Partial<SSSAgentState>) => void
  onConfirm: () => void
  onCancel: () => void
}

export const SSSTransactionReviewCard = ({
  state,
  active,
  busy,
  onUpdate,
  onConfirm,
  onCancel,
}: SSSTransactionReviewCardProps) => {
  const draft = buildSSSTransactionDraft(state)
  const service = SSS_SERVICES.find(item => item.id === state.serviceType)

  return (
    <div className="mt-4 p-4 rounded-xl bg-indigo-50 border border-indigo-200 space-y-4">
      <div className="flex items-center justify-between gap-2 border-b border-indigo-200 pb-2">
        <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-800">
          <span className="material-symbols-outlined text-base">fact_check</span>
          Review SSS Transaction
        </div>
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
          Not paid
        </span>
      </div>

      <div className="p-3 rounded-lg bg-white border border-indigo-100 text-xs">
        <span className="text-[10px] uppercase tracking-wide font-bold text-on-surface-variant">SSS Service</span>
        <div className="font-bold text-on-surface mt-1">{service?.title}</div>
        <div className="text-[10px] text-on-surface-variant mt-0.5">To change services, cancel this draft and start another SSS transaction.</div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">SSS Number / CRN</label>
          <input
            type="text"
            value={state.sssNumber || ''}
            onChange={event => onUpdate({ sssNumber: event.target.value.slice(0, 20) })}
            disabled={!active || busy}
            className="w-full px-3 py-2.5 rounded-lg bg-white border border-outline-variant/50 text-xs font-mono text-on-surface disabled:opacity-70"
          />
          {state.sssNumber && <p className="text-[9px] text-on-surface-variant">Masked preview: {maskSSSNumber(state.sssNumber)}</p>}
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">eVerify Reference</label>
          <input
            type="text"
            value={state.identityVerification?.verificationId || ''}
            readOnly
            className="w-full px-3 py-2.5 rounded-lg bg-surface-container border border-outline-variant/50 text-xs font-mono text-on-surface"
          />
        </div>
      </div>

      {state.serviceType === 'contribution' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">Membership Type</label>
            <select
              value={state.membershipType || ''}
              onChange={event => onUpdate({ membershipType: event.target.value })}
              disabled={!active || busy}
              className="w-full px-3 py-2.5 rounded-lg bg-white border border-outline-variant/50 text-xs text-on-surface disabled:opacity-70"
            >
              {SSS_MEMBERSHIP_TYPES.map(type => <option key={type}>{type}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">Applicable Period</label>
            <select
              value={state.applicablePeriod || ''}
              onChange={event => onUpdate({ applicablePeriod: event.target.value })}
              disabled={!active || busy}
              className="w-full px-3 py-2.5 rounded-lg bg-white border border-outline-variant/50 text-xs text-on-surface disabled:opacity-70"
            >
              {SSS_APPLICABLE_PERIODS.map(period => <option key={period}>{period}</option>)}
            </select>
          </div>
        </div>
      )}

      {state.serviceType !== 'record_verification' && (
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">
            {state.serviceType === 'salary_loan' ? 'Loan Account Number / PRN' : 'Payment Reference Number (PRN)'}
          </label>
          <input
            type="text"
            value={state.prn || ''}
            onChange={event => onUpdate({ prn: event.target.value.toUpperCase().slice(0, 40) })}
            disabled={!active || busy}
            className="w-full px-3 py-2.5 rounded-lg bg-white border border-outline-variant/50 text-xs font-mono text-on-surface disabled:opacity-70"
          />
        </div>
      )}

      <div className="p-3 rounded-lg bg-white border border-indigo-100 space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">Fee Assessment</p>
        {service?.defaultFees.map(fee => (
          <div key={fee.label} className="flex justify-between gap-3 text-[11px] text-on-surface-variant">
            <span>{fee.label}</span>
            <span className="font-mono font-semibold">₱{fee.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
        ))}
        <div className="flex justify-between gap-3 border-t border-indigo-100 pt-2 text-xs font-bold text-on-surface">
          <span>Total Amount</span>
          <span className="font-mono text-indigo-700">₱{(draft?.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
        </div>
      </div>

      <div className="pt-2 border-t border-indigo-200 space-y-2">
        <p className="text-[10px] text-on-surface-variant text-center">
          This action creates a pending eGovPay checkout link. It does not charge or mark the transaction as paid.
        </p>
        <button
          type="button"
          onClick={onConfirm}
          disabled={!active || busy || !draft}
          className="w-full py-2.5 rounded-lg bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
        >
          <span className={`material-symbols-outlined text-sm ${busy ? 'animate-spin' : ''}`}>
            {busy ? 'progress_activity' : 'payments'}
          </span>
          {busy ? 'Creating eGovPay Link...' : 'Confirm & Create eGovPay Link'}
        </button>
        {active && (
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="w-full py-1.5 text-[11px] text-on-surface-variant hover:text-error font-semibold disabled:opacity-50"
          >
            Cancel SSS transaction
          </button>
        )}
      </div>
    </div>
  )
}

interface SSSPaymentCardProps {
  draft: SSSTransactionDraft
  paymentIntent: PaymentIntent
  checking: boolean
  onRefreshStatus: () => void
  onStartAnother: () => void
}

export const SSSPaymentCard = ({
  draft,
  paymentIntent,
  checking,
  onRefreshStatus,
  onStartAnother,
}: SSSPaymentCardProps) => {
  const isPaid = paymentIntent.status === 'paid'
  const isUnsuccessful = paymentIntent.status === 'failed' || paymentIntent.status === 'cancelled'
  const statusLabel = isPaid
    ? 'Paid · Confirmed'
    : paymentIntent.status === 'failed'
      ? 'Payment failed'
      : paymentIntent.status === 'cancelled'
        ? 'Payment cancelled'
        : 'Pending · Not paid'

  return (
    <div className={`mt-4 p-4 rounded-xl border space-y-4 ${isUnsuccessful ? 'bg-rose-50 border-rose-200' : 'bg-emerald-50 border-emerald-200'}`}>
      <div className={`flex items-center justify-between gap-2 border-b pb-2 ${isUnsuccessful ? 'border-rose-200' : 'border-emerald-200'}`}>
        <div className={`flex items-center gap-1.5 text-xs font-bold ${isUnsuccessful ? 'text-rose-800' : 'text-emerald-800'}`}>
          <span className="material-symbols-outlined text-base">{isPaid ? 'verified' : isUnsuccessful ? 'error' : 'open_in_new'}</span>
          {isPaid ? 'eGovPay Payment Confirmed' : 'Official eGovPay Test Checkout'}
        </div>
        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${isPaid ? 'bg-emerald-600 text-white' : isUnsuccessful ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'}`}>{statusLabel}</span>
      </div>

      {isPaid && (
        <div className="p-3 rounded-lg bg-emerald-100 border border-emerald-200 text-[11px] text-emerald-900 flex items-start gap-2">
          <span className="material-symbols-outlined text-base">task_alt</span>
          <span><strong>Payment received and verified.</strong> You do not need to pay this SSS transaction again.</span>
        </div>
      )}

      <div className={`p-3 rounded-lg bg-white border text-[11px] space-y-2 ${isUnsuccessful ? 'border-rose-100' : 'border-emerald-100'}`}>
        <div className="flex justify-between gap-3"><span className="text-on-surface-variant">SSS Service</span><span className="font-semibold text-right">{draft.serviceTitle}</span></div>
        <div className="flex justify-between gap-3"><span className="text-on-surface-variant">Reference</span><span className="font-mono font-bold">{paymentIntent.referenceNumber}</span></div>
        <div className="flex justify-between gap-3"><span className="text-on-surface-variant">Amount</span><span className="font-mono font-bold text-emerald-700">₱{paymentIntent.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
        {paymentIntent.paidAt
          ? <div className="flex justify-between gap-3"><span className="text-on-surface-variant">Paid at</span><span>{new Date(paymentIntent.paidAt).toLocaleString()}</span></div>
          : <div className="flex justify-between gap-3"><span className="text-on-surface-variant">Link expires</span><span>{new Date(paymentIntent.expiresAt).toLocaleString()}</span></div>}
      </div>

      {paymentIntent.status === 'pending' && (
        <a href={paymentIntent.paymentUrl} target="_blank" rel="noopener noreferrer" className="w-full py-3 rounded-lg bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 flex items-center justify-center gap-1.5 shadow-sm">
          <span className="material-symbols-outlined text-base">open_in_new</span>
          Proceed to Official eGovPay Test Gateway
        </a>
      )}

      {!isPaid && (
        <button type="button" onClick={onRefreshStatus} disabled={checking} className="w-full py-2.5 rounded-lg border border-emerald-300 bg-white text-emerald-800 font-bold text-xs flex items-center justify-center gap-1.5 disabled:opacity-50">
          <span className={`material-symbols-outlined text-sm ${checking ? 'animate-spin' : ''}`}>{checking ? 'progress_activity' : 'refresh'}</span>
          {checking ? 'Checking eGovPay...' : 'Refresh Payment Status'}
        </button>
      )}

      <p className="text-[10px] leading-relaxed text-on-surface-variant text-center">
        {isPaid
          ? 'Status verified from eGovPay. This card updates automatically when the gateway confirms payment.'
          : 'After checkout, return to this tab. The card refreshes automatically, or you can check the official status manually.'}
      </p>

      <button type="button" onClick={onStartAnother} className="w-full py-2 rounded-lg border border-emerald-200 bg-white text-emerald-800 font-semibold text-[11px]">
        Start Another SSS Transaction
      </button>
    </div>
  )
}
