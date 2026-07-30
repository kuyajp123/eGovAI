// ============================================================
// aiIdentityService.ts — ID / Passport intent detection
// Detects when a user explicitly asks to view their own National ID,
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
  'my passport',
  'view passport',
  'show passport',
  'show me my passport',
  'open my passport',
]

const NATIONAL_ID_KEYWORDS = [
  'national id',
  'philsys',
  'phil sys',
  'philippine id',
  'phil id',
  'national identification',
  'philsys number',
  'national identification system',
  'my national id',
  'my philsys',
  'my phil id',
  'my philsys id',
  'show my national id',
  'view my national id',
  // Natural voice phrases
  'show me my id',
  'show my id',
  'view my id',
  'open my id',
  'display my id',
  'see my id',
  'my id',
  'my identification',
  'show id',
  'my card',
  'show my card',
  'show me my card',
  'view my card',
  'my government id',
  'show my government id',
  'show me my government id',
]

const PROFILE_KEYWORDS = [
  'my profile',
  'my account',
  'my details',
  'my sso profile',
  'my egov profile',
  'show my profile',
  'view my profile',
  // Natural voice phrases
  'show me my profile',
  'open my profile',
  'my information',
  'show my information',
  'show me my information',
  'my personal details',
  'show my personal details',
]

// ── Helpers ───────────────────────────────────────────────────────────────────

const normalize = (text: string) =>
  text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()

const containsAny = (text: string, keywords: string[]) =>
  keywords.some(kw => text.includes(kw))

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
 * Analyse the user message and, if they're explicitly asking to view their own
 * identity document (National ID, Passport, or Profile), build an IdentityCardData
 * from the SSO user object.
 *
 * Returns `{ isIdentityIntent: false }` when no identity document keyword is matched
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

  // STRICT CHECK: Must explicitly match a document or profile keyword.
  // Prevents general queries (e.g. "How can I check my SSS contribution") from triggering ID card display.
  if (!hasPassport && !hasNationalId && !hasProfile) {
    return { isIdentityIntent: false }
  }

  // Determine document type (passport > national_id > profile)
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
