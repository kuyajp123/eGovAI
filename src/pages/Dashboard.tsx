import { useNavigate, Link } from 'react-router-dom'

const Dashboard = () => {
  const navigate = useNavigate()

  return (
    <div className="pt-24 px-margin-mobile max-w-2xl mx-auto space-y-6">
      <div className="flex flex-col gap-1">
        <span className="font-bold text-primary uppercase tracking-widest text-[12px]">Recommended for You</span>
        <h2 className="text-[32px] font-bold text-on-surface">
          Streamline your <span className="text-primary">Compliance</span>
        </h2>
      </div>

      <div className="bg-surface-container-lowest rounded-xl shadow-md border border-outline-variant overflow-hidden p-6 flex flex-col gap-6 bento-card">
        <div className="flex flex-col gap-2">
          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <span className="material-symbols-outlined text-[28px]">business_center</span>
          </div>
          <h3 className="text-2xl font-bold text-on-surface">Business Permit Renewal</h3>
          <p className="text-on-surface-variant">
            Automated processing for the current fiscal year. Secure and encrypted.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div className="bg-surface-container-low p-3 rounded-lg border border-outline-variant/30">
            <p className="text-[10px] uppercase font-bold text-on-surface-variant">EST TIME</p>
            <p className="font-bold">15m</p>
          </div>
          <div className="bg-surface-container-low p-3 rounded-lg border border-outline-variant/30">
            <p className="text-[10px] uppercase font-bold text-on-surface-variant">GOV FEE</p>
            <p className="font-bold">₱1,500</p>
          </div>
          <div className="bg-surface-container-low p-3 rounded-lg border border-outline-variant/30 col-span-2 md:col-span-1">
            <p className="text-[10px] uppercase font-bold text-on-surface-variant">REQUIRED DOCS</p>
            <p className="font-bold">4 Items</p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-3">
          <button 
            onClick={() => navigate('/document-upload')} 
            className="flex-1 h-12 bg-primary text-white font-bold rounded-full flex items-center justify-center gap-2 active:scale-95 transition-all"
          >
            Start Application <span className="material-symbols-outlined">arrow_forward</span>
          </button>
          <button className="h-12 px-6 border-2 border-secondary text-secondary font-bold rounded-full active:scale-95 transition-all">
            View Requirements
          </button>
        </div>
      </div>

      <Link 
        to="/id-registration" 
        className="block bg-surface-container-low border border-outline-variant p-4 rounded-xl flex items-center gap-4 hover:bg-surface-container transition-colors"
      >
        <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-white">
          <span className="material-symbols-outlined">badge</span>
        </div>
        <div className="flex-1">
          <h4 className="font-bold">National ID Registration</h4>
          <p className="text-sm text-on-surface-variant">Apply for digital legal identification</p>
        </div>
        <span className="material-symbols-outlined text-primary">chevron_right</span>
      </Link>
    </div>
  )
}

export default Dashboard
