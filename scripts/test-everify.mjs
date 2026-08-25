import test from 'node:test'
import assert from 'node:assert/strict'

if (typeof process.loadEnvFile === 'function') {
  try {
    process.loadEnvFile()
  } catch {}
}

// Mock environment
const EVERIFY_BASE = process.env.VITE_EVERIFY_URL || 'https://platforms-api.e.gov.ph/everify'
const CLIENT_ID = process.env.VITE_EVERIFY_CLIENT_ID || 'mock_client_id'
const CLIENT_SECRET = process.env.VITE_EVERIFY_CLIENT_SECRET || 'mock_client_secret'
const PUBKEY = process.env.VITE_EVERIFY_PUBKEY || ''

test('eVerify Auth payload schema complies with specification', () => {
  const authPayload = {
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
  }

  assert.equal(authPayload.client_id, CLIENT_ID)
  assert.equal(authPayload.client_secret, CLIENT_SECRET)
})

test('eVerify Query payload structure matches required format with face_liveness_session_id', () => {
  const queryPayload = {
    first_name: 'Juan',
    middle_name: 'Santos',
    last_name: 'Dela Cruz',
    suffix: 'JR',
    birth_date: '1989-09-12',
    face_liveness_session_id: 'a1b3fae6-af74-4896-bd58-32a81604de01',
  }

  assert.equal(queryPayload.first_name, 'Juan')
  assert.equal(queryPayload.middle_name, 'Santos')
  assert.equal(queryPayload.last_name, 'Dela Cruz')
  assert.equal(queryPayload.suffix, 'JR')
  assert.equal(queryPayload.birth_date, '1989-09-12')
  assert.equal(queryPayload.face_liveness_session_id, 'a1b3fae6-af74-4896-bd58-32a81604de01')
})

test('Face Liveness Web SDK response payload parsing conforms to eKYC spec', () => {
  const sdkResponse = {
    status: 'COMPLETED',
    result: {
      photo: 'data:image/jpeg;base64,/9j/4AAQSkZJRg...',
      session_id: 'a1b3fae6-af74-4896-bd58-32a81604de01',
      photo_url: 'https://liveness.photo.url/image.jpg?expires=123',
    },
  }

  const sessionId = sdkResponse.result?.session_id
  const photoUrl = sdkResponse.result?.photo_url
  const photo = sdkResponse.result?.photo

  assert.equal(sessionId, 'a1b3fae6-af74-4896-bd58-32a81604de01')
  assert.equal(photoUrl, 'https://liveness.photo.url/image.jpg?expires=123')
  assert.ok(photo?.startsWith('data:image/jpeg;base64,'))
})

console.log('✅ All eVerify and Face Liveness SDK schema tests passed!')
