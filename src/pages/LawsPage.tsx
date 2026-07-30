import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { generateLawsResponse } from '../services/egovService'

// ── Popular topic shortcuts ───────────────────────────────────────────────────
const QUICK_TOPICS = [
  { icon: 'gavel', label: 'Labor Code', prompt: 'Explain the key provisions of the Philippine Labor Code.' },
  { icon: 'family_restroom', label: 'Family Code', prompt: 'What are the key provisions of the Philippine Family Code?' },
  { icon: 'storefront', label: 'Business Laws', prompt: 'What Philippine laws govern business registration and operations?' },
  { icon: 'directions_car', label: 'LTO & Traffic', prompt: 'What are the traffic laws and penalties under the Philippine Land Transportation Code?' },
  { icon: 'apartment', label: 'Property Law', prompt: 'Explain property ownership laws in the Philippines, including the Condo Act and subdivision rules.' },
  { icon: 'privacy_tip', label: 'Data Privacy', prompt: 'Explain the Philippine Data Privacy Act of 2012 (RA 10173) and its key obligations.' },
  { icon: 'balance', label: 'Anti-Corruption', prompt: 'What Philippine laws address graft, corruption, and plunder?' },
  { icon: 'school', label: 'Education Laws', prompt: 'What are the main education laws in the Philippines, including the Universal Access to Quality Tertiary Education Act?' },
]

interface LawsResult {
  prompt: string
  response: string
  sessionId: string
  timestamp: Date
}

