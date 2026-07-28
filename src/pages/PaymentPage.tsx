const PaymentPage = () => {
  return (
    <>
      <main className="mt-20 px-margin-mobile md:px-margin-tablet max-w-5xl mx-auto space-y-lg">
{/* Header Section */}
<section className="space-y-sm py-4">
<h2 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">Review &amp; Pay</h2>
<p className="font-body-md text-on-surface-variant max-w-lg">Complete your administrative request by finalizing the mandatory government fees securely.</p>
</section>
<div className="grid grid-cols-1 lg:grid-cols-12 gap-lg items-start">
{/* Left Column: Summary and Receipt */}
<div className="lg:col-span-7 space-y-lg">
{/* Bento Card: Payment Summary */}
<div className="bg-surface-container-lowest rounded-xl p-lg shadow-sm border border-outline-variant/30 space-y-lg">
<div className="flex justify-between items-center">
<h3 className="font-title-lg text-title-lg text-on-surface">Payment Summary</h3>
<div className="flex items-center gap-xs text-secondary font-label-lg bg-secondary-container/20 px-3 py-1 rounded-full">
<span className="material-symbols-outlined text-[18px]" data-icon="verified_user" style={{fontVariationSettings: "'FILL' 1",}}>verified_user</span>
                            Secure
                        </div>
</div>
<div className="space-y-md border-b border-outline-variant/50 pb-md">
<div className="flex justify-between items-center">
<span className="text-on-surface-variant font-body-md">Government Fee</span>
<span className="text-on-surface font-title-lg">₱1,500.00</span>
</div>
<div className="flex justify-between items-center">
<span className="text-on-surface-variant font-body-md">Processing Fee</span>
<span className="text-on-surface font-title-lg">₱50.00</span>
</div>
</div>
<div className="flex justify-between items-center pt-xs">
<span className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">Total</span>
<span className="font-headline-lg-mobile text-headline-lg-mobile text-primary">₱1,550.00</span>
</div>
</div>
{/* Preview of Official Receipt (Glassmorphism Effect) */}
<div className="relative overflow-hidden group">
<div className="absolute inset-0 bg-primary/5 -skew-y-3 translate-y-4 rounded-xl -z-10"></div>
<div className="glass-card rounded-xl p-lg border-2 border-dashed border-outline-variant/50 relative">
<div className="flex justify-between items-start mb-lg">
<div className="space-y-xs">
<p className="font-label-sm text-on-surface-variant uppercase tracking-wider">Draft Receipt</p>
<p className="font-title-lg text-primary font-bold">REPUBLIC OF THE PHILIPPINES</p>
</div>
<div className="w-12 h-12 bg-surface-container-highest rounded-full flex items-center justify-center opacity-50">
<span className="material-symbols-outlined text-primary" data-icon="account_balance">account_balance</span>
</div>
</div>
<div className="grid grid-cols-2 gap-md py-md border-t border-b border-outline-variant/30 text-sm">
<div>
<p className="text-on-surface-variant">Payor</p>
<p className="font-semibold">JUAN DELA CRUZ</p>
</div>
<div className="text-right">
<p className="text-on-surface-variant">Reference No.</p>
<p className="font-semibold">GOV-2023-8849-XP</p>
</div>
<div>
<p className="text-on-surface-variant">Date</p>
<p className="font-semibold">OCTOBER 24, 2023</p>
</div>
<div className="text-right">
<p className="text-on-surface-variant">Status</p>
<p className="text-error font-bold uppercase">Pending</p>
</div>
</div>
<div className="mt-md flex justify-center">
<div className="w-32 h-32 opacity-10 flex items-center justify-center border-4 border-primary rounded-lg rotate-12">
<p className="text-primary font-black text-center text-xs">OFFICIAL<br/>DRAFT</p>
</div>
</div>
</div>
</div>
</div>
{/* Right Column: Payment Method & Action */}
<div className="lg:col-span-5 space-y-lg">
<div className="bg-surface-container-low rounded-xl p-lg shadow-sm border border-outline-variant/30 space-y-lg">
<h3 className="font-title-lg text-title-lg text-on-surface">Select Payment Method</h3>
<div className="grid grid-cols-1 gap-md">
{/* GCash */}
<label className="relative flex items-center p-md bg-surface-container-lowest rounded-xl border border-outline-variant cursor-pointer hover:bg-white transition-all group has-[:checked]:border-primary has-[:checked]:active-ring">
<input defaultChecked className="hidden peer" name="payment" type="radio"/>
<div className="w-12 h-12 flex-shrink-0 bg-blue-100 rounded-lg mr-md overflow-hidden">
<div className="w-full h-full" data-alt="A clean, minimalist financial icon representing a mobile wallet with a bright blue background, featuring a subtle geometric shield pattern to signify security and digital currency. High key lighting, 3D claymorphism style." style={{backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuCM5rsr4zV1NEwQy1URTFIGnjXsaUXZOwo2ZhAxfODXPr2rxoWsX5xxFJSVfGA5TkAofx6rj1cbsqQOGLg-zBXtj4HPCs-POsckEycbcmd2ZPq_delpYWbitVr4kD4m4b__2CBTepm9wPT6ZyxqpFYd4IcZR3Ty1ugDJhOY3LfpXWbqYQ9g_fIKLcmBE1V3OZ_jabn_djLE5six9CN54EF1GCnPO_KF0j2oXsN95d_qyXkVmOocDDKpbp3p4Po584Lef20MTPXeg98')",}}></div>
</div>
<div className="flex-grow">
<p className="font-bold text-on-surface">GCash</p>
<p className="text-label-sm text-on-surface-variant">Instant Confirmation</p>
</div>
<span className="material-symbols-outlined text-primary opacity-0 peer-checked:opacity-100" data-icon="check_circle">check_circle</span>
</label>
{/* Maya */}
<label className="relative flex items-center p-md bg-surface-container-lowest rounded-xl border border-outline-variant cursor-pointer hover:bg-white transition-all group has-[:checked]:border-primary has-[:checked]:active-ring">
<input className="hidden peer" name="payment" type="radio"/>
<div className="w-12 h-12 flex-shrink-0 bg-emerald-100 rounded-lg mr-md overflow-hidden">
<div className="w-full h-full" data-alt="A modern digital payment logo aesthetic featuring a vibrant teal and white color scheme. The composition is centered, minimalist, and sleek, using smooth gradients to suggest a forward-thinking fintech brand. Professional studio lighting." style={{backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuBQogxldRkNlbfEeWyJrG8PIhxp8ej_IbFhrxnyIrGVg4U_5WSZvE4XcmbMt-ekBH7j2EpNBNGO2DuGgtelxFbsCKad70yagPmjVRZofZvS1PANEnwAWzVkPx1SaviyILZFJqeAkqZnfymIZFhmwQj7GPRwbOMjVEkG1XQqx9gARQWveCVV9jmwJ7vb3CvTPjOYd70yw_bB7jikZ5aA80QlKbUH4aTrAOyKnHzkMSA2ADUV03sJb7XZoKlnj10hZVxFwLj7P5sIhE4')",}}></div>
</div>
<div className="flex-grow">
<p className="font-bold text-on-surface">Maya</p>
<p className="text-label-sm text-on-surface-variant">Verified Merchant</p>
</div>
<span className="material-symbols-outlined text-primary opacity-0 peer-checked:opacity-100" data-icon="check_circle">check_circle</span>
</label>
{/* Credit Card */}
<label className="relative flex items-center p-md bg-surface-container-lowest rounded-xl border border-outline-variant cursor-pointer hover:bg-white transition-all group has-[:checked]:border-primary has-[:checked]:active-ring">
<input className="hidden peer" name="payment" type="radio"/>
<div className="w-12 h-12 flex-shrink-0 bg-surface-container-high rounded-lg mr-md flex items-center justify-center">
<span className="material-symbols-outlined text-primary scale-125" data-icon="credit_card">credit_card</span>
</div>
<div className="flex-grow">
<p className="font-bold text-on-surface">Credit Card</p>
<p className="text-label-sm text-on-surface-variant">Visa, Mastercard, JCB</p>
</div>
<span className="material-symbols-outlined text-primary opacity-0 peer-checked:opacity-100" data-icon="check_circle">check_circle</span>
</label>
{/* Online Banking */}
<label className="relative flex items-center p-md bg-surface-container-lowest rounded-xl border border-outline-variant cursor-pointer hover:bg-white transition-all group has-[:checked]:border-primary has-[:checked]:active-ring">
<input className="hidden peer" name="payment" type="radio"/>
<div className="w-12 h-12 flex-shrink-0 bg-surface-container-high rounded-lg mr-md flex items-center justify-center">
<span className="material-symbols-outlined text-primary scale-125" data-icon="account_balance">account_balance</span>
</div>
<div className="flex-grow">
<p className="font-bold text-on-surface">Online Banking</p>
<p className="text-label-sm text-on-surface-variant">BPI, BDO, UnionBank</p>
</div>
<span className="material-symbols-outlined text-primary opacity-0 peer-checked:opacity-100" data-icon="check_circle">check_circle</span>
</label>
</div>
{/* Payment Action Area */}
<div className="pt-lg space-y-md">
<button className="w-full h-[56px] bg-primary text-on-primary rounded-full font-headline-lg-mobile text-lg active:scale-[0.98] transition-all flex items-center justify-center gap-sm shadow-lg hover:bg-primary/90">
                            Pay ₱1,550
                            <span className="material-symbols-outlined" data-icon="arrow_forward">arrow_forward</span>
</button>
<div className="flex items-center justify-center gap-xs py-2 bg-surface-container-high/40 rounded-lg">
<span className="material-symbols-outlined text-secondary text-[20px]" data-icon="lock" style={{fontVariationSettings: "'FILL' 1",}}>lock</span>
<span className="text-label-sm text-on-surface-variant font-medium">Transaction Protected by Government-Grade Encryption</span>
</div>
</div>
</div>
{/* Assistance Card */}
<div className="bg-primary-container/10 p-md rounded-xl border-l-4 border-primary flex items-start gap-md">
<span className="material-symbols-outlined text-primary" data-icon="info">info</span>
<div className="space-y-xs">
<p className="font-bold text-primary">Need Help?</p>
<p className="text-label-sm text-on-surface-variant">Fees are non-refundable once processed by the Department. Chat with our AI agent if you have questions.</p>
</div>
</div>
</div>
</div>
</main>
    </>
  )
}

export default PaymentPage;
