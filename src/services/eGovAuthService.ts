import { EGOV_CONFIG } from '../config/egov.config'
import { User } from '../types/user'

export interface EGovProfileData {
  uniqid?: string
  user_id?: string
  id?: string
  email?: string
  birth_date?: string
  birthdate?: string
  first_name?: string
  firstName?: string
  middle_name?: string
  middleName?: string
  last_name?: string
  lastName?: string
  suffix?: string | null
  mobile?: string
  mobile_number?: string
  mobileNumber?: string
  phone?: string
  photo?: string
  profile_photo_url?: string
  street?: string
  barangay?: string
  municipality?: string
  city?: string
  province?: string
  region?: string
  postal?: string | null
  zip_code?: string
  address?: {
    street?: string
    barangay?: string
    municipality?: string
    city?: string
    province?: string
    region?: string
    postal?: string
    zip_code?: string
    zipCode?: string
  } | string
}

interface EGovProfileResponse {
  status?: number
  message?: string
  data?: EGovProfileData
  user?: EGovProfileData
  error?: string
  error_description?: string
}

interface EGovTokenResponse {
  access_token?: string
  data?: {
    access_token?: string
  }
  message?: string
  error?: string
  error_description?: string
}

export class EGovAuthenticationError extends Error {
  status: number
  code?: string

  constructor(message: string, status: number, code?: string) {
    super(message)
    this.name = 'EGovAuthenticationError'
    this.status = status
    this.code = code
  }
}

const getPartnerCode = (): string =>
  import.meta.env.VITE_EGOV_PARTNER_CODE || EGOV_CONFIG.partnerCode || 'a101db722afd40a2b33d39ed14b274e5'

const getPartnerSecret = (): string =>
  import.meta.env.VITE_EGOV_PARTNER_SECRET || EGOV_CONFIG.partnerSecret || 'bfacc31fe03042ccbd843ffd44b3e431'

const normalizeEmail = (email: string): string => email.trim().toLowerCase()

const isLikelyAccessToken = (credential: string): boolean =>
  credential.split('.').length === 3 || credential.startsWith('eyJ') || credential.length >= 64

const formatErrorMessage = (status: number, message?: string, errorDescription?: string): string => {
  if (status === 403) {
    return 'eGovPH Access Forbidden: Invalid partner credentials or unapproved partner account.'
  }
  if (status === 401) {
    return 'eGovPH Authentication Expired: The exchange code or access token is invalid or expired. Please sign in again.'
  }
  if (status === 429) {
    return 'eGovPH Quota Exceeded: No gateway credits remaining on partner account.'
  }
  if (status === 502 || status === 504) {
    return 'eGovPH Gateway Unreachable: The eGov authentication server timed out. Please retry.'
  }
  return message || errorDescription || `eGovPH authentication error (HTTP ${status}).`
}

/**
 * Maps raw eGovPH citizen profile payload to the application User model.
 */
export const mapEGovProfileToUser = (profile: EGovProfileData): User => {
  const uniqid = profile.uniqid || profile.user_id || profile.id || ''
  if (!uniqid) {
    throw new Error('The eGovPH profile did not include a valid citizen identifier (uniqid).')
  }

  const address = typeof profile.address === 'object' && profile.address ? profile.address : {}
  const now = new Date().toISOString()

  const firstName = profile.first_name || profile.firstName || 'Citizen'
  const lastName = profile.last_name || profile.lastName || ''
  const middleName = profile.middle_name || profile.middleName || undefined
  const email = profile.email || `${uniqid.toLowerCase()}@citizen.egov.ph`
  const mobileNumber =
    profile.mobile || profile.mobile_number || profile.mobileNumber || profile.phone || '+639090000001'

  return {
    id: uniqid,
    uniqid,
    firstName,
    middleName,
    lastName,
    suffix: profile.suffix || undefined,
    birthdate: profile.birth_date || profile.birthdate || '1990-01-01',
    email,
    mobileNumber,
    address: {
      street: address.street || profile.street || '',
      barangay: address.barangay || profile.barangay || '',
      city: address.city || address.municipality || profile.city || profile.municipality || '',
      province: address.province || profile.province || '',
      region: address.region || profile.region || '',
      zipCode:
        address.zip_code || address.zipCode || address.postal || profile.zip_code || profile.postal || undefined,
    },
    registeredAt: now,
    lastLogin: now,
    profileLocked: true,
    ssoProvider: 'egovph',
    profilePhotoUrl: profile.photo || profile.profile_photo_url,
  }
}

