import type { DonationLedgerBlock } from './donationService'

export type DonationAnchorStatus = 'submitting' | 'submitted' | 'confirmed' | 'failed'

export interface DonationChainAnchorReceipt {
  version: 1
  userId: string
  donationId: string
  blockId: string
  blockHash: string
  paymentId: string
  status: DonationAnchorStatus
  transactionHash?: string
  signerAddress?: string
  chainId?: number
  explorerUrl?: string
  blockNumber?: number
  confirmations?: number
  attemptedAt: string
  submittedAt?: string
  confirmedAt?: string
  error?: string
}

interface AnchorApiResponse {
  data?: {
    transactionHash: string
    signerAddress: string
    chainId: number
    explorerUrl: string
    submittedAt: string
    status: 'submitted'
  }
  message?: string
}

interface StatusApiResponse {
  data?: {
    transactionHash: string
    status: 'submitted' | 'confirmed' | 'failed'
    chainId: number
    explorerUrl: string
    blockNumber?: number
    confirmations?: number
    confirmedAt?: string
  }
  message?: string
}

export const DONATION_ANCHOR_STORAGE_PREFIX = 'egov_donation_echain_anchors_v1:'
export const DONATION_ANCHOR_CHANGED_EVENT = 'egov-donation-echain-anchor-changed'
const ECHAIN_API_BASE = (import.meta.env.VITE_ECHAIN_API_BASE || '/api/echain').replace(/\/$/, '')

const anchorStorageKey = (userId: string) => `${DONATION_ANCHOR_STORAGE_PREFIX}${userId}`

const safeAnchorError = (message?: string): string | undefined => {
  if (!message) return undefined
  if (/\b(?:502|503|504)\b|bad gateway|service temporarily unavailable|gateway time-?out|responseBody/i.test(message)) {
    return 'The official eGovChain test node is temporarily unavailable. Your paid donation and local ledger remain valid; retry the anchor when the node is online.'
  }
  return message
}

const readAnchorMap = (userId: string): Record<string, DonationChainAnchorReceipt> => {
  try {
    const raw = localStorage.getItem(anchorStorageKey(userId))
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, DonationChainAnchorReceipt>
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    return Object.fromEntries(Object.entries(parsed).map(([hash, receipt]) => [
      hash,
      { ...receipt, error: safeAnchorError(receipt.error) },
    ]))
  } catch {
    return {}
  }
}

const writeAnchor = (receipt: DonationChainAnchorReceipt): DonationChainAnchorReceipt => {
  const anchors = readAnchorMap(receipt.userId)
  anchors[receipt.blockHash] = receipt
  localStorage.setItem(anchorStorageKey(receipt.userId), JSON.stringify(anchors))
  window.dispatchEvent(new CustomEvent(DONATION_ANCHOR_CHANGED_EVENT, {
    detail: { userId: receipt.userId, donationId: receipt.donationId, blockHash: receipt.blockHash },
  }))
  return receipt
}

const apiError = async (response: Response, fallback: string): Promise<Error> => {
  const contentType = response.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) {
    return new Error(response.ok
      ? 'The eGovChain server API is unavailable. Use a Vercel deployment or run the project with vercel dev.'
      : `${fallback} (HTTP ${response.status})`)
  }
  const payload = await response.json().catch(() => null) as { message?: string } | null
  return new Error(payload?.message || `${fallback} (HTTP ${response.status})`)
}

export const getDonationChainAnchors = (userId: string): DonationChainAnchorReceipt[] =>
  Object.values(readAnchorMap(userId)).sort((a, b) => b.attemptedAt.localeCompare(a.attemptedAt))

export const getDonationChainAnchor = (
  userId: string,
  blockHash: string
): DonationChainAnchorReceipt | undefined => readAnchorMap(userId)[blockHash]

export const isAnchorableDonationBlock = (block: DonationLedgerBlock): boolean =>
  block.event === 'payment_confirmed' &&
  block.payment.status === 'paid' &&
  block.payment.verificationSource === 'egovpay_api' &&
  /^[0-9a-f]{64}$/i.test(block.hash)

