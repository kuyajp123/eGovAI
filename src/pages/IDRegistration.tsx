import { useNavigate } from 'react-router-dom'

const IDRegistration = () => {
  const navigate = useNavigate()

  return (
    <div className="mt-20 px-margin-mobile max-w-4xl mx-auto pb-32">
      <div className="inline-flex items-center gap-2 px-3 py-1 bg-secondary-container text-on-secondary-container rounded-full mb-4">
        <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
          verified
        </span>
        <span className="text-sm font-bold">Official Government Service</span>
      </div>

      <h2 className="text-3xl font-bold mb-2">National ID Registration</h2>
      <p className="text-on-surface-variant mb-8">
        Apply for your primary legal identification. This digital process initiates your application.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-xl border border-outline-variant bento-card">
          <span className="material-symbols-outlined text-primary mb-4">timer</span>
          <p className="text-[12px] font-bold text-on-surface-variant uppercase tracking-widest">ESTIMATED TIME</p>
          <p className="text-4xl font-bold text-primary">10m</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-outline-variant bento-card">
          <span className="material-symbols-outlined text-tertiary mb-4">payments</span>
          <p className="text-[12px] font-bold text-on-surface-variant uppercase tracking-widest">FEE</p>
          <p className="text-4xl font-bold text-tertiary">Free</p>
        </div>

        <div className="bg-primary p-6 rounded-xl text-white bento-card shadow-lg">
          <span className="material-symbols-outlined mb-4">psychology</span>
          <p className="text-[12px] font-bold uppercase tracking-widest opacity-80">AI ASSISTANT</p>
          <p className="text-xl font-bold">Guided Document Review</p>
        </div>
      </div>

      <button 
        onClick={() => navigate('/biometric')} 
        className="fixed bottom-24 right-6 bg-primary text-white font-bold px-8 py-4 rounded-full shadow-xl flex items-center gap-3 transition-all active:scale-95"
      >
        Start Registration <span className="material-symbols-outlined">arrow_forward</span>
      </button>
    </div>
  )
}

export default IDRegistration
