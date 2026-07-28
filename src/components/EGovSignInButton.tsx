const EGovSignInButton = () => {
  const handleSignIn = () => {
    const code = prompt('Enter eGovPH exchange code (from Postman or test portal):')
    if (code?.trim()) {
      window.location.href = `/egovph/sso?exchange_code=${code.trim()}`
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
