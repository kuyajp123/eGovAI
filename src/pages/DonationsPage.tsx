import { useCallback, useEffect, useMemo, useState } from 'react'
import { DonationPaymentCard } from '../components/DonationAgentCards'
import { useAuth } from '../context/AuthContext'
import {
  PAYMENT_STATUS_STORAGE_PREFIX,
  PaymentIntent,
  createPaymentIntent,
  getPublishedPaymentStatus,
  getTransactionDetails,
  publishPaymentStatus,
} from '../services/eGovPayService'
import {
  DonationChainVerificationResult,
  DonationDraft,
  DonationSummary,
  createDonationId,
  getDonationBlocks,
  getDonationCampaigns,
  getDonationLedger,
  isDonationCampaignConfigured,
  normalizeDonationAmount,
  reconcilePublishedDonationStatuses,
  recordDonationPaymentLink,
  recordDonationPaymentStatus,
  verifyDonationChain,
} from '../services/donationService'
import {
  DONATION_ANCHOR_STORAGE_PREFIX,
  DonationChainAnchorReceipt,
  getDonationChainAnchors,
  requestDonationChainAnchor,
  syncDonationChainAnchors,
} from '../services/eChainService'

const DonationsPage = () => {
  const { user } = useAuth()
  const campaigns = useMemo(() => getDonationCampaigns(), [])
  const [selectedCampaignId, setSelectedCampaignId] = useState(campaigns.find(isDonationCampaignConfigured)?.id || campaigns[0]?.id || '')
  const [amount, setAmount] = useState('')
  const [dedication, setDedication] = useState('')
  const [donations, setDonations] = useState<DonationSummary[]>([])
  const [selectedDonationId, setSelectedDonationId] = useState<string | null>(null)
  const [activeDraft, setActiveDraft] = useState<DonationDraft | null>(null)
  const [activePayment, setActivePayment] = useState<PaymentIntent | null>(null)
  const [integrity, setIntegrity] = useState<DonationChainVerificationResult | null>(null)
  const [anchors, setAnchors] = useState<DonationChainAnchorReceipt[]>([])
  const [busy, setBusy] = useState(false)
  const [checkingPaymentId, setCheckingPaymentId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const selectedCampaign = campaigns.find(campaign => campaign.id === selectedCampaignId)
  const paidTotal = donations.filter(donation => donation.status === 'paid').reduce((sum, donation) => sum + donation.amount, 0)
  const confirmedAnchorCount = anchors.filter(anchor => anchor.status === 'confirmed').length
  const anchorByBlockHash = useMemo(() => new Map(anchors.map(anchor => [anchor.blockHash, anchor])), [anchors])

  const refreshLedger = useCallback(async () => {
    if (!user) return
    try {
      const next = await reconcilePublishedDonationStatuses(user.id)
      setDonations(next)
      setActivePayment(previous => {
        if (!previous) return previous
        const summary = next.find(item => item.payment.paymentId === previous.paymentId)
        if (!summary || summary.status === 'expired') return previous
        return {
          ...previous,
          status: summary.status,
          referenceNumber: summary.payment.referenceNumber || previous.referenceNumber,
          paidAt: summary.paidAt,
          statusUpdatedAt: summary.updatedAt,
        }
      })
      const nextIntegrity = await verifyDonationChain(user.id)
      setIntegrity(nextIntegrity)
      setAnchors(nextIntegrity.valid
        ? await syncDonationChainAnchors(user.id, getDonationLedger(user.id))
        : getDonationChainAnchors(user.id))
      setError(null)
    } catch (ledgerError) {
      setError(ledgerError instanceof Error ? ledgerError.message : 'The local donation ledger could not be loaded.')
      setIntegrity({ valid: false, blockCount: 0, reason: 'The local donation ledger could not be loaded.' })
    }
  }, [user])

  const refreshPaymentStatus = useCallback(async (paymentId: string) => {
    if (!user || checkingPaymentId) return
    setCheckingPaymentId(paymentId)
    try {
      const published = getPublishedPaymentStatus(paymentId)
      const signal = published?.verificationSource === 'egovpay_api' && published.status !== 'pending'
        ? published
        : publishPaymentStatus(await getTransactionDetails(paymentId), 'egovpay_api')
      await recordDonationPaymentStatus(user.id, paymentId, signal)
      if (activePayment?.paymentId === paymentId) {
        setActivePayment(previous => previous ? {
          ...previous,
          status: signal.status,
          referenceNumber: signal.referenceNumber || previous.referenceNumber,
          paidAt: signal.paidAt,
          statusUpdatedAt: signal.updatedAt,
        } : previous)
      }
      await refreshLedger()
    } catch {
      setError('eGovPay has not returned a final status yet. The donation remains pending.')
    } finally {
      setCheckingPaymentId(null)
    }
  }, [activePayment?.paymentId, checkingPaymentId, refreshLedger, user])

  useEffect(() => {
    void refreshLedger()
    const handleStorage = (event: StorageEvent) => {
      if (event.key?.startsWith(PAYMENT_STATUS_STORAGE_PREFIX) || event.key?.startsWith(DONATION_ANCHOR_STORAGE_PREFIX)) {
        void refreshLedger()
      }
    }
    const handleFocus = () => void refreshLedger()
    window.addEventListener('storage', handleStorage)
    window.addEventListener('focus', handleFocus)
    return () => {
      window.removeEventListener('storage', handleStorage)
      window.removeEventListener('focus', handleFocus)
    }
  }, [refreshLedger])

  useEffect(() => {
    if (!anchors.some(anchor => anchor.status === 'submitted')) return
    const timer = window.setInterval(() => void refreshLedger(), 5_000)
    return () => window.clearInterval(timer)
  }, [anchors, refreshLedger])

  const createCheckout = async () => {
    if (!user || !selectedCampaign || busy) return
    const normalizedAmount = normalizeDonationAmount(amount)
    if (!isDonationCampaignConfigured(selectedCampaign)) {
      setError('This campaign cannot accept donations until its recipient-specific eGovPay settlement UUID is configured.')
      return
    }
    if (!normalizedAmount) {
      setError('Enter an amount from ₱1 to ₱100,000.')
      return
    }

    setBusy(true)
    setError(null)
    const draft: DonationDraft = {
      donationId: createDonationId(),
      campaign: selectedCampaign,
      amount: normalizedAmount,
      dedication: dedication.trim().slice(0, 160) || undefined,
    }
    try {
      const citizenName = [user.firstName, user.middleName, user.lastName].filter(Boolean).join(' ')
      const intent = await createPaymentIntent({
        amount: draft.amount,
        description: `Donation ${draft.donationId} — ${draft.campaign.title}`,
        citizenName,
        citizenEmail: user.email,
        citizenMobile: user.mobileNumber,
        settlementTemplateUuid: draft.campaign.settlementTemplateUuid,
        context: {
          kind: 'donation',
          entityId: draft.donationId,
          userId: user.id,
          campaignId: draft.campaign.id,
          campaignTitle: draft.campaign.title,
          recipientName: draft.campaign.recipientName,
          destination: draft.campaign.location,
        },
        items: [{ name: `Donation — ${draft.campaign.title}`, amount: draft.amount }],
      })
      await recordDonationPaymentLink(user.id, draft, intent)
      setActiveDraft(draft)
      setActivePayment(intent)
      setSelectedDonationId(draft.donationId)
      await refreshLedger()
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : 'The eGovPay donation link could not be created.')
    } finally {
      setBusy(false)
    }
  }

  const selectedDonation = donations.find(donation => donation.donationId === selectedDonationId)
  const selectedBlocks = user && selectedDonationId ? getDonationBlocks(user.id, selectedDonationId) : []

  const retryAnchor = async (blockHash: string) => {
    if (!user) return
    const block = getDonationLedger(user.id).find(item => item.hash === blockHash)
    if (!block) return
    const receipt = await requestDonationChainAnchor(user.id, block, true)
    setAnchors(previous => [receipt, ...previous.filter(item => item.blockHash !== receipt.blockHash)])
  }

  return (
    <main className="min-h-screen pt-24 pb-28 px-4 md:px-8 max-w-6xl mx-auto space-y-8">
      <section className="rounded-3xl bg-gradient-to-br from-fuchsia-800 via-purple-800 to-indigo-800 text-white p-6 md:p-8 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 text-fuchsia-100 text-xs font-bold uppercase tracking-wider"><span className="material-symbols-outlined">volunteer_activism</span>eGovPH Donations</div>
            <h1 className="text-2xl md:text-3xl font-bold mt-2">Donate through eGovPay and anchor verified records to eGovChain</h1>
            <p className="text-sm text-white/80 mt-2">Each enabled campaign uses its own settlement. After eGovPay verifies a successful payment, only its SHA-256 confirmation-block hash is submitted to eGovChain.</p>
          </div>
          <div className="grid grid-cols-2 gap-3 min-w-[260px]">
            <div className="rounded-2xl bg-white/10 p-4"><div className="text-[10px] uppercase text-white/70">Confirmed total</div><div className="text-xl font-bold mt-1">₱{paidTotal.toLocaleString()}</div></div>
            <div className="rounded-2xl bg-white/10 p-4"><div className="text-[10px] uppercase text-white/70">Ledger blocks</div><div className="text-xl font-bold mt-1">{integrity?.blockCount || 0}</div></div>
            <div className="rounded-2xl bg-white/10 p-4 col-span-2"><div className="text-[10px] uppercase text-white/70">Confirmed eGovChain anchors</div><div className="text-xl font-bold mt-1">{confirmedAnchorCount}</div></div>
          </div>
        </div>
      </section>

      {error && <div className="rounded-xl border border-amber-300 bg-amber-50 text-amber-900 p-4 text-sm">{error}</div>}

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div><h2 className="text-xl font-bold text-on-surface">Choose a campaign</h2><p className="text-xs text-on-surface-variant mt-1">Only campaigns with a recipient-specific settlement can create a checkout.</p></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {campaigns.map(campaign => {
              const configured = isDonationCampaignConfigured(campaign)
              const selected = selectedCampaignId === campaign.id
              return (
                <button key={campaign.id} type="button" onClick={() => setSelectedCampaignId(campaign.id)} className={`rounded-2xl border p-5 text-left transition-all ${selected ? 'border-fuchsia-500 ring-2 ring-fuchsia-100 bg-fuchsia-50' : 'border-outline-variant/40 bg-white hover:border-fuchsia-300'}`}>
                  <div className="flex items-start justify-between gap-3"><span className="material-symbols-outlined text-3xl text-fuchsia-700">favorite</span><span className={`text-[9px] px-2 py-1 rounded-full font-bold ${configured ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>{configured ? 'eGovPay ready' : 'Settlement required'}</span></div>
                  <h3 className="font-bold text-on-surface mt-3">{campaign.title}</h3>
                  <p className="text-[11px] font-semibold text-fuchsia-800 mt-1">{campaign.recipientName} · {campaign.location}</p>
                  <p className="text-xs text-on-surface-variant mt-2 leading-relaxed">{campaign.purpose}</p>
                </button>
              )
            })}
          </div>
        </div>

        <aside className="rounded-2xl bg-white border border-outline-variant/40 shadow-sm p-5 h-fit space-y-4">
          <div><h2 className="font-bold text-on-surface">Donation details</h2><p className="text-[11px] text-on-surface-variant mt-1">Review before creating the pending checkout.</p></div>
          {selectedCampaign && <div className="rounded-xl bg-fuchsia-50 border border-fuchsia-100 p-3 text-xs"><strong>{selectedCampaign.title}</strong><div className="text-on-surface-variant mt-1">To: {selectedCampaign.recipientName}</div><div className="text-on-surface-variant">Where: {selectedCampaign.location}</div></div>}
          <div><label className="text-[10px] font-bold uppercase text-on-surface-variant">Amount (PHP)</label><input type="number" min="1" max="100000" step="0.01" value={amount} onChange={event => setAmount(event.target.value)} className="mt-1 w-full rounded-lg border border-outline-variant/50 px-3 py-2.5 text-sm" placeholder="500" /></div>
          {selectedCampaign && <div className="flex flex-wrap gap-2">{selectedCampaign.suggestedAmounts.map(value => <button key={value} type="button" onClick={() => setAmount(String(value))} className="px-3 py-1.5 rounded-full bg-fuchsia-50 border border-fuchsia-200 text-fuchsia-800 text-[10px] font-bold">₱{value.toLocaleString()}</button>)}</div>}
          <div><label className="text-[10px] font-bold uppercase text-on-surface-variant">Optional dedication</label><textarea maxLength={160} value={dedication} onChange={event => setDedication(event.target.value)} className="mt-1 w-full rounded-lg border border-outline-variant/50 px-3 py-2.5 text-sm min-h-20" /></div>
          <button type="button" disabled={busy || !selectedCampaign || !isDonationCampaignConfigured(selectedCampaign)} onClick={() => void createCheckout()} className="w-full rounded-lg bg-fuchsia-700 text-white py-3 text-xs font-bold disabled:opacity-50">{busy ? 'Creating eGovPay Link...' : 'Review & Create eGovPay Link'}</button>
          <p className="text-[10px] text-center text-on-surface-variant">No charge occurs here. Payment details belong only on the hosted eGovPay page.</p>
        </aside>
      </section>

      {activeDraft && activePayment && <DonationPaymentCard draft={activeDraft} paymentIntent={activePayment} checking={checkingPaymentId === activePayment.paymentId} onRefreshStatus={() => void refreshPaymentStatus(activePayment.paymentId)} onOpenDonations={() => setSelectedDonationId(activeDraft.donationId)} />}

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-2xl bg-white border border-outline-variant/40 p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-4"><div><h2 className="font-bold text-on-surface">My Donations</h2><p className="text-[11px] text-on-surface-variant">Stored only in this browser for {user?.firstName || 'this user'}.</p></div><button type="button" onClick={() => void refreshLedger()} className="text-xs font-bold text-fuchsia-700">Refresh</button></div>
          {!donations.length ? (
            <div className="rounded-xl bg-surface-container p-6 text-center text-sm text-on-surface-variant">No donation payment links have been recorded yet.</div>
          ) : (
            <div className="space-y-3">
              {donations.map(donation => (
                <div key={donation.donationId} className={`rounded-xl border p-4 ${selectedDonationId === donation.donationId ? 'border-fuchsia-400 bg-fuchsia-50' : 'border-outline-variant/30'}`}>
                  <button type="button" onClick={() => setSelectedDonationId(donation.donationId)} className="w-full text-left">
                    <div className="flex justify-between gap-3">
                      <div><strong className="text-sm">{donation.campaign.title}</strong><div className="text-[11px] text-on-surface-variant mt-1">{donation.campaign.recipientName} · {donation.campaign.location}</div></div>
                      <div className="text-right"><strong className="text-fuchsia-800">₱{donation.amount.toLocaleString()}</strong><div className="text-[9px] uppercase font-bold mt-1">{donation.status}</div></div>
                    </div>
                  </button>
                  {donation.status === 'pending' && (
                    <button type="button" disabled={checkingPaymentId === donation.payment.paymentId} onClick={() => void refreshPaymentStatus(donation.payment.paymentId)} className="mt-3 w-full py-2 rounded-lg bg-white border border-fuchsia-200 text-fuchsia-800 text-[10px] font-bold disabled:opacity-50">
                      {checkingPaymentId === donation.payment.paymentId ? 'Checking eGovPay...' : 'Refresh Official Payment Status'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <aside className={`rounded-2xl border p-5 h-fit ${integrity?.valid ? 'border-emerald-200 bg-emerald-50' : 'border-rose-200 bg-rose-50'}`}>
          <div className="flex items-center gap-2"><span className="material-symbols-outlined">{integrity?.valid ? 'verified' : 'gpp_bad'}</span><h2 className="font-bold">Local ledger integrity</h2></div>
          <p className="text-xs mt-2">{integrity?.valid ? `All ${integrity.blockCount} locally linked blocks passed SHA-256 verification.` : integrity?.reason || 'Checking the local chain...'}</p>
          {integrity?.firstInvalidIndex !== undefined && <p className="text-[11px] mt-2 font-bold">First invalid block: #{integrity.firstInvalidIndex + 1}</p>}
          {integrity?.latestHash && <p className="font-mono text-[9px] break-all mt-3">Latest: {integrity.latestHash}</p>}
          <p className="text-[10px] leading-relaxed mt-4 border-t border-current/10 pt-3">The complete history remains browser-local and can be removed by clearing browser data. Verified payment-confirmation hashes can be independently timestamped on eGovChain, but this still does not prove how a recipient later spent the funds.</p>
        </aside>
      </section>

      {selectedDonation && (
        <section className="rounded-2xl bg-white border border-outline-variant/40 p-5 shadow-sm">
          <h2 className="font-bold">Donation block history · {selectedDonation.donationId}</h2>
          <div className="mt-4 space-y-3">
            {selectedBlocks.map(block => {
              const anchor = anchorByBlockHash.get(block.hash)
              return (
                <div key={block.blockId} className="rounded-xl bg-surface-container p-4 text-xs">
                  <div className="flex justify-between gap-3"><strong>#{block.index + 1} · {block.event.replace(/_/g, ' ')}</strong><span>{new Date(block.timestamp).toLocaleString()}</span></div>
                  <div className="font-mono text-[9px] break-all mt-2 text-on-surface-variant">Hash: {block.hash}</div>
                  <div className="font-mono text-[9px] break-all mt-1 text-on-surface-variant">Previous: {block.previousHash}</div>
                  {block.event === 'payment_confirmed' && (
                    <div className={`mt-3 rounded-lg border p-3 ${anchor?.status === 'confirmed' ? 'border-emerald-200 bg-emerald-50' : anchor?.status === 'failed' ? 'border-amber-200 bg-amber-50' : 'border-blue-200 bg-blue-50'}`}>
                      <div className="flex items-center justify-between gap-3">
                        <strong>eGovChain anchor</strong>
                        <span className="uppercase text-[9px] font-bold">{anchor?.status || 'waiting'}</span>
                      </div>
                      {anchor?.transactionHash && <div className="font-mono text-[9px] break-all mt-2">Transaction: {anchor.transactionHash}</div>}
                      {anchor?.blockNumber !== undefined && <div className="text-[10px] mt-1">Block #{anchor.blockNumber} · {anchor.confirmations || 0} confirmation{anchor.confirmations === 1 ? '' : 's'}</div>}
                      {anchor?.explorerUrl && <a href={anchor.explorerUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-2 font-bold text-blue-700"><span className="material-symbols-outlined text-sm">open_in_new</span>View on eGovChain Explorer</a>}
                      {anchor?.error && <p className="text-[10px] mt-2 text-amber-900">{anchor.error}</p>}
                      {anchor?.status === 'failed' && <button type="button" onClick={() => void retryAnchor(block.hash)} className="mt-2 px-3 py-1.5 rounded-md bg-amber-700 text-white text-[10px] font-bold">Retry eGovChain Anchor</button>}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}
    </main>
  )
}

export default DonationsPage
