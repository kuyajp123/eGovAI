import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  PaymentIntent,
  PaymentStatusSignal,
  createPaymentIntent,
  getCachedPaymentTransaction,
  resolvePaymentSettlementTemplate,
} from '../eGovPayService'
import {
  DONATION_LEDGER_STORAGE_PREFIX,
  DonationCampaign,
  DonationDraft,
  getDonationCampaigns,
  getDonationLedger,
  getDonationSummaries,
  recordDonationPaymentLink,
  recordDonationPaymentStatus,
  verifyDonationChain,
} from '../donationService'
import {
  continueDonationAgent,
  isDonationAgentIntent,
  isDonationTrackingIntent,
  processDonationTrackingIntent,
  startDonationAgent,
} from '../aiDonationAgentService'

class MemoryStorage implements Storage {
  private values = new Map<string, string>()
  get length() { return this.values.size }
  clear() { this.values.clear() }
  getItem(key: string) { return this.values.get(key) ?? null }
  key(index: number) { return [...this.values.keys()][index] ?? null }
  removeItem(key: string) { this.values.delete(key) }
  setItem(key: string, value: string) { this.values.set(key, String(value)) }
}

const campaign: DonationCampaign = {
  id: 'school-support',
  title: 'Public School Learning Support',
  recipientName: 'Test Education Recipient',
  location: 'Cebu, Philippines',
  purpose: 'School supplies',
  settlementTemplateUuid: 'settlement-school-123',
  keywords: ['school', 'schools', 'education', 'students'],
  suggestedAmounts: [100, 500],
  active: true,
}

const draft: DonationDraft = {
  donationId: 'DON-TEST-1',
  campaign,
  amount: 500,
  dedication: 'For learners',
}

const intent: PaymentIntent = {
  paymentId: 'pay-uuid-1',
  transactionId: 'txn-1',
  referenceNumber: 'ref-1',
  amount: 500,
  description: 'Donation',
  paymentUrl: 'https://example.test/pay-uuid-1',
  status: 'pending',
  createdAt: '2026-01-01T00:00:00.000Z',
  expiresAt: '2099-01-01T00:00:00.000Z',
}

const statusSignal = (
  verificationSource: PaymentStatusSignal['verificationSource'],
  status: PaymentStatusSignal['status'] = 'paid'
): PaymentStatusSignal => ({
  paymentId: intent.paymentId,
  referenceNumber: intent.referenceNumber,
  transactionId: intent.transactionId || '',
  status,
  gatewayStatus: status === 'paid' ? 'PAID' : status.toUpperCase(),
  amount: intent.amount,
  paidAt: status === 'paid' ? '2026-01-01T00:05:00.000Z' : undefined,
  updatedAt: '2026-01-01T00:05:00.000Z',
  verificationSource,
})

beforeEach(() => {
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: new MemoryStorage() })
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { dispatchEvent: vi.fn(), location: { origin: 'https://app.test' } },
  })
  vi.stubEnv('VITE_DONATION_CAMPAIGNS_JSON', JSON.stringify([campaign]))
})

describe('recipient-specific eGovPay settlement', () => {
  it('uses the donation campaign settlement and rejects a missing one', () => {
    expect(resolvePaymentSettlementTemplate({
      settlementTemplateUuid: campaign.settlementTemplateUuid,
      context: { kind: 'donation', entityId: 'DON-1', userId: 'user-1' },
    }, 'shared-settlement')).toBe(campaign.settlementTemplateUuid)

    expect(() => resolvePaymentSettlementTemplate({
      context: { kind: 'donation', entityId: 'DON-1', userId: 'user-1' },
    }, 'shared-settlement')).toThrow(/does not have a configured/i)

    expect(resolvePaymentSettlementTemplate({}, 'shared-settlement')).toBe('shared-settlement')
  })

  it('keeps separate cached context for multiple pending donations', async () => {
    vi.stubEnv('VITE_USE_MOCK_SERVICES', 'true')
    const first = await createPaymentIntent({
      amount: 100,
      description: 'First donation',
      citizenName: 'Test Citizen',
      settlementTemplateUuid: campaign.settlementTemplateUuid,
      context: { kind: 'donation', entityId: 'DON-A', userId: 'user-1' },
    })
    const second = await createPaymentIntent({
      amount: 200,
      description: 'Second donation',
      citizenName: 'Test Citizen',
      settlementTemplateUuid: campaign.settlementTemplateUuid,
      context: { kind: 'donation', entityId: 'DON-B', userId: 'user-1' },
    })

    expect(getCachedPaymentTransaction(first.paymentId)?.context?.entityId).toBe('DON-A')
    expect(getCachedPaymentTransaction(second.transactionId)?.context?.entityId).toBe('DON-B')
  })
})