/**
 * Step 1 of eGov SSO: Exchanges single-use exchange_code for a 1-hour access_token.
 * POST /api/token { partner_code, partner_secret, exchange_code, scope: "SSO_AUTHENTICATION" }
 */
export const exchangeEGovCodeForAccessToken = async (exchangeCode: string): Promise<string> => {
  const cleanCode = exchangeCode.trim()
  if (!cleanCode) {
    throw new EGovAuthenticationError('Missing exchange code.', 400)
  }

  const response = await fetch('/egov-api/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      exchange_code: cleanCode,
      scope: 'SSO_AUTHENTICATION',
      partner_code: getPartnerCode(),
      partner_secret: getPartnerSecret(),
    }),
  })

  const responseBody = (await response.json().catch(() => ({}))) as EGovTokenResponse
  if (!response.ok) {
    const errorMsg = formatErrorMessage(
      response.status,
      responseBody.message,
      responseBody.error_description || responseBody.error
    )
    throw new EGovAuthenticationError(errorMsg, response.status, responseBody.error)
  }

  const accessToken = responseBody.access_token || responseBody.data?.access_token
  if (!accessToken) {
    throw new EGovAuthenticationError('The eGovPH token endpoint did not return an access token.', 500)
  }

  return accessToken
}

/**
 * Step 2 of eGov SSO: Fetches citizen profile using Bearer access_token.
 * POST /api/partner/sso_authentication
 */
