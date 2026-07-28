// ============================================================
// aiIdentityService.ts — ID / Passport intent detection
// Detects when a user asks to view their own National ID,
// PhilSys ID, passport, or SSO identity details, then
// assembles a structured card from the authenticated user.
// ============================================================

import { User } from '../types/user'

// ── Exported types ───────────────────────────────────────────────────────────

export type IdentityDocumentType = 'national_id' | 'passport' | 'profile'

export interface IdentityCardData {
  /** Which document the user asked about */
  documentType: IdentityDocumentType
  /** Full name as registered in eGovPH SSO */
  fullName: string
  firstName: string
  middleName?: string
  lastName: string
  suffix?: string
  /** eGovPH unique citizen ID */
  uniqid: string
  birthdate: string
  /** Formatted birthdate for display */
  birthdateFmt: string
  email: string
  mobileNumber: string
  address: {
    street?: string
    barangay?: string
    city: string
    province: string
    region: string
    zipCode?: string
    full: string
  }
  /** Profile photo captured via Face Liveness, if any */
  profilePhotoUrl?: string
  /** ISO timestamp the card was assembled */
  retrievedAt: string
  /** Friendly summary sentence for the AI text response */
  aiSummaryText: string
}

export interface AiIdentityResult {
  isIdentityIntent: boolean
  documentType?: IdentityDocumentType
  card?: IdentityCardData
  /** Short reply the assistant should show above the card */
  aiSummaryText?: string
}

// ── Keyword banks ────────────────────────────────────────────────────────────

const PASSPORT_KEYWORDS = [
  'passport',
  'travel document',
  'travel docs',
  'dfa passport',
]

const NATIONAL_ID_KEYWORDS = [
  'national id',
  'philsys',
  'phil sys',
  'philippine id',
  'phil id',
  'national identification',
  'psn',                       // PhilSys Number
  'philsys number',
  'national identification system',
  'my id',
  'my national',
]

const PROFILE_KEYWORDS = [
  'my profile',
  'my account',
  'my details',
  'my information',
  'my data',
  'my sso',
  'my egov',
  'egov details',
  'citizen details',
  'show my info',
  'show my details',
  'view my profile',
  'fetch my details',
  'get my details',
  'retrieve my details',
]

// Verbs that indicate "show me / fetch / check" intent
const FETCH_VERBS = [
  'show',
  'view',
  'get',
  'fetch',
  'display',
  'check',
  'see',
  'what is my',
  "what's my",
  'give me my',
  'access my',
  'retrieve',
  'pull up',
  'look up',
  'find my',
]

// ── Helpers ───────────────────────────────────────────────────────────────────

const normalize = (text: string) =>
  text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()

const containsAny = (text: string, keywords: string[]) =>
  keywords.some(kw => text.includes(kw))

const hasFetchIntent = (text: string) =>
  FETCH_VERBS.some(v => text.includes(v))

const formatBirthdate = (raw: string): string => {
  if (!raw) return 'N/A'
  try {
    return new Date(raw).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  } catch {
    return raw
  }
}

const buildFullAddress = (addr: User['address']): string => {
  return [
    addr?.street,
    addr?.barangay,
    addr?.city,
    addr?.province,
    addr?.region,
    addr?.zipCode,
  ]
    .filter(Boolean)
    .join(', ')
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Analyse the user message and, if they're asking to view their own
 * identity document, build an IdentityCardData from the SSO user object.
 *
 * Returns `{ isIdentityIntent: false }` when no relevant intent is found
 * or when the user is not authenticated.
 */
export const processAiIdentityIntent = (
  userMessage: string,
  user: User | null | undefined,
): AiIdentityResult => {
  if (!user) return { isIdentityIntent: false }

  const text = normalize(userMessage)

  const hasPassport = containsAny(text, PASSPORT_KEYWORDS)
  const hasNationalId = containsAny(text, NATIONAL_ID_KEYWORDS)
  const hasProfile = containsAny(text, PROFILE_KEYWORDS)

  // Must have at least one document keyword OR a strong fetch-verb + "my"
  const isDocumentQuery = hasPassport || hasNationalId || hasProfile
  const isFetchQuery = hasFetchIntent(text) && text.includes('my')

  if (!isDocumentQuery && !isFetchQuery) return { isIdentityIntent: false }

  // Determine document type (passport wins if both mentioned)
  let documentType: IdentityDocumentType = 'national_id'
  if (hasPassport) documentType = 'passport'
  else if (hasProfile && !hasNationalId) documentType = 'profile'

  // Assemble card from SSO session data
  const fullName = [user.firstName, user.middleName, user.lastName, user.suffix]
    .filter(Boolean)
    .join(' ')

  const fullAddress = buildFullAddress(user.address)

  const summaries: Record<IdentityDocumentType, string> = {
    national_id: `Here are the **PhilSys National ID** details on file for your eGovPH account, ${user.firstName}. Your identity is verified and linked to the national registry.`,
    passport: `Here are the identity details from your **eGovPH SSO account** that would be used to process a passport application via DFA, ${user.firstName}. For a new or renewal application, visit [dfa.gov.ph](https://dfa.gov.ph).`,
    profile: `Here is your complete **eGovPH Citizen Profile**, ${user.firstName}, as synced from the SSO registry.`,
  }

  const card: IdentityCardData = {
    documentType,
    fullName,
    firstName: user.firstName,
    middleName: user.middleName,
    lastName: user.lastName,
    suffix: user.suffix,
    uniqid: user.uniqid,
    birthdate: user.birthdate,
    birthdateFmt: formatBirthdate(user.birthdate),
    email: user.email,
    mobileNumber: user.mobileNumber,
    address: {
      ...user.address,
      full: fullAddress,
    },
    profilePhotoUrl: user.profilePhotoUrl,
    retrievedAt: new Date().toISOString(),
    aiSummaryText: summaries[documentType],
  }

  return {
    isIdentityIntent: true,
    documentType,
    card,
    aiSummaryText: summaries[documentType],
  }
}
