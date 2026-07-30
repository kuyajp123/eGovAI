const ActivityPage = () => {
  return (
    <>
      <main className="pt-20 px-margin-mobile max-w-5xl mx-auto space-y-lg">
{/* Large Current Status Card */}
<section className="mt-4">
<div className="relative overflow-hidden bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-lg shadow-sm">
<div className="absolute top-0 right-0 p-sm">
<div className="flex items-center gap-xs bg-primary-container/10 px-3 py-1 rounded-full border border-primary/20">
<span className="material-symbols-outlined text-sm text-primary" data-icon="verified_user" style={{fontVariationSettings: "'FILL' 1",}}>verified_user</span>
<span className="text-label-sm font-label-sm text-primary uppercase tracking-wider">Secure</span>
</div>
</div>
<div className="space-y-sm">
<p className="text-label-lg font-label-lg text-on-surface-variant">Application ID: #GA-29401</p>
<h2 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">Small Business Grant</h2>
<div className="flex items-baseline gap-sm pt-2">
<span className="text-display-lg font-display-lg text-primary">Processing</span>
<div className="flex gap-1 items-center mb-1">
<div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
<div className="w-2 h-2 rounded-full bg-primary animate-pulse delay-75"></div>
<div className="w-2 h-2 rounded-full bg-primary animate-pulse delay-150"></div>
</div>
</div>
<p className="text-body-md font-body-md text-on-surface-variant max-w-md">Your application is currently being verified by the State Commerce Agency. Expected completion within 3-5 business days.</p>
</div>
</div>
</section>
{/* Bento Layout: Timeline & Notifications */}
<div className="grid grid-cols-1 md:grid-cols-3 gap-lg">
{/* Timeline UI (Bento Large Item) */}
<section className="md:col-span-2 bg-surface-container-lowest rounded-xl p-lg shadow-sm border border-outline-variant/20">
<div className="flex items-center justify-between mb-lg">
<h3 className="font-title-lg text-title-lg text-on-surface">Tracking History</h3>
<button className="text-primary font-label-lg hover:underline flex items-center gap-xs">
<span className="material-symbols-outlined text-sm" data-icon="download">download</span>
                        Export PDF
                    </button>
</div>
{/* Vertical Timeline */}
<div className="relative pl-10 space-y-xl">
{/* Connector Line */}
<div className="absolute left-4 top-2 bottom-2 w-[2px] timeline-gradient"></div>
{/* Step 1: Completed */}
<div className="relative">
<div className="absolute -left-10 w-8 h-8 flex items-center justify-center bg-primary text-on-primary rounded-full z-10">
<span className="material-symbols-outlined text-[18px]" data-icon="check">check</span>
</div>
<div className="space-y-xs">
<h4 className="font-label-lg text-label-lg text-on-surface">Submitted</h4>
<p className="text-label-sm font-label-sm text-on-surface-variant">Jan 10, 2024 • 09:42 AM</p>
<p className="text-body-md font-body-md text-on-surface-variant italic">Documents received and archived in the central registry.</p>
</div>
</div>
{/* Step 2: Completed */}
<div className="relative">
<div className="absolute -left-10 w-8 h-8 flex items-center justify-center bg-primary text-on-primary rounded-full z-10">
<span className="material-symbols-outlined text-[18px]" data-icon="check">check</span>
</div>
<div className="space-y-xs">
<h4 className="font-label-lg text-label-lg text-on-surface">Under Review</h4>
<p className="text-label-sm font-label-sm text-on-surface-variant">Jan 11, 2024 • 02:15 PM</p>
<p className="text-body-md font-body-md text-on-surface-variant italic">Automated compliance check completed with no errors found.</p>
</div>
</div>
{/* Step 3: Current */}
<div className="relative">
<div className="absolute -left-10 w-8 h-8 flex items-center justify-center bg-surface-container-lowest border-4 border-primary rounded-full z-10">
<div className="w-2 h-2 bg-primary rounded-full animate-ping"></div>
</div>
<div className="space-y-xs bg-primary-container/10 p-md rounded-xl border border-primary/10">
<div className="flex items-center gap-sm">
<h4 className="font-label-lg text-label-lg text-primary">Current: Agency Verification</h4>
<span className="bg-primary text-on-primary px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-tighter">Active</span>
</div>
<p className="text-label-sm font-label-sm text-on-surface-variant">Jan 12, 2024 • Pending</p>
<p className="text-body-md font-body-md text-on-surface">Officer Sarah Jenkins is verifying local business credentials. This is the final step before decisioning.</p>
</div>
</div>
{/* Step 4: Upcoming */}
<div className="relative opacity-40">
<div className="absolute -left-10 w-8 h-8 flex items-center justify-center bg-outline-variant text-on-surface-variant rounded-full z-10">
<span className="material-symbols-outlined text-[18px]" data-icon="hourglass_empty">hourglass_empty</span>
</div>
<div className="space-y-xs">
<h4 className="font-label-lg text-label-lg text-on-surface">Upcoming: Approval</h4>
<p className="text-label-sm font-label-sm text-on-surface-variant">Estimated: Jan 15-18</p>
</div>
</div>
</div>
</section>
{/* Notification Settings (Bento Small Item) */}
<aside className="space-y-lg">
<div className="bg-surface-container-lowest rounded-xl p-lg shadow-sm border border-outline-variant/20 h-full">
<div className="flex items-center gap-sm mb-lg">
<span className="material-symbols-outlined text-primary" data-icon="notifications_active">notifications_active</span>
<h3 className="font-title-lg text-title-lg text-on-surface">Updates</h3>
</div>
<p className="text-body-md font-body-md text-on-surface-variant mb-md">How would you like to be notified about status changes?</p>
<div className="space-y-md">
{/* Push Toggle */}
<div className="flex items-center justify-between p-sm hover:bg-surface-container-low rounded-lg transition-colors cursor-pointer group">
<div className="flex items-center gap-md">
<span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary transition-colors" data-icon="smartphone">smartphone</span>
<div>
<p className="font-label-lg text-label-lg text-on-surface">Push Notifications</p>
<p className="text-label-sm font-label-sm text-on-surface-variant">Real-time alerts</p>
</div>
</div>
<label className="relative inline-flex items-center cursor-pointer">
<input defaultChecked className="sr-only peer" type="checkbox"/>
<div className="w-11 h-6 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
</label>
</div>
{/* Email Toggle */}
<div className="flex items-center justify-between p-sm hover:bg-surface-container-low rounded-lg transition-colors cursor-pointer group">
<div className="flex items-center gap-md">
<span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary transition-colors" data-icon="mail">mail</span>
<div>
<p className="font-label-lg text-label-lg text-on-surface">Email Updates</p>
<p className="text-label-sm font-label-sm text-on-surface-variant">Weekly summaries</p>
</div>
</div>
<label className="relative inline-flex items-center cursor-pointer">
<input className="sr-only peer" type="checkbox"/>
<div className="w-11 h-6 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
</label>
</div>
{/* SMS Toggle */}
<div className="flex items-center justify-between p-sm hover:bg-surface-container-low rounded-lg transition-colors cursor-pointer group">
<div className="flex items-center gap-md">
<span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary transition-colors" data-icon="sms">sms</span>
<div>
<p className="font-label-lg text-label-lg text-on-surface">SMS Alerts</p>
<p className="text-label-sm font-label-sm text-on-surface-variant">Critical changes only</p>
</div>
</div>
<label className="relative inline-flex items-center cursor-pointer">
<input defaultChecked className="sr-only peer" type="checkbox"/>
<div className="w-11 h-6 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
</label>
</div>
</div>
<div className="mt-xl p-md bg-secondary-container/20 rounded-xl border border-secondary/10">
<h4 className="font-label-lg text-label-lg text-on-secondary-container flex items-center gap-xs">
<span className="material-symbols-outlined text-sm" data-icon="info">info</span>
                            AI Tip
                        </h4>
<p className="text-label-sm font-label-sm text-on-secondary-container mt-xs leading-relaxed">
                            Users with Push enabled receive decisions 1.4 days faster on average.
                        </p>
</div>
</div>
</aside>
</div>
{/* AI Assistance Action */}
<section className="flex flex-col items-center justify-center py-lg bg-surface-container-low rounded-xl border-2 border-dashed border-primary/20">
<h3 className="font-title-lg text-title-lg text-on-surface text-center px-md">Need to add more documents?</h3>
<p className="text-body-md font-body-md text-on-surface-variant mb-md">Our AI can help you prepare missing paperwork.</p>
<button className="bg-gradient-to-r from-primary to-secondary text-on-primary px-xl py-3 rounded-full font-label-lg shadow-lg hover:shadow-xl transition-all active:scale-95 flex items-center gap-md">
<span className="material-symbols-outlined" data-icon="auto_awesome">auto_awesome</span>
                Ask eBuddy
            </button>
</section>
</main>
    </>
  )
}

export default ActivityPage;
