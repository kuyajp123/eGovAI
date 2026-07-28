import { useNavigate } from 'react-router-dom'

const ReviewPage = () => {
  const navigate = useNavigate()

  return (
    <div className="pt-24 px-4 max-w-2xl mx-auto pb-32 space-y-6">
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary-container text-on-secondary-container font-bold text-xs uppercase tracking-widest">
        <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>
          verified
        </span>
        Ready for Submission
      </div>

      <h2 className="text-2xl font-bold">Review Application</h2>

      <div className="bg-white p-6 rounded-xl border border-outline-variant shadow-sm space-y-4">
        <h3 className="font-bold flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">person</span> Personal Details
        </h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-on-surface-variant uppercase text-[10px] font-bold">NAME</p>
            <p className="font-semibold">Jonathan Sterling</p>
          </div>
          <div>
            <p className="text-on-surface-variant uppercase text-[10px] font-bold">DOB</p>
            <p className="font-semibold">May 24, 1988</p>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl border border-outline-variant shadow-sm">
        <h3 className="font-bold flex items-center gap-2 mb-3">
          <span className="material-symbols-outlined text-secondary">description</span> Verified Files
        </h3>
        <div className="flex items-center justify-between p-3 rounded-lg bg-surface-container border border-outline-variant">
          <span className="text-sm font-medium">Birth_Cert.pdf</span>
          <span className="material-symbols-outlined text-tertiary">check_circle</span>
        </div>
      </div>

      <button 
        onClick={() => navigate('/payment')} 
        className="w-full h-12 bg-primary text-white font-bold rounded-full active:scale-95 transition-all"
      >
        Submit and Continue
      </button>
    </div>
  )
}

export default ReviewPage
