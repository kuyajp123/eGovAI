import { EGovUser, User } from '../types/user'
import { EGOV_CONFIG } from '../config/egov.config'

interface ExchangeCodeResponse {
  success: boolean
  data?: EGovUser
  error?: string
}

/**
 * Exchange the authorization code for user data from eGovPH
 */
export const exchangeCodeForUserData = async (
  exchangeCode: string
): Promise<ExchangeCodeResponse> => {
  try {
    // Exchange code for access token via eGovPH API
    const tokenResponse = await fetch(`/egov-api/api/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        exchange_code: exchangeCode,
        scope: 'SSO_AUTHENTICATION',
        partner_code: import.meta.env.VITE_EGOV_PARTNER_CODE,
        partner_secret: import.meta.env.VITE_EGOV_PARTNER_SECRET,
      }),
    })

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json().catch(() => ({}))
      throw new Error(errorData.message || 'Failed to exchange code for token')
    }

    const data = await tokenResponse.json()
    
    // Map eGovPH response to our EGovUser format
    const egovUser: EGovUser = {
      uniqid: data.uniqid || data.user_id || data.id,
      firstName: data.first_name || data.firstName,
      middleName: data.middle_name || data.middleName,
      lastName: data.last_name || data.lastName,
      suffix: data.suffix,
      birthdate: data.birthdate || data.birth_date,
      email: data.email,
      mobileNumber: data.mobile_number || data.mobileNumber || data.phone,
      address: {
        street: data.address?.street || data.street,
        barangay: data.address?.barangay || data.barangay,
        city: data.address?.city || data.city,
        province: data.address?.province || data.province,
        region: data.address?.region || data.region,
        zipCode: data.address?.zip_code || data.zipCode,
      },
    }
    
    return { success: true, data: egovUser }
  } catch (error) {
    console.error('Exchange code error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Find existing user by uniqid or personal details
 */
export const findExistingUser = async (
  egovUser: EGovUser
): Promise<User | null> => {
  try {
    // First, try to find by uniqid
    const response = await fetch(
      `${EGOV_CONFIG.apiBaseUrl}/users/find?uniqid=${egovUser.uniqid}`
    )

    if (response.ok) {
      const data = await response.json()
      return data.user
    }

    // If not found by uniqid, try matching by personal details
    const matchResponse = await fetch(`${EGOV_CONFIG.apiBaseUrl}/users/match`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        firstName: egovUser.firstName,
        lastName: egovUser.lastName,
        birthdate: egovUser.birthdate,
      }),
    })

    if (matchResponse.ok) {
      const matchData = await matchResponse.json()
      return matchData.user
    }

    return null
  } catch (error) {
    console.error('Find user error:', error)
    return null
  }
}

/**
 * Register new user with eGovPH data
 */
export const registerUser = async (egovUser: EGovUser): Promise<User> => {
  try {
    const response = await fetch(`${EGOV_CONFIG.apiBaseUrl}/users/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...egovUser,
        ssoProvider: 'egovph',
        profileLocked: true,
      }),
    })

    if (!response.ok) {
      throw new Error('Failed to register user')
    }

    const data = await response.json()
    return data.user
  } catch (error) {
    console.error('Register user error:', error)
    throw error
  }
}

/**
 * Bind uniqid to existing user account
 */
export const bindUniqidToUser = async (
  userId: string,
  uniqid: string
): Promise<boolean> => {
  try {
    const response = await fetch(
      `${EGOV_CONFIG.apiBaseUrl}/users/${userId}/bind-uniqid`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ uniqid }),
      }
    )

    return response.ok
  } catch (error) {
    console.error('Bind uniqid error:', error)
    return false
  }
}

/**
 * Update user's last login timestamp
 */
export const updateLastLogin = async (userId: string): Promise<void> => {
  try {
    await fetch(`${EGOV_CONFIG.apiBaseUrl}/users/${userId}/last-login`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ lastLogin: new Date().toISOString() }),
    })
  } catch (error) {
    console.error('Update last login error:', error)
  }
}
