import { EGOV_CONFIG, getFullSsoCallbackUrl } from '../config/egov.config'

const EGovSignInButton = () => {
  const handleSignIn = () => {
    // Redirect to eGovPH SSO with callback URL
    const callbackUrl = encodeURIComponent(getFullSsoCallbackUrl())
    const ssoUrl = `${EGOV_CONFIG.egovSsoUrl}/authorize?callback=${callbackUrl}`
    
    // Redirect to eGovPH SSO
    window.location.href = ssoUrl
  }

  return (
    <button
      onClick={handleSignIn}
      className="w-full h-touch-target bg-primary text-white font-bold rounded-full shadow-lg active:scale-95 transition-all flex items-center justify-center gap-3"
    >
      <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
        account_circle
      </span>
      Sign in with eGovPH
    </button>
  )
}

export default EGovSignInButton
