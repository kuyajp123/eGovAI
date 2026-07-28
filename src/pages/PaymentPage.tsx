import { useNavigate } from 'react-router-dom'

const PaymentPage = () => {
  const navigate = useNavigate()

  return (
    <div className="pt-24 px-margin-mobile max-w-2xl mx-auto space-y-6">
      <h2 className="text-3xl font-bold">Review & Pay</h2>

      <div className="bg-white p-6 rounded-xl border border-outline-variant shadow-sm space-y-4">
        <div className="flex justify-between font-bold text-xl">
          <span>Total Due</span>
          <span className="text-primary">₱1,550.00</span>
        </div>

        <div className="space-y-3">
          <div className="p-4 border-2 border-primary rounded-xl flex items-center gap-4 bg-primary/5">
            <div className="w-10 h-10 bg-blue-100 rounded flex items-center justify-center">
              <span className="material-symbols-outlined text-blue-600">wallet</span>
            </div>
            <div className="flex-1 font-bold">GCash</div>
            <span className="material-symbols-outlined text-primary">check_circle</span>
          </div>

          <div className="p-4 border border-outline-variant rounded-xl flex items-center gap-4">
            <div className="w-10 h-10 bg-surface-container rounded flex items-center justify-center">
              <span className="material-symbols-outlined">credit_card</span>
            </div>
            <div className="flex-1 font-bold">Credit Card</div>
          </div>
        </div>
      </div>

      <button 
        onClick={() => navigate('/success')} 
        className="w-full h-14 bg-primary text-white font-bold text-lg rounded-full shadow-lg active:scale-95 transition-all"
      >
        Pay ₱1,550
      </button>
    </div>
  )
}

export default PaymentPage