describe('donation blockchain-style ledger', () => {
  it('links payment and confirmation blocks and ignores duplicate status events', async () => {
    await recordDonationPaymentLink('user-1', draft, intent)
    expect((await verifyDonationChain('user-1')).valid).toBe(true)

    await recordDonationPaymentStatus('user-1', intent.paymentId, statusSignal('redirect_hint'))
    expect(getDonationLedger('user-1')).toHaveLength(1)
    expect(getDonationSummaries('user-1')[0].status).toBe('pending')

    await recordDonationPaymentStatus('user-1', intent.paymentId, statusSignal('egovpay_api'))
    await recordDonationPaymentStatus('user-1', intent.paymentId, statusSignal('egovpay_api'))
    const ledger = getDonationLedger('user-1')
    expect(ledger).toHaveLength(2)
    expect(ledger[1].previousHash).toBe(ledger[0].hash)
    expect(getDonationSummaries('user-1')[0].status).toBe('paid')
    expect((await verifyDonationChain('user-1')).valid).toBe(true)
  })

  it('detects modified local block contents and isolates user ledgers', async () => {
    await recordDonationPaymentLink('user-1', draft, intent)
    expect(getDonationSummaries('user-2')).toEqual([])

    const storageKey = `${DONATION_LEDGER_STORAGE_PREFIX}user-1`
    const blocks = JSON.parse(localStorage.getItem(storageKey) || '[]') as Array<Record<string, unknown>>
    blocks[0].amount = 9999
    localStorage.setItem(storageKey, JSON.stringify(blocks))

    const verification = await verifyDonationChain('user-1')
    expect(verification.valid).toBe(false)
    expect(verification.firstInvalidIndex).toBe(0)
  })
})

describe('agentic donation flow', () => {
  it('extracts a configured campaign and amount, then creates an editable review', () => {
    expect(getDonationCampaigns()[0].settlementTemplateUuid).toBe('settlement-school-123')
    expect(isDonationAgentIntent('Donate ₱500 for schools')).toBe(true)
    const turn = startDonationAgent('Donate ₱500 for schools')
    expect(turn.state?.stage).toBe('review')
    expect(turn.draft?.campaign.id).toBe('school-support')
    expect(turn.draft?.amount).toBe(500)
  })

  it('rejects sensitive payment data and supports cancellation', () => {
    const start = startDonationAgent('I want to make a donation')
    expect(start.state?.stage).toBe('campaign')
    const protectedTurn = continueDonationAgent(start.state!, 'my card number is 4111111111111111')
    expect(protectedTurn.reply).toMatch(/never send/i)
    const cancelled = continueDonationAgent(start.state!, 'cancel donation')
    expect(cancelled.state).toBeNull()
    expect(cancelled.cancelled).toBe(true)
  })

  it('answers tracking questions only from the local ledger', async () => {
    expect(isDonationTrackingIntent('Where did my last donation go?')).toBe(true)
    expect(processDonationTrackingIntent('Show my donations', 'user-1').donations).toEqual([])
    await recordDonationPaymentLink('user-1', draft, intent)
    const result = processDonationTrackingIntent('Where did my last donation go?', 'user-1')
    expect(result.content).toContain(campaign.recipientName)
    expect(result.donations).toHaveLength(1)
  })
})
