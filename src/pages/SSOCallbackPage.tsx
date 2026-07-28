import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { User } from '../types/user'

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
        setErrorMessage('Missing exchange_code parameter')
        return
      }

      // Exchange code for SSO-scoped access token
      const tokenRes = await fetch('/egov-api/api/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exchange_code: exchangeCode,
          scope: 'SSO_AUTHENTICATION',
          partner_code: import.meta.env.VITE_EGOV_PARTNER_CODE,
          partner_secret: import.meta.env.VITE_EGOV_PARTNER_SECRET,
        }),
      })

      if (!tokenRes.ok) {
        const err = await tokenRes.json().catch(() => ({}))
        throw new Error(err.message || `Token exchange failed (${tokenRes.status})`)
      }

      const data = await tokenRes.json()
      console.log('SSO token response:', data)

      // Build user from response — map whatever fields eGov returns
      const user: User = {
        id: data.uniqid || data.user_id || data.id || exchangeCode,
        uniqid: data.uniqid || data.user_id || data.id || '',
        firstName: data.first_name || data.firstName || '',
        middleName: data.middle_name || data.middleName,
        lastName: data.last_name || data.lastName || '',
        suffix: data.suffix,
        birthdate: data.birthdate || data.birth_date || '',
        email: data.email || '',
        mobileNumber: data.mobile_number || data.mobileNumber || data.phone || '',
        address: {
          street: data.address?.street,
          barangay: data.address?.barangay,
          city: data.address?.city || '',
          province: data.address?.province || '',
          region: data.address?.region || '',
          zipCode: data.address?.zip_code || data.address?.zipCode,
        },
        registeredAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        profileLocked: true,
        ssoProvider: 'egovph',
      }

      login(user)
      navigate('/home', { replace: true })
    } catch (error) {
      console.error('SSO callback error:', error)
      setStatus('error')
      setErrorMessage(error instanceof Error ? error.message : 'Authentication failed')
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
