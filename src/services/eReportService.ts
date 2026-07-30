import { User } from '../types/user';
import { generateAIResponse } from './egovService';

export type ReportCategory =
  | 'infrastructure'
  | 'safety'
  | 'sanitation'
  | 'traffic'
  | 'emergency'
  | 'corruption'
  | 'other';

export type ReportSeverity = 'low' | 'medium' | 'high' | 'critical';

export type ReportStatus = 'Submitted' | 'Under Review' | 'Dispatched' | 'Resolved';

export interface TimelineEvent {
  status: ReportStatus;
  timestamp: string;
  note: string;
}

export interface IncidentReport {
  id: string;
  trackingId: string;
  category: ReportCategory;
  categoryLabel: string;
  title: string;
  description: string;
  location: string;
  severity: ReportSeverity;
  imageUrl?: string;
  citizenName: string;
  citizenEmail: string;
  citizenMobile: string;
  status: ReportStatus;
  createdAt: string;
  updatedAt: string;
  agencyAssigned?: string;
  timeline: TimelineEvent[];
}

export interface CreateReportPayload {
  category: ReportCategory;
  title: string;
  description: string;
  location: string;
  severity: ReportSeverity;
  imageUrl?: string;
  citizenName?: string;
  citizenEmail?: string;
  citizenMobile?: string;
}

export interface AiReportDraft {
  category: ReportCategory;
  title: string;
  description: string;
  location: string;
  severity: ReportSeverity;
  imageUrl?: string;
  sourcePrompt: string;
  generatedAt: string;
}

const STORAGE_KEY = 'egov_ereports_store';
const AI_DRAFT_STORAGE_KEY = 'egov_ai_ereport_draft';
const EREPORT_TOKEN = import.meta.env.VITE_EREPORT_ACCESS_TOKEN;

// Initial default reports for demonstration
const DEFAULT_REPORTS: IncidentReport[] = [
  // {
  //   id: 'rep-101',
  //   trackingId: 'ERP-2026-98124',
  //   category: 'infrastructure',
  //   categoryLabel: 'Road & Infrastructure Damage',
  //   title: 'Hazardous Pothole on Katipunan Ave',
  //   description: 'Deep road damage causing traffic slowing and vehicle risk near pedestrian overpass.',
  //   location: 'Katipunan Ave, Quezon City, Metro Manila',
  //   severity: 'medium',
  //   citizenName: 'Juan Dela Cruz',
  //   citizenEmail: 'juan.delacruz@example.com',
  //   citizenMobile: '+63 917 123 4567',
  //   status: 'Dispatched',
  //   createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  //   updatedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
  //   agencyAssigned: 'DPWH National Capital Region',
  //   timeline: [
  //     { status: 'Submitted', timestamp: new Date(Date.now() - 86400000 * 2).toISOString(), note: 'Report received via eGovPH eReport portal' },
  //     { status: 'Under Review', timestamp: new Date(Date.now() - 86400000 * 1.5).toISOString(), note: 'Verified by QC LGU Disaster & Risk Office' },
  //     { status: 'Dispatched', timestamp: new Date(Date.now() - 3600000 * 4).toISOString(), note: 'Assigned repair team from DPWH District 1' }
  //   ]
  // },
  // {
  //   id: 'rep-102',
  //   trackingId: 'ERP-2026-44319',
  //   category: 'sanitation',
  //   categoryLabel: 'Waste & Sanitation',
  //   title: 'Uncollected Garbage Accumulation',
  //   description: 'Waste left uncollected for 4 days near public market entrance.',
  //   location: 'Barangay Central, Pasig City',
  //   severity: 'high',
  //   citizenName: 'Juan Dela Cruz',
  //   citizenEmail: 'juan.delacruz@example.com',
  //   citizenMobile: '+63 917 123 4567',
  //   status: 'Resolved',
  //   createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
  //   updatedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
  //   agencyAssigned: 'Pasig City Environment & Natural Resources Office',
  //   timeline: [
  //     { status: 'Submitted', timestamp: new Date(Date.now() - 86400000 * 5).toISOString(), note: 'Report logged into eGovPH' },
  //     { status: 'Under Review', timestamp: new Date(Date.now() - 86400000 * 4).toISOString(), note: 'Reviewed by CENRO Pasig' },
  //     { status: 'Dispatched', timestamp: new Date(Date.now() - 86400000 * 2).toISOString(), note: 'Special cleanup truck dispatched' },
  //     { status: 'Resolved', timestamp: new Date(Date.now() - 86400000 * 1).toISOString(), note: 'Site cleared and sanitized' }
  //   ]
  // }
];

