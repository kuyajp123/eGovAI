const NotificationsPage = () => {
  return (
    <>
      <main className="max-w-2xl mx-auto px-margin-mobile pt-lg space-y-lg">
{/* Header Section */}
<section className="flex justify-between items-end">
<div>
<h2 className="font-headline-lg text-headline-lg text-on-surface">Notifications</h2>
<p className="font-body-md text-body-md text-on-surface-variant">Stay updated with your government services.</p>
</div>
<button className="font-label-lg text-label-lg text-primary hover:underline px-sm py-xs">
                Mark all as read
            </button>
</section>
{/* Group: Today */}
<section className="space-y-sm">
<h3 className="font-title-lg text-title-lg text-on-surface-variant px-xs">Today</h3>
<div className="space-y-sm">
{/* AI Reminder */}
<div className="bg-surface-container-lowest rounded-xl shadow-sm ai-accent-border p-md flex gap-md notification-card transition-colors cursor-pointer group">
<div className="w-12 h-12 rounded-full bg-secondary-container flex items-center justify-center flex-shrink-0">
<span className="material-symbols-outlined text-on-secondary-container" data-icon="smart_toy">smart_toy</span>
</div>
<div className="flex-grow">
<div className="flex justify-between items-start">
<h4 className="font-label-lg text-label-lg text-on-surface">AI Reminder: Complete your permit renewal</h4>
<span className="font-label-sm text-label-sm text-on-surface-variant">2h ago</span>
</div>
<p className="font-body-md text-body-md text-on-surface-variant mt-xs">Your residential parking permit expires in 5 days. I've prepared the application for you.</p>
<div className="mt-md flex gap-sm">
<button className="bg-primary text-on-primary px-lg py-xs rounded-full font-label-lg text-label-lg active-scale">Renew Now</button>
<button className="outline outline-2 outline-secondary text-secondary px-lg py-xs rounded-full font-label-lg text-label-lg active-scale">Details</button>
</div>
</div>
<div className="w-2 h-2 rounded-full bg-primary self-center"></div>
</div>
{/* Payment Received */}
<div className="bg-surface-container-lowest rounded-xl shadow-sm p-md flex gap-md notification-card transition-colors cursor-pointer security-lock-stroke">
<div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center flex-shrink-0">
<span className="material-symbols-outlined text-primary" data-icon="payments">payments</span>
</div>
<div className="flex-grow">
<div className="flex justify-between items-start">
<div className="flex items-center gap-xs">
<h4 className="font-label-lg text-label-lg text-on-surface">Payment Received</h4>
<div className="bg-surface-container-high px-2 py-0.5 rounded flex items-center gap-1">
<span className="material-symbols-outlined text-[14px]" data-icon="verified" style={{fontVariationSettings: "'FILL' 1",}}>verified</span>
<span className="text-[10px] uppercase font-bold tracking-wider">Secure</span>
</div>
</div>
<span className="font-label-sm text-label-sm text-on-surface-variant">5h ago</span>
</div>
<p className="font-body-md text-body-md text-on-surface-variant mt-xs">Your payment of $142.50 for Property Tax Q3 has been processed successfully.</p>
</div>
<div className="w-2 h-2 rounded-full bg-primary self-center"></div>
</div>
</div>
</section>
{/* Group: Earlier */}
<section className="space-y-sm">
<h3 className="font-title-lg text-title-lg text-on-surface-variant px-xs">Earlier</h3>
<div className="space-y-sm">
{/* Additional Documents */}
<div className="bg-surface-container-lowest rounded-xl shadow-sm p-md flex gap-md notification-card transition-colors cursor-pointer">
<div className="w-12 h-12 rounded-full bg-error-container flex items-center justify-center flex-shrink-0">
<span className="material-symbols-outlined text-on-error-container" data-icon="pending_actions">pending_actions</span>
</div>
<div className="flex-grow">
<div className="flex justify-between items-start">
<h4 className="font-label-lg text-label-lg text-on-surface">Additional documents requested</h4>
<span className="font-label-sm text-label-sm text-on-surface-variant">Yesterday</span>
</div>
<p className="font-body-md text-body-md text-on-surface-variant mt-xs">The Department of Revenue requires a copy of your 2023 W2 to proceed with your refund.</p>
</div>
</div>
{/* Application Updated */}
<div className="bg-surface-container-lowest rounded-xl shadow-sm p-md flex gap-md notification-card transition-colors cursor-pointer">
<div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center flex-shrink-0">
<span className="material-symbols-outlined text-on-surface-variant" data-icon="description">description</span>
</div>
<div className="flex-grow">
<div className="flex justify-between items-start">
<h4 className="font-label-lg text-label-lg text-on-surface">Application Updated</h4>
<span className="font-label-sm text-label-sm text-on-surface-variant">Oct 24</span>
</div>
<p className="font-body-md text-body-md text-on-surface-variant mt-xs">Your "Small Business Grant" application status has changed to "Under Review".</p>
</div>
</div>
{/* Informational / Earlier */}
<div className="bg-surface-container-lowest rounded-xl shadow-sm p-md flex gap-md notification-card transition-colors cursor-pointer">
<div className="w-12 h-12 rounded-full bg-tertiary-container/10 flex items-center justify-center flex-shrink-0">
<span className="material-symbols-outlined text-tertiary" data-icon="info">info</span>
</div>
<div className="flex-grow">
<div className="flex justify-between items-start">
<h4 className="font-label-lg text-label-lg text-on-surface">System Maintenance</h4>
<span className="font-label-sm text-label-sm text-on-surface-variant">Oct 22</span>
</div>
<p className="font-body-md text-body-md text-on-surface-variant mt-xs">Portals will be briefly unavailable this Sunday from 2 AM to 4 AM for scheduled security updates.</p>
</div>
</div>
</div>
</section>
{/* Empty State Illustration (Subtle) */}
<div className="pt-xl pb-lg flex flex-col items-center opacity-40 grayscale">
<span className="material-symbols-outlined text-[64px]" data-icon="archive">archive</span>
<p className="font-label-lg text-label-lg mt-sm">No older notifications</p>
</div>
</main>
    </>
  )
}

export default NotificationsPage;
