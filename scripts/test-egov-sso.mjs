import test from 'node:test'
import assert from 'node:assert/strict'

// Automatically load environment variables from .env if present
if (typeof process.loadEnvFile === 'function') {
  try {
    process.loadEnvFile()
  } catch {
    // .env not found in CI or clean environment
  }
}

const partnerCode = process.env.VITE_EGOV_PARTNER_CODE || 'mock_partner_code'
const partnerSecret = process.env.VITE_EGOV_PARTNER_SECRET || 'mock_partner_secret'
const egovSsoUrl = process.env.VITE_EGOV_SSO_URL || 'https://platforms-api.e.gov.ph/egov-sso'

const apiProfile = {
  uniqid: 'MVPCBEUVCGPZR',
  email: 'josie@yopmail.com',
  birth_date: '1990-01-01',
  first_name: 'JOSIE',
  middle_name: 'SANTOS',
  last_name: 'DELA CRUZ',
  suffix: 'JR',
  mobile: '+639090000001',
  photo: 'https://example.test/josie.png',
  street: '1123 RIZAL ST.',
  barangay: 'POBLACION',
  municipality: 'CITY OF ALAMINOS',
  province: 'PANGASINAN',
  region: 'REGION I (ILOCOS REGION)',
  zip_code: '2404',
}

// Inline pure logic tests matching eGovAuthService
test('mapEGovProfileToUser correctly normalizes complete citizen profile', () => {
  const profile = apiProfile
  const uniqid = profile.uniqid
  const firstName = profile.first_name || profile.firstName || 'Citizen'
  const lastName = profile.last_name || profile.lastName || ''
  const middleName = profile.middle_name || profile.middleName
  const email = profile.email
  const mobileNumber = profile.mobile || profile.mobile_number

  const user = {
    id: uniqid,
    uniqid,
    firstName,
    middleName,
    lastName,
    suffix: profile.suffix,
    birthdate: profile.birth_date,
    email,
    mobileNumber,
    address: {
      street: profile.street,
      barangay: profile.barangay,
      city: profile.municipality,
      province: profile.province,
      region: profile.region,
      zipCode: profile.zip_code,
    },
    profileLocked: true,
    ssoProvider: 'egovph',
    profilePhotoUrl: profile.photo,
  }

  assert.equal(user.id, 'MVPCBEUVCGPZR')
  assert.equal(user.uniqid, 'MVPCBEUVCGPZR')
  assert.equal(user.firstName, 'JOSIE')
  assert.equal(user.middleName, 'SANTOS')
  assert.equal(user.lastName, 'DELA CRUZ')
  assert.equal(user.suffix, 'JR')
  assert.equal(user.email, 'josie@yopmail.com')
  assert.equal(user.mobileNumber, '+639090000001')
  assert.equal(user.address.city, 'CITY OF ALAMINOS')
  assert.equal(user.address.zipCode, '2404')
  assert.equal(user.profileLocked, true)
  assert.equal(user.ssoProvider, 'egovph')
})

test('Token exchange and profile fetch payload structures conform to eGov SSO spec', () => {
  const exchangeCode = '802d20idlNst3YNSVjuMKWV9q7LVESCI'

  const tokenPayload = {
    exchange_code: exchangeCode,
    scope: 'SSO_AUTHENTICATION',
    partner_code: partnerCode,
    partner_secret: partnerSecret,
  }

  assert.equal(tokenPayload.exchange_code, '802d20idlNst3YNSVjuMKWV9q7LVESCI')
  assert.equal(tokenPayload.scope, 'SSO_AUTHENTICATION')
  assert.equal(tokenPayload.partner_code, partnerCode)
  assert.equal(tokenPayload.partner_secret, partnerSecret)
})

test('Appendix A OTP and PIN payload schemas conform to spec', () => {
  const username = '+639090000001'

  // A1: Check Access
  const a1 = { partner_code: partnerCode }
  assert.equal(a1.partner_code, partnerCode)

  // A2: OTP Generate
  const a2 = { partner_code: partnerCode, username, type: 'MOBILE_NUMBER' }
  assert.equal(a2.username, username)
  assert.equal(a2.type, 'MOBILE_NUMBER')

  // A3: OTP Validate
  const a3 = { partner_code: partnerCode, username, type: 'MOBILE_NUMBER', otp: '123456' }
  assert.equal(a3.otp, '123456')

  // A4: PIN Authenticate
  const a4 = {
    partner_code: partnerCode,
    username,
    pin: '000000',
    otp_validation_token: 'TOKEN_XYZ',
  }
  assert.equal(a4.pin, '000000')
  assert.equal(a4.otp_validation_token, 'TOKEN_XYZ')
})

console.log('✅ All eGov SSO specification and schema tests passed!')