export const fetchEGovProfile = async (accessToken: string): Promise<EGovProfileData> => {
  const cleanToken = accessToken.trim().replace(/^Bearer\s+/i, '')
  if (!cleanToken) {
    throw new EGovAuthenticationError('Missing access token.', 401)
  }

  const profileResponse = await fetch('/egov-api/api/partner/sso_authentication', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${cleanToken}`,
    },
    body: JSON.stringify({
      partner_code: getPartnerCode(),
      partner_secret: getPartnerSecret(),
    }),
  })

  const responseBody = (await profileResponse.json().catch(() => ({}))) as EGovProfileResponse
  if (!profileResponse.ok || (responseBody.status && responseBody.status >= 400)) {
    const status = profileResponse.status || responseBody.status || 500
    const errorMsg = formatErrorMessage(
      status,
      responseBody.message,
      responseBody.error_description || responseBody.error
    )
    throw new EGovAuthenticationError(errorMsg, status, responseBody.error)
  }

  const profile = responseBody.data || responseBody.user || (responseBody as unknown as EGovProfileData)
  if (!profile || typeof profile !== 'object') {
    throw new EGovAuthenticationError('The eGovPH API returned an empty citizen profile.', 500)
  }

  return profile
}

/**
 * Complete Mode A SSO flow: Exchanges exchange_code for token and returns signed-in User.
 */
export const authenticateWithEGovExchangeCode = async (exchangeCode: string): Promise<User> => {
  const accessToken = await exchangeEGovCodeForAccessToken(exchangeCode)
  const profile = await fetchEGovProfile(accessToken)
  return mapEGovProfileToUser(profile)
}

// ════════════════════════════════════════════════════════════════════════════
// Appendix A — Direct Login as eGov REST APIs (OTP + PIN)
// ════════════════════════════════════════════════════════════════════════════

/**
 * Appendix A1: Check partner access probe.
 * POST /api/partner/check_access { partner_code }
 */
export const checkPartnerAccess = async (): Promise<boolean> => {
  try {
    const response = await fetch('/egov-api/api/partner/check_access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ partner_code: getPartnerCode() }),
    })
    if (!response.ok) return false
    const data = await response.json()
    return data.is_code_valid === 1
  } catch (error) {
    console.warn('Partner access probe failed:', error)
    return false
  }
}

/**
 * Appendix A2: Send an OTP to mobile or email.
 * POST /api/otp_generate { partner_code, username, type }
 */
export const generateOtp = async (
  username: string,
  type: 'MOBILE_NUMBER' | 'EMAIL' = 'MOBILE_NUMBER'
): Promise<{ success: boolean; message?: string }> => {
  const cleanUsername = username.trim()
  const response = await fetch('/egov-api/api/otp_generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      partner_code: getPartnerCode(),
      username: cleanUsername,
      type,
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new EGovAuthenticationError(
      err.message || err.error || `Failed to generate OTP (${response.status})`,
      response.status
    )
  }

  return { success: true }
}

/**
 * Appendix A3: Validate the OTP and get an otp_validation_token.
 * POST /api/otp_validate { partner_code, username, type, otp }
 */
export const validateOtp = async (
  username: string,
  otp: string,
  type: 'MOBILE_NUMBER' | 'EMAIL' = 'MOBILE_NUMBER'
): Promise<string> => {
  const cleanUsername = username.trim()
  const cleanOtp = otp.trim()

  const response = await fetch('/egov-api/api/otp_validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      partner_code: getPartnerCode(),
      username: cleanUsername,
      type,
      otp: cleanOtp,
    }),
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new EGovAuthenticationError(
      data.message || data.error || `Invalid OTP entered (${response.status}).`,
      response.status
    )
  }

  const token = data.otp_validation_token
  if (!token) {
    throw new EGovAuthenticationError('eGovPH did not return an OTP validation token.', 500)
  }

  return token
}

/**
 * Appendix A4: Authenticate with the citizen's eGov PIN and receive exchange_code.
 * POST /api/authenticate { partner_code, username, pin, otp_validation_token }
 */
export const authenticateWithPin = async (
  username: string,
  pin: string,
  otpValidationToken: string
): Promise<{ exchangeCode: string; sharedData?: string[] }> => {
  const cleanUsername = username.trim()
  const cleanPin = pin.trim()

  const response = await fetch('/egov-api/api/authenticate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      partner_code: getPartnerCode(),
      username: cleanUsername,
      pin: cleanPin,
      otp_validation_token: otpValidationToken,
    }),
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new EGovAuthenticationError(
      data.message || data.error || `eGov PIN verification failed (${response.status}).`,
      response.status
    )
  }

  const exchangeCode = data.exchange_code
  if (!exchangeCode) {
    throw new EGovAuthenticationError('eGovPH did not return an exchange code after PIN verification.', 500)
  }

  return {
    exchangeCode,
    sharedData: data.shared_data,
  }
}

/**
 * Complete Appendix A flow: Phone/Email + OTP + PIN -> User Session.
 */
export const authenticateWithOtpAndPin = async (
  username: string,
  otp: string,
  pin: string,
  type: 'MOBILE_NUMBER' | 'EMAIL' = 'MOBILE_NUMBER'
): Promise<User> => {
  const validationToken = await validateOtp(username, otp, type)
  const { exchangeCode } = await authenticateWithPin(username, pin, validationToken)
  return authenticateWithEGovExchangeCode(exchangeCode)
}

/**
 * Developer Prototype sign-in: accepts email + exchange code or raw access token.
 */
export const authenticateWithEGovAccessToken = async (
  email: string,
  credential: string
): Promise<User> => {
  const normalizedEmail = normalizeEmail(email)
  const normalizedCredential = credential.trim().replace(/^Bearer\s+/i, '')

  if (!normalizedEmail) throw new Error('Enter your eGovPH email address.')
  if (!normalizedCredential) {
    throw new Error('Enter the generated eGovPH exchange code or SSO access token.')
  }

  let profile: EGovProfileData
  if (isLikelyAccessToken(normalizedCredential)) {
    try {
      profile = await fetchEGovProfile(normalizedCredential)
    } catch (profileError) {
      if (!(profileError instanceof EGovAuthenticationError) || profileError.status !== 401) {
        throw profileError
      }

      try {
        const accessToken = await exchangeEGovCodeForAccessToken(normalizedCredential)
        profile = await fetchEGovProfile(accessToken)
      } catch {
        throw new EGovAuthenticationError('Invalid eGovPH SSO access token or exchange code.', 401)
      }
    }
  } else {
    try {
      const accessToken = await exchangeEGovCodeForAccessToken(normalizedCredential)
      profile = await fetchEGovProfile(accessToken)
    } catch {
      try {
        profile = await fetchEGovProfile(normalizedCredential)
      } catch {
        throw new EGovAuthenticationError('Invalid eGovPH SSO exchange code or access token.', 401)
      }
    }
  }

  if (profile.email && normalizeEmail(profile.email) !== normalizedEmail) {
    throw new Error('The email does not match the citizen profile linked to this credential.')
  }

  return mapEGovProfileToUser(profile)
}
