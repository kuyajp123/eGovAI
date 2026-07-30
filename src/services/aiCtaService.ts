// ============================================================
// aiCtaService.ts — Smart CTA Detection for AI Responses
// Detects when an AI assistant response implies a submittable
// action (application, renewal, registration, payment, etc.)
// and builds a pre-filled action button using SSO user data.
// ============================================================

import { User } from '../types/user'

// ── Exported types ───────────────────────────────────────────────────────────

export type CtaActionType =
  | 'business_permit_new'
  | 'business_permit_renewal'
  | 'drivers_license_renewal'
  | 'national_id_application'
  | 'passport_application'
  | 'sss_contribution'
  | 'sss_services'
  | 'philhealth_registration'
  | 'tax_payment'
  | 'financial_assistance'
  | 'civil_registration'
  | 'vehicle_registration'
  | 'generic_application'

export interface CtaAction {
  /** Type of action detected */
  actionType: CtaActionType
  /** Primary CTA button label */
  ctaLabel: string
  /** Short description */
  ctaDescription: string
  /** Icon name (Material Symbols) */
  icon: string
  /** Color theme: 'primary' | 'secondary' | 'tertiary' */
  colorTheme: 'primary' | 'secondary' | 'tertiary'
  /** Pre-filled user data summary */
  preFilled: {
    name: string
    email?: string
    mobile?: string
    location?: string
    uniqid?: string
  }
  /** Route or external URL */
  targetRoute?: string
  /** Estimated time to complete */
  estimatedTime?: string
  /** Agency or service provider */
  agency?: string
  /** Required documents / IDs the citizen must prepare */
  requirements?: string[]
}

export interface AiCtaResult {
  hasCta: boolean
  action?: CtaAction
}

// ── Keyword banks for action detection ───────────────────────────────────────

const BUSINESS_KEYWORDS = [
  'business permit',
  'business license',
  'mayor\'s permit',
  'bplo',
  'business registration',
  'business renewal',
  'renew business',
]

const DRIVERS_LICENSE_KEYWORDS = [
  'driver\'s license',
  'drivers license',
  'lto license',
  'license renewal',
  'renew license',
  'renew driver',
  'driving license',
]

const NATIONAL_ID_KEYWORDS = [
  'national id',
  'philsys',
  'phil id',
  'philippine id',
  'national identification',
  'psn',
  'philsys registration',
]

const PASSPORT_KEYWORDS = [
  'passport',
  'dfa passport',
  'passport application',
  'passport renewal',
  'travel document',
]

const SSS_KEYWORDS = [
  'sss',
  'social security',
  'sss contribution',
  'sss payment',
  'sss loan',
  'sss membership',
]

const PHILHEALTH_KEYWORDS = [
  'philhealth',
  'phil health',
  'philhealth registration',
  'philhealth contribution',
  'philhealth membership',
  'health insurance registration',
  'register for health insurance',
]

const TAX_KEYWORDS = [
  'pay tax',
  'tax payment',
  'real property tax',
  'cedula',
  'community tax',
  'bir registration',
  'bir payment',
  'bir filing',
  'pay bir',
  'tin application',
  'tin number',
  'get tin',
  'apply tin',
]

const FINANCIAL_ASSISTANCE_KEYWORDS = [
  'financial assistance',
  'scholarship application',
  'student aid',
  'ched scholarship',
  'ched grant',
  'stufap',
  'tertiary education subsidy',
  'tes subsidy',
  'educational assistance',
  'educational grant',
  'dswd scholarship',
  'lgu scholarship',
  'study grant',
  'tuition subsidy',
  'student loan',
  'student grant',
  'school financial assistance',
  'student financial',
]

const CIVIL_REG_KEYWORDS = [
  'birth certificate',
  'marriage certificate',
  'death certificate',
  'psa',
  'civil registry',
  'cenomar',
]

const VEHICLE_KEYWORDS = [
  'vehicle registration',
  'car registration',
  'lto registration',
  'vehicle renewal',
  'or cr',
]

const ACTION_VERBS = [
  'apply',
  'register',
  'renew',
  'pay',
  'request',
  'submit',
  'file',
  'process',
  'obtain',
  'get',
  'update',
]

// ── Helpers ───────────────────────────────────────────────────────────────────

const normalize = (text: string) =>
  text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()

const containsAny = (text: string, keywords: string[]) =>
  keywords.some(kw => text.includes(kw))

const hasActionVerb = (text: string) =>
  ACTION_VERBS.some(v => text.includes(v))

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Analyzes both the user query and the AI response to detect if there's
 * an actionable next step that requires the user's SSO details.
 * 
 * Returns a pre-filled CTA action if detected.
 */
