import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import EGovSignInButton from '../components/EGovSignInButton'
import { useEffect } from 'react'

const WelcomePage = () => {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()

  useEffect(() => {
    // Auto-redirect authenticated users
    if (isAuthenticated) {
      navigate('/home', { replace: true })
    }
  }, [isAuthenticated, navigate])

  return (
    <div className="pt-24 pb-12 px-margin-mobile flex flex-col items-center max-w-screen-xl mx-auto">
      <section className="w-full flex flex-col md:flex-row items-center justify-between gap-12 mb-16">
        <div className="flex-1 space-y-6 text-center md:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-surface-container-low rounded-full border border-outline-variant/30">
            <span className="material-symbols-outlined text-tertiary text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              verified_user
            </span>
            <span className="font-label-sm text-label-sm text-tertiary">Official Citizen Portal</span>
          </div>
          <h2 className="text-[40px] font-bold text-on-surface leading-tight">Your Government Assistant</h2>
          <p className="text-lg text-on-surface-variant max-w-xl mx-auto md:mx-0">
            Find, prepare, pay, submit, and track government services in one place. frictionless bridge between citizens and administration.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start pt-4 max-w-md">
            <div className="flex-1">
              <EGovSignInButton />
            </div>
          </div>
          <p className="text-sm text-on-surface-variant mt-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-tertiary text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              shield
            </span>
            Secure authentication via eGovPH Single Sign-On
          </p>
        </div>
        <div className="flex-1 w-full relative">
          <img 
            className="w-full aspect-[4/3] rounded-xl object-cover shadow-2xl" 
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBzIrQS3nUJCbmoAhCm8544q5MrfkNF3f50aR384Phw9BbO4YYUu-zDaqKA3BhNZ03kdsr-PYgrdZNIjb4EfF0LYzHTdj5wZBNFSOyW-JyYbGUmVLlREoEwpGjoKrbwwgru7BDup_ngBatb_n-ePvz7ied6vpKsp3Z3x5eg-m1JcLREFY2zdYRhcPpAfuj2LO1EUduzxsU81i51_u7lwbvV0KaKWxUWLpOQhl6h5yud-uGm7yJ3qHayMAg0zx5QXzp-14rVBSsh5B4" 
            alt="Government services illustration"
          />
        </div>
      </section>
    </div>
  )
}

export default WelcomePage
