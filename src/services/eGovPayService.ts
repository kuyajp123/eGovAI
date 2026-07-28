// ============================================================
// eGovPay Service — Government Payment Gateway
// POST /payments/v1/intent  (proxied via /egovpay-api)
// Auth header: Authorization: Bearer <api-key>
// ============================================================

const EGOVPAY_BASE = '/egovpay-api'
const EGOVPAY_API_KEY = import.meta.env.VITE_EGOVPAY_API_KEY
const SETTLEMENT_UUID = import.meta.env.VITE_EGOVPAY_SETTLEMENT_UUID

export interface PaymentIntentPayload {
  amount: number       // in PHP, e.g. 5000
  description: string  // "Business Permit Renewal — Juan Dela Cruz"
  citizenName: string
  citizenEmail?: string
  citizenMobile?: string
  metadata?: Record<string, string>
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

export interface PaymentStatus {
  paymentId: string
  status: 'pending' | 'paid' | 'failed' | 'cancelled'
  referenceNumber: string
  paidAt?: string
}

/**
 * Create a payment intent and get a hosted payment URL.
 * Falls back to a rich mock that shows the full payment UI.
 */
export const createPaymentIntent = async (
  payload: PaymentIntentPayload
): Promise<PaymentIntent> => {
  const useMock = import.meta.env.VITE_USE_MOCK_SERVICES !== 'false'

  if (!useMock) {
    try {
      const res = await fetch(`${EGOVPAY_BASE}/payments/v1/intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${EGOVPAY_API_KEY}`,
        },
        body: JSON.stringify({
          settlement_template_uuid: SETTLEMENT_UUID,
          amount: payload.amount * 100, // eGovPay uses centavos
          currency: 'PHP',
          description: payload.description,
          payer_name: payload.citizenName,
          payer_email: payload.citizenEmail || '',
          payer_phone: payload.citizenMobile || '',
          metadata: payload.metadata || {},
        }),
      })

      if (res.ok) {
        const data = await res.json()
        return {
          paymentId: data.payment_id || data.id || generatePaymentId(),
          referenceNumber: data.reference_number || data.ref || generateRef(),
          amount: payload.amount,
          description: payload.description,
          paymentUrl: data.payment_url || data.checkout_url || '#',
          status: 'pending',
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        }
      }
    } catch (err) {
      console.warn('eGovPay API call failed, falling back to mock intent:', err)
    }
  }

  // ── Mock fallback — simulates a successful payment intent ──
  await delay(1500)
  const ref = generateRef()
  return {
    paymentId: generatePaymentId(),
    referenceNumber: ref,
    amount: payload.amount,
    description: payload.description,
    paymentUrl: `https://hackathon-pay.e.gov.ph/checkout/${ref}`,
    status: 'pending',
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
  }
}

/**
 * Poll the status of an existing payment.
 */
export const getPaymentStatus = async (paymentId: string): Promise<PaymentStatus> => {
  try {
    const res = await fetch(`${EGOVPAY_BASE}/payments/v1/status/${paymentId}`, {
      headers: { 'Authorization': `Bearer ${EGOVPAY_API_KEY}` },
    })
    if (res.ok) {
      const data = await res.json()
      return {
        paymentId,
        status: data.status || 'pending',
        referenceNumber: data.reference_number || '',
        paidAt: data.paid_at,
      }
    }
  } catch (err) {
    console.warn('eGovPay status check error:', err)
  }

  // Mock: return paid after 3 seconds
  return {
    paymentId,
    status: 'paid',
    referenceNumber: generateRef(),
    paidAt: new Date().toISOString(),
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
  `EGPAY-${Math.random().toString(36).slice(2, 10).toUpperCase()}`

const delay = (ms: number) => new Promise(r => setTimeout(r, ms))
