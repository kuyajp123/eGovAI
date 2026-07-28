import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import { useAuth } from '../context/AuthContext'
import { generateAIResponse } from '../services/egovService'
import { processAiReportIntent, IncidentReport } from '../services/eReportService'
import { processAiBusinessIntent, AiBusinessAction } from '../services/aiBusinessService'
import { processAiIdentityIntent, IdentityCardData } from '../services/aiIdentityService'
import { detectCtaAction, CtaAction } from '../services/aiCtaService'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  sessionId?: string
  report?: IncidentReport
  businessAction?: AiBusinessAction
  identityCard?: IdentityCardData
  ctaAction?: CtaAction
}

const AIChatHome = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [inputValue, setInputValue] = useState('')
  const [placeholderIndex, setPlaceholderIndex] = useState(0)
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [category] = useState('PH')

  const placeholders = [
    "How do I renew my driver's license online?",
    "What are the requirements for National ID?",
    "How to apply for a Business Permit in 2026?",
    "How to request PSA Birth Certificate online?",
    "Where is the nearest Social Security office?"
  ]

  const featureCards = [
    { 
      icon: "badge", 
      title: "National ID & Civil Docs", 
      desc: "Check PhilSys ID, PSA certificates, birth/marriage records", 
      query: "How do I request a digital National ID or PSA Birth Certificate?" 
    },
    { 
      icon: "storefront", 
      title: "Business & Taxes", 
      desc: "Business permit renewal, BIR TIN, Tax filing guides", 
      query: "What are the requirements for renewing a Business Permit?" 
    },
    { 
      icon: "directions_car", 
      title: "LTO & Vehicle Permits", 
      desc: "Driver's license renewal, vehicle registration, LTFRB", 
      query: "How do I renew my driver's license and vehicle registration?" 
    },
    { 
      icon: "shield_person", 
      title: "Social Benefits & SSS", 
      desc: "SSS, GSIS, PhilHealth, Pag-IBIG contributions & loans", 
      query: "How can I check my SSS contribution and loan status?" 
    }
  ]

  const quickPrompts = [
    "Renew Driver's License",
    "Digital National ID",
    "Business Permit Renewal",
    "PSA Birth Certificate",
    "PhilHealth Membership",
    "TIN Application"
  ]

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % placeholders.length)
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, isLoading, error])

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
    if (!text || isLoading) return

    setError(null)
    setInputValue('')

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date()
    }
    setMessages(prev => [...prev, userMessage])
    setIsLoading(true)

    try {
      // 1. Check if user is asking for their own ID / passport / profile details
      const aiIdentityResult = processAiIdentityIntent(text, user)

      if (aiIdentityResult.isIdentityIntent && aiIdentityResult.card) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: aiIdentityResult.aiSummaryText || 'Here are your identity details from your eGovPH SSO account.',
          timestamp: new Date(),
          identityCard: aiIdentityResult.card,
        }
        setMessages(prev => [...prev, assistantMessage])
        setIsLoading(false)
        return
      }

      // 2. Check if user is describing an incident/problem to report
      const aiReportResult = await processAiReportIntent(text, user)

      if (aiReportResult.isReportIntent && aiReportResult.report) {
        // Auto-filed eReport!
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: aiReportResult.aiSummaryText || 'Incident report filed successfully.',
          timestamp: new Date(),
          report: aiReportResult.report
        }
        setMessages(prev => [...prev, assistantMessage])
      } else {
        // 3. Check if user is requesting Business Permit or Tax Payment
        const aiBusinessResult = processAiBusinessIntent(text, user)

        if (aiBusinessResult.isBusinessIntent && aiBusinessResult.action) {
          const assistantMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: aiBusinessResult.aiSummaryText || 'Here is your automated business application.',
            timestamp: new Date(),
            businessAction: aiBusinessResult.action
          }
          setMessages(prev => [...prev, assistantMessage])
        } else {
          // Normal AI assistant inquiry
          const contextualPrompt = buildContextualPrompt(text)
          const response = await generateAIResponse(contextualPrompt, category)

          // Detect if the AI response implies a submittable action
          const ctaResult = detectCtaAction(text, response.data, user)

          const assistantMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: response.data,
            timestamp: new Date(),
            sessionId: response.session_id,
            ctaAction: ctaResult.hasCta ? ctaResult.action : undefined,
          }
          setMessages(prev => [...prev, assistantMessage])
        }
      }
    } catch (err) {
      setError('Unable to fetch response from eGovPH AI assistant. Please try again.')
      console.error('AI Chat error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopy = (id: string, content: string) => {
    navigator.clipboard.writeText(content)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const clearChat = () => {
    setMessages([])
    setError(null)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-surface via-surface-container-low to-surface flex flex-col justify-between">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl bg-primary text-white shadow-2xl text-xs font-bold flex items-center gap-2 animate-bounce pointer-events-none">
          <span className="material-symbols-outlined text-base">check_circle</span>
          {toastMessage}
        </div>
      )}
      {/* Top Header Spacing */}
      <main className="flex-grow pt-20 pb-40 px-4 md:px-8 max-w-4xl mx-auto w-full flex flex-col">
        {messages.length === 0 ? (
          /* Landing / Hero Screen */
          <div className="flex-grow flex flex-col justify-center items-center text-center my-auto py-6 space-y-8 animate-fadeIn">
            
            {/* AI Assistant Core Badge */}
            <div className="relative group cursor-pointer" onClick={() => inputRef.current?.focus()}>
              <div className="w-24 h-24 md:w-28 md:h-28 rounded-full bg-gradient-to-tr from-primary via-surface-tint to-secondary p-1 shadow-xl hover:scale-105 transition-all duration-300">
                <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden shadow-inner">
                  <span className="material-symbols-outlined text-5xl md:text-6xl text-primary animate-pulse" style={{ fontVariationSettings: "'FILL' 1" }}>
                    smart_toy
                  </span>
                </div>
              </div>
              <div className="absolute bottom-0 right-0 bg-tertiary text-on-tertiary p-1.5 rounded-full shadow-lg border-2 border-white flex items-center justify-center">
                <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>
                  verified
                </span>
              </div>
            </div>

            {/* Greeting & Headline */}
            <div className="space-y-3 max-w-2xl">
              <h2 className="text-3xl md:text-4xl font-bold text-on-surface tracking-tight leading-tight">
                {user?.firstName ? (
                  <>
                    Magandang araw, <span className="text-primary">{user.firstName}</span>!
                  </>
                ) : (
                  'Welcome to eGovPH Assistant'
                )}
              </h2>
              <p className="text-on-surface-variant text-base md:text-lg">
                Your instant AI guide for Philippine government services, permits, requirements, and agency support.
              </p>
            </div>

            {/* User Authenticated Status Chip */}
            {user?.firstName && (
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-container/15 text-primary border border-primary/20 shadow-sm">
                <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>
                  account_circle
                </span>
                <span className="text-sm font-semibold">
                  Verified Citizen: {user.firstName} {user.lastName}
                </span>
                {user.uniqid && (
                  <span className="text-xs opacity-75 font-mono">({user.uniqid})</span>
                )}
              </div>
            )}

            {/* eReport Quick Action Banner */}
            <div 
              onClick={() => navigate('/ereport')}
              className="w-full p-4 rounded-2xl bg-gradient-to-r from-red-600 to-rose-700 text-white shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center justify-between gap-4 group"
            >
              <div className="flex items-center gap-3 text-left">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                    campaign
                  </span>
                </div>
                <div>
                  <h3 className="font-bold text-sm flex items-center gap-1.5">
                    File an Emergency or Public Report (eReport)
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-white/20 text-white">Live</span>
                  </h3>
                  <p className="text-xs text-white/90">Report potholes, public hazards, sanitation, or emergency incidents instantly.</p>
                </div>
              </div>
              <span className="material-symbols-outlined text-xl group-hover:translate-x-1 transition-transform">
                arrow_forward
              </span>
            </div>

            {/* Feature Bento Grid */}
            <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-4 text-left pt-2">
              {featureCards.map((card, idx) => (
                <div
                  key={idx}
                  onClick={() => handleSuggestionClick(card.query)}
                  className="group p-5 rounded-2xl bg-white/80 hover:bg-white border border-outline-variant/40 hover:border-primary/40 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-primary-container/20 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                      <span className="material-symbols-outlined text-2xl">{card.icon}</span>
                    </div>
                    <span className="material-symbols-outlined text-outline group-hover:text-primary group-hover:translate-x-1 transition-all text-xl">
                      arrow_forward
                    </span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-on-surface group-hover:text-primary transition-colors text-base">
                      {card.title}
                    </h3>
                    <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                      {card.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Prompts Carousel */}
            <div className="w-full pt-2">
              <p className="text-xs font-semibold text-outline uppercase tracking-wider mb-3">Suggested Topics</p>
              <div className="flex flex-wrap justify-center gap-2">
                {quickPrompts.map((prompt, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestionClick(`How to apply or renew ${prompt}?`)}
                    className="px-4 py-2 rounded-full bg-white hover:bg-primary-container/20 border border-outline-variant/40 hover:border-primary/40 text-on-surface-variant hover:text-primary text-xs font-medium transition-all shadow-sm active:scale-95"
                  >
                    ✨ {prompt}
                  </button>
                ))}
              </div>
            </div>

          </div>
        ) : (
          /* Active Chat Conversation Container */
          <div className="flex-grow flex flex-col space-y-4">
            
            {/* Sticky Chat Header Bar */}
            <div className="sticky top-20 z-30 bg-white/90 backdrop-blur-md px-5 py-3 rounded-2xl shadow-sm border border-outline-variant/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-primary to-secondary p-0.5 shadow-sm">
                  <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>
                      smart_toy
                    </span>
                  </div>
                </div>
                <div>
                  <h3 className="font-bold text-on-surface text-sm flex items-center gap-1.5">
                    eGovPH AI Assistant
                    <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse"></span>
                  </h3>
                  <p className="text-xs text-on-surface-variant">
                    {user?.firstName ? `Tailored for ${user.firstName}` : 'Official Philippine Government AI'}
                  </p>
                </div>
              </div>
              <button
                onClick={clearChat}
                className="px-3.5 py-1.5 rounded-full bg-surface-container hover:bg-error-container hover:text-on-error-container text-on-surface-variant text-xs font-semibold transition-all flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-base">delete</span>
                Clear Chat
              </button>
            </div>

            {/* Messages Feed */}
            <div className="space-y-5 pt-2">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`}
                >
                  {message.role === 'assistant' && (
                    <div className="w-9 h-9 rounded-full bg-primary-container text-primary flex items-center justify-center shrink-0 shadow-sm border border-primary/20">
                      <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                        smart_toy
                      </span>
                    </div>
                  )}

                  <div
                    className={`group relative max-w-[85%] md:max-w-[78%] rounded-2xl px-5 py-4 shadow-sm ${
                      message.role === 'user'
                        ? 'bg-primary text-white rounded-br-none'
                        : 'bg-white text-on-surface border border-outline-variant/30 rounded-bl-none'
                    }`}
                  >
                    {message.role === 'assistant' ? (
                      <div className="prose prose-sm max-w-none text-on-surface
                        prose-p:leading-relaxed prose-p:my-1.5
                        prose-strong:font-semibold prose-strong:text-on-surface
                        prose-ul:my-2 prose-ul:pl-5 prose-li:my-0.5
                        prose-ol:my-2 prose-ol:pl-5
                        prose-h1:text-base prose-h1:font-bold prose-h1:mt-3 prose-h1:mb-1
                        prose-h2:text-sm prose-h2:font-bold prose-h2:mt-2.5 prose-h2:mb-1
                        prose-h3:text-sm prose-h3:font-semibold prose-h3:mt-2 prose-h3:mb-1
                        prose-a:text-primary prose-a:underline hover:prose-a:opacity-80
                        prose-code:bg-surface-container prose-code:px-1 prose-code:rounded prose-code:text-xs prose-code:font-mono
                        prose-blockquote:border-l-2 prose-blockquote:border-primary/40 prose-blockquote:pl-3 prose-blockquote:text-on-surface-variant prose-blockquote:italic
                        break-words">
                        <ReactMarkdown>{message.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="text-sm md:text-base leading-relaxed whitespace-pre-wrap break-words">
                        {message.content}
                      </p>
                    )}

                    {/* 🟢 AI AUTO-FILED EREPORT SUMMARY CARD */}
                    {message.report && (
                      <div className="mt-4 p-4 rounded-xl bg-surface-container/60 border border-primary/20 space-y-3">
                        <div className="flex items-center justify-between gap-2 border-b border-primary/10 pb-2">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
                            <span className="material-symbols-outlined text-base">verified</span>
                            <span>Official eReport Filed</span>
                          </div>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            • {message.report.status}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="p-2 rounded bg-white border border-outline-variant/30">
                            <span className="text-[10px] text-on-surface-variant block">Tracking ID</span>
                            <span className="font-mono font-bold text-primary">{message.report.trackingId}</span>
                          </div>
                          <div className="p-2 rounded bg-white border border-outline-variant/30">
                            <span className="text-[10px] text-on-surface-variant block">Assigned Agency</span>
                            <span className="font-semibold text-on-surface truncate block">{message.report.agencyAssigned}</span>
                          </div>
                        </div>

                        <div className="text-xs text-on-surface-variant space-y-1">
                          <p><strong>Location:</strong> {message.report.location}</p>
                          <p><strong>Severity:</strong> <span className="capitalize font-semibold text-amber-700">{message.report.severity} Priority</span></p>
                        </div>

                        <button
                          onClick={() => navigate('/ereport')}
                          className="w-full py-2 rounded-lg bg-primary text-white font-bold text-xs hover:bg-primary/90 transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                        >
                          <span className="material-symbols-outlined text-sm">travel_explore</span>
                          Track Report Resolution Progress
                        </button>
                      </div>
                    )}

                    {/* 🔵 AI AUTOMATED BUSINESS & TAX TRANSACTION CARD */}
                    {message.businessAction && (
                      <div className="mt-4 p-4 rounded-xl bg-gradient-to-br from-primary/5 to-secondary/5 border border-primary/20 space-y-3">
                        <div className="flex items-center justify-between gap-2 border-b border-primary/15 pb-2">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
                            <span className="material-symbols-outlined text-base">account_balance</span>
                            <span>{message.businessAction.title}</span>
                          </div>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-primary-container text-primary">
                            AI Ready • ₱{message.businessAction.estimatedTotal.toLocaleString()}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="p-2 rounded bg-white border border-outline-variant/30">
                            <span className="text-[10px] text-on-surface-variant block">Agency</span>
                            <span className="font-semibold text-on-surface truncate block">{message.businessAction.agency}</span>
                          </div>
                          <div className="p-2 rounded bg-white border border-outline-variant/30">
                            <span className="text-[10px] text-on-surface-variant block">Applicant</span>
                            <span className="font-semibold text-on-surface truncate block">{message.businessAction.applicantName}</span>
                          </div>
                        </div>

                        {/* Integration Badges */}
                        <div className="flex flex-wrap gap-1.5">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[12px]">verified</span>
                            eVerify PhilSys
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[12px]">lock</span>
                            eGovPay Gateway
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[12px]">sms</span>
                            eMessage SMS
                          </span>
                        </div>

                        <button
                          onClick={() => navigate('/services/business')}
                          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-primary to-secondary text-white font-bold text-xs hover:opacity-95 transition-all flex items-center justify-center gap-2 shadow-md active:scale-98"
                        >
                          <span className="material-symbols-outlined text-base">payments</span>
                          Launch Transaction (eVerify + eGovPay) →
                        </button>
                      </div>
                    )}

                    {/* 🆔 IDENTITY CARD — PASSPORT / NATIONAL ID / PROFILE */}
                    {message.identityCard && (
                      <div className="mt-4 rounded-2xl overflow-hidden shadow-lg border-2 border-primary/30 bg-gradient-to-br from-blue-50 via-white to-indigo-50">
                        {/* Card Header */}
                        <div className="bg-gradient-to-r from-primary via-secondary to-tertiary px-4 py-3 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-white text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                              {message.identityCard.documentType === 'passport' ? 'flight_takeoff' :
                               message.identityCard.documentType === 'national_id' ? 'badge' : 'account_circle'}
                            </span>
                            <div className="text-white">
                              <p className="text-xs font-bold leading-none">
                                {message.identityCard.documentType === 'passport' ? 'Philippine Passport (DFA)' :
                                 message.identityCard.documentType === 'national_id' ? 'PhilSys National ID' : 'eGovPH Citizen Profile'}
                              </p>
                              <p className="text-[10px] opacity-90 mt-0.5">Republic of the Philippines</p>
                            </div>
                          </div>
                          <span className="px-2.5 py-1 rounded-full bg-white/20 text-white text-[9px] font-bold uppercase tracking-wide backdrop-blur-sm">
                            SSO Verified
                          </span>
                        </div>

                        {/* Card Body */}
                        <div className="p-4 space-y-4">
                          {/* Profile Photo + Name Block */}
                          <div className="flex items-start gap-4">
                            {/* Photo */}
                            <div className="shrink-0">
                              <div className="w-20 h-24 rounded-lg overflow-hidden border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/5 flex items-center justify-center shadow-sm">
                                {message.identityCard.profilePhotoUrl ? (
                                  <img
                                    src={message.identityCard.profilePhotoUrl}
                                    alt="Citizen photo"
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <span className="text-3xl font-bold text-primary/40">
                                    {message.identityCard.firstName?.[0]}{message.identityCard.lastName?.[0]}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Name & Core Info */}
                            <div className="flex-1 min-w-0 space-y-2">
                              <div>
                                <p className="text-[9px] uppercase tracking-wider font-bold text-primary/70 mb-0.5">Full Legal Name</p>
                                <p className="text-base font-bold text-on-surface leading-tight">{message.identityCard.fullName}</p>
                              </div>

                              <div className="grid grid-cols-2 gap-2 text-[11px]">
                                <div>
                                  <p className="text-[9px] uppercase tracking-wider font-semibold text-on-surface-variant mb-0.5">Date of Birth</p>
                                  <p className="font-semibold text-on-surface">{message.identityCard.birthdateFmt}</p>
                                </div>
                                <div>
                                  <p className="text-[9px] uppercase tracking-wider font-semibold text-on-surface-variant mb-0.5">PhilSys ID</p>
                                  <p className="font-mono font-bold text-primary text-[10px]">{message.identityCard.uniqid || 'N/A'}</p>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Contact & Address Section */}
                          <div className="border-t border-primary/10 pt-3 space-y-2.5 text-xs">
                            <div className="flex items-start gap-2">
                              <span className="material-symbols-outlined text-primary/70 text-sm mt-0.5 shrink-0">mail</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-[9px] uppercase tracking-wider font-semibold text-on-surface-variant">Email Address</p>
                                <p className="font-medium text-on-surface truncate">{message.identityCard.email || 'N/A'}</p>
                              </div>
                            </div>

                            <div className="flex items-start gap-2">
                              <span className="material-symbols-outlined text-primary/70 text-sm mt-0.5 shrink-0">phone</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-[9px] uppercase tracking-wider font-semibold text-on-surface-variant">Mobile Number</p>
                                <p className="font-mono font-medium text-on-surface">{message.identityCard.mobileNumber || 'N/A'}</p>
                              </div>
                            </div>

                            <div className="flex items-start gap-2">
                              <span className="material-symbols-outlined text-primary/70 text-sm mt-0.5 shrink-0">home_pin</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-[9px] uppercase tracking-wider font-semibold text-on-surface-variant">Registered Address</p>
                                <p className="font-medium text-on-surface leading-snug">{message.identityCard.address.full || 'N/A'}</p>
                              </div>
                            </div>
                          </div>

                          {/* Footer Badges */}
                          <div className="border-t border-primary/10 pt-3 flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-wrap gap-1.5">
                              <span className="px-2 py-1 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                                <span className="material-symbols-outlined text-[11px]">verified</span>
                                SSO Verified
                              </span>
                              <span className="px-2 py-1 rounded-full text-[9px] font-bold bg-blue-100 text-blue-800 flex items-center gap-1">
                                <span className="material-symbols-outlined text-[11px]">shield_person</span>
                                eGovPH Registry
                              </span>
                              {message.identityCard.profilePhotoUrl && (
                                <span className="px-2 py-1 rounded-full text-[9px] font-bold bg-purple-100 text-purple-800 flex items-center gap-1">
                                  <span className="material-symbols-outlined text-[11px]">face_retouching_natural</span>
                                  Face Liveness
                                </span>
                              )}
                            </div>
                            <p className="text-[9px] text-on-surface-variant font-mono">
                              Retrieved {new Date(message.identityCard.retrievedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>

                          {/* Action Buttons */}
                          <div className="grid grid-cols-2 gap-2 pt-2">
                            <button
                              onClick={() => navigate('/profile')}
                              className="py-2 rounded-lg bg-white border-2 border-primary/30 text-primary font-bold text-xs hover:bg-primary/5 transition-all flex items-center justify-center gap-1.5"
                            >
                              <span className="material-symbols-outlined text-sm">person</span>
                              View Full Profile
                            </button>
                            <button
                              onClick={() => {
                                const text = `${message.identityCard!.fullName}\nPhilSys ID: ${message.identityCard!.uniqid}\nBirthdate: ${message.identityCard!.birthdateFmt}\nEmail: ${message.identityCard!.email}\nMobile: ${message.identityCard!.mobileNumber}\nAddress: ${message.identityCard!.address.full}`
                                navigator.clipboard.writeText(text)
                                setToastMessage('Identity details copied to clipboard!')
                                setTimeout(() => setToastMessage(null), 2500)
                              }}
                              className="py-2 rounded-lg bg-gradient-to-r from-primary to-secondary text-white font-bold text-xs hover:opacity-95 transition-all flex items-center justify-center gap-1.5 shadow-sm"
                            >
                              <span className="material-symbols-outlined text-sm">content_copy</span>
                              Copy Details
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* ⚡ SMART CTA — Pre-filled action panel */}
                    {message.ctaAction && (
                      <div className="mt-4 rounded-2xl overflow-hidden border border-primary/20 shadow-md">
                        {/* Panel Header */}
                        <div className={`px-4 py-2.5 flex items-center gap-2 ${
                          message.ctaAction.colorTheme === 'secondary'
                            ? 'bg-gradient-to-r from-secondary to-tertiary'
                            : message.ctaAction.colorTheme === 'tertiary'
                            ? 'bg-gradient-to-r from-tertiary to-secondary'
                            : 'bg-gradient-to-r from-primary to-secondary'
                        }`}>
                          <span className="material-symbols-outlined text-white text-base" style={{ fontVariationSettings: "'FILL' 1" }}>
                            {message.ctaAction.icon}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-xs font-bold leading-none">{message.ctaAction.agency}</p>
                            <p className="text-white/80 text-[10px] mt-0.5">Ready to submit with your details</p>
                          </div>
                          <span className="px-2 py-0.5 rounded-full bg-white/20 text-white text-[9px] font-bold uppercase tracking-wide shrink-0">
                            Auto-Filled
                          </span>
                        </div>

                        {/* Pre-filled Details Preview */}
                        <div className="bg-white px-4 py-3 space-y-2">
                          <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Your details, ready to go</p>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="flex items-center gap-1.5 bg-surface-container/60 rounded-lg px-2.5 py-1.5">
                              <span className="material-symbols-outlined text-primary/60 text-sm shrink-0">person</span>
                              <div className="min-w-0">
                                <p className="text-[9px] text-on-surface-variant">Name</p>
                                <p className="text-xs font-semibold text-on-surface truncate">{message.ctaAction.preFilled.name}</p>
                              </div>
                            </div>
                            {message.ctaAction.preFilled.location && (
                              <div className="flex items-center gap-1.5 bg-surface-container/60 rounded-lg px-2.5 py-1.5">
                                <span className="material-symbols-outlined text-primary/60 text-sm shrink-0">home_pin</span>
                                <div className="min-w-0">
                                  <p className="text-[9px] text-on-surface-variant">Location</p>
                                  <p className="text-xs font-semibold text-on-surface truncate">{message.ctaAction.preFilled.location}</p>
                                </div>
                              </div>
                            )}
                            {message.ctaAction.preFilled.email && (
                              <div className="flex items-center gap-1.5 bg-surface-container/60 rounded-lg px-2.5 py-1.5">
                                <span className="material-symbols-outlined text-primary/60 text-sm shrink-0">mail</span>
                                <div className="min-w-0">
                                  <p className="text-[9px] text-on-surface-variant">Email</p>
                                  <p className="text-xs font-semibold text-on-surface truncate">{message.ctaAction.preFilled.email}</p>
                                </div>
                              </div>
                            )}
                            {message.ctaAction.preFilled.mobile && (
                              <div className="flex items-center gap-1.5 bg-surface-container/60 rounded-lg px-2.5 py-1.5">
                                <span className="material-symbols-outlined text-primary/60 text-sm shrink-0">phone</span>
                                <div className="min-w-0">
                                  <p className="text-[9px] text-on-surface-variant">Mobile</p>
                                  <p className="text-xs font-semibold text-on-surface font-mono">{message.ctaAction.preFilled.mobile}</p>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Trust row */}
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                              <span className="material-symbols-outlined text-[11px]">verified</span>
                              SSO Verified Identity
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-100 text-blue-800 flex items-center gap-1">
                              <span className="material-symbols-outlined text-[11px]">lock</span>
                              eGovPH Secured
                            </span>
                            {message.ctaAction.estimatedTime && (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-100 text-amber-800 flex items-center gap-1">
                                <span className="material-symbols-outlined text-[11px]">schedule</span>
                                ~{message.ctaAction.estimatedTime}
                              </span>
                            )}
                          </div>

                          {/* CTA Button */}
                          <button
                            onClick={() => {
                              if (message.ctaAction?.targetRoute) {
                                navigate(message.ctaAction.targetRoute)
                              } else {
                                // Pre-fill the input to trigger the business flow
                                handleSuggestionClick(
                                  message.ctaAction?.actionType === 'drivers_license_renewal'
                                    ? 'I want to renew my driver\'s license'
                                    : message.ctaAction?.actionType === 'national_id_application'
                                    ? 'I want to apply for a National ID'
                                    : message.ctaAction?.actionType === 'passport_application'
                                    ? 'I want to apply for a passport'
                                    : message.ctaAction?.actionType === 'sss_contribution'
                                    ? 'I want to pay my SSS contribution'
                                    : message.ctaAction?.actionType === 'philhealth_registration'
                                    ? 'I want to register for PhilHealth'
                                    : message.ctaAction?.actionType === 'civil_registration'
                                    ? 'I want to request a PSA document'
                                    : message.ctaAction?.actionType === 'vehicle_registration'
                                    ? 'I want to register my vehicle'
                                    : `Process ${message.ctaAction?.agency} application`
                                )
                              }
                            }}
                            className={`mt-1 w-full py-2.5 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 shadow-md hover:opacity-95 active:scale-[0.98] transition-all ${
                              message.ctaAction.colorTheme === 'secondary'
                                ? 'bg-gradient-to-r from-secondary to-tertiary'
                                : message.ctaAction.colorTheme === 'tertiary'
                                ? 'bg-gradient-to-r from-tertiary to-secondary'
                                : 'bg-gradient-to-r from-primary to-secondary'
                            }`}
                          >
                            <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>
                              {message.ctaAction.icon}
                            </span>
                            {message.ctaAction.ctaLabel}
                            <span className="material-symbols-outlined text-base ml-auto">arrow_forward</span>
                          </button>
                          <p className="text-[10px] text-center text-on-surface-variant pb-1">
                            {message.ctaAction.ctaDescription}
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-4 mt-2.5 pt-1 border-t border-black/5 text-[11px] opacity-70">
                      <span>
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      
                      {message.role === 'assistant' && (
                        <button
                          onClick={() => handleCopy(message.id, message.content)}
                          className="hover:opacity-100 flex items-center gap-1 transition-opacity"
                        >
                          <span className="material-symbols-outlined text-sm">
                            {copiedId === message.id ? 'check' : 'content_copy'}
                          </span>
                          {copiedId === message.id ? 'Copied' : 'Copy'}
                        </button>
                      )}
                    </div>
                  </div>

                  {message.role === 'user' && (
                    <div className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center shrink-0 shadow-sm font-bold text-sm">
                      {user?.firstName?.[0] || 'U'}
                    </div>
                  )}
                </div>
              ))}

              {/* Thinking / Loading State */}
              {isLoading && (
                <div className="flex gap-3 justify-start items-center animate-pulse">
                  <div className="w-9 h-9 rounded-full bg-primary-container text-primary flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                      smart_toy
                    </span>
                  </div>
                  <div className="bg-white border border-outline-variant/30 rounded-2xl rounded-bl-none px-5 py-4 shadow-sm flex items-center gap-2">
                    <span className="text-xs text-on-surface-variant font-medium">eGovPH AI is searching government databases</span>
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                      <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                      <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                    </div>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="flex gap-3 justify-start">
                  <div className="w-9 h-9 rounded-full bg-error-container text-on-error-container flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-xl">error</span>
                  </div>
                  <div className="bg-error-container/40 border border-error/30 text-on-error-container rounded-2xl px-5 py-4 shadow-sm flex flex-col gap-2">
                    <p className="text-sm font-medium">{error}</p>
                    <button 
                      onClick={() => handleSend(messages[messages.length - 1]?.content)} 
                      className="text-xs font-bold text-error underline text-left hover:opacity-80"
                    >
                      Retry last request
                    </button>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>
        )}
      </main>

      {/* 🟢 FIXED & ENHANCED CHAT INPUT SHELL (Always positioned above BottomNav) */}
      <div className="fixed bottom-[76px] left-0 right-0 z-40 px-4 md:px-6 pointer-events-none">
        <div className="max-w-3xl mx-auto pointer-events-auto">
          <div className="bg-white/95 backdrop-blur-xl p-2 md:p-3 rounded-3xl shadow-2xl border-2 border-primary/20 hover:border-primary/50 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10 transition-all duration-300 flex items-center gap-2">
            
            {/* Action / Sparkle Icon */}
            <button 
              type="button"
              onClick={() => inputRef.current?.focus()}
              className="w-10 h-10 md:w-11 md:h-11 flex items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container hover:text-primary transition-colors shrink-0"
              title="Focus Input"
            >
              <span className="material-symbols-outlined text-xl md:text-2xl">chat_spark</span>
            </button>

            {/* Input Field */}
            <div className="flex-grow relative">
              <input
                ref={inputRef}
                className="w-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-on-surface text-sm md:text-base placeholder:text-outline/80 px-2 py-2 font-medium"
                placeholder={placeholders[placeholderIndex]}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !isLoading && handleSend()}
                disabled={isLoading}
              />
            </div>

            {/* Auto Suggest Prompt */}
            <button 
              type="button"
              onClick={() => setInputValue("What are the requirements for National ID?")}
              className="w-10 h-10 md:w-11 md:h-11 flex items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container hover:text-primary transition-colors shrink-0"
              title="Quick sample prompt"
            >
              <span className="material-symbols-outlined text-xl md:text-2xl">auto_awesome</span>
            </button>

            {/* Send Button */}
            <button 
              type="button"
              onClick={() => handleSend()}
              disabled={isLoading || !inputValue.trim()}
              className="w-10 h-10 md:w-11 md:h-11 flex items-center justify-center rounded-full bg-primary text-white shadow-md hover:bg-primary/90 hover:scale-105 active:scale-95 transition-all duration-200 disabled:opacity-40 disabled:hover:scale-100 disabled:cursor-not-allowed shrink-0"
              title="Send Message"
            >
              <span className="material-symbols-outlined text-xl md:text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                {isLoading ? 'progress_activity' : 'send'}
              </span>
            </button>
          </div>
          
          <p className="text-[11px] text-center text-on-surface-variant/70 mt-1.5 font-medium">
            eGovPH AI Assistant provides official informational guidance for Philippine government services.
          </p>
        </div>
      </div>
    </div>
  )
}

export default AIChatHome
