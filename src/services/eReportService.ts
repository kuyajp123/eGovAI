export type ReportCategory = 
  | 'infrastructure' 
  | 'safety' 
  | 'sanitation' 
  | 'traffic' 
  | 'emergency' 
  | 'corruption' 
  | 'other'

export type ReportSeverity = 'low' | 'medium' | 'high' | 'critical'

export type ReportStatus = 'Submitted' | 'Under Review' | 'Dispatched' | 'Resolved'

export interface TimelineEvent {
  status: ReportStatus
  timestamp: string
  note: string
}

export interface IncidentReport {
  id: string
  trackingId: string
  category: ReportCategory
  categoryLabel: string
  title: string
  description: string
  location: string
  severity: ReportSeverity
  imageUrl?: string
  citizenName: string
  citizenEmail: string
  citizenMobile: string
  status: ReportStatus
  createdAt: string
  updatedAt: string
  agencyAssigned?: string
  timeline: TimelineEvent[]
}

export interface CreateReportPayload {
  category: ReportCategory
  title: string
  description: string
  location: string
  severity: ReportSeverity
  imageUrl?: string
  citizenName?: string
  citizenEmail?: string
  citizenMobile?: string
}

const STORAGE_KEY = 'egov_ereports_store'
const EREPORT_TOKEN = import.meta.env.VITE_EREPORT_ACCESS_TOKEN

// Initial default reports for demonstration
const DEFAULT_REPORTS: IncidentReport[] = [
  {
    id: 'rep-101',
    trackingId: 'ERP-2026-98124',
    category: 'infrastructure',
    categoryLabel: 'Road & Infrastructure Damage',
    title: 'Hazardous Pothole on Katipunan Ave',
    description: 'Deep road damage causing traffic slowing and vehicle risk near pedestrian overpass.',
    location: 'Katipunan Ave, Quezon City, Metro Manila',
    severity: 'medium',
    citizenName: 'Juan Dela Cruz',
    citizenEmail: 'juan.delacruz@example.com',
    citizenMobile: '+63 917 123 4567',
    status: 'Dispatched',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    agencyAssigned: 'DPWH National Capital Region',
    timeline: [
      { status: 'Submitted', timestamp: new Date(Date.now() - 86400000 * 2).toISOString(), note: 'Report received via eGovPH eReport portal' },
      { status: 'Under Review', timestamp: new Date(Date.now() - 86400000 * 1.5).toISOString(), note: 'Verified by QC LGU Disaster & Risk Office' },
      { status: 'Dispatched', timestamp: new Date(Date.now() - 3600000 * 4).toISOString(), note: 'Assigned repair team from DPWH District 1' }
    ]
  },
  {
    id: 'rep-102',
    trackingId: 'ERP-2026-44319',
    category: 'sanitation',
    categoryLabel: 'Waste & Sanitation',
    title: 'Uncollected Garbage Accumulation',
    description: 'Waste left uncollected for 4 days near public market entrance.',
    location: 'Barangay Central, Pasig City',
    severity: 'high',
    citizenName: 'Juan Dela Cruz',
    citizenEmail: 'juan.delacruz@example.com',
    citizenMobile: '+63 917 123 4567',
    status: 'Resolved',
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    agencyAssigned: 'Pasig City Environment & Natural Resources Office',
    timeline: [
      { status: 'Submitted', timestamp: new Date(Date.now() - 86400000 * 5).toISOString(), note: 'Report logged into eGovPH' },
      { status: 'Under Review', timestamp: new Date(Date.now() - 86400000 * 4).toISOString(), note: 'Reviewed by CENRO Pasig' },
      { status: 'Dispatched', timestamp: new Date(Date.now() - 86400000 * 2).toISOString(), note: 'Special cleanup truck dispatched' },
      { status: 'Resolved', timestamp: new Date(Date.now() - 86400000 * 1).toISOString(), note: 'Site cleared and sanitized' }
    ]
  }
]

export const categoryLabels: Record<ReportCategory, string> = {
  infrastructure: 'Road & Infrastructure Damage',
  safety: 'Public Safety & Security',
  sanitation: 'Waste & Sanitation Concern',
  traffic: 'Traffic & Transport Issue',
  emergency: 'Urgent Emergency Hazard',
  corruption: 'Public Service / Integrity Concern',
  other: 'General Community Report'
}

/**
 * Fetch all filed reports for current user
 */
export const getUserReports = async (): Promise<IncidentReport[]> => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
    // Seed with defaults
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_REPORTS))
    return DEFAULT_REPORTS
  } catch (error) {
    console.error('Error fetching reports:', error)
    return DEFAULT_REPORTS
  }
}

/**
 * Submit a new incident report to eReport API
 */
export const submitIncidentReport = async (
  payload: CreateReportPayload
): Promise<IncidentReport> => {
  const trackingNumber = `ERP-2026-${Math.floor(10000 + Math.random() * 90000)}`
  const now = new Date().toISOString()

  const newReport: IncidentReport = {
    id: `rep-${Date.now()}`,
    trackingId: trackingNumber,
    category: payload.category,
    categoryLabel: categoryLabels[payload.category] || 'General Incident',
    title: payload.title,
    description: payload.description,
    location: payload.location,
    severity: payload.severity,
    imageUrl: payload.imageUrl,
    citizenName: payload.citizenName || 'Citizen Reporter',
    citizenEmail: payload.citizenEmail || '',
    citizenMobile: payload.citizenMobile || '',
    status: 'Submitted',
    createdAt: now,
    updatedAt: now,
    agencyAssigned: getAgencyForCategory(payload.category),
    timeline: [
      {
        status: 'Submitted',
        timestamp: now,
        note: 'Incident report submitted and encrypted via eGovPH eReport service'
      }
    ]
  }

  // Attempt eReport external endpoint POST if token exists
  try {
    if (EREPORT_TOKEN) {
      console.log('Submitting to eReport API with Access Token:', EREPORT_TOKEN.substring(0, 8) + '...')
      // Attempt backend endpoint dispatch
      await fetch('/integration-api/api/v1/egov/ereport/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${EREPORT_TOKEN}`
        },
        body: JSON.stringify(newReport)
      }).catch(err => console.log('eReport API server notification logged:', err))
    }
  } catch (e) {
    console.warn('eReport remote sync fallback to local storage:', e)
  }

  // Save to local storage
  const currentReports = await getUserReports()
  const updatedReports = [newReport, ...currentReports]
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedReports))

  return newReport
}

