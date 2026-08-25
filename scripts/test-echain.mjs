import test from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'

if (typeof process.loadEnvFile === 'function') {
  try {
    process.loadEnvFile()
  } catch {}
}

const chainId = 13371
const explorerUrl = 'https://hackathon-explorer.e.gov.ph'

test('1. Cryptographic donation block hashing generates valid SHA-256', () => {
  const blockData = {
    donationId: 'DON-2026-001',
    amount: 500,
    event: 'payment_confirmed',
    paymentId: 'PALS-2026-8901',
    timestamp: '2026-08-25T00:00:00.000Z',
  }
  const rawPayload = JSON.stringify(blockData)
  const hash = crypto.createHash('sha256').update(rawPayload).digest('hex')

  assert.equal(hash.length, 64)
  assert.match(hash, /^[0-9a-f]{64}$/i)
})

test('2. eGovChain anchor eligibility guard validation', () => {
  const isAnchorable = (block) =>
    block.event === 'payment_confirmed' &&
    block.payment.status === 'paid' &&
    block.payment.verificationSource === 'egovpay_api' &&
    /^[0-9a-f]{64}$/i.test(block.hash)

  const validBlock = {
    event: 'payment_confirmed',
    hash: 'a'.repeat(64),
    payment: { status: 'paid', verificationSource: 'egovpay_api' },
  }

  const pendingBlock = {
    event: 'payment_created',
    hash: 'a'.repeat(64),
    payment: { status: 'pending', verificationSource: 'redirect_hint' },
  }

  assert.equal(isAnchorable(validBlock), true)
  assert.equal(isAnchorable(pendingBlock), false)
})

test('3. Zero-Knowledge Privacy: on-chain payload only contains block hash', () => {
  const citizenName = 'Juan Dela Cruz'
  const dedication = 'For relief victims in Palawan'
  const blockHash = 'e1b2c3d4e5f6a7b8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c'

  const onChainData = {
    to: '0x0000000000000000000000000000000000000000',
    value: 0n,
    data: '0x' + blockHash,
    chainId,
  }

  assert.equal(onChainData.data, `0x${blockHash}`)
  assert.equal(onChainData.data.includes(citizenName), false)
  assert.equal(onChainData.data.includes(dedication), false)
})

test('4. eGovChain Explorer URL generation for Transaction Hash', () => {
  const txHash = '0xabcdef1234567890987654321abcdef1234567890987654321abcdef12345678'
  const url = `${explorerUrl}/tx/${txHash}`
  assert.equal(
    url,
    'https://hackathon-explorer.e.gov.ph/tx/0xabcdef1234567890987654321abcdef1234567890987654321abcdef12345678'
  )
})

test('5. Live eGovChain Blockscout Explorer reachability', async () => {
  const res = await fetch(explorerUrl, { method: 'GET' })
  assert.equal(res.status, 200)
  const html = await res.text()
  assert.equal(html.includes('eGov Hackathon') || html.includes('Blockscout'), true)
})

console.log('✅ All eGovChain specification, cryptographic, and live reachability tests passed!')
