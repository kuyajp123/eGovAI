const FaceLivenessPage = () => {
  return (
    <>
      <main className="relative flex flex-col items-center justify-start h-[calc(100vh-44px)] px-margin-mobile">
{/* Progress Indicator */}
<div className="w-full max-w-md mt-sm mb-lg">
<div className="flex justify-between items-center mb-xs px-1">
<span className="font-label-sm text-label-sm text-on-surface-variant">Step 2 of 6</span>
<span className="font-label-sm text-label-sm text-primary font-bold">Biometric Scan</span>
</div>
<div className="h-1.5 w-full bg-surface-variant rounded-full overflow-hidden">
<div className="h-full bg-primary loading-bar-fill" style={{width: "33.33%",}}></div>
</div>
</div>
{/* Camera Viewport Container */}
<div className="relative w-full max-w-sm aspect-[3/4] rounded-[32px] overflow-hidden shadow-md bg-inverse-surface">
{/* Simulated Camera Feed */}
<div className="absolute inset-0 w-full h-full bg-cover bg-center" data-alt="A high-resolution, slightly out-of-focus close-up portrait of a diverse person with neutral lighting, positioned front-on to the camera. The background is a clean, minimalist interior of a modern government office with soft blue and white tones. The aesthetic is professional, clear, and secure, resembling a high-quality smartphone front camera view used for facial recognition." style={{backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuDYksQX3NZr3ik4Z-0RV7vXcE_P8ZDDXDvv0llvgnsUoOOKBfWkemVuH9d-ridN9cKwsx0dohj8ykmQB1xW-NqicAuc6fYcgKGwmKQ4lFYmKNNZuEaeUCyEHaK-WVPiwTHcFixWS0ZXbmorus0tHZphw9-ZzlyNyckELfBpT4nHaB3-1yNNRxNhcpyeQYrdj3fTge-epIgJhxKpQpV7zg2jH7LoVZOJDHgFQN4-bD6tTnO3V4-GZ3O6RnkM6xoWc_4BiQKS02qi6Uk')",}}>
</div>
{/* Dark Overlay with Circular Cutout */}
<div className="absolute inset-0 bg-black/40 scan-mask pointer-events-none"></div>
{/* Scanning Shader Overlay */}
<div className="absolute inset-0 pointer-events-none">

</div>
{/* UI Overlay: Scanning Ring & Frame */}
<div className="absolute inset-0 flex items-center justify-center pointer-events-none">
<div className="w-[280px] h-[280px] rounded-full border-4 border-primary/40 scanning-pulse relative">
{/* Corner Indicators */}
<div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-primary rounded-tl-lg"></div>
<div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-primary rounded-tr-lg"></div>
<div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-primary rounded-bl-lg"></div>
<div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-primary rounded-br-lg"></div>
</div>
</div>
{/* Real-time Status Badge */}
<div className="absolute bottom-md left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-md px-lg py-sm rounded-full shadow-lg flex items-center gap-sm">
<span className="relative flex h-3 w-3">
<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
<span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
</span>
<span className="font-label-lg text-label-lg text-on-surface tracking-wide" id="status-text">Position your face within the circle</span>
</div>
</div>
{/* Guidance Section */}
<div className="mt-xl text-center space-y-sm max-w-xs">
<p className="font-body-lg text-body-lg text-on-surface-variant">
                Keep your head still for <span className="font-bold text-primary">3 seconds</span>.
            </p>
<p className="font-label-sm text-label-sm text-outline px-lg">
                Ensure you are in a well-lit area and remove glasses or hats if possible.
            </p>
</div>
{/* Security Footer */}
<div className="mt-auto mb-xl flex flex-col items-center gap-md">
{/* Security Badge */}
<div className="flex items-center gap-xs bg-surface-container-high px-md py-xs rounded-full border border-primary/10">
<span className="material-symbols-outlined text-primary text-[18px]" style={{fontVariationSettings: "'FILL' 1",}}>verified_user</span>
<span className="font-label-sm text-label-sm text-on-surface-variant font-bold uppercase tracking-wider">Secure &amp; Encrypted</span>
</div>
{/* AI Action Button (Triggered after successful scan) */}
<button className="hidden opacity-0 translate-y-4 transition-all duration-500 flex items-center gap-sm bg-primary-container text-on-primary-container px-xl h-touch-target rounded-full font-label-lg text-label-lg shadow-lg active:scale-95" id="action-button">
<span className="material-symbols-outlined">check_circle</span>
                Complete Verification
            </button>
</div>
</main>
    </>
  )
}

export default FaceLivenessPage;
