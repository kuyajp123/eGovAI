import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import EGovSignInForm from '../components/EGovSignInForm'
import EBuddyMascot from '../components/EBuddyMascot'
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
    <div className="px-margin-mobile md:px-8 py-8 md:py-12 flex flex-col items-center max-w-screen-xl mx-auto w-full">
      <section className="w-full flex flex-col md:flex-row items-center justify-between gap-12 mb-16">
        <div className="flex-1 space-y-6 text-center md:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-surface-container-low rounded-full border border-outline-variant/30">
            <span className="material-symbols-outlined text-tertiary text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              verified_user
            </span>
            <span className="font-label-sm text-label-sm text-tertiary">Official Citizen Portal</span>
          </div>
          <h2 className="text-[40px] font-bold text-on-surface leading-tight">Meet eBuddy, Your Government Assistant</h2>
          <p className="text-lg text-on-surface-variant max-w-xl mx-auto md:mx-0">
            Find, prepare, pay, submit, and track government services in one place. Experience a frictionless bridge between citizens and administrative processes.
          </p>
          <div className="pt-4 max-w-md mx-auto md:mx-0">
            <EGovSignInForm />
          </div>
          <p className="text-sm text-on-surface-variant mt-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-tertiary text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              shield
            </span>
            Secured by official eGovPH Single Sign-On and PhilSys Biometrics.
          </p>
        </div>
        <div className="flex-1 w-full relative">
          <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden shadow-2xl bg-gradient-to-br from-blue-50 via-white to-amber-50">
            <EBuddyMascot
              className="w-full h-full p-6 md:p-8"
              alt="eBuddy, the eGovPH AI assistant mascot"
            />
            {/* Decorative Floating Element 2: Stats */}
            <div className="absolute bottom-6 left-6 glass-effect p-4 rounded-xl shadow-lg flex flex-col gap-1">
              <div className="flex gap-1">
                <div className="h-1 w-8 bg-primary rounded-full"></div>
                <div className="h-1 w-4 bg-primary/30 rounded-full"></div>
              </div>
              <p className="font-label-sm text-[12px] text-primary font-bold uppercase tracking-wider">Live Status</p>
              <p className="font-body-md text-[16px] text-on-surface">98% Faster Processing</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Bento Grid */}
      <section className="w-full grid grid-cols-1 md:grid-cols-12 gap-4">
        <div className="md:col-span-8 bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/20 shadow-sm flex flex-col justify-between bento-card">
          <div>
            <span className="material-symbols-outlined text-primary-container bg-primary-container/10 p-3 rounded-lg mb-4 inline-block">search_insights</span>
            <h3 className="text-[22px] font-bold text-on-surface">Unified Discovery</h3>
            <p className="text-[16px] text-on-surface-variant mt-2">Browse thousands of federal and local services from a single intuitive dashboard. No more jumping between departments.</p>
          </div>
          <div className="mt-8 flex flex-wrap gap-2">
            <span className="px-4 py-2 bg-surface-container-low rounded-full text-[12px] font-medium">Tax Filing</span>
            <span className="px-4 py-2 bg-surface-container-low rounded-full text-[12px] font-medium">Passport Renewal</span>
            <span className="px-4 py-2 bg-surface-container-low rounded-full text-[12px] font-medium">Social Benefits</span>
            <span className="px-4 py-2 bg-surface-container-low rounded-full text-[12px] font-medium">Business Licensing</span>
          </div>
        </div>
        <div className="md:col-span-4 bg-tertiary text-on-tertiary p-6 rounded-xl shadow-lg relative overflow-hidden bento-card">
          <div className="relative z-10">
            <span className="material-symbols-outlined text-tertiary-fixed bg-white/20 p-3 rounded-lg mb-4 inline-block">bolt</span>
            <h3 className="text-[22px] font-bold">AI-Powered Prep</h3>
            <p className="text-[16px] text-on-tertiary/80 mt-2">Let our AI scan your documents and prepare your forms in seconds with 100% accuracy.</p>
          </div>
          <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/5 rounded-full blur-3xl"></div>
        </div>
        <div className="md:col-span-4 bg-surface-container p-6 rounded-xl border border-outline-variant/20 flex flex-col items-center text-center bento-card">
          <span className="material-symbols-outlined text-on-surface-variant text-[48px] mb-4">payments</span>
          <h3 className="text-[22px] font-bold text-on-surface">Secure Payments</h3>
          <p className="text-[16px] text-on-surface-variant mt-2">Handle all fees, taxes, and fines via our government-grade secure payment gateway.</p>
        </div>
        <div className="md:col-span-8 bg-white p-6 rounded-xl border border-outline-variant/20 shadow-sm flex flex-col md:flex-row items-center gap-6 bento-card">
          <div className="flex-1 text-center md:text-left">
            <h3 className="text-[22px] font-bold text-on-surface">Track in Real-Time</h3>
            <p className="text-[16px] text-on-surface-variant mt-2">Receive push notifications and SMS updates as your applications move through the system.</p>
          </div>
          <div className="flex-shrink-0 w-full md:w-48 h-24 bg-surface-container-low rounded-lg p-4 flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <div className="w-16 h-2 bg-primary rounded-full"></div>
              <span className="text-[10px] font-bold text-primary">In Progress</span>
            </div>
            <div className="w-full h-1.5 bg-outline-variant rounded-full overflow-hidden">
              <div className="w-[65%] h-full bg-primary"></div>
            </div>
            <p className="text-[10px] text-on-surface-variant">Step 3 of 4: Document Verification</p>
          </div>
        </div>
      </section>

      {/* Trust Indicator Section */}
      <section className="w-full mt-16 pt-8 border-t border-outline-variant/30 flex flex-col md:flex-row justify-between items-center gap-8">
        <div className="flex flex-wrap justify-center md:justify-start items-center gap-6 opacity-60 grayscale hover:grayscale-0 transition-all cursor-default">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined">assured_workload</span>
            <span className="text-[14px] font-semibold">Federal Authority</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined">gpp_good</span>
            <span className="text-[14px] font-semibold">Data Protection</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined">diversity_3</span>
            <span className="text-[14px] font-semibold">Inclusive Design</span>
          </div>
        </div>
        <p className="text-[12px] font-medium text-on-surface-variant text-center md:text-right">© 2026 eBuddy. Official Government Agency Prototype.</p>
      </section>
    </div>
  )
}

export default WelcomePage