export const categoryLabels: Record<ReportCategory, string> = {
  infrastructure: 'Road & Infrastructure Damage',
  safety: 'Public Safety & Security',
  sanitation: 'Waste & Sanitation Concern',
  traffic: 'Traffic & Transport Issue',
  emergency: 'Urgent Emergency Hazard',
  corruption: 'Public Service / Integrity Concern',
  other: 'General Community Report',
};

const reportCategories: ReportCategory[] = [
  'infrastructure',
  'safety',
  'sanitation',
  'traffic',
  'emergency',
  'corruption',
  'other',
];

const reportSeverities: ReportSeverity[] = ['low', 'medium', 'high', 'critical'];

const isAiReportDraft = (value: unknown): value is AiReportDraft => {
  if (!value || typeof value !== 'object') return false;
  const draft = value as Partial<AiReportDraft>;
  return (
    reportCategories.includes(draft.category as ReportCategory) &&
    reportSeverities.includes(draft.severity as ReportSeverity) &&
    typeof draft.title === 'string' &&
    typeof draft.description === 'string' &&
    typeof draft.location === 'string' &&
    typeof draft.sourcePrompt === 'string' &&
    typeof draft.generatedAt === 'string'
  );
};

export const saveAiReportDraft = (draft: AiReportDraft): void => {
  sessionStorage.setItem(AI_DRAFT_STORAGE_KEY, JSON.stringify(draft));
};

export const getPendingAiReportDraft = (): AiReportDraft | null => {
  try {
    const stored = sessionStorage.getItem(AI_DRAFT_STORAGE_KEY);
    if (!stored) return null;
    const parsed: unknown = JSON.parse(stored);
    return isAiReportDraft(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

export const clearPendingAiReportDraft = (): void => {
  sessionStorage.removeItem(AI_DRAFT_STORAGE_KEY);
};

/**
 * Fetch all filed reports for current user
 */
export const getUserReports = async (): Promise<IncidentReport[]> => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
    // Seed with defaults
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_REPORTS));
    return DEFAULT_REPORTS;
  } catch (error) {
    console.error('Error fetching reports:', error);
    return DEFAULT_REPORTS;
  }
};

/**
 * Submit a new incident report to eReport API
 */
export const submitIncidentReport = async (payload: CreateReportPayload): Promise<IncidentReport> => {
  const trackingNumber = `ERP-2026-${Math.floor(10000 + Math.random() * 90000)}`;
  const now = new Date().toISOString();

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
        note: 'Incident report submitted and encrypted via eGovPH eReport service',
      },
    ],
  };

  // Attempt eReport external endpoint POST if token exists
  try {
    if (EREPORT_TOKEN) {
      console.log('Submitting to eReport API with Access Token:', EREPORT_TOKEN.substring(0, 8) + '...');
      // Attempt backend endpoint dispatch
      await fetch('/integration-api/api/v1/egov/ereport/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${EREPORT_TOKEN}`,
        },
        body: JSON.stringify(newReport),
      }).catch(err => console.log('eReport API server notification logged:', err));
    }
  } catch (e) {
    console.warn('eReport remote sync fallback to local storage:', e);
  }

  // Save to local storage
  const currentReports = await getUserReports();
  const updatedReports = [newReport, ...currentReports];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedReports));

  return newReport;
};

/**
 * Find report by tracking ID
 */
export const getReportByTrackingId = async (trackingId: string): Promise<IncidentReport | null> => {
  const reports = await getUserReports();
  const query = trackingId.trim().toUpperCase();
  return reports.find(r => r.trackingId.toUpperCase() === query || r.id === trackingId) || null;
};

const getAgencyForCategory = (cat: ReportCategory): string => {
  switch (cat) {
    case 'infrastructure':
      return 'DPWH / City Engineering Office';
    case 'safety':
      return 'Philippine National Police / LGU Security';
    case 'sanitation':
      return 'City Environment & Waste Management';
    case 'traffic':
      return 'MMDA / LTO Traffic Management';
    case 'emergency':
      return 'NDRRMC / Local Disaster Risk Office';
    case 'corruption':
      return 'Civil Service Commission / Anti-Red Tape Authority';
    default:
      return 'eGovPH Citizen Services Department';
  }
};

const inferCategory = (prompt: string): ReportCategory => {
  if (/pothole|road|bridge|streetlight|broken light|pavement|pipe|water leak|infrastructure/i.test(prompt)) {
    return 'infrastructure';
  }
  if (/garbage|trash|waste|sanitation|sewage|drainage|canal|flood|clean/i.test(prompt)) {
    return 'sanitation';
  }
  if (/traffic|signal|parking|jam|obstruction|vehicle|collision|accident|motorcycle|\bcar\b/i.test(prompt)) {
    return 'traffic';
  }
  if (/crime|theft|robbery|assault|dark street|security|police|suspicious/i.test(prompt)) {
    return 'safety';
  }
  if (/fire|landslide|collapse|explosion|emergency|typhoon|disaster/i.test(prompt)) {
    return 'emergency';
  }
  if (/bribery|red tape|extortion|corrupt|misconduct|delay|overcharging/i.test(prompt)) {
    return 'corruption';
  }
  return 'other';
};

