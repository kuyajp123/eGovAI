import {
  CreateSessionRequest,
  CreateSessionResponse,
  VerificationResult,
  CONFIDENCE_THRESHOLD,
} from '../types/faceLiveness'

const LIVENESS_BASE_URL = import.meta.env.VITE_FACE_LIVENESS_URL
const API_KEY = import.meta.env.VITE_FACE_LIVENESS_API_KEY

/**
 * Create a face liveness verification session
 */
export async function createLivenessSession(
  request: CreateSessionRequest
): Promise<CreateSessionResponse> {
  try {
    const response = await fetch(`${LIVENESS_BASE_URL}/v1/liveness/session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
      },
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.message || 'Failed to create liveness session')
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Create liveness session failed:', error)
    throw error
  }
}

/**
 * Get verification result for a liveness session
 */
export async function getVerificationResult(
  sessionToken: string
): Promise<VerificationResult> {
  try {
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

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Get verification result failed:', error)
    throw error
  }
}

/**
 * Validate verification result against security thresholds
 */
export function isVerificationValid(result: VerificationResult): boolean {
  return (
    result.status === 'SUCCEEDED' &&
    result.confidence_score >= CONFIDENCE_THRESHOLD
  )
}

/**
 * Create a redirect flow liveness session
 */
export async function createRedirectSession(
  callbackUrl: string,
  delay: number = 3000
): Promise<CreateSessionResponse> {
  return createLivenessSession({
    action: 'redirect',
    callback_url: callbackUrl,
    delay,
  })
}

/**
 * Create a post message flow liveness session
 */
export async function createPostMessageSession(
  delay: number = 3000
): Promise<CreateSessionResponse> {
  return createLivenessSession({
    action: 'post',
    delay,
  })
}

/**
 * Create a close flow liveness session
 */
export async function createCloseSession(
  delay: number = 3000
): Promise<CreateSessionResponse> {
  return createLivenessSession({
    action: 'close',
    delay,
  })
}