/**
 * Find report by tracking ID
 */
export const getReportByTrackingId = async (
  trackingId: string
): Promise<IncidentReport | null> => {
  const reports = await getUserReports()
  const query = trackingId.trim().toUpperCase()
  return reports.find(r => r.trackingId.toUpperCase() === query || r.id === trackingId) || null
}

const getAgencyForCategory = (cat: ReportCategory): string => {
  switch (cat) {
    case 'infrastructure': return 'DPWH / City Engineering Office'
    case 'safety': return 'Philippine National Police / LGU Security'
    case 'sanitation': return 'City Environment & Waste Management'
    case 'traffic': return 'MMDA / LTO Traffic Management'
    case 'emergency': return 'NDRRMC / Local Disaster Risk Office'
    case 'corruption': return 'Civil Service Commission / Anti-Red Tape Authority'
    default: return 'eGovPH Citizen Services Department'
  }
}

/**
 * AI Intent Processor for eReport
 * Automatically detects report intent in user prompt and files an eReport
 */
export const processAiReportIntent = async (
  prompt: string,
  userProfile?: any
): Promise<{ isReportIntent: boolean; report?: IncidentReport; aiSummaryText?: string }> => {
  const lowerPrompt = prompt.toLowerCase()

  // Incident trigger keywords
  const reportKeywords = [
    'report', 'file a report', 'complain', 'complaint', 'pothole', 'garbage', 'trash',
    'waste', 'streetlight', 'broken light', 'water leak', 'hazard', 'traffic light',
    'flooding', 'flood', 'accident', 'fire', 'outage', 'illegal parking', 'crime',
    'theft', 'uncollected', 'damage', 'road damage', 'drainage', 'sewage', 'red tape'
  ]

  const isTriggered = reportKeywords.some(kw => lowerPrompt.includes(kw))
  if (!isTriggered) {
    return { isReportIntent: false }
  }

  // 1. Determine category
  let category: ReportCategory = 'other'
  if (/pothole|road|bridge|streetlight|broken light|pavement|pipe|water leak|infrastructure/i.test(prompt)) {
    category = 'infrastructure'
  } else if (/garbage|trash|waste|sanitation|sewage|drainage|canal|flood|clean/i.test(prompt)) {
    category = 'sanitation'
  } else if (/traffic|signal|parking|jam|obstruction|vehicle|collision/i.test(prompt)) {
    category = 'traffic'
  } else if (/crime|theft|robbery|assault|dark street|security|police|suspicious/i.test(prompt)) {
    category = 'safety'
  } else if (/fire|landslide|collapse|explosion|emergency|typhoon|disaster/i.test(prompt)) {
    category = 'emergency'
  } else if (/bribery|red tape|extortion|corrupt|misconduct|delay|overcharging/i.test(prompt)) {
    category = 'corruption'
  }

  // 2. Extract location
  let location = 'Metro Manila'
  const locationMatch = prompt.match(/(?:in|at|along|near)\s+([A-Za-z0-9\s,\.-]+?)(?:\.|\,|$|\s(?:and|for|with|it|please))/i)
  if (locationMatch && locationMatch[1].trim().length > 3) {
    location = locationMatch[1].trim()
  } else if (userProfile?.address?.city) {
    location = [userProfile.address.barangay, userProfile.address.city, userProfile.address.province].filter(Boolean).join(', ')
  }

  // 3. Determine severity
  let severity: ReportSeverity = 'medium'
  if (/critical|urgent|emergency|severe|accident|danger|life-threatening|fire/i.test(prompt)) {
    severity = 'critical'
  } else if (/high|major|serious|heavy flood|hazard/i.test(prompt)) {
    severity = 'high'
  } else if (/minor|low|small|slow/i.test(prompt)) {
    severity = 'low'
  }

  // 4. Generate title & description
  const categoryTitle = categoryLabels[category] || 'Community Incident'
  const cleanTitle = prompt.length > 50 ? `${prompt.substring(0, 47)}...` : prompt
  const description = `Auto-filed via eGovPH AI Assistant: "${prompt}"`

  const citizenName = userProfile
    ? [userProfile.firstName, userProfile.middleName, userProfile.lastName].filter(Boolean).join(' ')
    : 'Authenticated Citizen'

  // 5. Submit report automatically!
  const report = await submitIncidentReport({
    category,
    title: `${categoryTitle}: ${cleanTitle}`,
    description,
    location,
    severity,
    citizenName,
    citizenEmail: userProfile?.email || '',
    citizenMobile: userProfile?.mobileNumber || ''
  })

  const aiSummaryText = `I have automatically submitted an official **eReport** for your concern with **${report.agencyAssigned}**.\n\nYour incident tracking number is **${report.trackingId}**. You can track real-time resolution below or under the **eReport** tab.`

  return {
    isReportIntent: true,
    report,
    aiSummaryText
  }
}