const inferSeverity = (prompt: string): ReportSeverity => {
  if (/critical|urgent|emergency|severe|accident|danger|life-threatening|fire/i.test(prompt)) {
    return 'critical';
  }
  if (/high|major|serious|heavy flood|hazard/i.test(prompt)) return 'high';
  if (/minor|low|small|slow/i.test(prompt)) return 'low';
  return 'medium';
};

const getProfileLocation = (userProfile?: User | null): string => {
  if (!userProfile?.address?.city) return '';
  return [
    userProfile.address.street,
    userProfile.address.barangay,
    userProfile.address.city,
    userProfile.address.province,
  ]
    .filter(Boolean)
    .join(', ');
};

const extractLocation = (prompt: string, userProfile?: User | null): string => {
  const locationMatch = prompt.match(
    /\b(?:in|at|along|near)\s+([A-Za-z0-9\s,.'-]+?)(?:[.!?]|$|\s(?:and|because|where|which|with|please))/i
  );
  if (locationMatch && locationMatch[1].trim().length > 3) {
    return locationMatch[1].trim();
  }
  return getProfileLocation(userProfile);
};

const cleanIncidentText = (prompt: string): string => {
  const cleaned = prompt
    .trim()
    .replace(
      /^(?:please\s+)?(?:create|make|draft|file|generate|prepare|submit)\s+(?:an?\s+)?(?:e-?report|incident report|report)\s*(?:for|about|regarding|that)?\s*/i,
      ''
    );
  return cleaned || prompt.trim();
};

const createFallbackDraft = (prompt: string, userProfile?: User | null): AiReportDraft => {
  const category = inferCategory(prompt);
  const incidentText = cleanIncidentText(prompt);
  const shortTitle = incidentText.length > 80 ? `${incidentText.slice(0, 77)}...` : incidentText;
  return {
    category,
    title: shortTitle || categoryLabels[category],
    description: incidentText,
    location: extractLocation(prompt, userProfile),
    severity: inferSeverity(prompt),
    sourcePrompt: prompt,
    generatedAt: new Date().toISOString(),
  };
};

const parseJsonObject = (text: string): Record<string, unknown> | null => {
  const normalized = text
    .replace(/```(?:json)?/gi, '')
    .replace(/```/g, '')
    .trim();
  const start = normalized.indexOf('{');
  const end = normalized.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    const parsed: unknown = JSON.parse(normalized.slice(start, end + 1));
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
};

const normalizedText = (value: unknown, fallback: string, maxLength: number): string => {
  if (typeof value !== 'string' || !value.trim()) return fallback;
  return value.trim().slice(0, maxLength);
};

/** Generate an editable report draft. This function never submits or stores a report. */
export const generateAiReportDraft = async (prompt: string, userProfile?: User | null): Promise<AiReportDraft> => {
  const fallback = createFallbackDraft(prompt, userProfile);
  const profileLocation = getProfileLocation(userProfile);
  const aiPrompt = [
    'You are the eGovPH eReport drafting assistant.',
    'Convert the citizen message into one editable incident-report draft.',
    'Return ONLY valid JSON with these exact keys: category, title, description, location, severity.',
    'Allowed category values: infrastructure, safety, sanitation, traffic, emergency, corruption, other.',
    'Allowed severity values: low, medium, high, critical.',
    'Be factual and concise. Do not claim the report was submitted. Do not invent names, dates, or locations.',
    `Use this verified profile location only when the citizen omitted a location: ${profileLocation || '(none available)'}.`,
    `Citizen message: ${prompt}`,
  ].join('\n');

  try {
    const response = await generateAIResponse(aiPrompt, 'PH');
    const parsed = parseJsonObject(response.data);
    if (!parsed) return fallback;

    const category = reportCategories.includes(parsed.category as ReportCategory)
      ? (parsed.category as ReportCategory)
      : fallback.category;
    const severity = reportSeverities.includes(parsed.severity as ReportSeverity)
      ? (parsed.severity as ReportSeverity)
      : fallback.severity;

    return {
      category,
      severity,
      title: normalizedText(parsed.title, fallback.title, 140),
      description: normalizedText(parsed.description, fallback.description, 2000),
      location: normalizedText(parsed.location, fallback.location, 250),
      sourcePrompt: prompt,
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.warn('AI eReport draft generation fell back to local extraction:', error);
    return fallback;
  }
};
