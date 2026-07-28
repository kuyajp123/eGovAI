const SuccessPage = () => {
  return (
    <>
      <main className="flex-grow flex flex-col items-center justify-center px-margin-mobile py-xl mt-touch-target mb-24 overflow-x-hidden">
{/* Celebration Section */}
<div className="relative w-full max-w-lg mx-auto text-center">
{/* Background Decoration */}
<div className="absolute inset-0 -z-10 success-gradient opacity-20 blur-3xl rounded-full scale-150"></div>
{/* Illustration Area */}
<div className="relative mb-lg flex justify-center items-center h-64">
<div className="absolute celebration-sparkle" style={{top: "10%",left: "20%",animationDelay: "0.2s",}}>
<span className="material-symbols-outlined text-secondary-container text-4xl" data-icon="auto_awesome">auto_awesome</span>
</div>
<div className="absolute celebration-sparkle" style={{top: "20%",right: "15%",animationDelay: "0.8s",}}>
<span className="material-symbols-outlined text-primary-fixed text-2xl" data-icon="star">star</span>
</div>
<div className="absolute celebration-sparkle" style={{bottom: "15%",left: "10%",animationDelay: "0.5s",}}>
<span className="material-symbols-outlined text-tertiary-fixed text-3xl" data-icon="sparkles">arrow_back_ios_new</span>
</div>
{/* Main Success Icon Container */}
<div className="bg-surface-container-lowest rounded-full p-8 shadow-xl border-4 border-secondary-container">
<div className="bg-secondary text-on-secondary rounded-full w-24 h-24 flex items-center justify-center">
<span className="material-symbols-outlined text-6xl" data-icon="check_circle" style={{fontVariationSettings: "'FILL' 1",}}>check_circle</span>
</div>
</div>
</div>
{/* Headlines */}
<div className="space-y-sm mb-xl">
<h1 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">Application Submitted Successfully</h1>
<p className="font-body-lg text-body-lg text-on-surface-variant max-w-sm mx-auto">Your digital assistant has safely delivered your documents to the central registry.</p>
</div>
{/* Info Bento Cards */}
<div className="grid grid-cols-1 md:grid-cols-2 gap-md mb-xl">
{/* Reference Number Card */}
<div className="bg-surface-container-lowest border border-outline-variant p-lg rounded-xl shadow-sm text-left flex flex-col justify-between">
<div className="flex items-center gap-xs text-on-surface-variant mb-xs">
<span className="material-symbols-outlined text-sm" data-icon="tag">tag</span>
<span className="font-label-sm text-label-sm uppercase tracking-wider">Reference Number</span>
</div>
<p className="font-title-lg text-title-lg text-primary font-bold">BP-2024-X88</p>
<div className="mt-sm pt-sm border-t border-dashed border-outline-variant">
<span className="text-tertiary font-label-lg text-label-lg flex items-center gap-xs">
<span className="material-symbols-outlined text-sm" data-icon="verified" style={{fontVariationSettings: "'FILL' 1",}}>verified</span>
                            Verified Secure
                        </span>
</div>
</div>
{/* Processing Time Card */}
<div className="bg-surface-container-lowest border border-outline-variant p-lg rounded-xl shadow-sm text-left flex flex-col justify-between">
<div className="flex items-center gap-xs text-on-surface-variant mb-xs">
<span className="material-symbols-outlined text-sm" data-icon="schedule">schedule</span>
<span className="font-label-sm text-label-sm uppercase tracking-wider">Processing Time</span>
</div>
<p className="font-title-lg text-title-lg text-on-surface">3-5 Business Days</p>
<p className="font-label-sm text-label-sm text-on-surface-variant mt-sm italic">Expected by Oct 24, 2024</p>
</div>
</div>
{/* Action Buttons */}
<div className="flex flex-col gap-md w-full">
<button className="bg-primary text-on-primary font-label-lg text-label-lg py-4 rounded-full shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-sm">
                    Return Home
                </button>
<div className="flex gap-md">
<button className="flex-1 border-2 border-secondary text-secondary font-label-lg text-label-lg py-3 rounded-full hover:bg-secondary-container transition-colors flex items-center justify-center gap-xs">
<span className="material-symbols-outlined" data-icon="query_stats">query_stats</span>
                        Track Status
                    </button>
<button className="flex-1 border-2 border-secondary text-secondary font-label-lg text-label-lg py-3 rounded-full hover:bg-secondary-container transition-colors flex items-center justify-center gap-xs">
<span className="material-symbols-outlined" data-icon="download">download</span>
                        Download Receipt
                    </button>
</div>
</div>
{/* Footer Note */}
<div className="mt-xl flex items-center justify-center gap-sm text-on-surface-variant">
<span className="material-symbols-outlined text-xl" data-icon="mail">mail</span>
<span className="font-label-sm text-label-sm">A confirmation email has been sent to your inbox.</span>
</div>
</div>
{/* Secondary Decoration (Bento Style Suggestion) */}
<section className="w-full max-w-4xl mt-32">
<h2 className="font-title-lg text-title-lg mb-lg text-center">While you wait, you can:</h2>
<div className="grid grid-cols-1 md:grid-cols-3 gap-md">
<div className="p-lg bg-surface-container-low rounded-xl border border-outline-variant hover:shadow-md transition-shadow group cursor-pointer">
<span className="material-symbols-outlined text-primary mb-md" data-icon="shield">shield</span>
<h3 className="font-label-lg text-label-lg mb-xs">Review Identity Vault</h3>
<p className="font-label-sm text-label-sm text-on-surface-variant">Ensure your digital certificates are up to date for future filings.</p>
</div>
<div className="p-lg bg-surface-container-low rounded-xl border border-outline-variant hover:shadow-md transition-shadow group cursor-pointer">
<span className="material-symbols-outlined text-primary mb-md" data-icon="chat">chat</span>
<h3 className="font-label-lg text-label-lg mb-xs">Ask GovAI</h3>
<p className="font-label-sm text-label-sm text-on-surface-variant">Have questions about the next steps? Our assistant is ready to help.</p>
</div>
<div className="p-lg bg-surface-container-low rounded-xl border border-outline-variant hover:shadow-md transition-shadow group cursor-pointer">
<span className="material-symbols-outlined text-primary mb-md" data-icon="account_balance_wallet">account_balance_wallet</span>
<h3 className="font-label-lg text-label-lg mb-xs">Setup Payments</h3>
<p className="font-label-sm text-label-sm text-on-surface-variant">Link your wallet for faster reimbursements or fee settlements.</p>
</div>
</div>
</section>
</main>
    </>
  )
}

export default SuccessPage;
