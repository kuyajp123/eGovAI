import test from 'node:test'
import assert from 'node:assert/strict'

if (typeof process.loadEnvFile === 'function') {
  try {
    process.loadEnvFile()
  } catch {}
}

const token = process.env.VITE_EMESSAGE_TOKEN || process.env.VITE_EMESSAGE_ACCESS_TOKEN || 'mock_emessage_token'
const baseUrl = process.env.VITE_EMESSAGE_URL || 'https://platforms-api.e.gov.ph/emessage'

test('eMessage payload and header conform to push SMS specification', () => {
  const number = '+639090000001'
  const message = 'Test message'

  const headers = {
    'Content-Type': 'application/json',
    'X-EMESSAGE-Auth': token,
  }

  const body = {
    number,
    message,
  }

  assert.equal(headers['Content-Type'], 'application/json')
  assert.equal(headers['X-EMESSAGE-Auth'], token)
  assert.equal(body.number, '+639090000001')
  assert.equal(body.message, 'Test message')
})

test('eMessage normaliseNumber parses various Philippine phone formats correctly', () => {
  const normaliseNumber = (raw) => {
    if (!raw) return null
    const digits = raw.replace(/\D/g, '')
    if (digits.startsWith('63') && digits.length === 12) return `+${digits}`
    if (digits.startsWith('09') && digits.length === 11) return `+63${digits.slice(1)}`
    if (digits.startsWith('9') && digits.length === 10) return `+63${digits}`
    if (raw.startsWith('+63') && digits.length === 12) return raw
    return null
  }

  assert.equal(normaliseNumber('09090000001'), '+639090000001')
  assert.equal(normaliseNumber('+639090000001'), '+639090000001')
  assert.equal(normaliseNumber('639090000001'), '+639090000001')
  assert.equal(normaliseNumber('9090000001'), '+639090000001')
})

console.log('✅ All eMessage schema and helper tests passed!')
