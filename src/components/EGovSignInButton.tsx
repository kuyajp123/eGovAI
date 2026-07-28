const EGovSignInButton = () => {
  const handleSignIn = () => {
    // Show instructions for production use
    alert('To test SSO: Use the eGovPH portal to generate an exchange code, then access the callback URL:\n\nhttps://e-gov-ai.vercel.app/egovph/sso?exchange_code=YOUR_CODE')
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
