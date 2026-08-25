// ============================================================
// eGovPay Service — Government Payment Gateway
// POST /api/v1/transaction  (proxied via /egovpay-api)
// GET /api/v1/transaction/:uuid (Check Transaction Details)
// Auth Header: X-eGovPay-Token: test_<TOKEN_KEY>
// ============================================================

const EGOVPAY_BASE = '/egovpay-api'

const getEGovPayToken = (): string =>
  import.meta.env.VITE_EGOVPAY_TOKEN || import.meta.env.VITE_EGOVPAY_API_KEY || ''

const getEGovPayTokenHeader = (): string => {
  const token = getEGovPayToken().trim()
  if (!token) return ''
  return token.startsWith('test_') ? token : `test_${token}`
}

const getSettlementUuid = (): string =>
  import.meta.env.VITE_EGOVPAY_SETTLEMENT_TEMPLATE_UUID || import.meta.env.VITE_EGOVPAY_SETTLEMENT_UUID || ''

export interface PaymentIntentPayload {
  amount: number       // total PHP amount
  description: string  // "Business Permit Renewal — Juan Dela Cruz"
  citizenName: string
  citizenEmail?: string
  citizenMobile?: string
  items?: Array<{ name: string; amount: number }>
  /** Optional override used by recipient-specific payments such as donations. */
  settlementTemplateUuid?: string
  context?: PaymentTransactionContext
}

export interface PaymentTransactionContext {
  kind: 'donation' | 'sss' | 'business_permit' | 'other'
  entityId: string
  userId: string
  campaignId?: string
  campaignTitle?: string
  recipientName?: string
  destination?: string
}

export interface PaymentIntent {
  paymentId: string
  transactionId?: string
  referenceNumber: string
  amount: number
  description: string
  /** Redirect URL to the eGovPay hosted payment page */
  paymentUrl: string
  status: 'pending' | 'paid' | 'failed' | 'cancelled'
  createdAt: string
  expiresAt: string
  paidAt?: string
  statusUpdatedAt?: string
  context?: PaymentTransactionContext
}

export interface TransactionDetails {
  uuid: string
  refno: string
  txnid: string
  amount: string
  payment_status: 'INITIAL' | 'PAID' | 'SUCCESS' | 'FAILED' | 'CANCELLED' | string
  currency: string
  paid_at?: string
  created_at?: string
}

export interface PaymentStatusSignal {
  paymentId: string
  referenceNumber: string
  transactionId: string
  status: PaymentIntent['status']
  gatewayStatus: string
  amount: number
  paidAt?: string
  updatedAt: string
  verificationSource: 'egovpay_api' | 'redirect_hint'
}

export const PAYMENT_STATUS_STORAGE_PREFIX = 'egov_payment_status:'
export const PAYMENT_CONTEXT_STORAGE_PREFIX = 'egov_payment_context:'

export interface CachedPaymentTransaction {
  uuid: string
  txnid: string
  referenceNumber?: string
  amount: number
  description: string
  createdAt: string
  context?: PaymentTransactionContext
}

export const normalizePaymentStatus = (status?: string): PaymentIntent['status'] => {
  const normalized = (status || '').toUpperCase()
  if (normalized === 'PAID' || normalized === 'SUCCESS') return 'paid'
  if (normalized === 'FAILED') return 'failed'
  if (normalized === 'CANCELLED' || normalized === 'CANCELED') return 'cancelled'
  return 'pending'
}

export const publishPaymentStatus = (
  details: TransactionDetails,
  verificationSource: PaymentStatusSignal['verificationSource'] = 'egovpay_api'
): PaymentStatusSignal => {
  const updatedAt = new Date().toISOString()
  const signal: PaymentStatusSignal = {
    paymentId: details.uuid,
    referenceNumber: details.refno,
    transactionId: details.txnid,
    status: normalizePaymentStatus(details.payment_status),
    gatewayStatus: details.payment_status,
    amount: Number.parseFloat(details.amount || '0') || 0,
    paidAt: details.paid_at,
    updatedAt,
    verificationSource,
  }

  try {
    const identifiers = [details.uuid, details.txnid, details.refno].filter(Boolean)
    identifiers.forEach(identifier => {
      localStorage.setItem(`${PAYMENT_STATUS_STORAGE_PREFIX}${identifier}`, JSON.stringify(signal))
    })
    localStorage.setItem('egov_latest_payment_status', JSON.stringify(signal))
  } catch (error) {
    console.warn('Could not publish the eGovPay status to other app tabs:', error)
  }

  return signal
}

