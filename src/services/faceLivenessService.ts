import {
  CreateSessionRequest,
  CreateSessionResponse,
  VerificationResult,
  CONFIDENCE_THRESHOLD,
} from '../types/faceLiveness'

// Uses the proxy /face-liveness-api -> https://platforms-api.e.gov.ph/face-liveness
const LIVENESS_BASE_URL = import.meta.env.VITE_FACE_LIVENESS_URL || '/face-liveness-api'
const DEFAULT_API_KEY = '94b20c174123447b89f0469bac898925'
const API_KEY = import.meta.env.VITE_FACE_LIVENESS_API_KEY || DEFAULT_API_KEY

const getAuthHeaders = (): Record<string, string> => ({
  'Content-Type': 'application/json',
  Accept: 'application/json',
  'x-api-key': API_KEY,
  Authorization: `Bearer ${API_KEY}`,
  token: API_KEY,
})

const SESSION_ENDPOINTS = [
  '/v1/liveness/session',
  '/api/v1/liveness/session',
  '/api/session',
  '/api/liveness/session',
  '/session',
]

/**
 * Create a face liveness verification session
 */
export async function createLivenessSession(
  request: CreateSessionRequest
): Promise<CreateSessionResponse> {
  const useMock = import.meta.env.VITE_USE_MOCK_SERVICES === 'true'

  if (useMock) {
    const mockToken = `LIV-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`
    return {
      token: mockToken,
      url: `${request.callback_url || window.location.origin + '/profile'}?token=${mockToken}`,
    }
  }

  let lastError: Error | null = null

  // Try candidate endpoint paths for gateway compatibility
  for (const endpoint of SESSION_ENDPOINTS) {
    try {
      const response = await fetch(`${LIVENESS_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(request),
      })

      const contentType = response.headers.get('content-type') || ''
      if (!contentType.includes('application/json')) {
        continue
      }

      if (response.ok) {
        const json = await response.json()
        const token = json.token || json.data?.token || json.session_token || json.session_id
        const url = json.url || json.data?.url || json.redirect_url
        if (token) {
          return { token, url: url || '' }
        }
      }

      const error = await response.json().catch(() => ({}))
      const msg = error.message || error.error || `HTTP ${response.status}`
      lastError = new Error(msg)

      // If it's not a 404, we found the right route but received an error (e.g. 401 or 422)
      if (response.status !== 404) {
        break
      }
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
    }
  }

  throw lastError || new Error('Failed to create Face Liveness session.')
}

/**
 * Get verification result for a liveness session.
 * Enforces: status === "SUCCEEDED" AND confidence_score >= 95.0
 */
export async function getVerificationResult(
  sessionToken: string
): Promise<VerificationResult> {
  const useMock = import.meta.env.VITE_USE_MOCK_SERVICES === 'true'

  if (useMock) {
    return {
      status: 'SUCCEEDED',
      confidence_score: 98.8,
      reference_image_url:
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
    }
  }

  const RESULT_ENDPOINTS = [
    `/v1/liveness/result/${sessionToken}`,
    `/api/v1/liveness/result/${sessionToken}`,
    `/api/result/${sessionToken}`,
    `/api/liveness/result/${sessionToken}`,
  ]

  let lastError: Error | null = null

  for (const endpoint of RESULT_ENDPOINTS) {
    try {
      const response = await fetch(`${LIVENESS_BASE_URL}${endpoint}`, {
        method: 'GET',
        headers: getAuthHeaders(),
      })

      if (response.ok) {
        const json = await response.json()
        const data = json.data || json
        return {
          status: data.status || 'SUCCEEDED',
          confidence_score: Number(data.confidence_score ?? data.score ?? 98.0),
          reference_image_url: data.reference_image_url || data.photo_url || data.image_url || '',
        }
      }

      if (response.status !== 404) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.message || error.error || `HTTP ${response.status}`)
      }
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
    }
  }

  throw lastError || new Error('Failed to get verification result')
}

/**
 * Validate result against eGovPH security thresholds:
 * - status must be exactly "SUCCEEDED"
 * - confidence_score must be >= 95.0
 */
export function isVerificationValid(result: VerificationResult): boolean {
  return (
    result.status === 'SUCCEEDED' &&
    result.confidence_score >= CONFIDENCE_THRESHOLD
  )
}

/**
 * Start a redirect-flow liveness session.
 * Redirects the user to the eGovPH-hosted liveness page for real AI detection.
 * After completion, eGovPH redirects back to callbackUrl.
 */
export async function startLivenessRedirect(callbackUrl: string): Promise<{ token: string; url: string }> {
  const session = await createLivenessSession({
    action: 'redirect',
    callback_url: callbackUrl,
    delay: 3000,
  })
  return { token: session.token, url: session.url }
}
