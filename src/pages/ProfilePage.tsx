import { useNavigate } from "react-router-dom"
import { useAuth } from '../context/AuthContext'

const ProfilePage = () => {
  const navigate = useNavigate();
  return (
    <>
      <main className="px-margin-mobile pt-lg max-w-2xl mx-auto">
{/* Hero Profile Section */}
<section className="mb-xl flex flex-col items-center">
<div className="relative group">
<div className="w-32 h-32 rounded-full border-4 border-primary p-1 bg-surface-container-lowest shadow-lg overflow-hidden">
<img className="w-full h-full object-cover rounded-full" data-alt="A professional portrait of a senior citizen with a friendly smile, captured in soft natural lighting. The background is a clean, modern home office setting with subtle hints of blue and teal. The image maintains a high-key, trustworthy light-mode aesthetic with crisp details and high contrast for accessibility." src="https://lh3.googleusercontent.com/aida-public/AB6AXuBnesDaj1V5X3VcKWckAOaTdvsU9whhkWHsx_lp8oqK3S0KfYIQH6dWcuaxnc7-XWK8bPSxaFEQKInlgkhaxGCM47uQUvNyYw8c7DrR6I6If9Opuiz4UsTjcoOdcGX0hiGfA-EyAOGIpYShnUOiby2FSnJi99XfAhwKz3qG8IhxJlSizXF9tH0AL182XW_YFUFgaUbNtRbB5FsO1To5S4GjjNxncOwps5W15FNUfXqYgAb-FMiiBCtdzewpvnZLLnp5AEqaFpDQirU"/>
</div>
<button className="absolute bottom-0 right-0 bg-primary text-on-primary w-10 h-10 rounded-full border-2 border-white flex items-center justify-center shadow-md active-scale">
<span className="material-symbols-outlined text-[20px]" data-icon="edit">edit</span>
</button>
</div>
<div className="mt-lg text-center">
<h2 className="font-headline-lg text-headline-lg text-on-surface">Eleanor Vance</h2>
<div className="flex items-center justify-center gap-1 mt-1">
<span className="material-symbols-outlined text-tertiary text-[18px]" data-icon="verified" style={{fontVariationSettings: "'FILL' 1",}}>verified</span>
<p className="font-label-lg text-label-lg text-on-surface-variant">Verified Citizen Since 2018</p>
</div>
</div>
</section>
{/* Bento Grid Sections */}
<div className="grid grid-cols-1 md:grid-cols-2 gap-md">
{/* National ID Card */}
<button className="flex flex-col p-lg rounded-xl bg-surface-container-lowest shadow-sm border border-outline-variant text-left hover:bg-surface-container-low transition-colors active-scale">
<div className="w-12 h-12 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center mb-md">
<span className="material-symbols-outlined text-[28px]" data-icon="badge">badge</span>
</div>
<h3 className="font-title-lg text-title-lg mb-xs">National ID</h3>
<p className="font-body-md text-body-md text-on-surface-variant flex items-center gap-1">
<span className="text-tertiary font-bold">Linked</span> • **** 8291
                </p>
</button>
{/* Government Account */}
<button className="flex flex-col p-lg rounded-xl bg-surface-container-lowest shadow-sm border border-outline-variant text-left hover:bg-surface-container-low transition-colors active-scale">
<div className="w-12 h-12 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center mb-md">
<span className="material-symbols-outlined text-[28px]" data-icon="account_circle">account_circle</span>
</div>
<h3 className="font-title-lg text-title-lg mb-xs">Gov Account</h3>
<p className="font-body-md text-body-md text-on-surface-variant">Update tax info and benefits</p>
</button>
{/* Security & Privacy */}
<button className="flex flex-col p-lg rounded-xl bg-surface-container-lowest shadow-sm border border-outline-variant text-left hover:bg-surface-container-low transition-colors active-scale">
<div className="w-12 h-12 rounded-full bg-tertiary-container text-on-tertiary-container flex items-center justify-center mb-md">
<span className="material-symbols-outlined text-[28px]" data-icon="security">security</span>
</div>
<h3 className="font-title-lg text-title-lg mb-xs">Security</h3>
<p className="font-body-md text-body-md text-on-surface-variant">2FA, Biometrics &amp; Login History</p>
</button>
{/* Help Center */}
<button className="flex flex-col p-lg rounded-xl bg-surface-container-lowest shadow-sm border border-outline-variant text-left hover:bg-surface-container-low transition-colors active-scale">
<div className="w-12 h-12 rounded-full bg-surface-container-highest text-on-surface-variant flex items-center justify-center mb-md">
<span className="material-symbols-outlined text-[28px]" data-icon="help_center">help_center</span>
</div>
<h3 className="font-title-lg text-title-lg mb-xs">Help Center</h3>
<p className="font-body-md text-body-md text-on-surface-variant">Support tickets and FAQ</p>
</button>
</div>
{/* Preference Settings (Horizontal Scroll / Stack) */}
<div className="mt-lg p-lg rounded-xl bg-surface-container-low border border-outline-variant space-y-lg">
<h3 className="font-label-lg text-label-lg text-primary uppercase tracking-wider">Accessibility &amp; Preferences</h3>
{/* Font Size */}
<div className="flex items-center justify-between">
<div className="flex items-center gap-md">
<span className="material-symbols-outlined text-on-surface-variant" data-icon="text_fields">text_fields</span>
<span className="font-body-lg text-body-lg text-on-surface">Text Size</span>
</div>
<div className="flex bg-surface-container-highest rounded-full p-1">
<button className="w-10 h-8 flex items-center justify-center text-label-sm font-bold bg-white text-primary rounded-full shadow-sm">A</button>
<button className="w-10 h-8 flex items-center justify-center text-body-md font-bold text-on-surface-variant">A</button>
<button className="w-10 h-8 flex items-center justify-center text-body-lg font-bold text-on-surface-variant">A</button>
</div>
</div>
{/* Contrast */}
<div className="flex items-center justify-between">
<div className="flex items-center gap-md">
<span className="material-symbols-outlined text-on-surface-variant" data-icon="contrast">contrast</span>
<span className="font-body-lg text-body-lg text-on-surface">High Contrast</span>
</div>
<button className="w-12 h-6 bg-outline rounded-full p-1 transition-colors duration-300" onClick={() => { this.classList.toggle('bg-primary'); this.querySelector('div').classList.toggle('translate-x-6') }}>
<div className="w-4 h-4 bg-white rounded-full transition-transform duration-300"></div>
</button>
</div>
{/* Dark Mode Toggle */}
<div className="flex items-center justify-between">
<div className="flex items-center gap-md">
<span className="material-symbols-outlined text-on-surface-variant" data-icon="dark_mode">dark_mode</span>
<span className="font-body-lg text-body-lg text-on-surface">Dark Mode</span>
</div>
<button className="w-12 h-6 bg-outline rounded-full p-1 transition-colors duration-300" onClick={() => { document.documentElement.classList.toggle('dark'); this.classList.toggle('bg-primary'); this.querySelector('div').classList.toggle('translate-x-6') }}>
<div className="w-4 h-4 bg-white rounded-full transition-transform duration-300"></div>
</button>
</div>
</div>
{/* Logout Action */}
<div className="mt-xl">
<button className="w-full h-touch-target flex items-center justify-center gap-sm font-label-lg text-label-lg text-secondary border-2 border-secondary rounded-full hover:bg-secondary-container transition-all active-scale">
<span className="material-symbols-outlined" data-icon="logout">logout</span>
                Logout from Device
            </button>
</div>
{/* Official Seal / Branding Footer */}
<footer className="mt-xl py-lg border-t border-outline-variant flex flex-col items-center opacity-60">
<div className="flex items-center gap-sm mb-sm grayscale">
<div className="w-10 h-10 flex items-center justify-center bg-surface-container rounded-full overflow-hidden">
<img className="w-8 h-8 opacity-40" data-alt="A minimalist, professional government crest or seal representing administrative authority. The design is geometric, using simple shapes and lines to convey trust and history, rendered in a single solid tone consistent with a modern corporate identity. The background is a clean light-mode white." src="https://lh3.googleusercontent.com/aida-public/AB6AXuD_zwWeI4A4CxpfeGMhWZJRshCXOnNL_qbwrW4DociZMY_jnC462FkhX1tGR7Mq-HBhxEdTwSSW3VvIX0iLgtg7R6o4oFuHs76u0DdZ1rgnWwskY4s01OGkUu_1cOUgjoj-tH9e0C9m4bZLSY4TVvyNGtbye8mLx2JfPexCHePKEMjo2udOw4oGJNhfryKQgnz41EAKQR9Yeonbg5sLLp9T1x7NdgHO8cwMMlPu7OsR9NVCetIN3UeteRic6GH8VgZGT7Mii3Xoh74"/>
</div>
<span className="font-label-lg text-label-lg font-bold">DEPARTMENT OF CITIZEN SERVICES</span>
</div>
<p className="font-label-sm text-label-sm text-center">Version 4.2.1-stable • Data encrypted via AES-256<br/>© 2024 National Government Agency</p>
</footer>
</main>
    </>
  )
}

export default ProfilePage;