const cachePaymentTransaction = (transaction: CachedPaymentTransaction): void => {
  try {
    const identifiers = [transaction.uuid, transaction.txnid, transaction.referenceNumber].filter(Boolean) as string[]
    identifiers.forEach(identifier => {
      localStorage.setItem(`${PAYMENT_CONTEXT_STORAGE_PREFIX}${identifier}`, JSON.stringify(transaction))
    })
    localStorage.setItem('egov_latest_pending_transaction', JSON.stringify(transaction))
  } catch (error) {
    console.warn('Could not cache pending transaction:', error)
  }
}

export const getCachedPaymentTransaction = (identifier?: string): CachedPaymentTransaction | null => {
  try {
    if (identifier) {
      const keyed = localStorage.getItem(`${PAYMENT_CONTEXT_STORAGE_PREFIX}${identifier}`)
      if (keyed) return JSON.parse(keyed) as CachedPaymentTransaction
    }
    const latest = localStorage.getItem('egov_latest_pending_transaction')
    return latest ? JSON.parse(latest) as CachedPaymentTransaction : null
  } catch {
    return null
  }
}

export const resolvePaymentSettlementTemplate = (
  payload: Pick<PaymentIntentPayload, 'settlementTemplateUuid' | 'context'>,
  defaultSettlementTemplateUuid: string = getSettlementUuid()
): string => {
  const recipientSettlement = payload.settlementTemplateUuid?.trim()
  if (payload.context?.kind === 'donation' && !recipientSettlement) {
    throw new Error('This donation campaign does not have a configured eGovPay settlement template.')
  }
  return recipientSettlement || defaultSettlementTemplateUuid
}

export const getPublishedPaymentStatus = (paymentId: string): PaymentStatusSignal | null => {
  try {
    const raw = localStorage.getItem(`${PAYMENT_STATUS_STORAGE_PREFIX}${paymentId}`)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<PaymentStatusSignal>
    if (!parsed.paymentId || !parsed.status || !parsed.updatedAt) return null
    return {
      ...parsed,
      verificationSource: parsed.verificationSource === 'egovpay_api' ? 'egovpay_api' : 'redirect_hint',
    } as PaymentStatusSignal
  } catch {
    return null
  }
}

/**
 * Compute HMAC-SHA256 digest: hash_hmac('sha256', "$amount|$txnid", $token)
 */
async function computeDigest(amount: number, txnid: string, token: string): Promise<string> {
  const secretKey = token.replace(/^test_/, '')
  const encoder = new TextEncoder()
  const keyData = encoder.encode(secretKey)
  const messageData = encoder.encode(`${amount}|${txnid}`)
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData)
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

