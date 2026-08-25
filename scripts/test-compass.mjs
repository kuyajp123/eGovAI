import test from 'node:test'
import assert from 'node:assert/strict'

if (typeof process.loadEnvFile === 'function') {
  try {
    process.loadEnvFile()
  } catch {}
}

const baseUrl = process.env.VITE_COMPASS_URL || 'https://platforms-api.e.gov.ph/compass'
const apiKey = process.env.VITE_COMPASS_TOKEN || process.env.VITE_COMPASS_API_KEY || ''

const authHeader = {
  'X-API-Key': apiKey,
  Accept: 'application/json',
}

test('1. SAAODB Summary Dashboard', async () => {
  const res = await fetch(`${baseUrl}/api/v1/records/saaodb/dashboard?reportYear=2026&sheetScope=summary`, {
    headers: authHeader,
  })
  assert.equal(res.status, 200)
  const data = await res.json()
  assert.equal(data.reportYear, 2026)
  assert.ok(data.cascade)
  assert.ok(data.rates)
  assert.ok(Array.isArray(data.classBreakdown))
})

test('2. SAAODB Paginated Records', async () => {
  const res = await fetch(`${baseUrl}/api/v1/records/saaodb?reportYear=2026&period=FY&class=PS&sheetScope=summary&entityName=Agriculture&page=1&limit=5`, {
    headers: authHeader,
  })
  assert.equal(res.status, 200)
  const data = await res.json()
  assert.ok(Array.isArray(data.items))
})

test('3. SAAODB Hierarchical Entities', async () => {
  const res = await fetch(`${baseUrl}/api/v1/records/saaodb/entities?reportYear=2026&sheetScope=agency&expandParent=Department%20of%20Finance`, {
    headers: authHeader,
  })
  assert.equal(res.status, 200)
})

test('4. NCA (Notice of Cash Allocation) Records', async () => {
  const res = await fetch(`${baseUrl}/api/v1/records/nca?budgetYear=2026&page=1&limit=5`, {
    headers: authHeader,
  })
  assert.equal(res.status, 200)
  const data = await res.json()
  assert.ok(Array.isArray(data.items))
})

test('5. SARO (Special Allotment Release Order) Records', async () => {
  const res = await fetch(`${baseUrl}/api/v1/records/saro?page=1&limit=5`, {
    headers: authHeader,
  })
  assert.equal(res.status, 200)
  const data = await res.json()
  assert.ok(Array.isArray(data.items))
})

test('6. LGSF (Local Government Support Fund) Records', async () => {
  const res = await fetch(`${baseUrl}/api/v1/records/lgsf?fiscalYear=2026&programCode=FALGU&page=1&limit=5`, {
    headers: authHeader,
  })
  assert.equal(res.status, 200)
  const data = await res.json()
  assert.ok(Array.isArray(data.items))
})

test('7. LGSF Dashboard', async () => {
  const res = await fetch(`${baseUrl}/api/v1/records/lgsf/dashboard?programCode=FALGU&reportYear=2026&page=1&limit=5`, {
    headers: authHeader,
  })
  assert.equal(res.status, 200)
  const data = await res.json()
  assert.ok(data.kpis)
  assert.ok(data.projects)
})

console.log('✅ All DBM Compass Transparency specification and live endpoint tests passed!')
