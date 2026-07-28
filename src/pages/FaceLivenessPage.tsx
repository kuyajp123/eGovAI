import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  createRedirectSession,
  getVerificationResult,
  isVerificationValid,
} from '../services/faceLivenessService'

const FaceLivenessPage = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [livenessUrl, setLivenessUrl] = useState('')
  const [sessionToken, setSessionToken] = useState('')

  // Check if returning from liveness verification
  const token = searchParams.get('token')
  const isCallback = !!token

  useEffect(() => {
    if (isCallback && token) {
      handleVerificationCallback(token)
    }
  }, [isCallback, token])

  const handleVerificationCallback = async (token: string) => {
    setLoading(true)
    setError('')

    try {
      // Get verification result
      const result = await getVerificationResult(token)

      // Validate result
      if (isVerificationValid(result)) {
        // Store result in session/context if needed
        localStorage.setItem('face_verification', JSON.stringify(result))

        // Success - proceed to next step
        setTimeout(() => {
          navigate('/review')
        }, 1000)
      } else {
        setError(
          `Verification failed. Status: ${result.status}, Confidence: ${result.confidence_score}%`
        )
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed')
    } finally {
      setLoading(false)
    }
  }

  const handleStartVerification = async () => {
    setLoading(true)
    setError('')

    try {
      // Create callback URL for this page
      const callbackUrl = `${window.location.origin}/face-liveness`

      // Create liveness session
      const session = await createRedirectSession(callbackUrl, 3000)

      setSessionToken(session.token)
      setLivenessUrl(session.url)

      // Redirect to liveness verification
      window.location.href = session.url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start verification')
      setLoading(false)
    }
  }

  if (isCallback && loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-margin-mobile">
        <div className="w-20 h-20 bg-primary-container rounded-full flex items-center justify-center mb-6">
          <span className="material-symbols-outlined text-5xl text-on-primary-container animate-spin">
            progress_activity
          </span>
        </div>
        <h2 className="text-2xl font-bold text-on-surface mb-3">
          Verifying Your Identity
        </h2>
        <p className="text-on-surface-variant text-center">
          Please wait while we validate your biometric data...
        </p>
      </div>
    )
  }

  return (
    <div className="pt-24 pb-12 px-margin-mobile flex flex-col items-center max-w-lg mx-auto w-full">
      <div className="mb-8 flex flex-col items-center">
        <div className="w-16 h-16 bg-primary-container text-on-primary-container rounded-2xl flex items-center justify-center mb-3 shadow-lg">
          <span
            className="material-symbols-outlined text-4xl"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            face
          </span>
        </div>
        <h2 className="text-xl font-bold text-primary">Face Liveness Verification</h2>
        <p className="text-sm text-on-surface-variant text-center mt-1">
          Biometric Authentication Required
        </p>
      </div>

      {error && (
        <div className="w-full bg-error-container border border-error p-4 rounded-xl mb-6 flex gap-3">
          <span className="material-symbols-outlined text-error">error</span>
          <div className="flex-1">
            <h4 className="font-bold text-on-error-container">Verification Failed</h4>
            <p className="text-sm text-on-error-container">{error}</p>
          </div>
        </div>
      )}

      <div className="w-full bg-white p-6 rounded-xl border border-outline-variant shadow-sm mb-6">
        <h3 className="font-bold text-lg mb-4">How It Works</h3>
        <ol className="space-y-3 text-sm text-on-surface-variant">
          <li className="flex gap-3">
            <span className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center shrink-0 text-xs font-bold">
              1
            </span>
            <span>Position your face within the frame</span>
          </li>
          <li className="flex gap-3">
            <span className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center shrink-0 text-xs font-bold">
              2
            </span>
            <span>Follow the on-screen instructions</span>
          </li>
          <li className="flex gap-3">
            <span className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center shrink-0 text-xs font-bold">
              3
            </span>
            <span>Wait for automatic verification</span>
          </li>
        </ol>
      </div>

      <div className="w-full bg-surface-container-low p-4 rounded-xl border border-outline-variant mb-8">
        <div className="flex gap-3">
          <span className="material-symbols-outlined text-primary">info</span>
          <div className="flex-1 text-sm text-on-surface-variant">
            <p className="font-bold text-on-surface mb-1">Security Threshold</p>
            <p>Confidence score must be 95% or higher for approval.</p>
          </div>
        </div>
      </div>

      <button
        onClick={handleStartVerification}
        disabled={loading}
        className="w-full h-14 bg-primary text-white font-bold text-lg rounded-full shadow-lg active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <span className="material-symbols-outlined animate-spin">progress_activity</span>
            Starting Verification...
          </>
        ) : (
          <>
            <span className="material-symbols-outlined">video_camera_front</span>
            Start Face Verification
          </>
        )}
      </button>

      {sessionToken && (
        <p className="text-xs text-on-surface-variant mt-4 text-center">
          Session: {sessionToken.substring(0, 8)}...
        </p>
      )}
    </div>
  )
}

export default FaceLivenessPage