function formatDateForEGovPay(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

/**
 * Create a payment transaction link via eGovPay API.
 */
export const createPaymentIntent = async (
  payload: PaymentIntentPayload
): Promise<PaymentIntent> => {
  if (!Number.isFinite(payload.amount) || payload.amount <= 0) {
    throw new Error('eGovPay requires a transaction amount greater than ₱0.00.')
  }
  const settlementTemplateUuid = resolvePaymentSettlementTemplate(payload)

  const useMock = import.meta.env.VITE_USE_MOCK_SERVICES === 'true'

  if (!useMock) {
    const txnid = generateRef()
    const token = getEGovPayToken()
    const tokenHeader = getEGovPayTokenHeader()
    const digest = await computeDigest(payload.amount, txnid, token)
    const now = new Date()
    const expiry = new Date(now.getTime() + 24 * 60 * 60 * 1000) // 24 hours
    const expiresAtStr = formatDateForEGovPay(expiry)

    const requestBody = {
      amount: payload.amount,
      settlement_template_uuid: settlementTemplateUuid,
      currency: 'PHP',
      digest,
      txnid,
      mobile: payload.citizenMobile || '+639090000000',
      email: payload.citizenEmail || 'citizen@egov.ph',
      name: payload.citizenName,
      callback_url: `${window.location.origin}/payment-callback?txnid=${txnid}`,
      redirect_url: `${window.location.origin}/payment-return?txnid=${txnid}`,
      expires_at: expiresAtStr,
      link_expires_at: expiresAtStr,
      items: payload.items && payload.items.length > 0 ? payload.items : [
        {
          name: payload.description,
          amount: payload.amount,
        },
      ],
    }

    const res = await fetch(`${EGOVPAY_BASE}/api/v1/transaction`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'X-eGovPay-Token': tokenHeader,
      },
      body: JSON.stringify(requestBody),
    })

    if (res.ok) {
      const result = await res.json()
      const data = result.data || {}
      const intent: PaymentIntent = {
        paymentId: data.uuid || txnid,
        transactionId: txnid,
        referenceNumber: data.channel?.refno || txnid,
        amount: payload.amount,
        description: payload.description,
        paymentUrl: data.url || `https://egovpay-pgi-dev.oueg.info/${data.uuid}`,
        status: 'pending',
        createdAt: new Date().toISOString(),
        expiresAt: expiry.toISOString(),
        context: payload.context,
      }

      cachePaymentTransaction({
        uuid: data.uuid || txnid,
        txnid,
        referenceNumber: data.channel?.refno || txnid,
        amount: payload.amount,
        description: payload.description,
        createdAt: intent.createdAt,
        context: payload.context,
      })

      return intent
    }

    const errorJson = await res.json().catch(() => ({}))
    throw new Error(
      errorJson.message || errorJson.error || `eGovPay Transaction error (HTTP ${res.status})`
    )
  }

  // Demo fallback mode when VITE_USE_MOCK_SERVICES is set to true
  await new Promise(r => setTimeout(r, 1200))
  const ref = generateRef()
  const intent: PaymentIntent = {
    paymentId: generatePaymentId(),
    transactionId: ref,
    referenceNumber: ref,
    amount: payload.amount,
    description: payload.description,
    paymentUrl: `https://egovpay-pgi-dev.oueg.info/${ref}`,
    status: 'pending',
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    context: payload.context,
  }
  cachePaymentTransaction({
    uuid: intent.paymentId,
    txnid: ref,
    referenceNumber: ref,
    amount: intent.amount,
    description: intent.description,
    createdAt: intent.createdAt,
    context: payload.context,
  })
  return intent
}

/**
 * Check Transaction Details by UUID
 */
export const getTransactionDetails = async (
  transactionUuid: string
): Promise<TransactionDetails> => {
  const res = await fetch(`${EGOVPAY_BASE}/api/v1/transaction/${transactionUuid}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'X-eGovPay-Token': getEGovPayTokenHeader(),
    },
  })

  if (res.ok) {
    const result = await res.json()
    return result.data
  }

  const errorJson = await res.json().catch(() => ({}))
  throw new Error(errorJson.message || `Transaction lookup failed (HTTP ${res.status})`)
}

// ── Fee tables ──────────────────────────────────────────────

export interface FeeItem {
  label: string
  amount: number
}

export const getBusinessPermitFees = (type: string): FeeItem[] => {
  const base: Record<string, FeeItem[]> = {
    new: [
      { label: 'Business Registration Fee', amount: 2500 },
      { label: 'Mayor\'s Permit Fee', amount: 1500 },
      { label: 'Sanitary Inspection Fee', amount: 500 },
      { label: 'Building / Zoning Fee', amount: 750 },
      { label: 'Business Tax', amount: 1800 },
    ],
    renewal: [
      { label: 'Business Permit Renewal', amount: 1500 },
      { label: 'Mayor\'s Permit Renewal', amount: 800 },
      { label: 'Annual Sanitary Inspection', amount: 350 },
      { label: 'Business Tax', amount: 1200 },
    ],
  }
  return base[type] || base['new']
}

export const getTaxFees = (type: string): FeeItem[] => {
  const base: Record<string, FeeItem[]> = {
    real_property: [
      { label: 'Real Property Tax (Annual)', amount: 4200 },
      { label: 'Special Education Fund (SEF)', amount: 800 },
    ],
    community: [
      { label: 'Community Tax Certificate', amount: 500 },
      { label: 'Documentary Stamp', amount: 30 },
    ],
    professional: [
      { label: 'Professional Tax Receipt', amount: 300 },
    ],
  }
  return base[type] || base['real_property']
}

// ── Helpers ─────────────────────────────────────────────────

const generatePaymentId = () =>
  `PAY-${Date.now().toString(36).toUpperCase()}`

const generateRef = () =>
  `TESTREF${Math.floor(100000 + Math.random() * 900000)}`
