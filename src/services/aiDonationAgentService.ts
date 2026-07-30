import { PaymentIntent } from './eGovPayService'
import {
  DonationCampaign,
  DonationDraft,
  DonationSummary,
  createDonationId,
  getDonationCampaign,
  getDonationCampaigns,
  getDonationSummaries,
  isDonationCampaignConfigured,
  normalizeDonationAmount,
  resolveDonationCampaign,
} from './donationService'

export type DonationAgentStage = 'campaign' | 'amount' | 'review' | 'payment'

export interface DonationAgentState {
  id: string
  stage: DonationAgentStage
  campaignId?: string
  amount?: number
  dedication?: string
  donationId: string
  paymentStatus?: PaymentIntent['status']
  sourceMessages: string[]
  offTopicCount: number
}

export interface DonationAgentPrompt {
  conversationId: string
  stage: DonationAgentStage
}

export interface DonationAgentTurn {
  state: DonationAgentState | null
  reply: string
  prompt?: DonationAgentPrompt
  draft?: DonationDraft
  paymentIntent?: PaymentIntent
  cancelled?: boolean
}

export interface DonationTrackingResult {
  isTrackingIntent: boolean
  content?: string
  donations?: DonationSummary[]
}

const cancellationPattern =
  /^(?:cancel|stop|exit|quit|never\s*mind|forget it)(?:\s+(?:this|the|my))?(?:\s+(?:donation|donate|payment|draft))?[.!]?$/i
const sensitivePaymentPattern = /\b(?:otp|pin|cvv|card number|credit card|debit card|password)\b/i

export const isDonationTrackingIntent = (message: string): boolean =>
  /\b(?:show|view|track|history|where|status|total|how much)\b.{0,60}\b(?:donations?|donated|donation)\b|\bwhere did my (?:last )?donation go\b/i.test(message)

export const isDonationAgentIntent = (message: string): boolean => {
  const normalized = message.trim()
  if (!normalized || cancellationPattern.test(normalized) || isDonationTrackingIntent(normalized)) return false
  return /\b(?:donate|donation|give money|support (?:a |the )?(?:cause|victims?|schools?|environment)|help (?:disaster|typhoon|flood|earthquake) victims?)\b/i.test(normalized)
}

const extractDonationAmount = (message: string, allowBareNumber = false): number | undefined => {
  const explicit = message.match(/(?:₱|php\s*|donat(?:e|ion)(?:\s+of)?\s+|amount(?:\s+(?:is|to)|:)?\s*)([\d,]+(?:\.\d{1,2})?)/i)
  if (explicit?.[1]) return normalizeDonationAmount(explicit[1])
  if (allowBareNumber && /^\s*(?:₱|php\s*)?[\d,]+(?:\.\d{1,2})?\s*$/i.test(message)) {
    return normalizeDonationAmount(message)
  }
  return undefined
}

export const buildDonationDraft = (state: DonationAgentState): DonationDraft | null => {
  const campaign = state.campaignId ? getDonationCampaign(state.campaignId) : undefined
  const amount = state.amount ? normalizeDonationAmount(state.amount) : undefined
  if (!campaign || !isDonationCampaignConfigured(campaign) || !amount) return null
  return {
    donationId: state.donationId,
    campaign,
    amount,
    dedication: state.dedication?.trim().slice(0, 160) || undefined,
  }
}

const campaignUnavailableReply = (campaign: DonationCampaign): string =>
  `**${campaign.title}** is listed for this prototype, but its recipient-specific eGovPay settlement is not configured. I will not create a checkout using a different recipient's settlement. Please choose an available campaign.`

const promptForState = (state: DonationAgentState, lead = ''): DonationAgentTurn => {
  const prefix = lead ? `${lead}\n\n` : ''
  const campaign = state.campaignId ? getDonationCampaign(state.campaignId) : undefined

  if (!campaign) {
    const next = { ...state, stage: 'campaign' as const }
    return {
      state: next,
      reply: prefix + 'Which configured campaign would you like to support? Choose from the campaign card below. I cannot route donations to an unverified free-form recipient.',
      prompt: { conversationId: state.id, stage: 'campaign' },
    }
  }

  if (!isDonationCampaignConfigured(campaign)) {
    const next = { ...state, stage: 'campaign' as const, campaignId: undefined }
    return {
      state: next,
      reply: prefix + campaignUnavailableReply(campaign),
      prompt: { conversationId: state.id, stage: 'campaign' },
    }
  }

  if (!state.amount) {
    const next = { ...state, stage: 'amount' as const }
    return {
      state: next,
      reply: prefix + `How much would you like to donate to **${campaign.title}**? Enter an amount from **₱1 to ₱100,000**, or choose a suggestion below.`,
      prompt: { conversationId: state.id, stage: 'amount' },
    }
  }

  const next = { ...state, stage: 'review' as const }
  return {
    state: next,
    reply: prefix + 'Your donation draft is ready. Review the recipient, destination, amount, and optional dedication. Nothing has been paid yet. Use the review card’s explicit action to create an eGovPay checkout link.',
    prompt: { conversationId: state.id, stage: 'review' },
    draft: buildDonationDraft(next) || undefined,
  }
}

const offTopicTurn = (state: DonationAgentState, hint: string): DonationAgentTurn => {
  const count = state.offTopicCount + 1
  return promptForState(
    { ...state, offTopicCount: count },
    `That response does not answer the current donation question, so I did not add it to the draft. ${hint}${count >= 2 ? ' You can say **cancel donation** to leave this agent.' : ''}`
  )
}

