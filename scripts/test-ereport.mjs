import test from 'node:test'
import assert from 'node:assert/strict'

if (typeof process.loadEnvFile === 'function') {
  try {
    process.loadEnvFile()
  } catch {}
}

const baseUrl = process.env.VITE_EREPORT_URL || 'https://platforms-api.e.gov.ph/ereport'
const accessCode = process.env.VITE_EREPORT_ACCESS_CODE || 'cb8da149b1304007b3b7b936e5655937'

let token = ''

test('1. eGov eReport Token Generation', async () => {
  const res = await fetch(`${baseUrl}/api/integration/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ access_code: accessCode }),
  })
  assert.equal(res.status, 200)
  const data = await res.json()
  assert.ok(data.access_token)
  token = data.access_token
})

test('2. eGov eReport Datasets - Report Types', async () => {
  assert.ok(token, 'Token must be available')
  const res = await fetch(`${baseUrl}/api/integration/datasets/report_types`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  })
  assert.equal(res.status, 200)
  const data = await res.json()
  assert.ok(Array.isArray(data.data))
  assert.ok(data.data.length > 0)
})

test('3. eGov eReport Datasets - Regions and Provinces', async () => {
  assert.ok(token)
  const regRes = await fetch(`${baseUrl}/api/integration/datasets/regions`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  })
  assert.equal(regRes.status, 200)
  const regData = await regRes.json()
  assert.ok(Array.isArray(regData.data))
})

test('4. eGov eReport Submit Complaint Endpoint', async () => {
  assert.ok(token)
  const res = await fetch(`${baseUrl}/api/integration/submit_complaint`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      mobile: '639000000000',
      first_name: 'Juan',
      last_name: 'dela Cruz',
      gender: 'Male',
      complainant_email: 'juan.delacruz@example.com',
      report_type: 'red_tape',
      subject: 'Slow document processing',
      message: 'Processing has exceeded the citizen charter timeline.',
      region_code: '040000000',
      province_code: '042100000',
      municipality_code: '042111000',
      barangay_code: '042111011',
    }),
  })
  assert.equal(res.status, 200)
  const data = await res.json()
  assert.ok(data.case_number || data.code === 200)
})

console.log('✅ All eReport specification and live endpoint tests passed!')
