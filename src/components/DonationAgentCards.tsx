import { PaymentIntent } from '../services/eGovPayService'
import {
  DonationAgentPrompt,
  DonationAgentState,
  buildDonationDraft,
} from '../services/aiDonationAgentService'
import {
  DonationDraft,
  DonationSummary,
  getDonationCampaign,
  getDonationCampaigns,
  isDonationCampaignConfigured,
} from '../services/donationService'

interface DonationPromptCardProps {
  prompt: DonationAgentPrompt
  state: DonationAgentState
  busy: boolean
  onReply: (reply: string) => void
  onCancel: () => void
}

export const DonationPromptCard = ({ prompt, state, busy, onReply, onCancel }: DonationPromptCardProps) => {
  const campaign = state.campaignId ? getDonationCampaign(state.campaignId) : undefined
  return (
    <div className="mt-4 rounded-xl bg-fuchsia-50 border border-fuchsia-200 p-4 space-y-3">
      <div className="flex items-center justify-between gap-2 border-b border-fuchsia-200 pb-2">
        <div className="flex items-center gap-1.5 text-xs font-bold text-fuchsia-900">
          <span className="material-symbols-outlined text-base">volunteer_activism</span>
          Donation Agent · {prompt.stage}
        </div>
        <span className="text-[10px] font-bold text-amber-700">Not paid</span>
      </div>

      {prompt.stage === 'campaign' && (
        <div className="grid grid-cols-1 gap-2">
          {getDonationCampaigns().map(item => {
            const configured = isDonationCampaignConfigured(item)
            return (
              <button
                key={item.id}
                type="button"
                disabled={busy || !configured}
                onClick={() => onReply(item.title)}
                className="p-3 rounded-lg bg-white border border-fuchsia-200 text-left disabled:opacity-60 hover:bg-fuchsia-100"
              >
                <span className="flex items-center justify-between gap-2">
                  <strong className="text-xs text-on-surface">{item.title}</strong>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${configured ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                    {configured ? 'Available' : 'Settlement not configured'}
                  </span>
                </span>
                <span className="block text-[10px] text-on-surface-variant mt-1">{item.recipientName} · {item.location}</span>
                <span className="block text-[10px] text-on-surface-variant mt-1">{item.purpose}</span>
              </button>
            )
          })}
        </div>
      )}

      {prompt.stage === 'amount' && campaign && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {campaign.suggestedAmounts.map(amount => (
              <button key={amount} type="button" disabled={busy} onClick={() => onReply(String(amount))} className="px-3 py-2 rounded-full bg-white border border-fuchsia-200 text-fuchsia-900 text-[11px] font-bold disabled:opacity-50">
                ₱{amount.toLocaleString()}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-on-surface-variant">Or type any amount from ₱1 to ₱100,000 in the chat field. Never provide card details, an OTP, PIN, CVV, or password.</p>
        </div>
      )}

      <button type="button" onClick={onCancel} disabled={busy} className="text-[10px] font-semibold text-on-surface-variant hover:text-error disabled:opacity-50">
        Cancel donation
      </button>
    </div>
  )
}

interface DonationReviewCardProps {
  state: DonationAgentState
  active: boolean
  busy: boolean
  onUpdate: (updates: Partial<DonationAgentState>) => void
  onConfirm: () => void
  onCancel: () => void
}

export const DonationReviewCard = ({ state, active, busy, onUpdate, onConfirm, onCancel }: DonationReviewCardProps) => {
  const draft = buildDonationDraft(state)
  const campaigns = getDonationCampaigns().filter(isDonationCampaignConfigured)
  return (
    <div className="mt-4 rounded-xl bg-fuchsia-50 border border-fuchsia-200 p-4 space-y-4">
      <div className="flex items-center justify-between border-b border-fuchsia-200 pb-2">
        <div className="flex items-center gap-1.5 text-xs font-bold text-fuchsia-900"><span className="material-symbols-outlined text-base">fact_check</span>Review Donation Draft</div>
        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">Not paid</span>
      </div>

      <div className="space-y-1">
        <label className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">Campaign and recipient</label>
        <select value={state.campaignId || ''} onChange={event => onUpdate({ campaignId: event.target.value })} disabled={!active || busy} className="w-full px-3 py-2.5 rounded-lg bg-white border border-outline-variant/50 text-xs">
          {campaigns.map(campaign => <option key={campaign.id} value={campaign.id}>{campaign.title} — {campaign.recipientName}</option>)}
        </select>
      </div>

      {draft && (
        <div className="p-3 rounded-lg bg-white border border-fuchsia-100 text-[11px] space-y-1.5">
          <div><span className="text-on-surface-variant">Where:</span> <strong>{draft.campaign.location}</strong></div>
          <div><span className="text-on-surface-variant">Purpose:</span> {draft.campaign.purpose}</div>
          <div><span className="text-on-surface-variant">Settlement:</span> <span className="font-mono">…{draft.campaign.settlementTemplateUuid?.slice(-8)}</span></div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">Amount (PHP)</label>
          <input type="number" min="1" max="100000" step="0.01" value={state.amount || ''} onChange={event => onUpdate({ amount: Number(event.target.value) })} disabled={!active || busy} className="w-full px-3 py-2.5 rounded-lg bg-white border border-outline-variant/50 text-xs" />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">Optional dedication</label>
          <input type="text" maxLength={160} value={state.dedication || ''} onChange={event => onUpdate({ dedication: event.target.value.slice(0, 160) })} disabled={!active || busy} placeholder="Short message (optional)" className="w-full px-3 py-2.5 rounded-lg bg-white border border-outline-variant/50 text-xs" />
        </div>
      </div>

      <div className="pt-2 border-t border-fuchsia-200 space-y-2">
        <p className="text-[10px] text-on-surface-variant text-center">This action creates a pending checkout for the selected recipient settlement. It does not charge or mark the donation paid.</p>
        <button type="button" onClick={onConfirm} disabled={!active || busy || !draft} className="w-full py-2.5 rounded-lg bg-fuchsia-700 text-white font-bold text-xs disabled:opacity-50 flex items-center justify-center gap-1.5">
          <span className={`material-symbols-outlined text-sm ${busy ? 'animate-spin' : ''}`}>{busy ? 'progress_activity' : 'payments'}</span>
          {busy ? 'Creating eGovPay Link...' : 'Create eGovPay Donation Link'}
        </button>
        {active && <button type="button" onClick={onCancel} disabled={busy} className="w-full py-1.5 text-[10px] font-semibold text-on-surface-variant hover:text-error">Cancel donation</button>}
      </div>
    </div>
  )
}

interface DonationPaymentCardProps {
  draft: DonationDraft
  paymentIntent: PaymentIntent
  checking: boolean
  onRefreshStatus: () => void
  onOpenDonations: () => void
}

export const DonationPaymentCard = ({ draft, paymentIntent, checking, onRefreshStatus, onOpenDonations }: DonationPaymentCardProps) => {
  const paid = paymentIntent.status === 'paid'
  const unsuccessful = paymentIntent.status === 'failed' || paymentIntent.status === 'cancelled'
  return (
    <div className={`mt-4 rounded-xl border p-4 space-y-4 ${unsuccessful ? 'bg-rose-50 border-rose-200' : 'bg-emerald-50 border-emerald-200'}`}>
      <div className="flex items-center justify-between gap-2 border-b border-current/10 pb-2">
        <strong className="text-xs text-on-surface">{paid ? 'Donation Confirmed' : 'Official eGovPay Test Checkout'}</strong>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${paid ? 'bg-emerald-600 text-white' : unsuccessful ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'}`}>
          {paid ? 'Paid · Recorded' : unsuccessful ? paymentIntent.status : 'Pending · Not paid'}
        </span>
      </div>
      <div className="p-3 rounded-lg bg-white border border-current/10 text-[11px] space-y-2">
        <div className="flex justify-between gap-3"><span className="text-on-surface-variant">Recipient</span><strong className="text-right">{draft.campaign.recipientName}</strong></div>
        <div className="flex justify-between gap-3"><span className="text-on-surface-variant">Destination</span><span className="text-right">{draft.campaign.location}</span></div>
        <div className="flex justify-between gap-3"><span className="text-on-surface-variant">Reference</span><span className="font-mono font-bold">{paymentIntent.referenceNumber}</span></div>
        <div className="flex justify-between gap-3 border-t border-outline-variant/20 pt-2"><span className="font-bold">Amount</span><strong className="text-emerald-700">₱{paymentIntent.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong></div>
      </div>
      {paymentIntent.status === 'pending' && <a href={paymentIntent.paymentUrl} target="_blank" rel="noopener noreferrer" className="w-full py-3 rounded-lg bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-1.5"><span className="material-symbols-outlined text-base">open_in_new</span>Proceed to Official eGovPay Test Gateway</a>}
      {!paid && <button type="button" onClick={onRefreshStatus} disabled={checking} className="w-full py-2.5 rounded-lg bg-white border border-emerald-300 text-emerald-800 font-bold text-xs disabled:opacity-50">{checking ? 'Checking eGovPay...' : 'Refresh Payment Status'}</button>}
      <button type="button" onClick={onOpenDonations} className="w-full py-2 rounded-lg bg-white border border-fuchsia-200 text-fuchsia-800 font-semibold text-[11px]">Open Donation Ledger</button>
    </div>
  )
}

export const DonationHistoryCard = ({ donations, onOpen }: { donations: DonationSummary[]; onOpen: () => void }) => (
  <div className="mt-4 rounded-xl border border-fuchsia-200 bg-fuchsia-50 p-4 space-y-3">
    <div className="flex items-center justify-between"><strong className="text-xs text-fuchsia-900">My Local Donation History</strong><span className="text-[10px] text-on-surface-variant">{donations.length} record{donations.length === 1 ? '' : 's'}</span></div>
    {donations.slice(0, 3).map(donation => (
      <div key={donation.donationId} className="p-3 rounded-lg bg-white border border-fuchsia-100 text-[11px]">
        <div className="flex justify-between gap-3"><strong>{donation.campaign.title}</strong><span className="font-bold text-fuchsia-800">₱{donation.amount.toLocaleString()}</span></div>
        <div className="flex justify-between gap-3 mt-1 text-on-surface-variant"><span>{donation.campaign.recipientName}</span><span className="uppercase font-bold text-[9px]">{donation.status}</span></div>
      </div>
    ))}
    <button type="button" onClick={onOpen} className="w-full py-2 rounded-lg bg-fuchsia-700 text-white font-bold text-xs">View Full Donation Ledger</button>
  </div>
)
