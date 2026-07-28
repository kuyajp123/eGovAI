import {
  CreateSessionRequest,
  CreateSessionResponse,
  VerificationResult,
  CONFIDENCE_THRESHOLD,
} from '../types/faceLiveness'

// Uses the Vite proxy /face-liveness-api -> https://hackathon-face-liveness.e.gov.ph
const LIVENESS_BASE_URL = import.meta.env.VITE_FACE_LIVENESS_URL || '/face-liveness-api'
const API_KEY = import.meta.env.VITE_FACE_LIVENESS_API_KEY

/**
 * Create a face liveness verification session
 */
export async function createLivenessSession(
  request: CreateSessionRequest
): Promise<CreateSessionResponse> {
  const response = await fetch(`${LIVENESS_BASE_URL}/v1/liveness/session`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
    },
    body: JSON.stringify(request),
  })

  // Guard against HTML error pages (proxy misconfiguration / network error)
  const contentType = response.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) {
    const text = await response.text()
    throw new Error(
      `Face Liveness API returned unexpected content (HTTP ${response.status}). ` +
      `Check that the proxy is correctly configured. Preview: ${text.slice(0, 80)}`
    )
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.message || `Face Liveness session error (HTTP ${response.status})`)
  }

  return response.json()
}

/**
 * Get verification result for a liveness session.
 * Enforces: status === "SUCCEEDED" AND confidence_score >= 95.0
 */
export async function getVerificationResult(
  sessionToken: string
): Promise<VerificationResult> {
  const response = await fetch(
    `${LIVENESS_BASE_URL}/v1/liveness/result/${sessionToken}`,
    {
      method: 'GET',
      headers: {
        'x-api-key': API_KEY,
      },
    }
  )

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.message || 'Failed to get verification result')
  }

  return response.json()
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
