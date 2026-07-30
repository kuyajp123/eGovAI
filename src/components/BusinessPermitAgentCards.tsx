import { PaymentIntent } from '../services/eGovPayService'
import {
  BusinessPermitAgentPrompt,
  BusinessPermitAgentState,
  buildBusinessPermitRenewalDraft,
} from '../services/aiBusinessPermitAgentService'
import {
  BUSINESS_PERMIT_RENEWAL_DOCUMENTS,
  BUSINESS_PERMIT_TYPES,
  BusinessPermitDocumentType,
  BusinessPermitRenewalApplication,
  BusinessPermitRenewalDraft,
  getBusinessPermitRenewalYears,
} from '../services/businessPermitService'

interface BusinessPermitPromptCardProps {
  prompt: BusinessPermitAgentPrompt
  state: BusinessPermitAgentState
  citizenName: string
  profileLgu?: string
  busy: boolean
  documentError?: string | null
  onReply: (message: string) => void
  onVerifyIdentity: () => void
  onAttachDocument: (documentType: BusinessPermitDocumentType, file: File) => void
  onRemoveDocument: (documentType: BusinessPermitDocumentType) => void
  onCancel: () => void
}

const stageLabels: Record<BusinessPermitAgentState['stage'], string> = {
  identity: 'Identity verification',
  permit_number: 'Existing permit',
  business_name: 'Business name',
  lgu: 'Issuing LGU',
  business_address: 'Business address',
  business_type: 'Nature of business',
  tin: 'Tax identification',
  renewal_year: 'Renewal year',
  documents: 'Required documents',
  review: 'Review',
  submitted: 'Submitted',
  payment: 'eGovPay',
}

