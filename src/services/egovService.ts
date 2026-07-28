import { EGovUser, User } from '../types/user'
import { EGOV_CONFIG } from '../config/egov.config'

interface ExchangeCodeResponse {
  success: boolean
  data?: EGovUser
  error?: string
}

// AI Assistant API Types
interface TokenResponse {
  access_token: string
  expires_in_seconds: number
  credits_total: number
  credits_remaining: number
}

interface AIAssistantResponse {
  data: string
  session_id: string
}

interface TranslatorResponse {
  original_prompt: string
  source_lang: string
  target_lang: string
  translate_from: {
    code: string
    label: string
  }
  translated_prompt: string
  transliterated_prompt: string
}

interface TourismResponse {
  data: string
  session_id: string
}

interface LawsResponse {
  data: string
  session_id: string
}

interface DocumentExtractorResponse {
  data: string
}

interface CreditsResponse {
  credits_total: number
  credits_used: number
  credits_remaining: number
  expires_at: string
}

// Store token in memory (or use localStorage for persistence)
let cachedToken: string | null = null
let tokenExpiry: number | null = null

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

// ============================================================================
// AI INTEGRATION API FUNCTIONS
// ============================================================================

// Use proxy for integration API to avoid CORS and DNS issues
const INTEGRATION_BASE_URL = '/integration-api'
const ACCESS_CODE = import.meta.env.VITE_EGOV_ACCESS_CODE

// Debug: Log configuration
console.log('Integration API Config:', {
  baseUrl: INTEGRATION_BASE_URL,
  hasAccessCode: !!ACCESS_CODE,
  accessCodePrefix: ACCESS_CODE?.substring(0, 10) + '...'
})

/**
 * Get or generate access token for AI Integration API
 */
const getAccessToken = async (): Promise<string> => {
  // Return cached token if still valid
  if (cachedToken && tokenExpiry && Date.now() < tokenExpiry) {
    return cachedToken
  }

  try {
    const response = await fetch(`${INTEGRATION_BASE_URL}/api/v1/egov/integration/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        access_code: ACCESS_CODE,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Token API error response:', errorText)
      throw new Error(`Failed to generate access token: ${response.status} - ${errorText}`)
    }

    const data: TokenResponse = await response.json()
    
    // Cache token with expiry (subtract 60 seconds for safety margin)
    cachedToken = data.access_token
    tokenExpiry = Date.now() + (data.expires_in_seconds - 60) * 1000
    
    return data.access_token
  } catch (error) {
    console.error('Get access token error:', error)
    throw error
  }
}

/**
 * AI Assistant - Generate response to user query
 */
export const generateAIResponse = async (
  prompt: string,
  category: string = 'PH'
): Promise<AIAssistantResponse> => {
  try {
    const token = await getAccessToken()
    
    const response = await fetch(
      `${INTEGRATION_BASE_URL}/api/v1/egov/integration/ai_assistant/generate`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          prompt,
          category,
        }),
      }
    )

    if (!response.ok) {
      throw new Error('Failed to generate AI response')
    }

    return await response.json()
  } catch (error) {
    console.error('AI Assistant error:', error)
    throw error
  }
}

/**
 * Tourism Content Generator
 */
export const generateTourismContent = async (
  prompt: string,
  category: string = 'PH'
): Promise<TourismResponse> => {
  try {
    const token = await getAccessToken()
    
    const response = await fetch(
      `${INTEGRATION_BASE_URL}/api/v1/egov/integration/tourism/generate`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          prompt,
          category,
        }),
      }
    )

    if (!response.ok) {
      throw new Error('Failed to generate tourism content')
    }

    return await response.json()
  } catch (error) {
    console.error('Tourism generator error:', error)
    throw error
  }
}

/**
 * Laws and Regulations Generator
 */
export const generateLawsResponse = async (
  prompt: string,
  category: string = 'PH'
): Promise<LawsResponse> => {
  try {
    const token = await getAccessToken()
    
    const response = await fetch(
      `${INTEGRATION_BASE_URL}/api/v1/egov/integration/laws_and_regulations/generate`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          prompt,
          category,
        }),
      }
    )

    if (!response.ok) {
      throw new Error('Failed to generate laws response')
    }

    return await response.json()
  } catch (error) {
    console.error('Laws generator error:', error)
    throw error
  }
}

/**
 * Translator
 */
export const translateText = async (
  prompt: string,
  sourceLang: string,
  targetLang: string
): Promise<TranslatorResponse> => {
  try {
    const token = await getAccessToken()
    
    const response = await fetch(
      `${INTEGRATION_BASE_URL}/api/v1/egov/integration/translator/generate`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          prompt,
          source_lang: sourceLang,
          target_lang: targetLang,
        }),
      }
    )

    if (!response.ok) {
      throw new Error('Failed to translate text')
    }

    return await response.json()
  } catch (error) {
    console.error('Translator error:', error)
    throw error
  }
}

/**
 * Document Extractor
 */
export const extractDocumentData = async (file: File): Promise<DocumentExtractorResponse> => {
  try {
    const token = await getAccessToken()
    
    const formData = new FormData()
    formData.append('file', file)
    
    const response = await fetch(
      `${INTEGRATION_BASE_URL}/api/v1/egov/integration/document_extractor/generate`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      }
    )

    if (!response.ok) {
      throw new Error('Failed to extract document data')
    }

    return await response.json()
  } catch (error) {
    console.error('Document extractor error:', error)
    throw error
  }
}

/**
 * Get API Credits Balance
 */
export const getCreditsBalance = async (): Promise<CreditsResponse> => {
  try {
    const token = await getAccessToken()
    
    const response = await fetch(
      `${INTEGRATION_BASE_URL}/api/v1/egov/integration/credits`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    )

    if (!response.ok) {
      throw new Error('Failed to get credits balance')
    }

    return await response.json()
  } catch (error) {
    console.error('Get credits error:', error)
    throw error
  }
}
