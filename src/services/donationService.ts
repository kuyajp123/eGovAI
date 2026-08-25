import {
  PaymentIntent,
  PaymentStatusSignal,
  getPublishedPaymentStatus,
} from './eGovPayService'

export interface DonationCampaign {
  id: string
  title: string
  recipientName: string
  location: string
  purpose: string
  settlementTemplateUuid?: string
  keywords: string[]
  suggestedAmounts: number[]
  active: boolean
}

export interface DonationDraft {
  donationId: string
  campaign: DonationCampaign
  amount: number
  dedication?: string
}

export type DonationLedgerEvent =
  | 'payment_link_created'
  | 'payment_confirmed'
  | 'payment_failed'
  | 'payment_cancelled'
  | 'payment_expired'

export interface DonationPaymentSnapshot {
  paymentId: string
  transactionId?: string
  referenceNumber: string
  status: PaymentIntent['status']
  paymentUrl?: string
  createdAt: string
  expiresAt?: string
  paidAt?: string
  verificationSource?: PaymentStatusSignal['verificationSource']
}

export interface DonationLedgerBlock {
  version: 1
  index: number
  blockId: string
  eventKey: string
  timestamp: string
  event: DonationLedgerEvent
  userId: string
  donationId: string
  campaign: Pick<DonationCampaign, 'id' | 'title' | 'recipientName' | 'location' | 'purpose' | 'settlementTemplateUuid'>
  amount: number
  dedication?: string
  payment: DonationPaymentSnapshot
  previousHash: string
  hash: string
}

export interface DonationSummary {
  donationId: string
  campaign: DonationLedgerBlock['campaign']
  amount: number
  dedication?: string
  status: PaymentIntent['status'] | 'expired'
  payment: DonationPaymentSnapshot
  createdAt: string
  updatedAt: string
  paidAt?: string
  blockCount: number
}

export interface DonationChainVerificationResult {
  valid: boolean
  blockCount: number
  firstInvalidIndex?: number
  reason?: string
  latestHash?: string
}

export interface DonationCampaignMatch {
  campaign?: DonationCampaign
  ambiguous: DonationCampaign[]
}

export const DONATION_LEDGER_STORAGE_PREFIX = 'egov_donation_ledger_v1:'
export const DONATION_LEDGER_CHANGED_EVENT = 'egov-donation-ledger-changed'
export const MIN_DONATION_AMOUNT = 1
export const MAX_DONATION_AMOUNT = 100_000

const fallbackCampaigns: DonationCampaign[] = [
  {
    id: 'disaster-relief',
    title: 'Disaster Relief and Recovery',
    recipientName: 'Configured Disaster Relief Recipient',
    location: 'Philippines',
    purpose: 'Emergency food, shelter, medical aid, and community recovery.',
    keywords: ['disaster', 'relief', 'typhoon', 'flood', 'earthquake', 'victims', 'emergency'],
    suggestedAmounts: [100, 250, 500, 1000],
    active: true,
  },
  {
    id: 'school-support',
    title: 'Public School Learning Support',
    recipientName: 'Configured Education Recipient',
    location: 'Philippines',
    purpose: 'Learning materials, classroom supplies, and student support.',
    keywords: ['school', 'schools', 'education', 'students', 'children', 'learning', 'classroom'],
    suggestedAmounts: [100, 300, 500, 1500],
    active: true,
  },
  {
    id: 'environment',
    title: 'Reforestation and Watershed Recovery',
    recipientName: 'Configured Environmental Recipient',
    location: 'Philippines',
    purpose: 'Tree planting, watershed rehabilitation, and habitat restoration.',
    keywords: ['environment', 'trees', 'forest', 'reforestation', 'watershed', 'nature', 'climate'],
    suggestedAmounts: [100, 250, 500, 1000],
    active: true,
  },
]

const getDefaultSettlementUuid = (): string | undefined =>
  import.meta.env.VITE_EGOVPAY_SETTLEMENT_TEMPLATE_UUID ||
  import.meta.env.VITE_EGOVPAY_SETTLEMENT_UUID ||
  undefined

