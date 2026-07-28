import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const AIChatHome = () => {
  const navigate = useNavigate()
  const [inputValue, setInputValue] = useState('')
  const [placeholderIndex, setPlaceholderIndex] = useState(0)
  
  const placeholders = [
    "How do I renew my license?",
    "Apply for National ID...",
    "Where is the nearest social security office?",
    "Report a street light outage..."
  ]

  const suggestions = [
    { label: "Renew Business Permit", path: "/document-upload" },
    { label: "National ID", path: "/id-registration" },
    { label: "Driver's License", path: "/services" },
    { label: "Birth Certificate", path: "/services" },
    { label: "Passport", path: "/services" },
    { label: "Report a Concern", path: "/services" }
  ]

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % placeholders.length)
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  const handleSuggestionClick = (path: string) => {
    navigate(path)
  }

  const handleSend = () => {
    if (inputValue.trim()) {
      // Navigate to services or show chat interface
      navigate('/services')
    }
  }

  return (
    <>
      {/* Main Content Canvas */}
      <main className="flex-grow pt-24 pb-32 px-margin-mobile ai-gradient-bg relative overflow-hidden flex flex-col items-center justify-center">
        {/* Subtle AI Background Animation Placeholder */}
        <div className="absolute inset-0 pointer-events-none opacity-40"></div>

        {/* Hero Section */}
        <div className="z-10 w-full max-w-2xl text-center flex flex-col items-center space-y-8">
          {/* AI Avatar / Identity */}
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-primary to-secondary p-1 shadow-lg pulse-soft">
              <div className="w-full h-full rounded-full overflow-hidden bg-white flex items-center justify-center">
                <img 
                  className="w-16 h-16 object-contain" 
                  alt="AI Government Assistant Avatar"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuBm4AQ-42eqIEkvsyrypztHdH3vDk8m8fJWpAcgdG7FJE9BFKXD1BnQMnLvEJG-g00ZA9oQCDUM_K8Q1FZZmg1nR9EuZDLKOJAEH9t9aPYyaw-mROcwoR06S-mORxu6olhJ-CgZImBfVnBozfcSYFr_CwWs44cVfaTW9D8zfvljNKgvpSA8iRiIGh1vEKmDrRy5905sxcgVYj1rf59bbE3i27C558xPvhkAcSNyRnRXWzuFbD_yfN0A113Ms7BTIBVD2jaysGlxy-U" 
                />
              </div>
            </div>
            <div className="absolute -bottom-1 -right-1 bg-white p-1 rounded-full shadow-sm border border-surface-container-highest">
              <span className="material-symbols-outlined text-secondary text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
                verified
              </span>
            </div>
          </div>

          {/* Greeting */}
          <h2 className="font-headline-lg-mobile text-headline-lg-mobile md:font-headline-lg md:text-headline-lg text-on-surface tracking-tight">
            What government service do you need today?
          </h2>

          {/* Suggestions Chips (Horizontal Scroll) */}
          <div className="w-full overflow-x-auto hide-scrollbar flex gap-3 pb-4">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(suggestion.path)}
                className="flex-shrink-0 px-5 py-3 rounded-full bg-surface-container-lowest border border-outline-variant text-on-surface-variant font-label-lg text-label-lg hover:border-primary hover:text-primary transition-colors whitespace-nowrap active:scale-95 duration-100"
              >
                {suggestion.label}
              </button>
            ))}
          </div>
        </div>

        {/* Floating AI Assistant FAB */}
        <button 
          onClick={() => navigate('/services')}
          className="fixed right-6 bottom-32 w-14 h-14 rounded-full bg-gradient-to-br from-primary to-secondary text-white shadow-xl flex items-center justify-center z-40 transition-transform active:scale-90 hover:shadow-2xl"
        >
          <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
            smart_toy
          </span>
        </button>
      </main>

      {/* Persistent Chat Input Shell */}
      <div className="fixed bottom-[72px] md:bottom-4 left-0 right-0 px-margin-mobile z-50">
        <div className="max-w-3xl mx-auto glass-panel p-3 rounded-3xl shadow-lg border border-white/40 flex items-center gap-2">
          <button className="w-11 h-11 flex items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container-high transition-colors">
            <span className="material-symbols-outlined">add</span>
          </button>
          <div className="flex-grow relative">
            <input
              className="w-full bg-surface-container-low border-none rounded-2xl py-3 px-4 text-on-surface focus:ring-2 focus:ring-primary/20 placeholder:text-outline font-body-md transition-all"
              placeholder={placeholders[placeholderIndex]}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            />
          </div>
          <button className="w-11 h-11 flex items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container-high transition-colors">
            <span className="material-symbols-outlined">mic</span>
          </button>
          <button 
            onClick={handleSend}
            className="w-11 h-11 flex items-center justify-center rounded-full bg-primary text-on-primary shadow-md hover:bg-primary-container hover:text-on-primary-container transition-all active:scale-95"
          >
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
              send
            </span>
          </button>
        </div>
      </div>
    </>
  )
}

export default AIChatHome
