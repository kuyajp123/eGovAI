import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { generateAIResponse } from '../services/egovService'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  sessionId?: string
}

const AIChatHome = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [inputValue, setInputValue] = useState('')
  const [placeholderIndex, setPlaceholderIndex] = useState(0)
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [category] = useState('PH') // Default to Philippines
  
  const placeholders = [
    "How do I renew my license?",
    "Apply for National ID...",
    "Where is the nearest social security office?",
    "Report a street light outage..."
  ]

  const suggestions = [
    { label: "Renew Business Permit", query: "How do I renew my business permit?" },
    { label: "National ID", query: "How can I get my digital National ID?" },
    { label: "Driver's License", query: "What are the requirements for renewing my driver's license?" },
    { label: "Birth Certificate", query: "How do I request a copy of my birth certificate?" },
    { label: "TIN ID", query: "How can I get my digital TIN ID?" },
    { label: "Report a Concern", query: "How can I report a public concern to the government?" }
  ]

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % placeholders.length)
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSuggestionClick = async (query: string) => {
    setInputValue(query)
    await handleSend(query)
  }

  const buildContextualPrompt = (userQuery: string): string => {
    if (!user || !user.firstName) {
      return userQuery
    }

    // Build user context
    const userContext = [
      `User Information:`,
      `- Name: ${[user.firstName, user.middleName, user.lastName, user.suffix].filter(Boolean).join(' ')}`,
      user.email && `- Email: ${user.email}`,
      user.mobileNumber && `- Mobile: ${user.mobileNumber}`,
      user.birthdate && `- Birthdate: ${user.birthdate}`,
      user.address?.city && `- Location: ${[user.address.city, user.address.province].filter(Boolean).join(', ')}`,
      ``,
      `User Query: ${userQuery}`
    ].filter(Boolean).join('\n')

    return userContext
  }

  const handleSend = async (messageText?: string) => {
    const text = messageText || inputValue.trim()
    if (!text) return

    setError(null)
    setInputValue('')

    // Add user message (display only the actual query)
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date()
    }
    setMessages(prev => [...prev, userMessage])
    setIsLoading(true)

    try {
      // Build contextual prompt with user information
      const contextualPrompt = buildContextualPrompt(text)
      
      if (import.meta.env.DEV) {
        console.log('=== AI Request with User Context ===')
        console.log('Original Query:', text)
        console.log('Contextual Prompt:', contextualPrompt)
        console.log('User Data:', user)
      }
      
      // Call AI Assistant API with user context
      const response = await generateAIResponse(contextualPrompt, category)
      
      if (import.meta.env.DEV) {
        console.log('AI Response:', response)
      }
      
      // Add assistant response
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.data,
        timestamp: new Date(),
        sessionId: response.session_id
      }
      setMessages(prev => [...prev, assistantMessage])
    } catch (err) {
      setError('Failed to get response. Please try again.')
      console.error('AI Chat error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const clearChat = () => {
    setMessages([])
    setError(null)
  }

  return (
    <>
      {/* Main Content Canvas */}
      <main className="flex-grow pt-24 pb-32 px-margin-mobile ai-gradient-bg relative overflow-hidden flex flex-col">
        {/* Subtle AI Background Animation Placeholder */}
        <div className="absolute inset-0 pointer-events-none opacity-40"></div>

        {messages.length === 0 ? (
          /* Hero Section - Empty State */
          <div className="z-10 w-full max-w-2xl mx-auto text-center flex flex-col items-center justify-center flex-grow space-y-8">
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
              {user?.firstName 
                ? `Hi ${user.firstName}, what government service do you need today?`
                : 'What government service do you need today?'}
            </h2>

            {/* User Badge (if logged in) */}
            {user && user.firstName && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary-container text-on-primary-container">
                <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
                  account_circle
                </span>
                <span className="font-label-md text-label-md">
                  Logged in as {user.firstName} {user.lastName}
                </span>
                <span className="material-symbols-outlined text-sm text-tertiary" style={{ fontVariationSettings: "'FILL' 1" }}>
                  verified
                </span>
              </div>
            )}

            {/* Suggestions Chips (Horizontal Scroll) */}
            <div className="w-full overflow-x-auto hide-scrollbar flex gap-3 pb-4">
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(suggestion.query)}
                  className="flex-shrink-0 px-5 py-3 rounded-full bg-surface-container-lowest border border-outline-variant text-on-surface-variant font-label-lg text-label-lg hover:border-primary hover:text-primary transition-colors whitespace-nowrap active:scale-95 duration-100"
                >
                  {suggestion.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Chat Messages Container */
          <div className="z-10 w-full max-w-3xl mx-auto flex-grow overflow-y-auto pb-4">
            {/* Header with Clear Button */}
            <div className="sticky top-0 bg-surface/80 backdrop-blur-sm p-4 mb-4 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-secondary p-0.5">
                  <div className="w-full h-full rounded-full overflow-hidden bg-white flex items-center justify-center">
                    <img 
                      className="w-6 h-6 object-contain" 
                      alt="AI Assistant"
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuBm4AQ-42eqIEkvsyrypztHdH3vDk8m8fJWpAcgdG7FJE9BFKXD1BnQMnLvEJG-g00ZA9oQCDUM_K8Q1FZZmg1nR9EuZDLKOJAEH9t9aPYyaw-mROcwoR06S-mORxu6olhJ-CgZImBfVnBozfcSYFr_CwWs44cVfaTW9D8zfvljNKgvpSA8iRiIGh1vEKmDrRy5905sxcgVYj1rf59bbE3i27C558xPvhkAcSNyRnRXWzuFbD_yfN0A113Ms7BTIBVD2jaysGlxy-U" 
                    />
                  </div>
                </div>
                <div>
                  <h3 className="font-title-md text-title-md text-on-surface">eGovPH Assistant</h3>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    {user?.firstName ? `Personalized for ${user.firstName}` : 'AI-powered support'}
                  </p>
                </div>
              </div>
              <button
                onClick={clearChat}
                className="px-4 py-2 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface transition-colors flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-lg">delete</span>
                <span className="font-label-md text-label-md">Clear</span>
              </button>
            </div>

            {/* Messages */}
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {message.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-secondary p-0.5 flex-shrink-0">
                      <div className="w-full h-full rounded-full overflow-hidden bg-white flex items-center justify-center">
                        <span className="material-symbols-outlined text-sm text-primary">smart_toy</span>
                      </div>
                    </div>
                  )}
                  
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                      message.role === 'user'
                        ? 'bg-primary text-on-primary'
                        : 'bg-surface-container text-on-surface'
                    }`}
                  >
                    <p className="font-body-md text-body-md whitespace-pre-wrap break-words">
                      {message.content}
                    </p>
                    <span className="text-xs opacity-70 mt-1 block">
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {message.role === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center flex-shrink-0">
                      <span className="material-symbols-outlined text-sm">person</span>
                    </div>
                  )}
                </div>
              ))}

              {/* Loading Indicator */}
              {isLoading && (
                <div className="flex gap-3 justify-start">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-secondary p-0.5 flex-shrink-0">
                    <div className="w-full h-full rounded-full overflow-hidden bg-white flex items-center justify-center">
                      <span className="material-symbols-outlined text-sm text-primary">smart_toy</span>
                    </div>
                  </div>
                  <div className="bg-surface-container rounded-2xl px-4 py-3">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-on-surface-variant rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                      <span className="w-2 h-2 bg-on-surface-variant rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                      <span className="w-2 h-2 bg-on-surface-variant rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                    </div>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="flex gap-3 justify-start">
                  <div className="w-8 h-8 rounded-full bg-error text-on-error flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-sm">error</span>
                  </div>
                  <div className="bg-error-container text-on-error-container rounded-2xl px-4 py-3">
                    <p className="font-body-md text-body-md">{error}</p>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>
        )}
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
              onKeyPress={(e) => e.key === 'Enter' && !isLoading && handleSend()}
              disabled={isLoading}
            />
          </div>
          <button className="w-11 h-11 flex items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container-high transition-colors">
            <span className="material-symbols-outlined">mic</span>
          </button>
          <button 
            onClick={() => handleSend()}
            disabled={isLoading || !inputValue.trim()}
            className="w-11 h-11 flex items-center justify-center rounded-full bg-primary text-on-primary shadow-md hover:bg-primary-container hover:text-on-primary-container transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
              {isLoading ? 'hourglass_empty' : 'send'}
            </span>
          </button>
        </div>
      </div>
    </>
  )
}

export default AIChatHome
