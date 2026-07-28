import { EGOV_CONFIG } from '../config/egov.config'
import { useNavigate } from 'react-router-dom'

const EGovSignInButton = () => {
  const navigate = useNavigate()

  const handleSignIn = () => {
    // For hackathon, redirect to test SSO page in dev mode
    // In production, you would need to register your domain with eGovPH
    if (import.meta.env.DEV) {
      navigate('/test-sso')
    } else {
      // For production, show instructions
      alert('Please use the Test SSO page to generate an exchange code, or contact eGovPH to register your production domain.')
      navigate('/test-sso')
    }
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
