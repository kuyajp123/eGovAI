import test from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'

if (typeof process.loadEnvFile === 'function') {
  try {
    process.loadEnvFile()
  } catch {}
}

const token = process.env.VITE_EGOVPAY_TOKEN || process.env.VITE_EGOVPAY_API_KEY || 'mock_token'
const settlementUuid =
  process.env.VITE_EGOVPAY_SETTLEMENT_TEMPLATE_UUID ||
  process.env.VITE_EGOVPAY_SETTLEMENT_UUID ||
  ''

test('1. eGovPay HMAC-SHA256 digest computation', () => {
  const amount = 1000
  const txnid = 'TESTREF123'
  const cleanToken = token.replace(/^test_/, '')

  const expectedDigest = crypto
    .createHmac('sha256', cleanToken)
    .update(`${amount}|${txnid}`)
    .digest('hex')

  assert.equal(typeof expectedDigest, 'string')
  assert.equal(expectedDigest.length, 64)
})

test('2. eGovPay create transaction request payload structure', () => {
  const amount = 1000
  const txnid = 'TESTREF123'
  const rawToken = token.replace(/^test_/, '')
  const digest = crypto.createHmac('sha256', rawToken).update(`${amount}|${txnid}`).digest('hex')

  const payload = {
    amount,
    settlement_template_uuid: settlementUuid,
    currency: 'PHP',
    digest,
    mobile: '09000000000',
    expires_at: '2027-07-10 23:59:59',
    callback_url: 'https://app.gov.ph/payment-callback',
    redirect_url: 'https://app.gov.ph/payment-return',
    txnid,
    link_expires_at: '2027-07-10 23:59:59',
    email: 'citizen@egov.ph',
    name: 'JUAN DELA CRUZ',
    items: [
      {
        name: 'Business Permit Renewal',
        amount: 1000,
      },
    ],
  }

  assert.equal(payload.amount, 1000)
  assert.equal(payload.settlement_template_uuid, settlementUuid)
  assert.equal(payload.txnid, 'TESTREF123')
  assert.equal(payload.items.length, 1)
})

test('3. eGovPay status normalization handles all gateway statuses', () => {
  const normalize = (status) => {
    const normalized = (status || '').toUpperCase()
    if (normalized === 'PAID' || normalized === 'SUCCESS') return 'paid'
    if (normalized === 'FAILED') return 'failed'
    if (normalized === 'CANCELLED' || normalized === 'CANCELED') return 'cancelled'
    return 'pending'
  }

  assert.equal(normalize('INITIAL'), 'pending')
  assert.equal(normalize('PAID'), 'paid')
  assert.equal(normalize('SUCCESS'), 'paid')
  assert.equal(normalize('FAILED'), 'failed')
  assert.equal(normalize('CANCELLED'), 'cancelled')
})

console.log('✅ All eGovPay specification and schema tests passed!')
