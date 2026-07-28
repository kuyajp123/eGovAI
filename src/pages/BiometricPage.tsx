import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const BiometricPage = () => {
  const navigate = useNavigate()
  const [status, setStatus] = useState("Scanning...")

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate('/review')
    }, 4000)

    return () => clearTimeout(timer)
  }, [navigate])

  return (
    <div className="pt-24 pb-12 px-margin-mobile flex flex-col items-center max-w-lg mx-auto w-full">
      <div className="mb-8 flex flex-col items-center">
        <div className="w-16 h-16 bg-primary-container text-on-primary-container rounded-2xl flex items-center justify-center mb-3 shadow-lg">
          <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>
            lock
          </span>
        </div>
        <h2 className="text-xl font-bold text-primary">Identity Vault</h2>
        <p className="text-sm text-on-surface-variant text-center mt-1">Biometric Verification Required</p>
      </div>

      <div className="relative w-full aspect-square max-w-[320px] mx-auto mb-10">
        <div className="absolute inset-0 rounded-full border-4 border-primary-fixed-dim pulse-border"></div>
        <div className="absolute inset-2 rounded-full overflow-hidden bg-surface-container-highest border-4 border-white shadow-xl">
          <div 
            className="w-full h-full bg-cover bg-center opacity-80" 
            style={{ 
              backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuA_X2EKu057yF-AsJYFTUizfvPX3KJaLj1MVfDrw7OMcOgGdudYHxza2g1GS5_c6F-nvqzLWZu8molKfNzxnJ03sY1k3u3X4xAZktuUqr-gICVHfRQCDeg7f0NScd-2QxSXFcRhx_UhaLKiU0qUxRyUqfNNMiQriSK3fuUwgzJmlNyTsTc_o7L5g5arY6-hFK0Zf3GwslIJNMFSqknPG_9zsY6wS0M7RLJ5FG0Nnyn8YagjolP7FV_06rJmmQJlZ8hiVm9iBPScKMY')" 
            }}
          ></div>
          <div className="scan-line"></div>
        </div>
      </div>

      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2 text-primary text-xl font-bold">
          <span className="material-symbols-outlined animate-spin">progress_activity</span>
          <span>{status}</span>
        </div>
      </div>
    </div>
  )
}

export default BiometricPage
