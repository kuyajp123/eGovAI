import { useNavigate } from "react-router-dom"


const IDRegistration = () => {
  const navigate = useNavigate();
  return (
    <>
      <main className="flex-grow pt-20 pb-24 px-margin-mobile max-w-2xl mx-auto w-full">
{/* Step Indicator */}
<div className="mb-8">
<div className="flex justify-between items-end mb-2">
<span className="font-label-lg text-primary uppercase tracking-wider">Identity Verification</span>
<span className="font-label-sm text-on-surface-variant">Step 2 of 6</span>
</div>
<div className="h-2 w-full bg-surface-container-highest rounded-full overflow-hidden flex gap-1">
<div className="h-full w-1/6 bg-tertiary rounded-full"></div>
<div className="h-full w-1/6 bg-primary rounded-full"></div>
<div className="h-full w-1/6 bg-surface-container rounded-full"></div>
<div className="h-full w-1/6 bg-surface-container rounded-full"></div>
<div className="h-full w-1/6 bg-surface-container rounded-full"></div>
<div className="h-full w-1/6 bg-surface-container rounded-full"></div>
</div>
</div>
{/* Header Section */}
<section className="mb-10 text-center">
<div className="inline-flex items-center gap-2 bg-secondary-container text-on-secondary-container px-3 py-1 rounded-full mb-4">
<span className="material-symbols-outlined text-[18px]" data-icon="verified_user" style={{fontVariationSettings: "'FILL' 1",}}>verified_user</span>
</div>
<h2 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface mb-2">Verify your identity</h2>
<p className="font-body-md text-on-surface-variant max-w-md mx-auto">Please choose a method to confirm your identity. This process is encrypted and never shared with third parties.</p>
</section>
{/* Verification Methods (Bento-lite) */}
<div className="grid grid-cols-1 gap-4 mb-10">
{/* National ID */}
<button className="verification-card flex items-center p-5 bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm text-left hover:border-primary group" onClick={() => navigate('/document-upload')}>
<div className="w-12 h-12 rounded-lg bg-surface-container flex items-center justify-center mr-4 group-hover:bg-primary-container group-hover:text-on-primary-container transition-colors">
<span className="material-symbols-outlined text-[28px]" data-icon="badge">badge</span>
</div>
<div className="flex-grow">
<h3 className="font-title-lg text-on-surface">National ID Verification</h3>
<p className="font-label-sm text-on-surface-variant">Scan or upload your official government ID card.</p>
</div>
<div className="ml-4 w-6 h-6 rounded-full border-2 border-outline-variant flex items-center justify-center check-indicator">
<div className="w-2.5 h-2.5 rounded-full bg-primary hidden"></div>
</div>
</button>
{/* Face Verification */}
<button className="verification-card flex items-center p-5 bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm text-left hover:border-primary group" onClick={() => navigate('/face-liveness')}>
<div className="w-12 h-12 rounded-lg bg-surface-container flex items-center justify-center mr-4 group-hover:bg-primary-container group-hover:text-on-primary-container transition-colors">
<span className="material-symbols-outlined text-[28px]" data-icon="face">face</span>
</div>
<div className="flex-grow">
<h3 className="font-title-lg text-on-surface">Face Verification (Biometric)</h3>
<p className="font-label-sm text-on-surface-variant">Use your camera for a quick 3D liveness check.</p>
</div>
<div className="ml-4 w-6 h-6 rounded-full border-2 border-outline-variant flex items-center justify-center check-indicator">
<div className="w-2.5 h-2.5 rounded-full bg-primary hidden"></div>
</div>
</button>
{/* Gov Account */}
<button className="verification-card flex items-center p-5 bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm text-left hover:border-primary group" onClick={() => navigate('/egovph/sso')}>
<div className="w-12 h-12 rounded-lg bg-surface-container flex items-center justify-center mr-4 group-hover:bg-primary-container group-hover:text-on-primary-container transition-colors">
<span className="material-symbols-outlined text-[28px]" data-icon="login">login</span>
</div>
<div className="flex-grow">
<h3 className="font-title-lg text-on-surface">Government Account Login</h3>
<p className="font-label-sm text-on-surface-variant">Sign in with your existing official digital identity.</p>
</div>
<div className="ml-4 w-6 h-6 rounded-full border-2 border-outline-variant flex items-center justify-center check-indicator">
<div className="w-2.5 h-2.5 rounded-full bg-primary hidden"></div>
</div>
</button>
</div>
{/* Call to Action */}
<div className="space-y-6">
<button className="w-full h-touch-target bg-primary text-on-primary rounded-full font-label-lg shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:grayscale" disabled id="verifyBtn">
                Verify Identity
                <span className="material-symbols-outlined" data-icon="arrow_forward">arrow_forward</span>
</button>
<div className="flex items-center justify-center gap-6 opacity-60">
<div className="flex items-center gap-1.5">
<span className="material-symbols-outlined text-[16px]" data-icon="history_edu">history_edu</span>
<span className="font-label-sm">Audit Trail Active</span>
</div>
<div className="flex items-center gap-1.5 border-l border-outline-variant pl-6">
<span className="material-symbols-outlined text-[16px]" data-icon="encrypted">encrypted</span>
<span className="font-label-sm">AES-256 Bit</span>
</div>
</div>
</div>
{/* Subtle AI/Trust Background Element */}
<div className="fixed bottom-24 right-6 pointer-events-none opacity-10">
<span className="material-symbols-outlined text-[120px]" data-icon="shield_with_heart" style={{fontVariationSettings: "'FILL' 1",}}>shield_with_heart</span>
</div>
</main>
    </>
  )
}

export default IDRegistration;
