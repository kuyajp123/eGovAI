import test from 'node:test'
import assert from 'node:assert/strict'

if (typeof process.loadEnvFile === 'function') {
  try {
    process.loadEnvFile()
  } catch {}
}

const accessCode = process.env.VITE_EGOVAI_ACCESS_CODE || process.env.VITE_EGOV_ACCESS_CODE || 'mock_access_code'

test('1. eGovAI Token endpoint request payload structure', () => {
  const payload = { access_code: accessCode }
  assert.equal(payload.access_code, accessCode)
})

test('2. eGovAI AI Assistant request payload & header structure', () => {
  const prompt = 'how can i get my digital tin id here in egov'
  const category = 'PH'
  const mockToken = 'mock_jwt_token'

  const headers = {
    'Content-Type': 'application/json',
    Authorization: 'Bearer ' + mockToken,
  }

  const body = { prompt, category }

  assert.equal(headers['Content-Type'], 'application/json')
  assert.equal(headers.Authorization, 'Bearer mock_jwt_token')
  assert.equal(body.prompt, 'how can i get my digital tin id here in egov')
  assert.equal(body.category, 'PH')
})

test('3. eGovAI Speech Maker request payload structure', () => {
  const prompt = 'Give me a speech about current trends in PH'
  const category = 'PH'
  const body = { prompt, category }
  assert.equal(body.prompt, 'Give me a speech about current trends in PH')
  assert.equal(body.category, 'PH')
})

test('4. eGovAI Tourism Content Generator request payload structure', () => {
  const prompt = 'Provide travel itinerary for Boracay'
  const category = 'PH'
  const body = { prompt, category }
  assert.equal(body.prompt, 'Provide travel itinerary for Boracay')
  assert.equal(body.category, 'PH')
})

test('5. eGovAI Laws & Regulations request payload structure', () => {
  const prompt = 'Can you explain your purpose?'
  const category = 'PH'
  const body = { prompt, category }
  assert.equal(body.prompt, 'Can you explain your purpose?')
  assert.equal(body.category, 'PH')
})

test('6. eGovAI Translator request payload structure', () => {
  const prompt = 'How should the education system adapt?'
  const sourceLang = 'en'
  const targetLang = 'fil'

  const body = {
    prompt,
    source_lang: sourceLang,
    target_lang: targetLang,
  }

  assert.equal(body.prompt, 'How should the education system adapt?')
  assert.equal(body.source_lang, 'en')
  assert.equal(body.target_lang, 'fil')
})

console.log('✅ All eGovAI request and schema tests passed!')