const normalizeCampaign = (value: Partial<DonationCampaign>): DonationCampaign | null => {
  if (!value.id?.trim() || !value.title?.trim() || !value.recipientName?.trim()) return null
  const defaultSettlement = getDefaultSettlementUuid()
  return {
    id: value.id.trim(),
    title: value.title.trim(),
    recipientName: value.recipientName.trim(),
    location: value.location?.trim() || 'Philippines',
    purpose: value.purpose?.trim() || 'Donation support',
    settlementTemplateUuid: value.settlementTemplateUuid?.trim() || defaultSettlement,
    keywords: Array.isArray(value.keywords)
      ? value.keywords.map(item => String(item).trim().toLowerCase()).filter(Boolean)
      : [],
    suggestedAmounts: Array.isArray(value.suggestedAmounts)
      ? value.suggestedAmounts.map(Number).filter(amount => amount >= MIN_DONATION_AMOUNT && amount <= MAX_DONATION_AMOUNT)
      : [100, 500, 1000],
    active: value.active !== false,
  }
}

export const getDonationCampaigns = (): DonationCampaign[] => {
  const defaultSettlement = getDefaultSettlementUuid()
  const configured = import.meta.env.VITE_DONATION_CAMPAIGNS_JSON
  if (!configured?.trim()) {
    return fallbackCampaigns.map(campaign => ({
      ...campaign,
      settlementTemplateUuid: campaign.settlementTemplateUuid || defaultSettlement,
    }))
  }
  try {
    const parsed = JSON.parse(configured) as Partial<DonationCampaign>[]
    if (!Array.isArray(parsed)) {
      return fallbackCampaigns.map(campaign => ({
        ...campaign,
        settlementTemplateUuid: campaign.settlementTemplateUuid || defaultSettlement,
      }))
    }
    const campaigns = parsed.map(normalizeCampaign).filter((campaign): campaign is DonationCampaign => !!campaign)
    return campaigns.length
      ? campaigns
      : fallbackCampaigns.map(campaign => ({
          ...campaign,
          settlementTemplateUuid: campaign.settlementTemplateUuid || defaultSettlement,
        }))
  } catch (error) {
    console.warn('VITE_DONATION_CAMPAIGNS_JSON is invalid:', error)
    return fallbackCampaigns.map(campaign => ({
      ...campaign,
      settlementTemplateUuid: campaign.settlementTemplateUuid || defaultSettlement,
    }))
  }
}

export const isDonationCampaignConfigured = (campaign: DonationCampaign): boolean =>
  campaign.active && !!campaign.settlementTemplateUuid?.trim()

export const getDonationCampaign = (campaignId: string): DonationCampaign | undefined =>
  getDonationCampaigns().find(campaign => campaign.id === campaignId)

export const resolveDonationCampaign = (message: string): DonationCampaignMatch => {
  const normalized = message.toLowerCase()
  const scored = getDonationCampaigns()
    .map(campaign => {
      const phrases = [campaign.id, campaign.title, campaign.recipientName, ...campaign.keywords]
      const score = phrases.reduce((total, phrase) => total + (phrase && normalized.includes(phrase.toLowerCase()) ? 1 : 0), 0)
      return { campaign, score }
    })
    .filter(result => result.score > 0)
    .sort((a, b) => b.score - a.score)

  if (!scored.length) return { ambiguous: [] }
  const highest = scored[0].score
  const matches = scored.filter(result => result.score === highest).map(result => result.campaign)
  return matches.length === 1 ? { campaign: matches[0], ambiguous: [] } : { ambiguous: matches }
}

export const normalizeDonationAmount = (value: string | number): number | undefined => {
  const amount = typeof value === 'number'
    ? value
    : Number.parseFloat(value.replace(/[,₱PHP\s]/gi, ''))
  if (!Number.isFinite(amount) || amount < MIN_DONATION_AMOUNT || amount > MAX_DONATION_AMOUNT) return undefined
  return Math.round(amount * 100) / 100
}

export const createDonationId = (): string =>
  `DON-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`

const ledgerKey = (userId: string) => `${DONATION_LEDGER_STORAGE_PREFIX}${userId}`

