import { useNavigate } from 'react-router-dom'

const SuccessPage = () => {
  const navigate = useNavigate()

  return (
    <div className="pt-24 pb-12 flex flex-col items-center justify-center px-margin-mobile">
      <div className="bg-secondary text-on-secondary rounded-full w-24 h-24 flex items-center justify-center mb-8 shadow-xl">
        <span className="material-symbols-outlined text-6xl" style={{ fontVariationSettings: "'FILL' 1" }}>
          check_circle
        </span>
      </div>

      <h1 className="text-2xl font-bold text-center mb-2">Submission Successful</h1>
      <p className="text-on-surface-variant text-center max-w-xs mb-12">
        Your documents have been safely delivered to the central registry.
      </p>

      <div className="w-full max-w-sm grid grid-cols-1 gap-4">
        <button 
          onClick={() => navigate('/activity')} 
          className="bg-primary text-white h-12 rounded-full font-bold shadow-lg active:scale-95 transition-all"
        >
          Track Status
        </button>
        <button 
          onClick={() => navigate('/home')} 
          className="border-2 border-secondary text-secondary h-12 rounded-full font-bold active:scale-95 transition-all"
        >
          Return Home
        </button>
      </div>
    </div>
  )
}

export default SuccessPage
