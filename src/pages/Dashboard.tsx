import { Link } from 'react-router-dom'
import EBuddyMascot from '../components/EBuddyMascot'

const Dashboard = () => {
  return (
    <>
      <div className="px-margin-mobile md:px-8 py-6 md:py-8 max-w-5xl mx-auto w-full">

{/* Quick Actions — Pay Taxes & Business Permit */}
<section className="mb-xl">
<h3 className="font-title-lg text-title-lg text-on-surface mb-md">Quick Services</h3>
<div className="grid grid-cols-2 md:grid-cols-6 gap-md">
  <Link to="/services" className="group p-md rounded-2xl bg-gradient-to-br from-primary to-secondary text-white flex flex-col items-center text-center gap-2 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all">
    <span className="material-symbols-outlined text-3xl" style={{fontVariationSettings:"'FILL' 1"}}>add_business</span>
    <span className="text-xs font-bold">Business Permit</span>
    <span className="text-[10px] opacity-80">Apply / Renew</span>
  </Link>
  <Link to="/services" className="group p-md rounded-2xl bg-gradient-to-br from-secondary to-tertiary text-white flex flex-col items-center text-center gap-2 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all">
    <span className="material-symbols-outlined text-3xl" style={{fontVariationSettings:"'FILL' 1"}}>payments</span>
    <span className="text-xs font-bold">Pay Taxes</span>
    <span className="text-[10px] opacity-80">Real Property / CTC</span>
  </Link>
  <Link to="/services/sss" className="group p-md rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex flex-col items-center text-center gap-2 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all">
    <span className="material-symbols-outlined text-3xl" style={{fontVariationSettings:"'FILL' 1"}}>shield_person</span>
    <span className="text-xs font-bold">SSS Services</span>
    <span className="text-[10px] opacity-80">Contributions & Loans</span>
  </Link>
  <Link to="/ereport" className="group p-md rounded-2xl bg-gradient-to-br from-error to-error-container text-white flex flex-col items-center text-center gap-2 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all">
    <span className="material-symbols-outlined text-3xl" style={{fontVariationSettings:"'FILL' 1"}}>campaign</span>
    <span className="text-xs font-bold">eReport</span>
    <span className="text-[10px] opacity-80">File a Report</span>
  </Link>
  <Link to="/donations" className="group p-md rounded-2xl bg-gradient-to-br from-fuchsia-700 to-purple-800 text-white flex flex-col items-center text-center gap-2 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all">
    <span className="material-symbols-outlined text-3xl" style={{fontVariationSettings:"'FILL' 1"}}>volunteer_activism</span>
    <span className="text-xs font-bold">Donations</span>
    <span className="text-[10px] opacity-80">Donate & Track</span>
  </Link>
  <Link to="/home" className="group p-md rounded-2xl bg-surface-container border border-outline-variant flex flex-col items-center text-center gap-2 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all">
    <EBuddyMascot alt="" className="w-10 h-10" />
    <span className="text-xs font-bold text-on-surface">eBuddy</span>
    <span className="text-[10px] text-on-surface-variant">Ask your AI guide</span>
  </Link>
</div>
</section>

<section className="mb-xl">
<div className="relative overflow-hidden rounded-xl bg-primary-container p-lg flex flex-col md:flex-row items-center gap-lg">
<div className="z-10 flex-1">
<h2 className="font-headline-lg-mobile text-headline-lg-mobile text-on-primary-container mb-xs">Track Your Status</h2>
<p className="font-body-md text-body-md text-on-primary-container opacity-90">Keep an eye on all your active government filings and identity documents in one secure place.</p>
</div>
<div className="hidden md:block w-32 h-32 opacity-20">
<span className="material-symbols-outlined text-[128px]" data-icon="pending_actions">pending_actions</span>
</div>
</div>
</section>
{/* Applications Header */}
<div className="flex items-center justify-between mb-md">
<h3 className="font-title-lg text-title-lg text-on-surface">My Applications</h3>
<button className="flex items-center gap-1 text-primary font-label-lg hover:underline">
                View History <span className="material-symbols-outlined text-sm" data-icon="arrow_forward">arrow_forward</span>
</button>
</div>
{/* Application Grid */}
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md">
{/* Card 1: Business Permit (Renewing) */}
<div className="glass-card rounded-xl p-md shadow-sm border-l-4 border-primary transition-all hover:shadow-md cursor-pointer group">
<div className="flex justify-between items-start mb-md">
<div className="bg-surface-container p-sm rounded-lg text-primary">
<span className="material-symbols-outlined" data-icon="store">store</span>
</div>
<span className="bg-primary-container text-on-primary-container text-xs px-2 py-1 rounded-full font-label-sm">Renewing</span>
</div>
<h4 className="font-title-lg text-body-lg text-on-surface mb-xs group-hover:text-primary transition-colors">Business Permit (Renewing)</h4>
<div className="flex items-center justify-between text-on-surface-variant font-label-sm mb-sm">
<span>Progress</span>
<span className="font-bold">75%</span>
</div>
<div className="w-full bg-surface-container-highest h-2 rounded-full mb-md overflow-hidden">
<div className="bg-primary h-full rounded-full w-3/4"></div>
</div>
<div className="flex items-center gap-2 text-on-surface-variant font-label-sm">
<span className="material-symbols-outlined text-[16px]" data-icon="update">update</span>
<span>Updated 2 hours ago</span>
</div>
</div>
{/* Card 2: Passport (Completed) */}
<div className="glass-card rounded-xl p-md shadow-sm border-l-4 border-tertiary transition-all hover:shadow-md cursor-pointer group">
<div className="flex justify-between items-start mb-md">
<div className="bg-tertiary-fixed-dim/20 p-sm rounded-lg text-tertiary">
<span className="material-symbols-outlined" data-icon="passport">downloading</span>
</div>
<span className="bg-tertiary-container text-on-tertiary-container text-xs px-2 py-1 rounded-full font-label-sm">Completed</span>
</div>
<h4 className="font-title-lg text-body-lg text-on-surface mb-xs group-hover:text-tertiary transition-colors">Passport (Completed)</h4>
<div className="flex items-center justify-between text-on-surface-variant font-label-sm mb-sm">
<span>Progress</span>
<span className="font-bold text-tertiary">100%</span>
</div>
<div className="w-full bg-surface-container-highest h-2 rounded-full mb-md overflow-hidden">
<div className="bg-tertiary h-full rounded-full w-full"></div>
</div>
<div className="flex items-center gap-2 text-on-surface-variant font-label-sm">
<span className="material-symbols-outlined text-[16px]" data-icon="check_circle">check_circle</span>
<span>Finalized Oct 24, 2023</span>
</div>
</div>
{/* Card 3: National ID (Active) */}
<div className="glass-card rounded-xl p-md shadow-sm border-l-4 border-secondary transition-all hover:shadow-md cursor-pointer group">
<div className="flex justify-between items-start mb-md">
<div className="bg-secondary-container p-sm rounded-lg text-on-secondary-container">
<span className="material-symbols-outlined" data-icon="badge">badge</span>
</div>
<div className="flex items-center gap-1 bg-secondary-container text-on-secondary-container text-xs px-2 py-1 rounded-full font-label-sm">
<span className="material-symbols-outlined text-[12px]" data-icon="verified" style={{fontVariationSettings: "'FILL' 1",}}>verified</span>
<span>Active</span>
</div>
</div>
<h4 className="font-title-lg text-body-lg text-on-surface mb-xs group-hover:text-secondary transition-colors">National ID (Active)</h4>
<p className="font-body-md text-label-sm text-on-surface-variant mb-md">Universal Identity Token #4920-XXX</p>
<div className="flex items-center justify-between text-on-surface-variant font-label-sm mb-md p-sm bg-surface-container-low rounded-lg">
<div className="flex items-center gap-2">
<span className="material-symbols-outlined text-[18px]" data-icon="calendar_today">calendar_today</span>
<span>Expires 2030</span>
</div>
</div>
<div className="flex items-center gap-2 text-on-surface-variant font-label-sm">
<span className="material-symbols-outlined text-[16px]" data-icon="history">history</span>
<span>Last login Nov 12, 2023</span>
</div>
</div>
</div>
{/* AI Assistant Placeholder (Bento Style) */}
<div className="mt-xl grid grid-cols-1 md:grid-cols-3 gap-md">
<div className="md:col-span-2 p-lg rounded-2xl bg-surface-container-lowest shadow-sm border border-outline-variant flex flex-col justify-center min-h-[160px]">
<div className="flex items-center gap-3 mb-sm">
<div className="bg-white border border-primary/20 w-10 h-10 rounded-full flex items-center justify-center shadow-lg overflow-hidden">
<EBuddyMascot alt="" className="w-full h-full p-0.5" />
</div>
<div>
<h5 className="font-label-lg text-on-surface">Need help? Ask eBuddy.</h5>
<p className="font-body-md text-label-sm text-on-surface-variant">Ask me about missing documents or processing times.</p>
</div>
</div>
<div className="flex items-center gap-2 mt-md">
<button className="bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant font-label-sm px-4 py-2 rounded-full border border-outline-variant">"What's next for my permit?"</button>
<button className="bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant font-label-sm px-4 py-2 rounded-full border border-outline-variant">"Missing ID requirements"</button>
</div>
</div>
<div className="bg-white rounded-2xl p-md shadow-sm border border-outline-variant relative overflow-hidden flex flex-col items-center justify-center group cursor-pointer">
<div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
<span className="material-symbols-outlined text-6xl" data-icon="add_circle">add_circle</span>
</div>
<div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center text-primary mb-2">
<span className="material-symbols-outlined text-3xl" data-icon="add">add</span>
</div>
<span className="font-label-lg text-primary text-center">New Application</span>
</div>
</div>
</div>
    </>
  )
}

export default Dashboard;
