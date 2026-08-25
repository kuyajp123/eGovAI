import { useEffect, useState, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { authenticateWithEGovExchangeCode, EGovAuthenticationError } from '../services/eGovAuthService'

const SSOCallbackPage = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { login } = useAuth()
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [stepText, setStepText] = useState<string>('Redeeming eGovPH exchange code...')
  const processedRef = useRef(false)

  useEffect(() => {
    if (processedRef.current) return
    processedRef.current = true
    handleSSOCallback()
  }, [])

  const handleSSOCallback = async () => {
    const exchangeCode = searchParams.get('exchange_code')

    if (!exchangeCode) {
      setStatus('error')
      setErrorMessage(
        'Missing exchange_code in URL. Please access this page from the eGovPH app or via an authorized SSO redirect.'
      )
      return
    }

    try {
      setStatus('processing')
      setStepText('Connecting to eGovPH SSO Gateway...')

      const user = await authenticateWithEGovExchangeCode(exchangeCode)

      setStepText('Welcome! Synchronizing citizen profile...')
      setStatus('success')

      login(user)

      // Short delay for smooth transition
      setTimeout(() => {
        navigate('/home', { replace: true })
      }, 700)
    } catch (error) {
      console.error('eGov SSO callback error:', error)
      setStatus('error')
      if (error instanceof EGovAuthenticationError) {
        setErrorMessage(error.message)
      } else if (error instanceof Error) {
        setErrorMessage(error.message)
      } else {
        setErrorMessage('Failed to authenticate with eGovPH SSO.')
      }
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8 bg-gradient-to-br from-primary/5 via-surface to-secondary/5">
      <div className="max-w-md w-full bg-surface-container-lowest rounded-3xl shadow-xl border border-outline-variant/30 p-8 text-center animate-fadeIn">
        {status === 'processing' && (
          <div className="space-y-6">
            <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-primary/10 animate-ping opacity-75"></div>
              <div className="relative w-16 h-16 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20 text-white">
                <span className="material-symbols-outlined text-3xl animate-spin">
                  progress_activity
                </span>
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-on-surface">eGovPH Single Sign-On</h2>
              <p className="text-sm text-on-surface-variant mt-2">{stepText}</p>
            </div>
            <div className="w-full bg-surface-container-high rounded-full h-1.5 overflow-hidden">
              <div className="bg-primary h-full rounded-full w-2/3 animate-pulse"></div>
            </div>
            <p className="text-[11px] text-on-surface-variant/80">
              Government-grade encryption • PhilSys Verified Identity
            </p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-6">
            <div className="w-20 h-20 bg-tertiary-container rounded-2xl flex items-center justify-center mx-auto text-on-tertiary-container shadow-lg">
              <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                check_circle
              </span>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-on-surface">Citizen Authenticated</h2>
              <p className="text-sm text-on-surface-variant mt-2">Redirecting to your dashboard...</p>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-6">
            <div className="w-20 h-20 bg-error-container rounded-2xl flex items-center justify-center mx-auto text-on-error-container shadow-md">
              <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                error
              </span>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-on-surface">Authentication Failed</h2>
              <p className="text-sm text-on-surface-variant mt-2 leading-relaxed">{errorMessage}</p>
            </div>
            <div className="flex flex-col gap-3 pt-2">
              <button
                onClick={() => {
                  processedRef.current = false
                  handleSSOCallback()
                }}
                className="w-full h-12 bg-primary text-white font-bold rounded-full shadow-md active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-lg">refresh</span>
                Try Again
              </button>
              <button
                onClick={() => navigate('/', { replace: true })}
                className="w-full h-12 border border-outline-variant text-on-surface font-semibold rounded-full hover:bg-surface-container active:scale-95 transition-all"
              >
                Return to Login
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default SSOCallbackPage