export const getDonationLedger = (userId: string): DonationLedgerBlock[] => {
  const raw = localStorage.getItem(ledgerKey(userId))
  if (!raw) return []
  const parsed = JSON.parse(raw) as DonationLedgerBlock[]
  if (!Array.isArray(parsed)) throw new Error('The local donation ledger is not a valid block list.')
  return parsed
}

const canonicalize = (value: unknown): string => {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`
  const object = value as Record<string, unknown>
  return `{${Object.keys(object)
    .filter(key => object[key] !== undefined)
    .sort()
    .map(key => `${JSON.stringify(key)}:${canonicalize(object[key])}`)
    .join(',')}}`
}

const hashBlock = async (block: Omit<DonationLedgerBlock, 'hash'>): Promise<string> => {
  const bytes = new TextEncoder().encode(canonicalize(block))
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest)).map(byte => byte.toString(16).padStart(2, '0')).join('')
}

export const verifyDonationChain = async (userId: string): Promise<DonationChainVerificationResult> => {
  let ledger: DonationLedgerBlock[]
  try {
    ledger = getDonationLedger(userId)
  } catch (error) {
    return {
      valid: false,
      blockCount: 0,
      firstInvalidIndex: 0,
      reason: error instanceof Error ? error.message : 'The local donation ledger could not be read.',
    }
  }

  let previousHash = 'GENESIS'
  for (let index = 0; index < ledger.length; index += 1) {
    const block = ledger[index]
    if (block.index !== index || block.previousHash !== previousHash) {
      return { valid: false, blockCount: ledger.length, firstInvalidIndex: index, reason: 'Block order or previous hash does not match.' }
    }
    const { hash, ...unsignedBlock } = block
    const calculated = await hashBlock(unsignedBlock)
    if (calculated !== hash) {
      return { valid: false, blockCount: ledger.length, firstInvalidIndex: index, reason: 'The stored block hash does not match its contents.' }
    }
    previousHash = hash
  }
  return { valid: true, blockCount: ledger.length, latestHash: ledger.length ? ledger[ledger.length - 1].hash : undefined }
}

const appendDonationBlock = async (
  userId: string,
  input: Omit<DonationLedgerBlock, 'version' | 'index' | 'blockId' | 'timestamp' | 'previousHash' | 'hash'>
): Promise<DonationLedgerBlock> => {
  const ledger = getDonationLedger(userId)
  const verification = await verifyDonationChain(userId)
  if (!verification.valid) throw new Error(`Donation ledger integrity check failed: ${verification.reason}`)
  const duplicate = ledger.find(block => block.eventKey === input.eventKey)
  if (duplicate) return duplicate

  const unsignedBlock: Omit<DonationLedgerBlock, 'hash'> = {
    ...input,
    version: 1,
    index: ledger.length,
    blockId: `BLOCK-${String(ledger.length + 1).padStart(6, '0')}`,
    timestamp: new Date().toISOString(),
    previousHash: ledger.length ? ledger[ledger.length - 1].hash : 'GENESIS',
  }
  const block: DonationLedgerBlock = { ...unsignedBlock, hash: await hashBlock(unsignedBlock) }
  localStorage.setItem(ledgerKey(userId), JSON.stringify([...ledger, block]))
  window.dispatchEvent(new CustomEvent(DONATION_LEDGER_CHANGED_EVENT, { detail: { userId, donationId: input.donationId } }))
  return block
}

export const recordDonationPaymentLink = async (
  userId: string,
  draft: DonationDraft,
  intent: PaymentIntent
): Promise<DonationLedgerBlock> =>
  appendDonationBlock(userId, {
    eventKey: `${draft.donationId}:payment_link_created:${intent.paymentId}`,
    event: 'payment_link_created',
    userId,
    donationId: draft.donationId,
    campaign: {
      id: draft.campaign.id,
      title: draft.campaign.title,
      recipientName: draft.campaign.recipientName,
      location: draft.campaign.location,
      purpose: draft.campaign.purpose,
      settlementTemplateUuid: draft.campaign.settlementTemplateUuid,
    },
    amount: draft.amount,
    dedication: draft.dedication?.trim() || undefined,
    payment: {
      paymentId: intent.paymentId,
      transactionId: intent.transactionId,
      referenceNumber: intent.referenceNumber,
      status: intent.status,
      paymentUrl: intent.paymentUrl,
      createdAt: intent.createdAt,
      expiresAt: intent.expiresAt,
    },
  })

const eventForStatus = (status: PaymentIntent['status']): DonationLedgerEvent | undefined => {
  if (status === 'paid') return 'payment_confirmed'
  if (status === 'failed') return 'payment_failed'
  if (status === 'cancelled') return 'payment_cancelled'
  return undefined
}

export const getDonationSummaries = (userId: string): DonationSummary[] => {
  const summaries = new Map<string, DonationSummary>()
  getDonationLedger(userId).forEach(block => {
    const existing = summaries.get(block.donationId)
    const status: DonationSummary['status'] = block.event === 'payment_confirmed'
      ? 'paid'
      : block.event === 'payment_failed'
        ? 'failed'
        : block.event === 'payment_cancelled'
          ? 'cancelled'
          : block.event === 'payment_expired'
            ? 'expired'
            : existing?.status || 'pending'
    summaries.set(block.donationId, {
      donationId: block.donationId,
      campaign: block.campaign,
      amount: block.amount,
      dedication: block.dedication,
      status,
      payment: { ...block.payment, status: status === 'expired' ? 'cancelled' : status },
      createdAt: existing?.createdAt || block.timestamp,
      updatedAt: block.timestamp,
      paidAt: block.payment.paidAt || existing?.paidAt,
      blockCount: (existing?.blockCount || 0) + 1,
    })
  })
  return [...summaries.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export const getDonationBlocks = (userId: string, donationId: string): DonationLedgerBlock[] => {
  try {
    return getDonationLedger(userId).filter(block => block.donationId === donationId)
  } catch {
    return []
  }
}

export const recordDonationPaymentStatus = async (
  userId: string,
  paymentId: string,
  signal: PaymentStatusSignal
): Promise<DonationSummary | undefined> => {
  const summary = getDonationSummaries(userId).find(item => item.payment.paymentId === paymentId)
  if (!summary) return undefined
  if (signal.status === 'paid' && signal.verificationSource !== 'egovpay_api') return summary
  const event = eventForStatus(signal.status)
  if (!event) return summary

  await appendDonationBlock(userId, {
    eventKey: `${summary.donationId}:${event}`,
    event,
    userId,
    donationId: summary.donationId,
    campaign: summary.campaign,
    amount: summary.amount,
    dedication: summary.dedication,
    payment: {
      ...summary.payment,
      referenceNumber: signal.referenceNumber || summary.payment.referenceNumber,
      status: signal.status,
      paidAt: signal.paidAt,
      verificationSource: signal.verificationSource,
    },
  })
  return getDonationSummaries(userId).find(item => item.donationId === summary.donationId)
}

export const markExpiredDonations = async (userId: string): Promise<void> => {
  const now = Date.now()
  const pending = getDonationSummaries(userId).filter(summary =>
    summary.status === 'pending' && summary.payment.expiresAt && new Date(summary.payment.expiresAt).getTime() <= now
  )
  for (const summary of pending) {
    await appendDonationBlock(userId, {
      eventKey: `${summary.donationId}:payment_expired`,
      event: 'payment_expired',
      userId,
      donationId: summary.donationId,
      campaign: summary.campaign,
      amount: summary.amount,
      dedication: summary.dedication,
      payment: { ...summary.payment, status: 'cancelled' },
    })
  }
}

export const reconcilePublishedDonationStatuses = async (userId: string): Promise<DonationSummary[]> => {
  await markExpiredDonations(userId)
  const pending = getDonationSummaries(userId).filter(summary => summary.status === 'pending')
  for (const summary of pending) {
    const signal = getPublishedPaymentStatus(summary.payment.paymentId)
    if (signal) await recordDonationPaymentStatus(userId, summary.payment.paymentId, signal)
  }
  return getDonationSummaries(userId)
}
