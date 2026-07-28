import { useState } from 'react'
import {
  generateAccessToken,
  generateExchangeCode,
  buildTestCallbackUrl,
  testSSOFlow,
} from '../utils/egovTestHelper'

const TestSSOPage = () => {
  const [loading, setLoading] = useState(false)
  const [accessToken, setAccessToken] = useState('')
  const [exchangeCode, setExchangeCode] = useState('')
  const [callbackUrl, setCallbackUrl] = useState('')
  const [error, setError] = useState('')
  const [testAccountId, setTestAccountId] = useState('')

  const handleGenerateAccessToken = async () => {
    setLoading(true)
    setError('')
    try {
      const token = await generateAccessToken()
      setAccessToken(token.access_token)
      console.log('Access Token:', token)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate token')
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateExchangeCode = async () => {
    if (!accessToken) {
      setError('Please generate access token first')
      return
    }

    setLoading(true)
    setError('')
    try {
      const exchange = await generateExchangeCode(accessToken, testAccountId || undefined)
      setExchangeCode(exchange.exchange_code)
      const url = buildTestCallbackUrl(exchange.exchange_code)
      setCallbackUrl(url)
      console.log('Exchange Code:', exchange)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate code')
    } finally {
      setLoading(false)
    }
  }

  const handleCompleteFlow = async () => {
    setLoading(true)
    setError('')
    setAccessToken('')
    setExchangeCode('')
    setCallbackUrl('')

    try {
      await testSSOFlow(testAccountId || undefined)
      // The flow logs everything to console
      // Now generate for display
      const token = await generateAccessToken()
      setAccessToken(token.access_token)
      const exchange = await generateExchangeCode(token.access_token, testAccountId || undefined)
      setExchangeCode(exchange.exchange_code)
      const url = buildTestCallbackUrl(exchange.exchange_code)
      setCallbackUrl(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Test flow failed')
    } finally {
      setLoading(false)
    }
  }

  const handleTestAuthentication = () => {
    if (exchangeCode) {
      // Navigate directly to callback with exchange code
      window.location.href = `/egovph/sso?exchange_code=${exchangeCode}`
    }
  }

  const handleCopyUrl = () => {
    if (callbackUrl) {
      navigator.clipboard.writeText(callbackUrl)
      alert('Callback URL copied to clipboard!')
    }
  }

  const handleCopyExchangeCode = () => {
    if (exchangeCode) {
      navigator.clipboard.writeText(exchangeCode)
      alert('Exchange code copied to clipboard!')
    }
  }

  return (
    <div className="pt-24 px-margin-mobile max-w-4xl mx-auto pb-32">
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-tertiary-container rounded-full mb-4">
          <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
            bug_report
          </span>
          <span className="text-sm font-bold text-on-tertiary-container">Development Testing</span>
        </div>
        <h1 className="text-3xl font-bold text-on-surface mb-2">eGovPH SSO Test</h1>
        <p className="text-on-surface-variant">
          Generate test credentials and exchange codes for eGovPH SSO integration testing.
        </p>
      </div>

      {error && (
        <div className="bg-error-container border border-error p-4 rounded-xl mb-6 flex gap-3">
          <span className="material-symbols-outlined text-error">error</span>
          <div className="flex-1">
            <h4 className="font-bold text-on-error-container">Error</h4>
            <p className="text-sm text-on-error-container">{error}</p>
          </div>
        </div>
      )}

      {/* Test Account Input */}
      <div className="bg-white p-6 rounded-xl border border-outline-variant shadow-sm mb-6">
        <h3 className="font-bold text-lg mb-4">Test Account ID (Optional)</h3>
        <input
          type="text"
          value={testAccountId}
          onChange={(e) => setTestAccountId(e.target.value)}
          placeholder="default_test_account"
          className="w-full px-4 py-3 border border-outline-variant rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <p className="text-sm text-on-surface-variant mt-2">
          Leave empty to use default test account
        </p>
      </div>

      {/* Quick Test Button */}
      <div className="bg-primary-container p-6 rounded-xl shadow-lg mb-6">
        <h3 className="font-bold text-lg text-on-primary-container mb-3">Quick Test</h3>
        <p className="text-sm text-on-primary-container mb-4">
          Generate token and exchange code in one step
        </p>
        <button
          onClick={handleCompleteFlow}
          disabled={loading}
          className="w-full h-12 bg-primary text-white font-bold rounded-full active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Processing...' : 'Run Complete Test Flow'}
        </button>
      </div>

      {/* Step-by-Step Testing */}
      <div className="space-y-4">
        {/* Step 1: Access Token */}
        <div className="bg-white p-6 rounded-xl border border-outline-variant shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold">
              1
            </div>
            <h3 className="font-bold text-lg">Generate Access Token</h3>
          </div>
          <button
            onClick={handleGenerateAccessToken}
            disabled={loading}
            className="w-full h-12 bg-secondary text-white font-bold rounded-full active:scale-95 transition-all disabled:opacity-50 mb-4"
          >
            {loading ? 'Loading...' : 'Generate Access Token'}
          </button>
          {accessToken && (
            <div className="bg-surface-container p-3 rounded-lg">
              <p className="text-xs text-on-surface-variant uppercase font-bold mb-2">Access Token</p>
              <code className="text-xs break-all">{accessToken}</code>
            </div>
          )}
        </div>

        {/* Step 2: Exchange Code */}
        <div className="bg-white p-6 rounded-xl border border-outline-variant shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold">
              2
            </div>
            <h3 className="font-bold text-lg">Generate Exchange Code</h3>
          </div>
          <button
            onClick={handleGenerateExchangeCode}
            disabled={loading || !accessToken}
            className="w-full h-12 bg-secondary text-white font-bold rounded-full active:scale-95 transition-all disabled:opacity-50 mb-4"
          >
            {loading ? 'Loading...' : 'Generate Exchange Code'}
          </button>
          {exchangeCode && (
            <div className="bg-surface-container p-3 rounded-lg">
              <div className="flex justify-between items-start mb-2">
                <p className="text-xs text-on-surface-variant uppercase font-bold">Exchange Code</p>
                <button
                  onClick={handleCopyExchangeCode}
                  className="text-xs text-primary font-bold hover:underline"
                >
                  Copy
                </button>
              </div>
              <code className="text-xs break-all">{exchangeCode}</code>
            </div>
          )}
        </div>

        {/* Step 3: Test Authentication */}
        {callbackUrl && (
          <div className="bg-tertiary-container p-6 rounded-xl shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-tertiary text-white flex items-center justify-center font-bold">
                3
              </div>
              <h3 className="font-bold text-lg text-on-tertiary-container">Test Authentication</h3>
            </div>
            <div className="bg-white p-3 rounded-lg mb-4">
              <div className="flex justify-between items-start mb-2">
                <p className="text-xs text-on-surface-variant uppercase font-bold">Callback URL</p>
                <button
                  onClick={handleCopyUrl}
                  className="text-xs text-primary font-bold hover:underline"
                >
                  Copy
                </button>
              </div>
              <code className="text-xs break-all">{callbackUrl}</code>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleTestAuthentication}
                className="flex-1 h-12 bg-tertiary text-white font-bold rounded-full active:scale-95 transition-all"
              >
                Test Authentication
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="bg-surface-container-low p-6 rounded-xl mt-6 border border-outline-variant">
        <h4 className="font-bold mb-3 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">info</span>
          How to Test
        </h4>
        <ol className="list-decimal list-inside space-y-2 text-sm text-on-surface-variant">
          <li>Optional: Enter a test account ID or leave blank for default</li>
          <li>Click "Run Complete Test Flow" for automated testing</li>
          <li>Or use step-by-step approach: Generate token → Generate code → Test auth</li>
          <li>Check browser console for detailed logs</li>
          <li>Click "Test Authentication Flow" to simulate SSO callback</li>
        </ol>
      </div>
    </div>
  )
}

export default TestSSOPage
