import EBuddyMascot from '../components/EBuddyMascot'

const BiometricPage = () => {
  return (
    <>
      <main className="flex-grow pt-24 pb-12 px-margin-mobile flex flex-col items-center max-w-lg mx-auto w-full">
{/* Identity Vault Icon Section */}
<div className="mb-8 flex flex-col items-center">
<div className="w-16 h-16 bg-primary-container text-on-primary-container rounded-2xl flex items-center justify-center mb-3 shadow-lg">
<span className="material-symbols-outlined text-4xl" data-icon="lock" style={{fontVariationSettings: "'FILL' 1",}}>lock</span>
</div>
<h2 className="font-title-lg text-title-lg text-center text-primary">Identity Vault</h2>
<p className="font-label-lg text-label-lg text-on-surface-variant text-center mt-1">Biometric Verification Required</p>
</div>
{/* Biometric Camera Section */}
<div className="relative w-full aspect-square max-w-[320px] mx-auto mb-10">
{/* Pulsing outer ring */}
<div className="absolute inset-0 rounded-full border-4 border-primary-fixed-dim pulse-border"></div>
{/* Camera Preview Container */}
<div className="absolute inset-2 rounded-full overflow-hidden bg-surface-container-highest border-4 border-white shadow-xl relative group">
{/* Placeholder for actual camera stream */}
<div className="w-full h-full bg-cover bg-center transition-transform duration-700 group-hover:scale-105" data-alt="A close-up, high-definition portrait of a diverse person's face framed by a soft, circular spotlight in a clinical, modern government office. The lighting is bright and professional with a slight blue tint reflecting the UI aesthetic. The background is a blurred high-tech interface with security nodes. The style is clean, corporate photography with high contrast and sharp focus on facial features." style={{backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuA_X2EKu057yF-AsJYFTUizfvPX3KJaLj1MVfDrw7OMcOgGdudYHxza2g1GS5_c6F-nvqzLWZu8molKfNzxnJ03sY1k3u3X4xAZktuUqr-gICVHfRQCDeg7f0NScd-2QxSXFcRhx_UhaLKiU0qUxRyUqfNNMiQriSK3fuUwgzJmlNyTsTc_o7L5g5arY6-hFK0Zf3GwslIJNMFSqknPG_9zsY6wS0M7RLJ5FG0Nnyn8YagjolP7FV_06rJmmQJlZ8hiVm9iBPScKMY')",}}>
</div>
{/* Face Silhouette Overlay */}
<div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
<span className="material-symbols-outlined text-[200px] text-white" data-icon="face">face</span>
</div>
{/* Scanning Line Effect */}
<div className="scan-line"></div>
{/* Scanning Progress Ring (Visual Only) */}
<svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none" viewBox="0 0 100 100">
<circle className="opacity-80" cx="50" cy="50" fill="none" r="48" stroke="#16B6A6" strokeDasharray="301.59" strokeDashoffset="150" strokeWidth="2">
<animate attributeName="stroke-dashoffset" dur="4s" from="301.59" repeatCount="indefinite" to="0"></animate>
</circle>
</svg>
</div>
{/* Corners / Framing Elements */}
<div className="absolute -top-2 -left-2 w-12 h-12 border-t-4 border-l-4 border-primary rounded-tl-3xl"></div>
<div className="absolute -top-2 -right-2 w-12 h-12 border-t-4 border-r-4 border-primary rounded-tr-3xl"></div>
<div className="absolute -bottom-2 -left-2 w-12 h-12 border-b-4 border-l-4 border-primary rounded-bl-3xl"></div>
<div className="absolute -bottom-2 -right-2 w-12 h-12 border-b-4 border-r-4 border-primary rounded-br-3xl"></div>
</div>
{/* Feedback Messages */}
<div className="text-center space-y-2 mb-12">
<div className="flex items-center justify-center gap-2 text-primary font-title-lg text-title-lg">
<span className="material-symbols-outlined animate-spin" data-icon="progress_activity">progress_activity</span>
<span id="status-text">Scanning...</span>
</div>
<p className="font-body-lg text-body-lg text-on-surface-variant max-w-[280px] mx-auto" id="instruction-text">
                Position your face within the circle
            </p>
</div>
{/* Security Badge */}
<div className="bg-surface-container-low border border-primary-fixed-dim rounded-full py-2 px-4 flex items-center gap-2 mb-8">
<span className="material-symbols-outlined text-secondary text-xl" data-icon="verified_user" style={{fontVariationSettings: "'FILL' 1",}}>verified_user</span>
<span className="font-label-lg text-label-lg text-on-surface-variant">Secure &amp; Encrypted</span>
</div>
{/* AI Interaction Component (Floating Style) */}
<div className="w-full bg-white rounded-xl p-4 shadow-sm border border-surface-variant flex items-center gap-4 transition-all hover:shadow-md">
<div className="w-10 h-10 rounded-full bg-white border border-primary/20 flex items-center justify-center shrink-0 overflow-hidden">
<EBuddyMascot alt="" className="w-full h-full p-0.5" />
</div>
<div className="flex-grow">
<p className="font-label-sm text-label-sm text-primary mb-0.5">eBuddy</p>
<p className="font-body-md text-body-md text-on-surface leading-tight">I'm verifying your identity against official records. Please hold still for 3 seconds.</p>
</div>
</div>
</main>
    </>
  )
}

export default BiometricPage;
