import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  AiReportDraft,
  IncidentReport,
  ReportCategory,
  ReportSeverity,
  categoryLabels,
  clearPendingAiReportDraft,
  generateAiReportDraft,
  getPendingAiReportDraft,
  saveAiReportDraft,
  getUserReports,
  submitIncidentReport,
  getReportByTrackingId,
} from '../services/eReportService'

const EReportPage = () => {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<'submit' | 'track'>('submit')
  
  // Form State
  const [category, setCategory] = useState<ReportCategory>('infrastructure')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [severity, setSeverity] = useState<ReportSeverity>('medium')
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  // AI-assisted draft state. Generated reports remain drafts until form submission.
  const [aiPrompt, setAiPrompt] = useState('')
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false)
  const [aiDraftError, setAiDraftError] = useState<string | null>(null)
  const [aiDraftActive, setAiDraftActive] = useState(false)
  const [draftSourcePrompt, setDraftSourcePrompt] = useState('')
  
  // Submission & List States
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submittedReport, setSubmittedReport] = useState<IncidentReport | null>(null)
  const [reports, setReports] = useState<IncidentReport[]>([])
  const [searchTrackingId, setSearchTrackingId] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [copiedId, setCopiedId] = useState(false)
  const [selectedReport, setSelectedReport] = useState<IncidentReport | null>(null)

  useEffect(() => {
    loadReports()

    const pendingDraft = getPendingAiReportDraft()
    if (pendingDraft) {
      setCategory(pendingDraft.category)
      setTitle(pendingDraft.title)
      setDescription(pendingDraft.description)
      setLocation(pendingDraft.location)
      setSeverity(pendingDraft.severity)
      setImagePreview(pendingDraft.imageUrl || null)
      setDraftSourcePrompt(pendingDraft.sourcePrompt)
      setAiPrompt(pendingDraft.sourcePrompt)
      setAiDraftActive(true)
      setActiveTab('submit')
    }
  }, [])

  const loadReports = async () => {
    const list = await getUserReports()
    setReports(list)
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const applyAiDraft = (draft: AiReportDraft) => {
    saveAiReportDraft(draft)
    setCategory(draft.category)
    setTitle(draft.title)
    setDescription(draft.description)
    setLocation(draft.location)
    setSeverity(draft.severity)
    setImagePreview(draft.imageUrl || null)
    setDraftSourcePrompt(draft.sourcePrompt)
    setAiDraftActive(true)
    setActiveTab('submit')
  }

  const handleGenerateAiDraft = async () => {
    const prompt = aiPrompt.trim()
    if (!prompt || isGeneratingDraft) return

    setIsGeneratingDraft(true)
    setAiDraftError(null)
    try {
      const draft = await generateAiReportDraft(prompt, user)
      applyAiDraft(draft)
    } catch (err) {
      console.error('Error generating AI eReport draft:', err)
      setAiDraftError('The AI could not generate a draft right now. You can retry or continue with the manual form.')
    } finally {
      setIsGeneratingDraft(false)
    }
  }

  const handleStartManualReport = () => {
    clearPendingAiReportDraft()
    setAiDraftActive(false)
    setDraftSourcePrompt('')
    setAiDraftError(null)
    setCategory('infrastructure')
    setTitle('')
    setDescription('')
    setLocation('')
    setSeverity('medium')
    setImagePreview(null)
  }

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !description.trim() || !location.trim()) return

    setIsSubmitting(true)
    try {
      const citizenName = user
        ? [user.firstName, user.middleName, user.lastName].filter(Boolean).join(' ')
        : 'Anonymous Citizen'
      
      const citizenEmail = user?.email || ''
      const citizenMobile = user?.mobileNumber || ''

      const report = await submitIncidentReport({
        category,
        title: title.trim(),
        description: description.trim(),
        location: location.trim(),
        severity,
        imageUrl: imagePreview || undefined,
        citizenName,
        citizenEmail,
        citizenMobile
      })

      setSubmittedReport(report)
      clearPendingAiReportDraft()
      setAiDraftActive(false)
      setDraftSourcePrompt('')
      await loadReports()

      // Reset form
      setTitle('')
      setDescription('')
      setLocation('')
      setImagePreview(null)
      setSeverity('medium')
    } catch (err) {
      console.error('Error submitting eReport:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSearchTracking = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchTrackingId.trim()) {
      loadReports()
      return
    }
    const found = await getReportByTrackingId(searchTrackingId)
    if (found) {
      setSelectedReport(found)
    } else {
      alert(`No report found matching Tracking ID "${searchTrackingId}"`)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(true)
    setTimeout(() => setCopiedId(false), 2000)
  }

  const filteredReports = reports.filter(r => {
    if (statusFilter === 'all') return true
    return r.status.toLowerCase() === statusFilter.toLowerCase()
  })

  return (
    <main className="min-h-screen pt-20 pb-36 px-4 md:px-8 max-w-4xl mx-auto w-full">
      
      {/* Hero Header */}
      <section className="mb-6 text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary-container/15 text-primary border border-primary/20">
          <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>
            campaign
          </span>
          <span className="text-xs font-bold uppercase tracking-wider">Official eGovPH eReport System</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-on-surface tracking-tight">
          Citizen Emergency & Incident Reporting
        </h1>
        <p className="text-on-surface-variant text-sm md:text-base max-w-2xl mx-auto">
          File community hazards, infrastructure damage, and public safety issues directly to local and national government agencies.
        </p>
      </section>

      {/* Emergency 911 Callout Banner */}
      <div className="mb-8 p-4 rounded-2xl bg-gradient-to-r from-red-600 to-rose-700 text-white shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              e911_emergency
            </span>
          </div>
          <div>
            <h3 className="font-bold text-base">Life-Threatening Emergency?</h3>
            <p className="text-xs text-white/90">For immediate police, fire, or medical rescue call National Emergency hotline directly.</p>
          </div>
        </div>
        <a
          href="tel:911"
          className="px-5 py-2.5 rounded-full bg-white text-red-700 font-bold text-sm hover:bg-red-50 transition-colors shadow-md shrink-0 flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-lg">call</span>
          Call Emergency 911
        </a>
      </div>

      {/* Navigation Tabs */}
      <div className="flex bg-surface-container rounded-2xl p-1.5 mb-8 shadow-inner border border-outline-variant/30">
        <button
          onClick={() => setActiveTab('submit')}
          className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
            activeTab === 'submit'
              ? 'bg-white text-primary shadow-sm'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-lg">add_alert</span>
          File New Incident Report
        </button>
        <button
          onClick={() => { setActiveTab('track'); loadReports() }}
          className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
            activeTab === 'track'
              ? 'bg-white text-primary shadow-sm'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-lg">travel_explore</span>
          Track My Reports ({reports.length})
        </button>
      </div>

      {/* TAB 1: SUBMIT REPORT */}
      {activeTab === 'submit' && (
        <div className="space-y-6">
          {/* Optional AI drafting assistant. The manual form remains available below. */}
          <section className="rounded-3xl overflow-hidden border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-blue-50 shadow-sm">
            <div className="p-5 md:p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-violet-600 to-primary text-white flex items-center justify-center shadow-md shrink-0">
                    <span className="material-symbols-outlined">auto_awesome</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="font-bold text-on-surface">Create an eReport with AI</h2>
                      <span className="px-2 py-0.5 rounded-full bg-violet-100 text-violet-800 text-[10px] font-bold uppercase tracking-wide">
                        Draft only
                      </span>
                    </div>
                    <p className="text-xs text-on-surface-variant mt-1 max-w-2xl">
                      Describe what happened in your own words. AI will fill the form, but it will not submit anything until you review the fields and press the final submit button.
                    </p>
                  </div>
                </div>
                {aiDraftActive && (
                  <button
                    type="button"
                    onClick={handleStartManualReport}
                    className="text-xs font-semibold text-primary hover:underline whitespace-nowrap"
                  >
                    Start blank manual form
                  </button>
                )}
              </div>

              <textarea
                rows={3}
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="Example: Create a report about an uncollected garbage pile blocking the sidewalk near Barangay Hall in Pasig for four days."
                className="w-full px-4 py-3 rounded-2xl border border-violet-200 bg-white focus:border-violet-500 focus:ring-2 focus:ring-violet-200 outline-none text-sm resize-y"
              />

              {aiDraftError && (
                <p className="text-xs text-error flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-base">error</span>
                  {aiDraftError}
                </p>
              )}

              <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={() => setAiPrompt('Create an eReport about a broken streetlight making the intersection unsafe near our barangay hall.')}
                  className="text-xs text-violet-700 font-semibold hover:underline text-left"
                >
                  Use a sample prompt
                </button>
                <button
                  type="button"
                  onClick={handleGenerateAiDraft}
                  disabled={isGeneratingDraft || !aiPrompt.trim()}
                  className="px-5 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-primary text-white font-bold text-sm shadow-md hover:opacity-95 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <span className={`material-symbols-outlined text-lg ${isGeneratingDraft ? 'animate-spin' : ''}`}>
                    {isGeneratingDraft ? 'progress_activity' : 'auto_awesome'}
                  </span>
                  {isGeneratingDraft ? 'AI is drafting your report...' : 'Generate Editable Draft'}
                </button>
              </div>
            </div>
          </section>

          <form onSubmit={handleFormSubmit} className="space-y-6">
            {aiDraftActive && (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <span className="material-symbols-outlined text-amber-700">rate_review</span>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-sm text-amber-950">AI draft ready for your review</h3>
                      <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 text-[10px] font-bold">Not submitted</span>
                    </div>
                    <p className="text-xs text-amber-900/80 mt-1">
                      Every field below is editable. Correct missing or inaccurate details before your final submission.
                    </p>
                    {draftSourcePrompt && (
                      <p className="text-[11px] text-amber-900/70 mt-2 line-clamp-2">
                        <strong>Created from:</strong> “{draftSourcePrompt}”
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

          {/* Category Selector Cards */}
          <div className="space-y-3">
            <label className="block text-sm font-bold text-on-surface">
              1. Select Incident Category <span className="text-error">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { id: 'infrastructure', label: 'Infrastructure', icon: 'construction', desc: 'Potholes, broken lights, bridges' },
                { id: 'safety', label: 'Public Safety', icon: 'shield', desc: 'Crime, hazards, dark alleys' },
                { id: 'sanitation', label: 'Waste & Sanitation', icon: 'delete_sweep', desc: 'Garbage, drainage clog, sewage' },
                { id: 'traffic', label: 'Traffic & Transport', icon: 'traffic', desc: 'Signals, illegal parking, blockage' },
                { id: 'emergency', label: 'Disaster / Emergency', icon: 'warning', desc: 'Floods, landslides, fallen trees' },
                { id: 'corruption', label: 'Public Integrity', icon: 'gavel', desc: 'Service delays, red tape, concern' },
                { id: 'other', label: 'Other Concern', icon: 'description', desc: 'Other community or public issue' }
              ].map(cat => (
                <div
                  key={cat.id}
                  onClick={() => setCategory(cat.id as ReportCategory)}
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-2 ${
                    category === cat.id
                      ? 'border-primary bg-primary-container/10 shadow-md'
                      : 'border-outline-variant/40 bg-white hover:border-primary/50'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    category === cat.id ? 'bg-primary text-white' : 'bg-surface-container text-on-surface-variant'
                  }`}>
                    <span className="material-symbols-outlined text-xl">{cat.icon}</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-on-surface">{cat.label}</h4>
                    <p className="text-[11px] text-on-surface-variant leading-tight mt-0.5">{cat.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Form Inputs Container */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-outline-variant/40 space-y-5">
            
            {/* Title */}
            <div>
              <label className="block text-sm font-bold text-on-surface mb-1.5">
                2. Incident Title / Summary <span className="text-error">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Broken Streetlight causing dark intersection on Main St."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm"
              />
            </div>

            {/* Location */}
            <div>
              <label className="text-sm font-bold text-on-surface mb-1.5 flex items-center justify-between">
                <span>3. Specific Location / Landmark <span className="text-error">*</span></span>
                <button
                  type="button"
                  onClick={() => setLocation(user?.address?.city ? `${user.address.barangay || ''}, ${user.address.city}, ${user.address.province || ''}` : 'Quezon City, Metro Manila')}
                  className="text-xs text-primary font-semibold hover:underline flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-sm">my_location</span>
                  Use My Profile Address
                </button>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Corner Katipunan Ave and Aurora Blvd, Brgy. Loyola Heights"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-bold text-on-surface mb-1.5">
                4. Detailed Description <span className="text-error">*</span>
              </label>
              <textarea
                required
                rows={3}
                placeholder="Describe what happened, any immediate hazards, or specific assistance required..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm"
              />
            </div>

            {/* Severity Level */}
            <div>
              <label className="block text-sm font-bold text-on-surface mb-2">
                5. Urgency / Severity Level
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: 'low', label: 'Low', color: 'bg-emerald-500' },
                  { id: 'medium', label: 'Medium', color: 'bg-amber-500' },
                  { id: 'high', label: 'High', color: 'bg-orange-600' },
                  { id: 'critical', label: 'Critical', color: 'bg-red-600' }
                ].map(sev => (
                  <button
                    type="button"
                    key={sev.id}
                    onClick={() => setSeverity(sev.id as ReportSeverity)}
                    className={`py-2.5 px-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                      severity === sev.id
                        ? 'border-primary bg-primary-container/20 text-primary ring-2 ring-primary/20'
                        : 'border-outline-variant/50 text-on-surface-variant hover:bg-surface-container'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${sev.color}`}></span>
                    {sev.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Evidence Image Attachment */}
            <div>
              <label className="block text-sm font-bold text-on-surface mb-1.5">
                6. Attach Photo Evidence (Optional)
              </label>
              <div className="flex items-center gap-4">
                <label className="cursor-pointer px-4 py-2.5 rounded-xl border-2 border-dashed border-primary/40 hover:border-primary bg-primary-container/5 hover:bg-primary-container/10 transition-colors flex items-center gap-2 text-xs font-bold text-primary">
                  <span className="material-symbols-outlined text-lg">add_a_photo</span>
                  Upload Incident Photo
                  <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                </label>
                {imagePreview && (
                  <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-outline-variant">
                    <img src={imagePreview} alt="Evidence preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setImagePreview(null)}
                      className="absolute top-0 right-0 bg-red-600 text-white p-0.5 rounded-bl"
                    >
                      <span className="material-symbols-outlined text-xs">close</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Reporter Profile Preview */}
            <div className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/30 text-xs flex items-center justify-between text-on-surface-variant">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-base">verified_user</span>
                <span>
                  Reporting as: <strong className="text-on-surface">{user ? `${user.firstName} ${user.lastName}` : 'Guest Citizen'}</strong>
                  {user?.mobileNumber && ` (${user.mobileNumber})`}
                </span>
              </div>
              <span className="text-[11px] text-tertiary font-medium">Verified eGovPH Identity</span>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || !title.trim() || !description.trim() || !location.trim()}
              className="w-full py-4 rounded-xl bg-primary text-white font-bold text-sm shadow-lg hover:bg-primary/90 active:scale-98 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-xl">send</span>
              {isSubmitting
                ? 'Submitting Incident Report...'
                : aiDraftActive
                  ? 'Review Complete — Submit Incident Report'
                  : 'Submit Incident Report'}
            </button>

          </div>

          </form>
        </div>
      )}

      {/* TAB 2: TRACK REPORTS */}
      {activeTab === 'track' && (
        <div className="space-y-6">

          {/* Tracking ID Search Bar */}
          <form onSubmit={handleSearchTracking} className="flex gap-2">
            <div className="flex-grow relative">
              <span className="material-symbols-outlined absolute left-3.5 top-3.5 text-on-surface-variant text-lg">search</span>
              <input
                type="text"
                placeholder="Enter Tracking ID (e.g. ERP-2026-98124)..."
                value={searchTrackingId}
                onChange={(e) => setSearchTrackingId(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm"
              />
            </div>
            <button
              type="submit"
              className="px-5 py-3 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary/90 transition-colors"
            >
              Search
            </button>
          </form>

          {/* Filter Pills */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {['all', 'Submitted', 'Under Review', 'Dispatched', 'Resolved'].map(st => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                  statusFilter === st
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-white text-on-surface-variant hover:bg-surface-container border border-outline-variant/30'
                }`}
              >
                {st === 'all' ? 'All Reports' : st}
              </button>
            ))}
          </div>

          {/* Reports Feed */}
          {filteredReports.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl text-center border border-outline-variant/30 space-y-3">
              <span className="material-symbols-outlined text-4xl text-outline">fact_check</span>
              <h3 className="font-bold text-on-surface">No Reports Found</h3>
              <p className="text-xs text-on-surface-variant">You have not submitted any incident reports matching this status yet.</p>
              <button
                onClick={() => setActiveTab('submit')}
                className="px-4 py-2 rounded-full bg-primary text-white font-semibold text-xs inline-flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-base">add</span>
                File a Report Now
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredReports.map(report => (
                <div
                  key={report.id}
                  onClick={() => setSelectedReport(report)}
                  className="p-5 rounded-2xl bg-white border border-outline-variant/40 hover:border-primary/50 shadow-sm hover:shadow-md transition-all cursor-pointer space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs px-2.5 py-1 rounded-md bg-surface-container text-primary">
                        {report.trackingId}
                      </span>
                      <span className="text-xs font-medium text-on-surface-variant">
                        {categoryLabels[report.category] || report.categoryLabel}
                      </span>
                    </div>

                    {/* Status Badge */}
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      report.status === 'Resolved'
                        ? 'bg-emerald-100 text-emerald-800'
                        : report.status === 'Dispatched'
                        ? 'bg-blue-100 text-blue-800'
                        : report.status === 'Under Review'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-100 text-slate-800'
                    }`}>
                      • {report.status}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-bold text-base text-on-surface">{report.title}</h3>
                    <p className="text-xs text-on-surface-variant line-clamp-2 mt-1">{report.description}</p>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-outline-variant/20 text-xs text-on-surface-variant">
                    <div className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">location_on</span>
                      <span className="truncate max-w-xs">{report.location}</span>
                    </div>
                    <div className="flex items-center gap-1 font-semibold text-primary">
                      <span>View Timeline</span>
                      <span className="material-symbols-outlined text-sm">chevron_right</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      )}

      {/* SUCCESS SUBMISSION MODAL */}
      {submittedReport && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full text-center space-y-5 animate-scaleUp">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-3xl">check_circle</span>
            </div>
            
            <div>
              <h3 className="font-bold text-xl text-on-surface">Report Submitted Successfully!</h3>
              <p className="text-xs text-on-surface-variant mt-1">
                Your report has been encrypted and routed to the assigned agency.
              </p>
            </div>

            {/* Tracking Card */}
            <div className="p-4 rounded-2xl bg-surface-container border border-outline-variant/40 space-y-2">
              <p className="text-xs font-semibold text-on-surface-variant">Tracking Number</p>
              <div className="flex items-center justify-center gap-2">
                <span className="font-mono text-xl font-bold text-primary">{submittedReport.trackingId}</span>
                <button
                  onClick={() => copyToClipboard(submittedReport.trackingId)}
                  className="p-1.5 rounded-lg hover:bg-white text-on-surface-variant transition-colors"
                  title="Copy Tracking ID"
                >
                  <span className="material-symbols-outlined text-lg">
                    {copiedId ? 'check' : 'content_copy'}
                  </span>
                </button>
              </div>
              <p className="text-[11px] text-on-surface-variant">Assigned to: <strong>{submittedReport.agencyAssigned}</strong></p>
            </div>

            <button
              onClick={() => {
                setSubmittedReport(null)
                setActiveTab('track')
              }}
              className="w-full py-3 rounded-xl bg-primary text-white font-bold text-sm shadow-md hover:bg-primary/90 transition-colors"
            >
              Track Report Progress
            </button>
          </div>
        </div>
      )}

      {/* DETAIL MODAL WITH TIMELINE */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full max-h-[85vh] overflow-y-auto space-y-5">
            <div className="flex items-start justify-between">
              <div>
                <span className="font-mono font-bold text-xs px-2.5 py-1 rounded bg-surface-container text-primary">
                  {selectedReport.trackingId}
                </span>
                <h3 className="font-bold text-lg text-on-surface mt-2">{selectedReport.title}</h3>
              </div>
              <button
                onClick={() => setSelectedReport(null)}
                className="p-1.5 rounded-full hover:bg-surface-container text-on-surface-variant"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <div className="space-y-3 text-xs text-on-surface-variant border-y border-outline-variant/30 py-3">
              <p><strong>Category:</strong> {categoryLabels[selectedReport.category]}</p>
              <p><strong>Location:</strong> {selectedReport.location}</p>
              <p><strong>Assigned Agency:</strong> {selectedReport.agencyAssigned || 'Local Government Unit'}</p>
              <p><strong>Description:</strong> {selectedReport.description}</p>
            </div>

            {/* Timeline View */}
            <div>
              <h4 className="font-bold text-xs uppercase tracking-wider text-primary mb-3">Incident Processing Timeline</h4>
              <div className="space-y-3 relative pl-4 border-l-2 border-primary/30">
                {selectedReport.timeline.map((item, idx) => (
                  <div key={idx} className="relative pl-3">
                    <div className="absolute -left-[21px] top-0 w-3.5 h-3.5 rounded-full bg-primary ring-4 ring-white"></div>
                    <p className="font-bold text-xs text-on-surface">{item.status}</p>
                    <p className="text-[11px] text-on-surface-variant">{item.note}</p>
                    <span className="text-[10px] text-outline font-mono">{new Date(item.timestamp).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => setSelectedReport(null)}
              className="w-full py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-semibold text-xs transition-colors"
            >
              Close Details
            </button>
          </div>
        </div>
      )}

    </main>
  )
}

export default EReportPage
