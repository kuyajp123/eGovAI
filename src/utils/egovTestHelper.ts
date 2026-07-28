/**
 * eGovPH SSO Test Helper
 * Utility functions for testing eGovPH SSO integration
 */

const EGOV_BASE_URL = import.meta.env.VITE_EGOV_SSO_URL
const PARTNER_CODE = import.meta.env.VITE_EGOV_PARTNER_CODE
const PARTNER_SECRET = import.meta.env.VITE_EGOV_PARTNER_SECRET

export interface EGovAccessToken {
  access_token: string
  token_type: string
  expires_in: number
}

export interface EGovExchangeCode {
  exchange_code: string
  expires_at: string
}

/**
 * Generate access token for partner authentication
 */
export async function generateAccessToken(): Promise<EGovAccessToken> {
  try {
    const response = await fetch(`${EGOV_BASE_URL}/api/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        partner_code: PARTNER_CODE,
        partner_secret: PARTNER_SECRET,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to generate access token')
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Access token generation failed:', error)
    throw error
  }
}

/**
 * Generate exchange code using test eGov identity
 */
export async function generateExchangeCode(
  accessToken: string,
  testAccountId?: string
): Promise<EGovExchangeCode> {
  try {
    const response = await fetch(`${EGOV_BASE_URL}/api/mint`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        test_account: testAccountId || 'default_test_account',
        partner_code: PARTNER_CODE,
      }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.message || `Failed to generate exchange code: ${response.status}`)
    }

    const data = await response.json()
    return {
      exchange_code: data.exchange_code || data.code,
      expires_at: data.expires_at || data.expiry,
    }
  } catch (error) {
    console.error('Exchange code generation failed:', error)
    throw error
  }
}

/**
 * Complete test flow: Generate token and exchange code
 */
export async function getTestExchangeCode(
  testAccountId?: string
): Promise<string> {
  const tokenData = await generateAccessToken()
  const exchangeData = await generateExchangeCode(
    tokenData.access_token,
    testAccountId
  )
  return exchangeData.exchange_code
}

/**
 * Build SSO callback URL with exchange code for testing
 */
export function buildTestCallbackUrl(exchangeCode: string): string {
  const baseUrl = import.meta.env.VITE_APP_BASE_URL
  return `${baseUrl}/egovph/sso?exchange_code=${exchangeCode}`
}

/**
 * Test the complete SSO flow
 */
export async function testSSOFlow(testAccountId?: string): Promise<void> {
  console.log('🔐 Starting eGovPH SSO test flow...')

  // Step 1: Generate access token
  console.log('Step 1: Generating access token...')
  const tokenData = await generateAccessToken()
  console.log('✅ Access token generated:', tokenData.access_token.substring(0, 20) + '...')

  // Step 2: Generate exchange code
  console.log('Step 2: Generating exchange code...')
  const exchangeData = await generateExchangeCode(
    tokenData.access_token,
    testAccountId
  )
  console.log('✅ Exchange code generated:', exchangeData.exchange_code)

  // Step 3: Build callback URL
  const callbackUrl = buildTestCallbackUrl(exchangeData.exchange_code)
  console.log('✅ Test callback URL:', callbackUrl)

  console.log('\n🎉 SSO test flow complete!')
  console.log('📋 Copy this URL to test authentication:')
  console.log(callbackUrl)

  return
}
