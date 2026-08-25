import EBuddyMascot from '../components/EBuddyMascot'

const ReviewPage = () => {
  return (
    <>
      <main className="flex-grow pt-24 pb-32 px-margin-mobile max-w-2xl mx-auto w-full">
{/* AI Progress Header */}
<div className="mb-lg">
<div className="flex items-center gap-sm mb-xs">
<span className="material-symbols-outlined text-secondary" data-icon="verified_user" style={{fontVariationSettings: "'FILL' 1",}}>verified_user</span>
<p className="font-label-lg text-label-lg text-secondary">Step 9 of 9: Final Submission</p>
</div>
<h2 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">Review &amp; Consent</h2>
</div>
{/* Summary Card (Bento-style layout) */}
<section className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant overflow-hidden mb-lg">
<div className="p-lg bg-surface-container-low flex justify-between items-center">
<h3 className="font-title-lg text-title-lg text-on-surface">Application Summary</h3>
<div className="flex items-center gap-1 bg-white px-3 py-1 rounded-full shadow-sm security-lock-stroke">
<span className="material-symbols-outlined text-primary text-[18px]" data-icon="shield" style={{fontVariationSettings: "'FILL' 1",}}>shield</span>
<span className="font-label-sm text-label-sm text-primary uppercase">Secure</span>
</div>
</div>
<div className="p-lg grid grid-cols-1 md:grid-cols-2 gap-md">
{/* Field 1 */}
<div className="p-md rounded-lg bg-surface-bright border border-surface-variant">
<p className="font-label-sm text-label-sm text-on-surface-variant mb-xs">Applicant</p>
<p className="font-body-lg text-body-lg text-on-surface font-semibold">Sarah J. Miller</p>
</div>
{/* Field 2 */}
<div className="p-md rounded-lg bg-surface-bright border border-surface-variant">
<p className="font-label-sm text-label-sm text-on-surface-variant mb-xs">Business Name</p>
<p className="font-body-lg text-body-lg text-on-surface font-semibold">Eco-Dynamics Studio LLC</p>
</div>
{/* Field 3 */}
<div className="p-md rounded-lg bg-surface-bright border border-surface-variant flex items-center justify-between col-span-1 md:col-span-2">
<div>
<p className="font-label-sm text-label-sm text-on-surface-variant mb-xs">Documents Verified</p>
<p className="font-body-lg text-body-lg text-on-surface">4 of 4 Files Uploaded</p>
</div>
<span className="material-symbols-outlined text-tertiary" data-icon="check_circle">check_circle</span>
</div>
{/* Field 4 (Featured) */}
<div className="p-md rounded-lg bg-primary-container text-on-primary-container col-span-1 md:col-span-2 flex justify-between items-center">
<div>
<p className="font-label-sm text-label-sm opacity-80 mb-xs">Total Fee</p>
<p className="font-headline-lg-mobile text-headline-lg-mobile font-bold">$145.00</p>
</div>
<div className="text-right">
<p className="font-label-sm text-label-sm opacity-80">Payment Method</p>
<p className="font-body-md text-body-md">Saved Visa ending in 4242</p>
</div>
</div>
</div>
</section>
{/* AI Agent Reassurance Bubble */}
<div className="ai-accent-border bg-white p-lg rounded-xl shadow-md mb-lg flex gap-md items-start">
<div className="w-10 h-10 rounded-full bg-white border border-secondary/20 flex items-center justify-center shrink-0 overflow-hidden">
<EBuddyMascot alt="" className="w-full h-full p-0.5" />
</div>
<div>
<p className="font-body-md text-body-md text-on-surface leading-relaxed">
                    "I've double-checked your application against state requirements. Everything looks perfect. <span className="font-semibold">This assistant will submit on your behalf only after your final confirmation.</span>"
                </p>
<p className="mt-sm font-label-sm text-label-sm text-on-surface-variant">Ready for processing.</p>
</div>
</div>
{/* Consent Area */}
<div className="mb-xl">
<label className="flex items-start gap-md cursor-pointer group p-md rounded-lg hover:bg-surface-container transition-colors">
<div className="relative flex items-center mt-1">
<input className="peer h-6 w-6 rounded border-outline text-primary focus:ring-primary-container transition-all" id="consent" type="checkbox"/>
</div>
<span className="font-body-md text-body-md text-on-surface-variant leading-snug">
                    I authorize eBuddy to submit this application on my behalf.
                </span>
</label>
</div>
{/* Primary Action */}
<div className="space-y-lg">
<button className="w-full h-14 bg-primary text-white rounded-full font-title-lg text-title-lg flex items-center justify-center gap-sm shadow-lg hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 disabled:grayscale" disabled id="confirmBtn">
                Confirm &amp; Pay
                <span className="material-symbols-outlined" data-icon="arrow_forward">arrow_forward</span>
</button>
{/* Secure Transaction Icons */}
<div className="flex flex-wrap justify-center items-center gap-xl grayscale opacity-60">
<div className="flex items-center gap-xs">
<span className="material-symbols-outlined text-sm" data-icon="lock">lock</span>
<span className="font-label-sm text-label-sm uppercase tracking-wider">256-bit SSL</span>
</div>
<div className="flex items-center gap-xs">
<span className="material-symbols-outlined text-sm" data-icon="account_balance">account_balance</span>
<span className="font-label-sm text-label-sm uppercase tracking-wider">eGovPH Verified Network</span>
</div>
<div className="flex items-center gap-xs">
<span className="material-symbols-outlined text-sm" data-icon="encrypted">encrypted</span>
<span className="font-label-sm text-label-sm uppercase tracking-wider">PCI Compliant</span>
</div>
</div>
</div>
</main>
    </>
  )
}

export default ReviewPage;