const LawsPage = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [searchParams] = useSearchParams()

  const [query, setQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState<LawsResult[]>([])
  const [error, setError] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const didAutoSearch = useRef(false)

  // Auto-populate from chat navigation (?q=...)
  // Uses a ref guard to prevent double-fire in StrictMode
  useEffect(() => {
    if (didAutoSearch.current) return
    const q = searchParams.get('q')
    if (!q) return
    didAutoSearch.current = true
    setQuery(q)
    // Small delay to let the component fully mount before firing the API call
    const t = setTimeout(() => {
      generateLawsResponse(q, 'PH')
        .then(res => {
          setResults([{
            prompt: q,
            response: res.data,
            sessionId: res.session_id,
            timestamp: new Date(),
          }])
        })
        .catch(() => setError('Unable to fetch legal information. Please try again.'))
        .finally(() => setIsLoading(false))
      setIsLoading(true)
    }, 100)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [results, isLoading])

  const handleSearch = async (overrideQuery?: string) => {
    const q = (overrideQuery ?? query).trim()
    if (!q || isLoading) return

    setError(null)
    setIsLoading(true)

    try {
      const res = await generateLawsResponse(q, 'PH')
      setResults(prev => [
        ...prev,
        {
          prompt: q,
          response: res.data,
          sessionId: res.session_id,
          timestamp: new Date(),
        },
      ])
      if (!overrideQuery) setQuery('')
    } catch {
      setError('Unable to fetch legal information. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const citizenName = user ? `${user.firstName} ${user.lastName}`.trim() : ''

  return (
    <main className="min-h-screen pt-20 pb-40 px-4 md:px-8 max-w-4xl mx-auto w-full">

      {/* ── Page Header ───────────────────────────────────────────────────── */}
      <div className="mb-8 space-y-3">
        <button
          onClick={() => navigate('/home')}
          className="flex items-center gap-1.5 text-xs text-on-surface-variant hover:text-primary transition-colors"
        >
          <span className="material-symbols-outlined text-base">arrow_back</span>
          Back to AI Assistant
        </button>

        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-lg shrink-0">
            <span className="material-symbols-outlined text-white text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              balance
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl md:text-3xl font-bold text-on-surface">Laws & Regulations</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 border border-indigo-200">
                AI-Powered
              </span>
            </div>
            <p className="text-sm text-on-surface-variant">
              Ask any question about Philippine laws, regulations, and legal rights.
              {citizenName && (
                <span className="ml-1 text-indigo-600 font-semibold">
                  Personalized for {citizenName}.
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200">
          <span className="material-symbols-outlined text-amber-600 text-base shrink-0 mt-0.5">info</span>
          <p className="text-[11px] text-amber-800">
            This AI provides general legal information based on Philippine laws. It is not a substitute for professional legal advice. For specific legal concerns, consult a licensed Philippine attorney.
          </p>
        </div>
      </div>

      {/* ── Quick Topics ──────────────────────────────────────────────────── */}
      {results.length === 0 && (
        <div className="mb-8 space-y-3">
          <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Popular Legal Topics</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {QUICK_TOPICS.map((topic, i) => (
              <button
                key={i}
                onClick={() => {
                  setQuery(topic.prompt)
                  handleSearch(topic.prompt)
                }}
                disabled={isLoading}
                className="group p-3 rounded-xl bg-white border border-outline-variant/40 hover:border-indigo-300 hover:shadow-sm transition-all text-left flex flex-col gap-2 disabled:opacity-50"
              >
                <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                  <span className="material-symbols-outlined text-xl">{topic.icon}</span>
                </div>
                <p className="text-xs font-semibold text-on-surface group-hover:text-indigo-700 transition-colors leading-tight">
                  {topic.label}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Results Feed ──────────────────────────────────────────────────── */}
      {results.length > 0 && (
        <div className="space-y-6 mb-6">
          {results.map((result, idx) => (
            <div key={idx} className="space-y-3 animate-fadeIn">
              {/* User question bubble */}
              <div className="flex justify-end">
                <div className="max-w-[80%] bg-indigo-600 text-white rounded-2xl rounded-br-none px-5 py-3 shadow-sm">
                  <p className="text-sm font-medium leading-relaxed">{result.prompt}</p>
                  <p className="text-[10px] text-white/60 mt-1.5">
                    {result.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>

              {/* AI response bubble */}
              <div className="flex gap-3">
                <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 shadow-sm border border-indigo-200">
                  <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>balance</span>
                </div>
                <div className="flex-1 bg-white rounded-2xl rounded-bl-none px-5 py-4 shadow-sm border border-outline-variant/30">
                  {/* Header tag */}
                  <div className="flex items-center gap-1.5 mb-3 pb-2 border-b border-outline-variant/20">
                    <span className="material-symbols-outlined text-indigo-600 text-sm">verified</span>
                    <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wide">eGovPH Laws & Regulations AI</span>
                    <span className="ml-auto text-[9px] text-on-surface-variant font-mono">PH Jurisdiction</span>
                  </div>

                  {/* Response content */}
                  <div className="prose prose-sm max-w-none text-on-surface
                    prose-p:leading-relaxed prose-p:my-1.5
                    prose-strong:font-semibold prose-strong:text-on-surface
                    prose-ul:my-2 prose-ul:pl-5 prose-li:my-0.5
                    prose-ol:my-2 prose-ol:pl-5
                    prose-h1:text-base prose-h1:font-bold prose-h1:mt-3 prose-h1:mb-1
                    prose-h2:text-sm prose-h2:font-bold prose-h2:mt-2.5 prose-h2:mb-1
                    prose-h3:text-sm prose-h3:font-semibold prose-h3:mt-2 prose-h3:mb-1
                    prose-a:text-indigo-600 prose-a:underline
                    prose-blockquote:border-l-2 prose-blockquote:border-indigo-400 prose-blockquote:pl-3 prose-blockquote:text-on-surface-variant prose-blockquote:italic
                    break-words">
                    <ReactMarkdown>{result.response}</ReactMarkdown>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-outline-variant/10 text-[11px] text-on-surface-variant/70">
                    <span>{result.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <button
                      onClick={() => handleCopy(result.sessionId, result.response)}
                      className="flex items-center gap-1 hover:opacity-100 transition-opacity"
                    >
                      <span className="material-symbols-outlined text-sm">
                        {copiedId === result.sessionId ? 'check' : 'content_copy'}
                      </span>
                      {copiedId === result.sessionId ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Loading state */}
          {isLoading && (
            <div className="flex gap-3 items-center animate-pulse">
              <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>balance</span>
              </div>
              <div className="bg-white border border-outline-variant/30 rounded-2xl px-5 py-4 shadow-sm flex items-center gap-2">
                <span className="text-xs text-on-surface-variant font-medium">Searching Philippine laws database</span>
                <div className="flex gap-1">
                  {[0, 150, 300].map(delay => (
                    <span key={delay} className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: `${delay}ms` }} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-4 rounded-xl bg-error-container/40 border border-error/30 text-xs text-error">
              <span className="material-symbols-outlined text-base">error</span>
              {error}
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      )}

      {/* ── Fixed Search Bar ──────────────────────────────────────────────── */}
      <div className="fixed bottom-[76px] left-0 right-0 z-40 px-4 md:px-6 pointer-events-none">
        <div className="max-w-4xl mx-auto pointer-events-auto">
          <div className="bg-white/95 backdrop-blur-xl p-3 rounded-3xl shadow-2xl border-2 border-indigo-200 hover:border-indigo-400 focus-within:border-indigo-600 focus-within:ring-4 focus-within:ring-indigo-100 transition-all duration-300">
            <div className="flex items-end gap-2">
              <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 mb-0.5">
                <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>balance</span>
              </div>
              <textarea
                ref={inputRef}
                rows={1}
                className="flex-grow bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-on-surface text-sm placeholder:text-outline/70 px-2 py-1.5 font-medium resize-none leading-relaxed"
                placeholder="Ask about Philippine laws, rights, or regulations…"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey && !isLoading) {
                    e.preventDefault()
                    handleSearch()
                  }
                }}
                disabled={isLoading}
                style={{ minHeight: '36px', maxHeight: '120px' }}
              />
              <button
                type="button"
                onClick={() => handleSearch()}
                disabled={isLoading || !query.trim()}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-indigo-600 text-white shadow-md hover:bg-indigo-700 hover:scale-105 active:scale-95 transition-all disabled:opacity-40 disabled:hover:scale-100 shrink-0"
                title="Search laws"
              >
                <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                  {isLoading ? 'progress_activity' : 'search'}
                </span>
              </button>
            </div>
          </div>
          <p className="text-[11px] text-center text-on-surface-variant/70 mt-1.5 font-medium">
            Powered by eGovPH Laws & Regulations AI · Philippine Jurisdiction
          </p>
        </div>
      </div>

    </main>
  )
}

export default LawsPage
