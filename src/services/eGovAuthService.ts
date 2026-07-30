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

class EGovAuthenticationError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'EGovAuthenticationError'
    this.status = status
  }
}

const normalizeEmail = (email: string): string => email.trim().toLowerCase()

const isLikelyAccessToken = (credential: string): boolean =>
  credential.split('.').length === 3 || credential.startsWith('eyJ') || credential.length >= 64

const invalidCredentialError = (): Error =>
  new Error(
    'This credential is not a valid eGovPH SSO access token or exchange code. Generate it under SSO Authentication, not the AI Integration API, then try again.'
  )

export const mapEGovProfileToUser = (profile: EGovProfileData): User => {
  const uniqid = profile.uniqid || profile.user_id || profile.id || ''
  if (!uniqid) throw new Error('The eGovPH profile did not include a citizen identifier.')
  if (!profile.email) throw new Error('The eGovPH profile did not include an email address.')

  const address = typeof profile.address === 'object' && profile.address ? profile.address : {}
  const now = new Date().toISOString()

  return {
    id: uniqid,
    uniqid,
    firstName: profile.first_name || profile.firstName || '',
    middleName: profile.middle_name || profile.middleName,
    lastName: profile.last_name || profile.lastName || '',
    suffix: profile.suffix || undefined,
    birthdate: profile.birth_date || profile.birthdate || '',
    email: profile.email,
    mobileNumber:
      profile.mobile || profile.mobile_number || profile.mobileNumber || profile.phone || '',
    address: {
      street: address.street || profile.street,
      barangay: address.barangay || profile.barangay,
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

export const exchangeEGovCodeForAccessToken = async (exchangeCode: string): Promise<string> => {
  const response = await fetch('/egov-api/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      exchange_code: exchangeCode.trim(),
      scope: 'SSO_AUTHENTICATION',
      partner_code: import.meta.env.VITE_EGOV_PARTNER_CODE,
      partner_secret: import.meta.env.VITE_EGOV_PARTNER_SECRET,
    }),
  })

  const responseBody = (await response.json().catch(() => ({}))) as EGovTokenResponse
  if (!response.ok) {
    throw new EGovAuthenticationError(
      responseBody.message ||
        responseBody.error_description ||
        responseBody.error ||
        `The eGovPH exchange code could not be converted (${response.status}).`,
      response.status
    )
  }

  const accessToken = responseBody.access_token || responseBody.data?.access_token
  if (!accessToken) {
    throw new Error('The eGovPH token endpoint did not return an access token.')
  }

  return accessToken
}

const fetchEGovProfile = async (accessToken: string): Promise<EGovProfileData> => {
  const profileResponse = await fetch('/egov-api/api/partner/sso_authentication', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      partner_code: import.meta.env.VITE_EGOV_PARTNER_CODE,
      partner_secret: import.meta.env.VITE_EGOV_PARTNER_SECRET,
    }),
  })

  const responseBody = (await profileResponse.json().catch(() => ({}))) as EGovProfileResponse
  if (!profileResponse.ok || (responseBody.status && responseBody.status >= 400)) {
    throw new EGovAuthenticationError(
      responseBody.message ||
        responseBody.error_description ||
        responseBody.error ||
        `eGovPH authentication failed (${profileResponse.status}).`,
      profileResponse.status
    )
  }

  const profile = responseBody.data || responseBody.user || (responseBody as unknown as EGovProfileData)
  if (!profile?.email) throw new Error('The eGovPH API returned an incomplete citizen profile.')
  return profile
}

/**
 * Prototype sign-in: the password field accepts an eGovPH SSO access token or
 * the exchange code generated by the test portal. Credentials are never persisted.
 */
export const authenticateWithEGovAccessToken = async (
  email: string,
  credential: string
): Promise<User> => {
  const normalizedEmail = normalizeEmail(email)
  const normalizedCredential = credential.trim().replace(/^Bearer\s+/i, '')

  if (!normalizedEmail) throw new Error('Enter your eGovPH email address.')
  if (!normalizedCredential) {
    throw new Error('Enter the generated eGovPH exchange code or SSO access token as your password.')
  }

  let profile: EGovProfileData
  if (isLikelyAccessToken(normalizedCredential)) {
    // JWT-shaped and long credentials are normally final access tokens.
    try {
      profile = await fetchEGovProfile(normalizedCredential)
    } catch (profileError) {
      if (!(profileError instanceof EGovAuthenticationError) || profileError.status !== 401) {
        throw profileError
      }

      // Some environments issue opaque exchange codes with token-like lengths.
      try {
        const accessToken = await exchangeEGovCodeForAccessToken(normalizedCredential)
        profile = await fetchEGovProfile(accessToken)
      } catch {
        throw invalidCredentialError()
      }
    }
  } else {
    // The test portal's "Generate" action returns a short exchange code. Convert
    // it before calling the profile endpoint so a normal login does not emit 401.
    try {
      const accessToken = await exchangeEGovCodeForAccessToken(normalizedCredential)
      profile = await fetchEGovProfile(accessToken)
    } catch {
      // An opaque access token may also be short. If code exchange rejects it,
      // make one direct profile attempt before declaring the credential invalid.
      try {
        profile = await fetchEGovProfile(normalizedCredential)
      } catch {
        throw invalidCredentialError()
      }
    }
  }

  if (!profile.email) throw new Error('The eGovPH API returned an incomplete citizen profile.')
  if (normalizeEmail(profile.email) !== normalizedEmail) {
    throw new Error('The email does not match the citizen profile linked to this credential.')
  }

  return mapEGovProfileToUser(profile)
}
