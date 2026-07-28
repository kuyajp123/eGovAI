import { useNavigate } from "react-router-dom"


const DocumentUpload = () => {
  const navigate = useNavigate();
  return (
    <>
      <main className="pt-20 pb-28 px-margin-mobile max-w-2xl mx-auto space-y-lg">
{/* Welcome / Context */}
<section className="space-y-xs">
<h2 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">Renew Business Permit</h2>
<p className="font-body-md text-on-surface-variant">Please provide the following documents to continue your application.</p>
</section>
{/* AI Assistant Feedback Bubble */}
<div className="flex gap-sm items-end ai-pulse">
<div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center shrink-0 shadow-sm border border-secondary">
<span className="material-symbols-outlined text-on-secondary-container" style={{fontVariationSettings: "'FILL' 1",}}>smart_toy</span>
</div>
<div className="agent-bubble bg-surface-container-lowest custom-card-shadow p-lg rounded-xl rounded-bl-none max-w-[85%]">
<p className="font-body-md text-on-surface">Please upload your 2023 DTI Registration. I'll scan it immediately.</p>
</div>
</div>
{/* Document Grid */}
<div className="grid grid-cols-1 gap-md">
{/* Card 1: Business Permit (Previous) */}
<div className="bg-surface-container-lowest p-lg rounded-xl custom-card-shadow security-lock relative group transition-all hover:shadow-md">
<div className="absolute top-4 right-4 flex items-center gap-1 bg-primary-container/10 px-2 py-1 rounded-full border border-primary/20">
<span className="material-symbols-outlined text-[16px] text-primary" style={{fontVariationSettings: "'FILL' 1",}}>shield</span>
<span className="font-label-sm text-primary uppercase tracking-wider">Secure</span>
</div>
<h3 className="font-title-lg text-title-lg text-on-surface mb-xs">Business Permit (Previous)</h3>
<div className="flex items-center gap-xs mb-lg">
<span className="material-symbols-outlined text-on-surface-variant text-[18px]">check_circle</span>
<span className="font-label-sm text-on-surface-variant">Ready to Upload</span>
</div>
<div className="flex gap-md">
<button className="flex-1 h-touch-target bg-surface-container border-2 border-dashed border-outline-variant rounded-lg flex flex-col items-center justify-center gap-1 hover:bg-surface-container-high transition-colors active:scale-[0.98]">
<span className="material-symbols-outlined text-primary">upload_file</span>
<span className="font-label-sm text-primary">Upload</span>
</button>
<button className="w-touch-target h-touch-target bg-surface-container-low rounded-lg flex items-center justify-center hover:bg-surface-container-high transition-colors active:scale-[0.98]">
<span className="material-symbols-outlined text-on-surface-variant">photo_camera</span>
</button>
<button className="w-touch-target h-touch-target bg-surface-container-low rounded-lg flex items-center justify-center hover:bg-surface-container-high transition-colors active:scale-[0.98]">
<span className="material-symbols-outlined text-on-surface-variant">picture_as_pdf</span>
</button>
</div>
</div>
{/* Card 2: DTI Registration (Action Required) */}
<div className="bg-surface-container-lowest p-lg rounded-xl custom-card-shadow security-lock border-2 border-primary transition-all shadow-lg ring-1 ring-primary/30">
<div className="absolute top-4 right-4 flex items-center gap-1 bg-primary px-2 py-1 rounded-full">
<span className="material-symbols-outlined text-[16px] text-on-primary" style={{fontVariationSettings: "'FILL' 1",}}>priority_high</span>
<span className="font-label-sm text-on-primary uppercase tracking-wider">Required</span>
</div>
<h3 className="font-title-lg text-title-lg text-on-surface mb-xs">DTI Registration</h3>
<div className="flex items-center gap-xs mb-lg">
<span className="material-symbols-outlined text-primary text-[18px]">info</span>
<span className="font-label-sm text-primary font-bold">Awaiting Document</span>
</div>
<div className="flex gap-md">
<button className="flex-[2] h-[56px] bg-primary text-on-primary rounded-full flex items-center justify-center gap-2 hover:bg-on-primary-fixed-variant shadow-md active:scale-95 transition-transform">
<span className="material-symbols-outlined">upload</span>
<span className="font-label-lg text-label-lg">Choose File</span>
</button>
<button className="w-[56px] h-[56px] bg-surface-container-highest rounded-full flex items-center justify-center hover:bg-outline-variant transition-colors active:scale-95">
<span className="material-symbols-outlined text-on-surface">photo_camera</span>
</button>
<button className="w-[56px] h-[56px] bg-surface-container-highest rounded-full flex items-center justify-center hover:bg-outline-variant transition-colors active:scale-95">
<span className="material-symbols-outlined text-on-surface">cloud_download</span>
</button>
</div>
</div>
{/* Card 3: Barangay Clearance (Attached) */}
<div className="bg-surface-container-lowest p-lg rounded-xl custom-card-shadow security-lock transition-all opacity-90">
<div className="absolute top-4 right-4">
<span className="material-symbols-outlined text-tertiary" style={{fontVariationSettings: "'FILL' 1",}}>verified</span>
</div>
<h3 className="font-title-lg text-title-lg text-on-surface mb-xs">Barangay Clearance</h3>
<div className="flex items-center gap-xs mb-lg">
<span className="material-symbols-outlined text-tertiary text-[18px]">description</span>
<span className="font-label-sm text-tertiary font-bold">File Attached: BC_2024.pdf</span>
</div>
<div className="flex items-center justify-between bg-surface-container-low p-sm rounded-lg">
<div className="flex items-center gap-sm">
<span className="material-symbols-outlined text-on-surface-variant">picture_as_pdf</span>
<span className="font-label-sm text-on-surface">View document</span>
</div>
<button className="text-error font-label-sm px-4 py-2 hover:bg-error-container rounded-lg transition-colors">Replace</button>
</div>
</div>
{/* Card 4: Tax Certificate */}
<div className="bg-surface-container-lowest p-lg rounded-xl custom-card-shadow security-lock transition-all hover:shadow-md">
<h3 className="font-title-lg text-title-lg text-on-surface mb-xs">Tax Certificate</h3>
<div className="flex items-center gap-xs mb-lg">
<span className="material-symbols-outlined text-on-surface-variant text-[18px]">check_circle</span>
<span className="font-label-sm text-on-surface-variant">Ready to Upload</span>
</div>
<div className="flex gap-md">
<button className="flex-1 h-touch-target bg-surface-container border-2 border-dashed border-outline-variant rounded-lg flex flex-col items-center justify-center gap-1 hover:bg-surface-container-high transition-colors active:scale-[0.98]">
<span className="material-symbols-outlined text-primary">upload_file</span>
<span className="font-label-sm text-primary">Upload</span>
</button>
<button className="w-touch-target h-touch-target bg-surface-container-low rounded-lg flex items-center justify-center hover:bg-surface-container-high transition-colors active:scale-[0.98]">
<span className="material-symbols-outlined text-on-surface-variant">photo_camera</span>
</button>
<button className="w-touch-target h-touch-target bg-surface-container-low rounded-lg flex items-center justify-center hover:bg-surface-container-high transition-colors active:scale-[0.98]">
<span className="material-symbols-outlined text-on-surface-variant">picture_as_pdf</span>
</button>
</div>
</div>
</div>
{/* Help Section */}
<div className="bg-tertiary-container/10 p-lg rounded-xl border border-tertiary/20 flex gap-md items-start">
<span className="material-symbols-outlined text-tertiary-container mt-1">lightbulb</span>
<div>
<h4 className="font-label-lg text-tertiary-container">Tip from Assistant</h4>
<p className="font-body-md text-on-surface-variant">Ensure all photos are taken in bright light with all four corners of the document visible.</p>
</div>
</div>
</main>
    </>
  )
}

export default DocumentUpload;
