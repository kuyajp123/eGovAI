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

const EREPORT_BASE_URL = '/ereport-api';
let cachedEReportToken: string | null = null;
let ereportTokenExpiry: number | null = null;

export const getEReportToken = async (): Promise<string> => {
  if (cachedEReportToken && ereportTokenExpiry && Date.now() < ereportTokenExpiry) {
    return cachedEReportToken;
  }

  const accessCode =
    import.meta.env.VITE_EREPORT_ACCESS_CODE ||
    import.meta.env.VITE_EREPORT_ACCESS_TOKEN ||
    '';

  if (!accessCode) {
    throw new Error('Missing eReport ACCESS_CODE. Configure VITE_EREPORT_ACCESS_CODE in your .env file.');
  }

  const response = await fetch(`${EREPORT_BASE_URL}/api/integration/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ access_code: accessCode }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to generate eReport access token: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  cachedEReportToken = data.access_token;
  ereportTokenExpiry = Date.now() + 24 * 60 * 60 * 1000;
  return data.access_token;
};

export interface EReportTypeItem {
  id: string;
  code: string;
  name: string;
}

export const getEReportTypes = async (): Promise<EReportTypeItem[]> => {
  try {
    const token = await getEReportToken();
    const response = await fetch(`${EREPORT_BASE_URL}/api/integration/datasets/report_types`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      return (data.data || []).map((item: any) => ({
        id: item.id,
        code: item.attributes?.code || item.id,
        name: item.attributes?.name || item.attributes?.code || 'Incident',
      }));
    }
  } catch (err) {
    console.warn('eReport datasets fetch error:', err);
  }
  return [];
};

const mapCategoryToEReportType = (cat: ReportCategory): string => {
  switch (cat) {
    case 'infrastructure':
      return 'accident';
    case 'safety':
      return 'crime';
    case 'sanitation':
      return 'illegal_dumping';
    case 'traffic':
      return 'accident';
    case 'emergency':
      return 'fire';
    case 'corruption':
      return 'red_tape';
    case 'other':
    default:
      return 'crime';
  }
};

const normaliseMobileNumber = (raw?: string): string => {
  if (!raw) return '639000000000';
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('63') && digits.length === 12) return digits;
  if (digits.startsWith('09') && digits.length === 11) return `63${digits.slice(1)}`;
  if (digits.startsWith('9') && digits.length === 10) return `63${digits}`;
  return '639000000000';
};

// Initial default reports for demonstration
const DEFAULT_REPORTS: IncidentReport[] = [];

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
  let trackingNumber = `ERP-2026-${Math.floor(10000 + Math.random() * 90000)}`;
  const now = new Date().toISOString();
  let serverCaseNumber: string | undefined = undefined;

  const names = (payload.citizenName || 'Citizen Reporter').trim().split(/\s+/);
  const firstName = names[0] || 'Citizen';
  const lastName = names.slice(1).join(' ') || 'Reporter';

  const useMock = import.meta.env.VITE_USE_MOCK_SERVICES === 'true';

  if (!useMock) {
    try {
      const token = await getEReportToken();
      const reportType = mapCategoryToEReportType(payload.category);
      const mobile = normaliseMobileNumber(payload.citizenMobile);

      const requestBody = {
        mobile,
        first_name: firstName,
        last_name: lastName,
        gender: 'Male',
        complainant_email: payload.citizenEmail || 'citizen@egov.ph',
        report_type: reportType,
        subject: payload.title.slice(0, 150),
        message: `${payload.description}\n\nLocation: ${payload.location}`,
        evidences: payload.imageUrl ? [payload.imageUrl] : [],
        region_code: '040000000',
        province_code: '042100000',
        municipality_code: '042111000',
        barangay_code: '042111011',
        latitude: '14.60',
        longitude: '120.98',
      };

      const res = await fetch(`${EREPORT_BASE_URL}/api/integration/submit_complaint`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (res.ok) {
        const result = await res.json();
        if (result.case_number) {
          serverCaseNumber = result.case_number;
          trackingNumber = result.case_number;
        }
      } else {
        const errorJson = await res.json().catch(() => ({}));
        throw new Error(errorJson.message || `eReport Server Error (HTTP ${res.status})`);
      }
    } catch (err) {
      console.error('eReport server submission failed:', err);
      throw err; // Propagate error so UI accurately reflects reality
    }
  }

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
        note: serverCaseNumber
          ? `Incident report submitted and registered with eReport portal (Case: ${serverCaseNumber})`
          : 'Incident report submitted and encrypted via eGovPH eReport service',
      },
    ],
  };

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
