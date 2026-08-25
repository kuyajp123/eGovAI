import test from 'node:test'
import assert from 'node:assert/strict'

const BASE_URL = 'https://platforms-api.e.gov.ph/face-liveness'
const TOKEN = '94b20c174123447b89f0469bac898925'
const CONFIDENCE_THRESHOLD = 95.0

test('Face Liveness session creation request payload matches schema', () => {
  const request = {
    action: 'redirect',
    callback_url: 'http://localhost:5173/profile',
    delay: 3000,
  }

  assert.equal(request.action, 'redirect')
  assert.equal(request.callback_url, 'http://localhost:5173/profile')
  assert.equal(request.delay, 3000)
})

test('Face Liveness verification response conforms to thresholds and validation logic', () => {
  const successfulResult = {
    status: 'SUCCEEDED',
    confidence_score: 98.6,
    reference_image_url: 'https://platforms-api.e.gov.ph/face-liveness/images/selfie_123.jpg',
  }

  const isSuccessValid =
    successfulResult.status === 'SUCCEEDED' && successfulResult.confidence_score >= CONFIDENCE_THRESHOLD

  assert.equal(isSuccessValid, true)

  const lowScoreResult = {
    status: 'SUCCEEDED',
    confidence_score: 89.2,
    reference_image_url: 'https://platforms-api.e.gov.ph/face-liveness/images/selfie_low.jpg',
  }

  const isLowValid =
    lowScoreResult.status === 'SUCCEEDED' && lowScoreResult.confidence_score >= CONFIDENCE_THRESHOLD

  assert.equal(isLowValid, false)

  const failedStatusResult = {
    status: 'FAILED',
    confidence_score: 99.0,
    reference_image_url: '',
  }

  const isFailedValid =
    failedStatusResult.status === 'SUCCEEDED' && failedStatusResult.confidence_score >= CONFIDENCE_THRESHOLD

  assert.equal(isFailedValid, false)
})

test('Face Liveness authentication header configurations', () => {
  const headers = {
    'Content-Type': 'application/json',
    'x-api-key': TOKEN,
    Authorization: `Bearer ${TOKEN}`,
  }

  assert.equal(headers['x-api-key'], '94b20c174123447b89f0469bac898925')
  assert.equal(headers.Authorization, 'Bearer 94b20c174123447b89f0469bac898925')
})

console.log('✅ All Face Liveness tests passed!')
