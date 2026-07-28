export type LivenessAction = 'redirect' | 'post' | 'close'

export interface CreateSessionRequest {
  action: LivenessAction
  callback_url?: string
  delay?: number
}

export interface CreateSessionResponse {
  token: string
  url: string
}

export type VerificationStatus = 'SUCCEEDED' | 'FAILED' | 'PENDING' | 'EXPIRED'

export interface VerificationResult {
  status: VerificationStatus
  confidence_score: number
  reference_image_url: string
}

export const CONFIDENCE_THRESHOLD = 95.0