export const startDonationAgent = (message: string): DonationAgentTurn => {
  const state: DonationAgentState = {
    id: `donation-agent-${Date.now()}`,
    stage: 'campaign',
    donationId: createDonationId(),
    sourceMessages: [message],
    offTopicCount: 0,
  }
  const match = resolveDonationCampaign(message)
  const amount = extractDonationAmount(message)
  return promptForState({ ...state, campaignId: match.campaign?.id, amount })
}

export const continueDonationAgent = (state: DonationAgentState, message: string): DonationAgentTurn => {
  const normalized = message.trim()
  if (cancellationPattern.test(normalized)) {
    return {
      state: null,
      cancelled: true,
      reply: state.stage === 'payment'
        ? 'I closed the donation agent. Any existing eGovPay link keeps its official status, but nothing was marked paid from chat.'
        : 'The donation draft was cancelled. No eGovPay transaction was created and nothing was paid.',
    }
  }
  if (sensitivePaymentPattern.test(normalized)) {
    return promptForState(state, 'For your safety, never send passwords, OTPs, PINs, CVVs, or payment-card numbers in chat. Enter payment details only on the hosted eGovPay page.')
  }

  if (state.stage === 'campaign') {
    const match = resolveDonationCampaign(normalized)
    if (!match.campaign) return offTopicTurn(state, 'Choose one of the curated campaigns shown below.')
    return promptForState({ ...state, campaignId: match.campaign.id, offTopicCount: 0, sourceMessages: [...state.sourceMessages, normalized] })
  }

  if (state.stage === 'amount') {
    const amount = extractDonationAmount(normalized, true)
    if (!amount) return promptForState(state, 'Enter a valid donation amount from **₱1 to ₱100,000**.')
    return promptForState({ ...state, amount, offTopicCount: 0, sourceMessages: [...state.sourceMessages, `Amount: ${amount}`] })
  }

  if (state.stage === 'payment') {
    return {
      state,
      reply: state.paymentStatus === 'paid'
        ? 'eGovPay has confirmed this donation. Its confirmation block is now part of your local donation ledger.'
        : 'Use the official eGovPay link in the payment card. I cannot mark a donation as paid from a chat message; the gateway status must verify it.',
    }
  }

  const campaignMatch = resolveDonationCampaign(normalized)
  if (campaignMatch.campaign) {
    return promptForState({ ...state, campaignId: campaignMatch.campaign.id }, 'I changed the selected campaign. Review the updated draft.')
  }
  const amount = extractDonationAmount(normalized)
  if (amount) return promptForState({ ...state, amount }, 'I updated the donation amount.')
  const dedication = normalized.match(/^(?:dedication|message|note)(?:\s+is|:)?\s+(.{1,160})$/i)?.[1]
  if (dedication) return promptForState({ ...state, dedication: dedication.trim() }, 'I updated the optional dedication.')
  if (/^(?:remove|clear|no)\s+(?:the\s+)?(?:dedication|message|note)$/i.test(normalized)) {
    return promptForState({ ...state, dedication: undefined }, 'I removed the dedication.')
  }
  if (/\b(?:confirm|submit|pay|paid|proceed)\b/i.test(normalized)) {
    return promptForState(state, 'A chat message cannot create or confirm a payment. Review the card and use **Create eGovPay Donation Link** as the explicit action.')
  }
  return offTopicTurn(state, 'Tell me an updated amount, campaign, or dedication, or use the review card.')
}

export const markDonationPaymentCreated = (
  state: DonationAgentState,
  paymentIntent: PaymentIntent
): DonationAgentTurn => {
  const next: DonationAgentState = { ...state, stage: 'payment', paymentStatus: paymentIntent.status }
  return {
    state: next,
    reply: 'Your recipient-specific eGovPay test checkout is ready. The donation is still pending and has not been paid. Open the hosted gateway to continue.',
    prompt: { conversationId: state.id, stage: 'payment' },
    draft: buildDonationDraft(state) || undefined,
    paymentIntent,
  }
}

export const processDonationTrackingIntent = (message: string, userId: string): DonationTrackingResult => {
  if (!isDonationTrackingIntent(message)) return { isTrackingIntent: false }
  let donations: DonationSummary[]
  try {
    donations = getDonationSummaries(userId)
  } catch {
    return {
      isTrackingIntent: true,
      content: 'Your local donation ledger could not be read. Open the Donations module to run its integrity check before creating another donation.',
      donations: [],
    }
  }
  if (!donations.length) {
    return { isTrackingIntent: true, content: 'You do not have any donations recorded in this browser yet.', donations: [] }
  }

  const campaign = resolveDonationCampaign(message).campaign
  const filtered = campaign ? donations.filter(donation => donation.campaign.id === campaign.id) : donations
  const paid = filtered.filter(donation => donation.status === 'paid')
  const total = paid.reduce((sum, donation) => sum + donation.amount, 0)
  const last = filtered[0]
  const asksLast = /\b(?:last|latest|where)\b/i.test(message)
  const content = asksLast && last
    ? `Your latest matching donation is **₱${last.amount.toLocaleString()}** for **${last.campaign.title}**, routed to **${last.campaign.recipientName}** for **${last.campaign.purpose}**. Its current status is **${last.status}**.`
    : `This browser records **${filtered.length}** matching donation${filtered.length === 1 ? '' : 's'}, with **₱${total.toLocaleString()}** confirmed by eGovPay.`
  return { isTrackingIntent: true, content, donations: filtered }
}

export const getAvailableDonationCampaigns = (): DonationCampaign[] =>
  getDonationCampaigns().filter(isDonationCampaignConfigured)