export const detectCtaAction = (
  userQuery: string,
  aiResponse: string,
  user: User | null | undefined
): AiCtaResult => {
  if (!user) return { hasCta: false }

  const queryText = normalize(userQuery)
  const responseText = normalize(aiResponse)
  const combinedText = `${queryText} ${responseText}`

  // Must have an action verb in either query or response
  const hasVerb = hasActionVerb(combinedText)
  if (!hasVerb) return { hasCta: false }

  // Build user pre-filled data
  const preFilled = {
    name: [user.firstName, user.middleName, user.lastName]
      .filter(Boolean)
      .join(' '),
    email: user.email,
    mobile: user.mobileNumber,
    location: user.address?.city
      ? `${user.address.city}, ${user.address.province || ''}`
      : undefined,
    uniqid: user.uniqid,
  }

  // Detect specific action type
  let action: CtaAction | undefined

  // Civil Registration (PSA) — checked FIRST: most common civil service query, keywords are unambiguous
  if (containsAny(combinedText, CIVIL_REG_KEYWORDS)) {
    action = {
      actionType: 'civil_registration',
      ctaLabel: 'Request PSA Document Online',
      ctaDescription: 'Order your PSA certificate for home delivery',
      icon: 'description',
      colorTheme: 'secondary',
      preFilled,
      estimatedTime: '5-10 minutes',
      agency: 'Philippine Statistics Authority (PSA)',
      requirements: [
        'Full name of the document owner',
        'Date and place of birth / marriage / death',
        'Parents\' complete names (for birth certificate)',
        'Valid government-issued ID of the requester',
        'Purpose of request',
        'Delivery address',
      ],
    }
  }
  // Business Permit
  else if (containsAny(combinedText, BUSINESS_KEYWORDS)) {
    const isRenewal = combinedText.includes('renew')
    action = {
      actionType: isRenewal ? 'business_permit_renewal' : 'business_permit_new',
      ctaLabel: isRenewal ? 'Renew Business Permit Now' : 'Apply for Business Permit',
      ctaDescription: isRenewal
        ? 'Continue with your verified eGovPH details'
        : 'Start application with pre-filled information',
      icon: 'storefront',
      colorTheme: 'primary',
      preFilled,
      targetRoute: '/services/business',
      estimatedTime: '10-15 minutes',
      agency: 'City/Municipal BPLO',
      requirements: isRenewal
        ? [
            'Previous Business Permit (original)',
            'Official Receipt of last payment',
            'Barangay Business Clearance',
            'DTI / SEC / CDA Registration',
            'Latest ITR or Financial Statement',
          ]
        : [
            'DTI / SEC / CDA Certificate of Registration',
            'Barangay Business Clearance',
            'Contract of Lease (if renting)',
            'Community Tax Certificate (Cedula)',
            'Valid government-issued ID',
          ],
    }
  }
  // Driver's License
  else if (containsAny(combinedText, DRIVERS_LICENSE_KEYWORDS)) {
    action = {
      actionType: 'drivers_license_renewal',
      ctaLabel: 'Renew Driver\'s License',
      ctaDescription: 'Continue with your PhilSys-verified identity',
      icon: 'directions_car',
      colorTheme: 'secondary',
      preFilled,
      targetRoute: '/services/lto/license-renewal',
      estimatedTime: '8-12 minutes',
      agency: 'Land Transportation Office (LTO)',
      requirements: [
        'Current / expired Driver\'s License',
        'Medical Certificate (LTO-accredited clinic)',
        'Accomplished Application Form (ADL)',
        'Payment for renewal fee',
        'PhilSys National ID or valid gov\'t ID',
      ],
    }
  }
  // SSS Services
  else if (combinedText.includes('sss') || combinedText.includes('social security')) {
    action = {
      actionType: 'sss_services',
      ctaLabel: 'Pay SSS Contribution / Verify Record',
      ctaDescription: 'Secured via PhilSys eVerify & eGovPay',
      icon: 'shield_person',
      colorTheme: 'primary',
      preFilled,
      targetRoute: '/services/sss',
      estimatedTime: '5 minutes',
      agency: 'Social Security System (SSS)',
      requirements: [
        'SSS Number (SS ID or UMID)',
        'Valid government-issued ID',
        'Payment method (GCash, online banking, payment center)',
      ],
    }
  }
  // National ID
  else if (containsAny(combinedText, NATIONAL_ID_KEYWORDS)) {
    action = {
      actionType: 'national_id_application',
      ctaLabel: 'Register for PhilSys ID',
      ctaDescription: 'Pre-filled with your SSO account',
      icon: 'badge',
      colorTheme: 'tertiary',
      preFilled,
      estimatedTime: '12-15 minutes',
      agency: 'PhilSys / PSA',
      requirements: [
        'PSA Birth Certificate (original)',
        'Proof of Address (utility bill, barangay cert.)',
        'One of: passport, UMID, SSS ID, PhilHealth ID, or school ID',
        'Mobile number for OTP verification',
      ],
    }
  }
  // Passport
  else if (containsAny(combinedText, PASSPORT_KEYWORDS)) {
    action = {
      actionType: 'passport_application',
      ctaLabel: 'Apply for Passport',
      ctaDescription: 'DFA passport application with eGovPH',
      icon: 'flight_takeoff',
      colorTheme: 'primary',
      preFilled,
      estimatedTime: '15-20 minutes',
      agency: 'Department of Foreign Affairs (DFA)',
      requirements: [
        'PSA Birth Certificate (original + photocopy)',
        'Valid government-issued ID (original + photocopy)',
        'Accomplished DFA ePassport Application Form',
        'Old passport (for renewal)',
        'Marriage Certificate (if applicable)',
      ],
    }
  }
  // SSS
  else if (containsAny(combinedText, SSS_KEYWORDS)) {
    action = {
      actionType: 'sss_contribution',
      ctaLabel: 'Proceed to SSS Services',
      ctaDescription: 'Manage contributions with your verified account',
      icon: 'shield_person',
      colorTheme: 'secondary',
      preFilled,
      estimatedTime: '5-10 minutes',
      agency: 'Social Security System (SSS)',
      requirements: [
        'SSS Number (SS ID or UMID)',
        'Valid government-issued ID',
        'Payment method (GCash, online banking, payment center)',
      ],
    }
  }
  // PhilHealth
  else if (containsAny(combinedText, PHILHEALTH_KEYWORDS)) {
    action = {
      actionType: 'philhealth_registration',
      ctaLabel: 'Register for PhilHealth',
      ctaDescription: 'Health insurance with pre-filled details',
      icon: 'medical_services',
      colorTheme: 'tertiary',
      preFilled,
      estimatedTime: '8-12 minutes',
      agency: 'Philippine Health Insurance Corporation',
      requirements: [
        'PSA Birth Certificate',
        'Valid government-issued ID',
        'PhilHealth Member Registration Form (PMRF)',
        'Employer / self-employed documents (if applicable)',
      ],
    }
  }
  // Financial Assistance / Scholarship
  else if (containsAny(combinedText, FINANCIAL_ASSISTANCE_KEYWORDS)) {
    action = {
      actionType: 'financial_assistance',
      ctaLabel: 'Apply for Financial Assistance',
      ctaDescription: 'Proceed with your verified eGovPH identity',
      icon: 'school',
      colorTheme: 'tertiary',
      preFilled,
      estimatedTime: '10-15 minutes',
      agency: 'CHED / DSWD / Local Government Unit',
      requirements: [
        'PSA Birth Certificate',
        'Certificate of Enrollment or Acceptance',
        'Income Tax Return or Barangay Indigency Certificate',
        'Valid government-issued ID',
        'School Registration Form',
      ],
    }
  }
  // Tax Payment — only when financial assistance is NOT the topic
  else if (
    containsAny(combinedText, TAX_KEYWORDS) &&
    !containsAny(combinedText, FINANCIAL_ASSISTANCE_KEYWORDS)
  ) {
    action = {
      actionType: 'tax_payment',
      ctaLabel: 'Proceed to Tax Payment',
      ctaDescription: 'Continue with eGovPay integration',
      icon: 'account_balance',
      colorTheme: 'primary',
      preFilled,
      targetRoute: '/services/business',
      estimatedTime: '5-8 minutes',
      agency: 'City Treasurer\'s Office / BIR',
      requirements: [
        'Tax Declaration or Real Property Tax Order of Payment',
        'TIN (Tax Identification Number)',
        'Valid government-issued ID',
        'Previous Official Receipt (for renewal)',
      ],
    }
  }
  // Vehicle Registration
  else if (containsAny(combinedText, VEHICLE_KEYWORDS)) {
    action = {
      actionType: 'vehicle_registration',
      ctaLabel: 'Register Vehicle',
      ctaDescription: 'LTO vehicle registration with verified details',
      icon: 'time_to_leave',
      colorTheme: 'tertiary',
      preFilled,
      estimatedTime: '10-15 minutes',
      agency: 'Land Transportation Office (LTO)',
      requirements: [
        'Official Receipt / Certificate of Registration (OR/CR)',
        'PNP-HPG Motor Vehicle Clearance (for renewal)',
        'MVIS Certificate of Emission Compliance',
        'TPL Insurance (third-party liability)',
        'Valid government-issued ID',
      ],
    }
  }
  // Generic fallback for other actionable responses
  else if (hasVerb && (
    responseText.includes('requirement') ||
    responseText.includes('document') ||
    responseText.includes('step') ||
    responseText.includes('process')
  )) {
    action = {
      actionType: 'generic_application',
      ctaLabel: 'Continue with My Details',
      ctaDescription: 'Proceed using your verified eGovPH account',
      icon: 'arrow_forward',
      colorTheme: 'primary',
      preFilled,
      estimatedTime: '10-15 minutes',
      agency: 'Government Service Provider',
    }
  }

  if (!action) return { hasCta: false }

  return {
    hasCta: true,
    action,
  }
}
