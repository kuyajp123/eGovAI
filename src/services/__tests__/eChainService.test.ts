import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  PaymentIntent,
  PaymentStatusSignal,
} from '../eGovPayService'
import {
  DonationCampaign,
  DonationDraft,
  getDonationLedger,
  recordDonationPaymentLink,
  recordDonationPaymentStatus,
} from '../donationService'
import {
  getDonationChainAnchor,
  isAnchorableDonationBlock,
  refreshDonationChainAnchor,
  requestDonationChainAnchor,
  syncDonationChainAnchors,
} from '../eChainService'

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
  id: 'relief',
  title: 'Relief Fund',
  recipientName: 'Verified Recipient',
  location: 'Philippines',
  purpose: 'Emergency support',
  settlementTemplateUuid: 'recipient-settlement',
  keywords: ['relief'],
  suggestedAmounts: [500],
  active: true,
}

const draft: DonationDraft = {
  donationId: 'DON-ANCHOR-1',
  campaign,
  amount: 500,
  dedication: 'Private dedication must stay off-chain',
}

const intent: PaymentIntent = {
  paymentId: 'pay-anchor-1',
  transactionId: 'txn-anchor-1',
  referenceNumber: 'ref-anchor-1',
  amount: 500,
  description: 'Donation',
  paymentUrl: 'https://example.test/pay',
  status: 'pending',
  createdAt: '2026-01-01T00:00:00.000Z',
  expiresAt: '2099-01-01T00:00:00.000Z',
}

const paidSignal: PaymentStatusSignal = {
  paymentId: intent.paymentId,
  referenceNumber: intent.referenceNumber,
  transactionId: intent.transactionId || '',
  status: 'paid',
  gatewayStatus: 'PAID',
  amount: 500,
  paidAt: '2026-01-01T00:05:00.000Z',
  updatedAt: '2026-01-01T00:05:00.000Z',
  verificationSource: 'egovpay_api',
}

beforeEach(() => {
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: new MemoryStorage() })
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { dispatchEvent: vi.fn(), location: { origin: 'https://app.test' } },
  })
  vi.unstubAllGlobals()
})

describe('eGovChain donation anchoring', () => {
  it('does not anchor pending or redirect-only donation blocks', async () => {
    await recordDonationPaymentLink('user-1', draft, intent)
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const blocks = getDonationLedger('user-1')
    expect(isAnchorableDonationBlock(blocks[0])).toBe(false)
    expect(await syncDonationChainAnchors('user-1', blocks)).toEqual([])
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('submits only the verified confirmation hash and stores the transaction receipt', async () => {
    await recordDonationPaymentLink('user-1', draft, intent)
    await recordDonationPaymentStatus('user-1', intent.paymentId, paidSignal)
    const confirmation = getDonationLedger('user-1')[1]

    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      data: {
        transactionHash: `0x${'a'.repeat(64)}`,
        signerAddress: `0x${'b'.repeat(40)}`,
        chainId: 13371,
        explorerUrl: `https://hackathon-explorer.e.gov.ph/tx/0x${'a'.repeat(64)}`,
        submittedAt: '2026-01-01T00:06:00.000Z',
        status: 'submitted',
      },
    }), { status: 201, headers: { 'Content-Type': 'application/json' } }))
    vi.stubGlobal('fetch', fetchMock)

    const receipt = await requestDonationChainAnchor('user-1', confirmation)
    expect(receipt.status).toBe('submitted')
    expect(getDonationChainAnchor('user-1', confirmation.hash)?.transactionHash).toBe(receipt.transactionHash)

    const request = JSON.parse(String((fetchMock.mock.calls[0][1] as RequestInit).body)) as Record<string, unknown>
    expect(request.blockHash).toBe(confirmation.hash)
    expect(request.event).toBe('payment_confirmed')
    expect(request.verificationSource).toBe('egovpay_api')
    expect(JSON.stringify(request)).not.toContain(campaign.recipientName)
    expect(JSON.stringify(request)).not.toContain(draft.dedication)
  })

  it('updates a submitted anchor from the official node receipt endpoint', async () => {
    await recordDonationPaymentLink('user-1', draft, intent)
    await recordDonationPaymentStatus('user-1', intent.paymentId, paidSignal)
    const confirmation = getDonationLedger('user-1')[1]
    const txHash = `0x${'c'.repeat(64)}`

    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({
      data: {
        transactionHash: txHash,
        signerAddress: `0x${'d'.repeat(40)}`,
        chainId: 13371,
        explorerUrl: `https://hackathon-explorer.e.gov.ph/tx/${txHash}`,
        submittedAt: '2026-01-01T00:06:00.000Z',
        status: 'submitted',
      },
    }), { status: 201, headers: { 'Content-Type': 'application/json' } })))
    const submitted = await requestDonationChainAnchor('user-1', confirmation)

    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({
      data: {
        transactionHash: txHash,
        status: 'confirmed',
        chainId: 13371,
        explorerUrl: `https://hackathon-explorer.e.gov.ph/tx/${txHash}`,
        blockNumber: 42,
        confirmations: 2,
        confirmedAt: '2026-01-01T00:07:00.000Z',
      },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } })))

    const confirmed = await refreshDonationChainAnchor(submitted)
    expect(confirmed.status).toBe('confirmed')
    expect(confirmed.blockNumber).toBe(42)
    expect(confirmed.confirmations).toBe(2)
  })
})