export const BusinessPermitPromptCard = ({
  prompt,
  state,
  citizenName,
  profileLgu,
  busy,
  documentError,
  onReply,
  onVerifyIdentity,
  onAttachDocument,
  onRemoveDocument,
  onCancel,
}: BusinessPermitPromptCardProps) => (
  <div className="mt-4 p-3.5 rounded-xl bg-amber-50 border border-amber-200 space-y-3">
    <div className="flex items-center justify-between gap-2">
      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
        <span className="material-symbols-outlined text-sm">storefront</span>
        Permit Renewal Agent · {stageLabels[prompt.stage]}
      </span>
      <span className="text-[10px] font-semibold text-amber-700">Not submitted</span>
    </div>

    {prompt.stage === 'identity' && (
      <div className="space-y-2.5">
        <div className="p-3 rounded-lg bg-white border border-amber-100 text-[11px] text-on-surface-variant">
          Identity to verify: <strong className="text-on-surface">{citizenName}</strong>. The official eVerify window will request camera access for face liveness.
        </div>
        <button
          type="button"
          onClick={onVerifyIdentity}
          disabled={busy}
          className="w-full px-3 py-2.5 rounded-lg bg-amber-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 disabled:opacity-50"
        >
          <span className={`material-symbols-outlined text-base ${busy ? 'animate-spin' : ''}`}>
            {busy ? 'progress_activity' : 'face_retouching_natural'}
          </span>
          {busy ? 'Verifying with PhilSys eVerify...' : 'Verify Identity (Face Liveness)'}
        </button>
      </div>
    )}

    {prompt.stage === 'lgu' && profileLgu && (
      <button
        type="button"
        onClick={() => onReply(profileLgu)}
        disabled={busy}
        className="w-full px-3 py-2.5 rounded-lg bg-white border border-amber-200 text-left text-xs font-semibold text-on-surface hover:bg-amber-100 disabled:opacity-50 flex items-center gap-2"
      >
        <span className="material-symbols-outlined text-base text-amber-700">location_city</span>
        Use profile LGU: {profileLgu}
      </button>
    )}

    {prompt.stage === 'business_type' && (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {BUSINESS_PERMIT_TYPES.map(type => (
          <button
            key={type}
            type="button"
            onClick={() => onReply(type)}
            disabled={busy}
            className="px-3 py-2.5 rounded-lg bg-white border border-amber-200 text-on-surface font-semibold text-[11px] text-left hover:bg-amber-100 disabled:opacity-50"
          >
            {type}
          </button>
        ))}
      </div>
    )}

    {prompt.stage === 'renewal_year' && (
      <div className="grid grid-cols-2 gap-2">
        {getBusinessPermitRenewalYears().map(year => (
          <button
            key={year}
            type="button"
            onClick={() => onReply(String(year))}
            disabled={busy}
            className="px-3 py-2.5 rounded-lg bg-white border border-amber-200 text-on-surface font-semibold text-xs hover:bg-amber-100 disabled:opacity-50"
          >
            {year}
          </button>
        ))}
      </div>
    )}

    {prompt.stage === 'documents' && (
      <div className="space-y-2">
        {BUSINESS_PERMIT_RENEWAL_DOCUMENTS.map(requirement => {
          const attachment = state.documents.find(item => item.id === requirement.id)
          return (
            <div key={requirement.id} className="p-3 rounded-lg bg-white border border-amber-100 space-y-2">
              <div className="flex items-start gap-2">
                <span className={`material-symbols-outlined text-base ${attachment ? 'text-emerald-600' : 'text-amber-700'}`}>
                  {attachment ? 'check_circle' : 'description'}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-bold text-on-surface">{requirement.label}</p>
                  <p className="text-[9px] text-on-surface-variant">{attachment?.fileName || requirement.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <label className="cursor-pointer px-2.5 py-1.5 rounded-md bg-amber-700 text-white text-[10px] font-semibold hover:bg-amber-800">
                  {attachment ? 'Replace' : 'Attach file'}
                  <input
                    type="file"
                    accept="application/pdf,image/jpeg,image/png,image/webp"
                    disabled={busy}
                    className="hidden"
                    onChange={event => {
                      const file = event.target.files?.[0]
                      if (file) onAttachDocument(requirement.id, file)
                      event.currentTarget.value = ''
                    }}
                  />
                </label>
                {attachment && (
                  <button
                    type="button"
                    onClick={() => onRemoveDocument(requirement.id)}
                    disabled={busy}
                    className="px-2.5 py-1.5 rounded-md border border-outline-variant text-[10px] font-semibold text-on-surface-variant disabled:opacity-50"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          )
        })}
        {documentError && (
          <p className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-[10px] text-red-700">{documentError}</p>
        )}
      </div>
    )}

    {['permit_number', 'business_name', 'business_address', 'tin'].includes(prompt.stage) && (
      <div className="p-3 rounded-lg bg-white border border-amber-100 text-[11px] text-on-surface-variant flex items-start gap-2">
        <span className="material-symbols-outlined text-base text-amber-700">keyboard</span>
        <span>Type your answer in the chat field below. Never provide a password, OTP, PIN, or payment-card details.</span>
      </div>
    )}

    <button
      type="button"
      onClick={onCancel}
      disabled={busy}
      className="text-[11px] text-on-surface-variant hover:text-error font-semibold disabled:opacity-50"
    >
      Cancel permit renewal
    </button>
  </div>
)

interface BusinessPermitReviewCardProps {
  state: BusinessPermitAgentState
  active: boolean
  busy: boolean
  onUpdate: (updates: Partial<BusinessPermitAgentState>) => void
  onEditDocuments: () => void
  onSubmit: () => void
  onCancel: () => void
}

export const BusinessPermitReviewCard = ({
  state,
  active,
  busy,
  onUpdate,
  onEditDocuments,
  onSubmit,
  onCancel,
}: BusinessPermitReviewCardProps) => {
  const draft = buildBusinessPermitRenewalDraft(state)
  const inputClass = 'w-full px-3 py-2.5 rounded-lg bg-white border border-outline-variant/50 text-xs text-on-surface disabled:opacity-70'

  return (
    <div className="mt-4 p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-4">
      <div className="flex items-center justify-between gap-2 border-b border-amber-200 pb-2">
        <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
          <span className="material-symbols-outlined text-base">fact_check</span>
          Review Business Permit Renewal
        </div>
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">Draft only</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="space-y-1 text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">
          Existing Permit Number
          <input value={state.permitNumber || ''} onChange={event => onUpdate({ permitNumber: event.target.value.toUpperCase().slice(0, 40) })} disabled={!active || busy} className={`${inputClass} font-mono`} />
        </label>
        <label className="space-y-1 text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">
          eVerify Reference
          <input value={state.identityVerification?.verificationId || ''} readOnly className={`${inputClass} font-mono bg-surface-container`} />
        </label>
        <label className="space-y-1 text-[10px] font-bold uppercase tracking-wide text-on-surface-variant sm:col-span-2">
          Registered Business Name
          <input value={state.businessName || ''} onChange={event => onUpdate({ businessName: event.target.value.slice(0, 120) })} disabled={!active || busy} className={inputClass} />
        </label>
        <label className="space-y-1 text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">
          Issuing LGU
          <input value={state.lgu || ''} onChange={event => onUpdate({ lgu: event.target.value.slice(0, 120) })} disabled={!active || busy} className={inputClass} />
        </label>
        <label className="space-y-1 text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">
          Renewal Year
          <select value={state.renewalYear || ''} onChange={event => onUpdate({ renewalYear: Number(event.target.value) })} disabled={!active || busy} className={inputClass}>
            {getBusinessPermitRenewalYears().map(year => <option key={year}>{year}</option>)}
          </select>
        </label>
        <label className="space-y-1 text-[10px] font-bold uppercase tracking-wide text-on-surface-variant sm:col-span-2">
          Business Address
          <input value={state.businessAddress || ''} onChange={event => onUpdate({ businessAddress: event.target.value.slice(0, 240) })} disabled={!active || busy} className={inputClass} />
        </label>
        <label className="space-y-1 text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">
          Nature of Business
          <select value={state.businessType || ''} onChange={event => onUpdate({ businessType: event.target.value })} disabled={!active || busy} className={inputClass}>
            {BUSINESS_PERMIT_TYPES.map(type => <option key={type}>{type}</option>)}
          </select>
        </label>
        <label className="space-y-1 text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">
          TIN
          <input value={state.tin || ''} onChange={event => onUpdate({ tin: event.target.value.slice(0, 20) })} disabled={!active || busy} className={`${inputClass} font-mono`} />
        </label>
      </div>

      <div className="p-3 rounded-lg bg-white border border-amber-100 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">Attached Documents</p>
          {active && (
            <button type="button" onClick={onEditDocuments} disabled={busy} className="text-[10px] font-semibold text-amber-800 hover:underline disabled:opacity-50">
              Replace files
            </button>
          )}
        </div>
        {state.documents.map(document => {
          const requirement = BUSINESS_PERMIT_RENEWAL_DOCUMENTS.find(item => item.id === document.id)
          return (
            <div key={document.id} className="flex items-center gap-2 text-[10px]">
              <span className="material-symbols-outlined text-sm text-emerald-600">check_circle</span>
              <span className="font-semibold text-on-surface">{requirement?.label}</span>
              <span className="ml-auto max-w-[45%] truncate text-on-surface-variant">{document.fileName}</span>
            </div>
          )
        })}
      </div>

      <div className="p-3 rounded-lg bg-white border border-amber-100 space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">Estimated LGU Assessment</p>
        {draft?.fees.map(fee => (
          <div key={fee.label} className="flex justify-between gap-3 text-[11px] text-on-surface-variant">
            <span>{fee.label}</span>
            <span className="font-mono font-semibold">₱{fee.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
        ))}
        <div className="flex justify-between gap-3 border-t border-amber-100 pt-2 text-xs font-bold text-on-surface">
          <span>Estimated Total</span>
          <span className="font-mono text-amber-800">₱{(draft?.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
        </div>
        <p className="text-[9px] text-on-surface-variant">The issuing LGU may adjust fees or request additional documents during assessment.</p>
      </div>

      <div className="pt-2 border-t border-amber-200 space-y-2">
        <p className="text-[10px] text-on-surface-variant text-center">Submitting creates the renewal application only. It does not create a payment or mark anything as paid.</p>
        <button type="button" onClick={onSubmit} disabled={!active || busy || !draft} className="w-full py-2.5 rounded-lg bg-amber-700 text-white font-bold text-xs hover:bg-amber-800 flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50">
          <span className={`material-symbols-outlined text-sm ${busy ? 'animate-spin' : ''}`}>{busy ? 'progress_activity' : 'send'}</span>
          {busy ? 'Submitting for Assessment...' : 'Submit Renewal for Assessment'}
        </button>
        {active && <button type="button" onClick={onCancel} disabled={busy} className="w-full py-1.5 text-[11px] text-on-surface-variant hover:text-error font-semibold disabled:opacity-50">Cancel permit renewal</button>}
      </div>
    </div>
  )
}

interface BusinessPermitSubmissionCardProps {
  application: BusinessPermitRenewalApplication
  busy: boolean
  active: boolean
  onCreatePayment: () => void
  onClose: () => void
}

export const BusinessPermitSubmissionCard = ({ application, busy, active, onCreatePayment, onClose }: BusinessPermitSubmissionCardProps) => (
  <div className="mt-4 p-4 rounded-xl bg-blue-50 border border-blue-200 space-y-4">
    <div className="flex items-center justify-between gap-2 border-b border-blue-200 pb-2">
      <div className="flex items-center gap-1.5 text-xs font-bold text-blue-800"><span className="material-symbols-outlined text-base">task_alt</span>Renewal Submitted</div>
      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">Payment pending</span>
    </div>
    <div className="p-3 rounded-lg bg-white border border-blue-100 text-[11px] space-y-2">
      <div className="flex justify-between gap-3"><span className="text-on-surface-variant">Tracking number</span><span className="font-mono font-bold text-blue-700">{application.trackingId}</span></div>
      <div className="flex justify-between gap-3"><span className="text-on-surface-variant">Business</span><span className="font-semibold text-right">{application.businessName}</span></div>
      <div className="flex justify-between gap-3"><span className="text-on-surface-variant">Issuing LGU</span><span className="font-semibold text-right">{application.lgu}</span></div>
      <div className="flex justify-between gap-3"><span className="text-on-surface-variant">Estimated amount</span><span className="font-mono font-bold">₱{application.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
    </div>
    <p className="text-[10px] text-on-surface-variant text-center">Create a pending checkout link only after reviewing this assessment. The button does not charge you.</p>
    <button type="button" onClick={onCreatePayment} disabled={!active || busy} className="w-full py-2.5 rounded-lg bg-blue-700 text-white font-bold text-xs hover:bg-blue-800 flex items-center justify-center gap-1.5 disabled:opacity-50">
      <span className={`material-symbols-outlined text-sm ${busy ? 'animate-spin' : ''}`}>{busy ? 'progress_activity' : 'payments'}</span>
      {busy ? 'Creating eGovPay Link...' : 'Create eGovPay Link'}
    </button>
    {active && <button type="button" onClick={onClose} disabled={busy} className="w-full py-1.5 text-[11px] text-on-surface-variant font-semibold disabled:opacity-50">Close agent</button>}
  </div>
)

interface BusinessPermitPaymentCardProps {
  draft: BusinessPermitRenewalDraft
  application: BusinessPermitRenewalApplication
  paymentIntent: PaymentIntent
  checking: boolean
  onRefreshStatus: () => void
  onStartAnother: () => void
}

export const BusinessPermitPaymentCard = ({
  draft,
  application,
  paymentIntent,
  checking,
  onRefreshStatus,
  onStartAnother,
}: BusinessPermitPaymentCardProps) => {
  const isPaid = paymentIntent.status === 'paid'
  const isUnsuccessful = paymentIntent.status === 'failed' || paymentIntent.status === 'cancelled'
  const statusLabel = isPaid
    ? 'Paid · Confirmed'
    : paymentIntent.status === 'failed'
      ? 'Payment failed'
      : paymentIntent.status === 'cancelled'
        ? 'Payment cancelled'
        : 'Pending · Not paid'
  const statusClass = isPaid
    ? 'bg-emerald-600 text-white'
    : isUnsuccessful
      ? 'bg-rose-100 text-rose-800'
      : 'bg-amber-100 text-amber-800'

  return (
    <div className={`mt-4 p-4 rounded-xl border space-y-4 ${isUnsuccessful ? 'bg-rose-50 border-rose-200' : 'bg-emerald-50 border-emerald-200'}`}>
      <div className={`flex items-center justify-between gap-2 border-b pb-2 ${isUnsuccessful ? 'border-rose-200' : 'border-emerald-200'}`}>
        <div className={`flex items-center gap-1.5 text-xs font-bold ${isUnsuccessful ? 'text-rose-800' : 'text-emerald-800'}`}>
          <span className="material-symbols-outlined text-base">{isPaid ? 'verified' : isUnsuccessful ? 'error' : 'open_in_new'}</span>
          {isPaid ? 'eGovPay Payment Confirmed' : 'Official eGovPay Test Checkout'}
        </div>
        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${statusClass}`}>{statusLabel}</span>
      </div>

      {isPaid && (
        <div className="p-3 rounded-lg bg-emerald-100 border border-emerald-200 text-[11px] text-emerald-900 flex items-start gap-2">
          <span className="material-symbols-outlined text-base">task_alt</span>
          <span><strong>Payment received.</strong> Your permit renewal is now under LGU assessment. You do not need to pay again.</span>
        </div>
      )}

      {isUnsuccessful && (
        <div className="p-3 rounded-lg bg-rose-100 border border-rose-200 text-[11px] text-rose-900">
          eGovPay did not confirm a completed payment for this checkout. Check the status again before starting another transaction.
        </div>
      )}

      <div className={`p-3 rounded-lg bg-white border text-[11px] space-y-2 ${isUnsuccessful ? 'border-rose-100' : 'border-emerald-100'}`}>
        <div className="flex justify-between gap-3"><span className="text-on-surface-variant">Application</span><span className="font-mono font-bold">{application.trackingId}</span></div>
        <div className="flex justify-between gap-3"><span className="text-on-surface-variant">Reference</span><span className="font-mono font-bold">{paymentIntent.referenceNumber}</span></div>
        <div className="flex justify-between gap-3"><span className="text-on-surface-variant">Amount</span><span className="font-mono font-bold text-emerald-700">₱{draft.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
        {paymentIntent.paidAt
          ? <div className="flex justify-between gap-3"><span className="text-on-surface-variant">Paid at</span><span>{new Date(paymentIntent.paidAt).toLocaleString()}</span></div>
          : <div className="flex justify-between gap-3"><span className="text-on-surface-variant">Link expires</span><span>{new Date(paymentIntent.expiresAt).toLocaleString()}</span></div>}
      </div>

      {paymentIntent.status === 'pending' && (
        <a href={paymentIntent.paymentUrl} target="_blank" rel="noopener noreferrer" className="w-full py-3 rounded-lg bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 flex items-center justify-center gap-1.5 shadow-sm"><span className="material-symbols-outlined text-base">open_in_new</span>Proceed to Official eGovPay Test Gateway</a>
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
      <button type="button" onClick={onStartAnother} className="w-full py-2 rounded-lg border border-emerald-200 bg-white text-emerald-800 font-semibold text-[11px]">Start Another Permit Renewal</button>
    </div>
  )
}
