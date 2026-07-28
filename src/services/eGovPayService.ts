// ============================================================
// eGovPay Service — Government Payment Gateway
// POST /api/v1/transaction  (proxied via /egovpay-api)
// Auth Header: X-eGovPay-Token: test_<TOKEN_KEY>
// ============================================================

const EGOVPAY_BASE = '/egovpay-api'
const EGOVPAY_API_KEY = import.meta.env.VITE_EGOVPAY_API_KEY
const SETTLEMENT_UUID = import.meta.env.VITE_EGOVPAY_SETTLEMENT_UUID

export interface PaymentIntentPayload {
  amount: number       // total PHP amount
  description: string  // "Business Permit Renewal — Juan Dela Cruz"
  citizenName: string
  citizenEmail?: string
  citizenMobile?: string
  items?: Array<{ name: string; amount: number }>
}

export interface PaymentIntent {
  paymentId: string
  referenceNumber: string
  amount: number
  description: string
  /** Redirect URL to the eGovPay hosted payment page */
  paymentUrl: string
  status: 'pending' | 'paid' | 'failed' | 'cancelled'
  createdAt: string
  expiresAt: string
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
  const useMock = import.meta.env.VITE_USE_MOCK_SERVICES === 'true'

  if (!useMock) {
    const txnid = generateRef()
    const digest = await computeDigest(payload.amount, txnid, EGOVPAY_API_KEY)
    const now = new Date()
    const expiry = new Date(now.getTime() + 24 * 60 * 60 * 1000) // 24 hours
    const expiresAtStr = formatDateForEGovPay(expiry)

    const requestBody = {
      amount: payload.amount,
      settlement_template_uuid: SETTLEMENT_UUID,
      currency: 'PHP',
      digest,
      txnid,
      mobile: payload.citizenMobile || '+639090000000',
      email: payload.citizenEmail || 'citizen@egov.ph',
      name: payload.citizenName,
      callback_url: `${window.location.origin}/payment-callback`,
      redirect_url: `${window.location.origin}/payment-success`,
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
        'X-eGovPay-Token': EGOVPAY_API_KEY,
      },
      body: JSON.stringify(requestBody),
    })

    if (res.ok) {
      const result = await res.json()
      const data = result.data || {}
      return {
        paymentId: data.uuid || txnid,
        referenceNumber: data.channel?.refno || txnid,
        amount: payload.amount,
        description: payload.description,
        paymentUrl: data.url || `https://egovpay-pgi-dev.oueg.info/${data.uuid}`,
        status: 'pending',
        createdAt: new Date().toISOString(),
        expiresAt: expiry.toISOString(),
      }
    }

    const errorJson = await res.json().catch(() => ({}))
    throw new Error(
      errorJson.message || errorJson.error || `eGovPay Transaction error (HTTP ${res.status})`
    )
  }

  // Demo fallback mode when VITE_USE_MOCK_SERVICES is set to true
  await new Promise(r => setTimeout(r, 1200))
  const ref = generateRef()
  return {
    paymentId: generatePaymentId(),
    referenceNumber: ref,
    amount: payload.amount,
    description: payload.description,
    paymentUrl: `https://egovpay-pgi-dev.oueg.info/${ref}`,
    status: 'pending',
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
  }
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
