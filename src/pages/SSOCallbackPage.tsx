import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  exchangeCodeForUserData,
  findExistingUser,
  registerUser,
  bindUniqidToUser,
  updateLastLogin,
} from '../services/egovService'

const SSOCallbackPage = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { login } = useAuth()
  const [status, setStatus] = useState<'processing' | 'error'>('processing')
  const [errorMessage, setErrorMessage] = useState<string>('')

  useEffect(() => {
    handleSSOCallback()
  }, [])

  const handleSSOCallback = async () => {
    try {
      const exchangeCode = searchParams.get('exchange_code')

      if (!exchangeCode) {
        setStatus('error')
        setErrorMessage('Missing authentication code')
        return
      }

      // Step 1: Exchange code for user data
      setStatus('processing')
      const exchangeResponse = await exchangeCodeForUserData(exchangeCode)

      if (!exchangeResponse.success || !exchangeResponse.data) {
        setStatus('error')
        setErrorMessage('Failed to authenticate with eGovPH')
        return
      }

      const egovUser = exchangeResponse.data

      // Step 2: Check if user exists
      const existingUser = await findExistingUser(egovUser)

      let user
      if (existingUser) {
        // Existing user - bind uniqid if not already bound
        if (existingUser.uniqid !== egovUser.uniqid) {
          await bindUniqidToUser(existingUser.id, egovUser.uniqid)
        }
        user = { ...existingUser, ...egovUser }
      } else {
        // New user - register
        user = await registerUser(egovUser)
      }

      // Step 3: Update last login
      await updateLastLogin(user.id)

      // Step 4: Auto-login
      login(user)

      // Step 5: Redirect to home
      setTimeout(() => {
        navigate('/home', { replace: true })
      }, 1000)
    } catch (error) {
      console.error('SSO callback error:', error)
      setStatus('error')
      setErrorMessage('An unexpected error occurred during authentication')
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-margin-mobile bg-gradient-to-br from-primary/5 to-secondary/5">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        {status === 'processing' && (
          <>
            <div className="w-20 h-20 bg-primary-container rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="material-symbols-outlined text-5xl text-on-primary-container animate-spin">
                progress_activity
              </span>
            </div>
            <h2 className="text-2xl font-bold text-on-surface mb-3">
              Authenticating...
            </h2>
            <p className="text-on-surface-variant">
              Please wait while we securely verify your eGovPH credentials.
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-20 h-20 bg-error-container rounded-full flex items-center justify-center mx-auto mb-6">
              <span
                className="material-symbols-outlined text-5xl text-on-error-container"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                error
              </span>
            </div>
            <h2 className="text-2xl font-bold text-on-surface mb-3">
              Authentication Failed
            </h2>
            <p className="text-on-surface-variant mb-6">{errorMessage}</p>
            <button
              onClick={() => navigate('/', { replace: true })}
              className="bg-primary text-white h-12 px-8 rounded-full font-bold active:scale-95 transition-all"
            >
              Return to Home
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default SSOCallbackPage