export const requestDonationChainAnchor = async (
  userId: string,
  block: DonationLedgerBlock,
  force = false
): Promise<DonationChainAnchorReceipt> => {
  if (!isAnchorableDonationBlock(block)) {
    throw new Error('Only an eGovPay API-verified payment confirmation block can be anchored to eGovChain.')
  }

  const existing = getDonationChainAnchor(userId, block.hash)
  if (!force && existing && existing.status !== 'failed') return existing

  const attemptedAt = new Date().toISOString()
  const submitting = writeAnchor({
    version: 1,
    userId,
    donationId: block.donationId,
    blockId: block.blockId,
    blockHash: block.hash,
    paymentId: block.payment.paymentId,
    status: 'submitting',
    attemptedAt,
  })

  try {
    const response = await fetch(`${ECHAIN_API_BASE}/anchor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        blockHash: block.hash,
        blockId: block.blockId,
        donationId: block.donationId,
        paymentId: block.payment.paymentId,
        amount: block.amount,
        event: block.event,
        verificationSource: block.payment.verificationSource,
      }),
    })
    if (!response.ok) throw await apiError(response, 'The eGovChain anchor request failed')
    const payload = await response.json() as AnchorApiResponse
    if (!payload.data?.transactionHash) throw new Error(payload.message || 'The eGovChain node did not return a transaction hash.')

    return writeAnchor({
      ...submitting,
      status: 'submitted',
      transactionHash: payload.data.transactionHash,
      signerAddress: payload.data.signerAddress,
      chainId: payload.data.chainId,
      explorerUrl: payload.data.explorerUrl,
      submittedAt: payload.data.submittedAt,
      error: undefined,
    })
  } catch (error) {
    return writeAnchor({
      ...submitting,
      status: 'failed',
      error: error instanceof Error ? error.message : 'The eGovChain anchor request failed.',
    })
  }
}

export const refreshDonationChainAnchor = async (
  receipt: DonationChainAnchorReceipt
): Promise<DonationChainAnchorReceipt> => {
  if (!receipt.transactionHash || receipt.status === 'confirmed') return receipt
  try {
    const response = await fetch(`${ECHAIN_API_BASE}/status?txHash=${encodeURIComponent(receipt.transactionHash)}`)
    if (!response.ok) throw await apiError(response, 'The eGovChain status request failed')
    const payload = await response.json() as StatusApiResponse
    if (!payload.data) throw new Error(payload.message || 'The eGovChain node returned an invalid status response.')
    return writeAnchor({
      ...receipt,
      status: payload.data.status,
      chainId: payload.data.chainId,
      explorerUrl: payload.data.explorerUrl,
      blockNumber: payload.data.blockNumber,
      confirmations: payload.data.confirmations,
      confirmedAt: payload.data.confirmedAt,
      error: undefined,
    })
  } catch (error) {
    return writeAnchor({
      ...receipt,
      error: error instanceof Error ? error.message : 'The eGovChain status request failed.',
    })
  }
}

export const syncDonationChainAnchors = async (
  userId: string,
  blocks: DonationLedgerBlock[],
  retryFailed = false
): Promise<DonationChainAnchorReceipt[]> => {
  if (import.meta.env.VITE_ECHAIN_ANCHORING_ENABLED === 'false') return getDonationChainAnchors(userId)

  for (const block of blocks.filter(isAnchorableDonationBlock)) {
    const receipt = getDonationChainAnchor(userId, block.hash)
    const routeWasPreviouslyMissing = receipt?.status === 'failed' && /HTTP 404|server API is unavailable/i.test(receipt.error || '')
    if (!receipt || (retryFailed && receipt.status === 'failed') || routeWasPreviouslyMissing) {
      await requestDonationChainAnchor(userId, block, retryFailed || routeWasPreviouslyMissing)
    } else if (receipt.status === 'submitted') {
      await refreshDonationChainAnchor(receipt)
    } else if (receipt.status === 'submitting' && Date.now() - new Date(receipt.attemptedAt).getTime() > 60_000) {
      await requestDonationChainAnchor(userId, block, true)
    }
  }
  return getDonationChainAnchors(userId)
}
