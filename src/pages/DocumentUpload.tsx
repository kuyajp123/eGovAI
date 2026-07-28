import { useNavigate } from 'react-router-dom'

const DocumentUpload = () => {
  const navigate = useNavigate()

  return (
    <div className="pt-24 px-margin-mobile max-w-2xl mx-auto space-y-6">
      <div className="flex justify-between items-end">
        <h2 className="text-2xl font-bold">Upload National ID</h2>
        <span className="text-sm text-on-surface-variant">Step 3 of 8</span>
      </div>

      <div className="h-2 w-full bg-surface-container-highest rounded-full overflow-hidden">
        <div className="h-full bg-primary w-[37%]"></div>
      </div>

      <div className="space-y-4">
        <div className="bg-white p-4 rounded-xl border border-outline-variant shadow-sm group">
          <h3 className="font-bold">Front of Document</h3>
          <div className="mt-3 aspect-[1.58/1] rounded-lg bg-surface-container-low border-2 border-dashed border-outline-variant flex flex-col items-center justify-center cursor-pointer hover:bg-surface-container-high transition-all">
            <span className="material-symbols-outlined text-4xl text-primary">add_a_photo</span>
            <span className="text-primary font-bold mt-2">Capture Front</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-outline-variant shadow-sm group">
          <h3 className="font-bold">Back of Document</h3>
          <div className="mt-3 aspect-[1.58/1] rounded-lg bg-surface-container-low border-2 border-dashed border-outline-variant flex flex-col items-center justify-center cursor-pointer hover:bg-surface-container-high transition-all">
            <span className="material-symbols-outlined text-4xl text-on-surface-variant">add_a_photo</span>
            <span className="text-on-surface-variant font-bold mt-2">Capture Back</span>
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border-l-4 border-[#16B6A6] shadow-sm flex gap-4">
        <div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-on-secondary-container">smart_toy</span>
        </div>
        <p className="text-sm text-on-surface-variant">
          Place your ID on a dark, flat surface for better detection.
        </p>
      </div>

      <button 
        onClick={() => navigate('/review')} 
        className="w-full h-12 bg-primary text-white font-bold rounded-full active:scale-95 transition-all"
      >
        Continue to Verification
      </button>
    </div>
  )
}

export default DocumentUpload
