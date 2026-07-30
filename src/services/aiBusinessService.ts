import { FeeItem, getBusinessPermitFees, getTaxFees } from './eGovPayService'
import { User } from '../types/user'

export type AiServiceType =
  | 'business_new'
  | 'business_renewal'
  | 'business_check'
  | 'tax_real'
  | 'tax_community'
  | 'tax_professional'

export interface AiBusinessAction {
  serviceType: AiServiceType
  title: string
  subtitle: string
  agency: string
  estimatedTotal: number
  fees: FeeItem[]
  applicantName: string
  applicantLocation: string
  eVerifyStatus: 'verified' | 'pending'
  eGovPayReady: boolean
  eMessageNotifyNumber: string
}

export interface AiBusinessIntentResult {
  isBusinessIntent: boolean
  action?: AiBusinessAction
  aiSummaryText?: string
}

/**
 * Parses user message for Business Permit or Tax Payment intent
 * and constructs an automated AI transaction card.
 *
 * IMPORTANT: Only triggers when the user has a clear *action* intent.
 * Pure information queries ("what are the requirements", "how to apply",
 * "what documents do I need") fall through to the normal AI response.
 */
export const processAiBusinessIntent = (
  prompt: string,
  user: User | null
): AiBusinessIntentResult => {
  const query = prompt.toLowerCase()

  // ── Information intent block — always falls through to AI ─────────────────
  // Only block clearly informational patterns — not "can I apply" or "do I need"
  const INFO_PATTERNS = [
    'what are the requirements',
    'what are requirements',
    'what is required',
    'what documents',
    'what do i need',
    'requirements for',
    'requirements to',
    'how to apply',
    'how to renew',
    'how to register',
    'what is the process',
    'what\'s the process',
    'steps to',
    'steps for',
    'guide to',
    'guide for',
    'tell me about',
    'explain',
    'information about',
    'info about',
  ]
  if (INFO_PATTERNS.some(p => query.includes(p))) {
    return { isBusinessIntent: false }
  }

  // ── Action intent — explicit transactional or ownership/inquiry phrases ───
  const ACTION_VERBS = [
    // Direct intent
    'i want to renew', 'i want to apply', 'i want to register', 'i want to pay',
    'i want to get', 'i want to start', 'i want to open',
    'i need to renew', 'i need to apply', 'i need to pay', 'i need to get',
    'i would like to renew', 'i would like to apply', 'i would like to pay',
    'i would like to register',
    // Help/assist phrases
    'help me renew', 'help me apply', 'help me register', 'help me pay',
    'help me get', 'help me process',
    // Can I / do I (action-seeking questions)
    'can i apply', 'can i renew', 'can i pay', 'can i register', 'can i get',
    'can i check', 'can i view', 'can i see',
    'do i have', 'do i need to pay', 'do i need to renew',
    'do i still have', 'do i already have',
    'is my', 'is there', 'is it',
    'have i', 'have i already',
    // Possessive action
    'renew my', 'renew our',
    'pay my', 'pay our',
    'apply for my', 'apply for a', 'apply for new',
    'register my', 'register a',
    'process my', 'submit my',
    'get my', 'check my', 'check if', 'check whether',
    'verify my', 'confirm my',
    'view my', 'see my', 'show my', 'look up my',
    // Direct commands
    'launch', 'proceed with', 'start my', 'open a',
  ]
  const hasActionVerb = ACTION_VERBS.some(v => query.includes(v))

  // ── Check/inquiry keywords — only fire for explicit status/existing checks ──
  // Must NOT contain clear renew/pay action words (those are handled above)
  const isRenewOrPayQuery = query.includes('renew') || query.includes('renewal') ||
    query.includes('pay') || query.includes('payment') || query.includes('apply')
  const CHECK_KEYWORDS = [
    'existing', 'already have', 'have existing', 'have a permit', 'have permit',
    'still valid', 'still active', 'still existing',
    'active permit', 'active renewal', 'active business permit',
    'my permit status', 'permit status', 'permit expired', 'permit expir',
    'my renewal status', 'existing renewal', 'renewal status',
    'my tax', 'existing tax', 'tax status', 'tax due', 'tax balance',
    'outstanding tax', 'unpaid tax', 'pending tax',
    'business status', 'my business permit status', 'business permit status',
    'check permit', 'check renewal', 'check tax', 'check business',
    'verify permit', 'verify renewal', 'verify tax',
  ]
  const isCheckExisting = !isRenewOrPayQuery && hasActionVerb && CHECK_KEYWORDS.some(k => query.includes(k))

  // ── Service keyword detection ─────────────────────────────────────────────
  const isBusinessNew = hasActionVerb && (
    query.includes('new business') || query.includes('register business') ||
    query.includes('start business') || query.includes('apply business') ||
    query.includes('business permit application') || query.includes('open a business') ||
    query.includes('start a business') || query.includes('new permit')
  )
  const isBusinessRenew = hasActionVerb && (
    query.includes('renew business') || query.includes('business permit renewal') ||
    query.includes('renew permit') || query.includes('renewing permit') ||
    query.includes('renew my permit') || query.includes('renewal permit') ||
    query.includes('renew my business') || query.includes('renewing my business') ||
    query.includes('business renewal') ||
    (query.includes('renewal') && query.includes('business permit'))
  )
  const isTaxReal = hasActionVerb && (
    query.includes('real property') || query.includes('property tax') ||
    query.includes('land tax') || query.includes('amortization tax') || query.includes('rpt')
  )
  const isTaxCommunity = hasActionVerb && (query.includes('cedula') || query.includes('community tax') || query.includes('ctc'))
  const isTaxPTR = hasActionVerb && (query.includes('ptr') || query.includes('professional tax') || query.includes('prc tax'))
  // General business permit — any action verb + explicit permit/tax mention
  const isGeneralBusiness = hasActionVerb && (
    query.includes('business permit') || query.includes('pay tax') ||
    query.includes('pay taxes') || query.includes('business tax') ||
    query.includes('mayor\'s permit') || query.includes('mayors permit') ||
    query.includes('my permit') || query.includes('the permit') ||
    query.includes('a permit')
  )

  if (!isBusinessNew && !isBusinessRenew && !isCheckExisting && !isTaxReal && !isTaxCommunity && !isTaxPTR && !isGeneralBusiness) {
    return { isBusinessIntent: false }
  }

  // Determine specific service type
  let serviceType: AiServiceType = 'business_new'
  let title = 'New Business Permit Application'
  let subtitle = 'City Business Permit & Licensing Office Registration'
  let agency = 'City/Municipal BPLO'
  let feeType = 'new'

  if (isCheckExisting) {
    // Detect whether they're asking about tax or business permit
    const isTaxQuery = query.includes('tax') || query.includes('cedula') || query.includes('rpt') || query.includes('property')
    serviceType = 'business_check'
    title = isTaxQuery ? 'Check & Pay Outstanding Taxes' : 'Check & Renew Business Permit'
    subtitle = isTaxQuery
      ? 'Verify your tax balance and settle dues via eGovPay'
      : 'Verify your existing permit status and renew if needed'
    agency = isTaxQuery ? "City Treasurer's Office" : 'City/Municipal BPLO'
    feeType = isTaxQuery ? 'real_property' : 'renewal'
  } else if (isBusinessRenew || (isGeneralBusiness && (query.includes('renew') || query.includes('renewal') || query.includes('pay')))) {
    serviceType = 'business_renewal'
    title = 'Business Permit Renewal'
    subtitle = 'Annual LGU Business Permit Renewal'
    agency = 'City/Municipal BPLO'
    feeType = 'renewal'
  } else if (isTaxReal) {
    serviceType = 'tax_real'
    title = 'Real Property Tax Payment'
    subtitle = 'Annual Land & Building Tax'
    agency = "City Treasurer's Office"
    feeType = 'real_property'
  } else if (isTaxCommunity) {
    serviceType = 'tax_community'
    title = 'Community Tax Certificate (Cedula)'
    subtitle = 'Annual Community Tax Certificate'
    agency = "City Treasurer's Office / Barangay"
    feeType = 'community'
  } else if (isTaxPTR) {
    serviceType = 'tax_professional'
    title = 'Professional Tax Receipt (PTR)'
    subtitle = 'Annual Professional Tax Payment'
    agency = "City Treasurer's Office"
    feeType = 'professional'
  } else if (isBusinessNew || isGeneralBusiness) {
    serviceType = 'business_new'
    title = 'New Business Permit Application'
    subtitle = 'City Business Permit & Licensing Office Registration'
    agency = 'City/Municipal BPLO'
    feeType = 'new'
  }

  const fees = serviceType.startsWith('business')
    ? getBusinessPermitFees(feeType)
    : getTaxFees(feeType)

  const estimatedTotal = fees.reduce((sum, f) => sum + f.amount, 0)

  const applicantName = user
    ? [user.firstName, user.lastName].filter(Boolean).join(' ')
    : 'Valued Citizen'

  const applicantLocation = user?.address?.city
    ? `${user.address.city}, ${user.address.province || ''}`
    : 'Local Government Unit'

  const aiSummaryText =
    serviceType === 'business_check'
      ? `I've prepared your **${title}** transaction with ${agency}.\n\n` +
        `**Applicant:** ${applicantName}\n` +
        `**Location:** ${applicantLocation}\n` +
        `**Status Check:** The system will verify your existing permit/tax records upon launch.\n` +
        `**Estimated Renewal/Payment:** ₱${estimatedTotal.toLocaleString()} PHP\n\n` +
        `Click below to check your status and proceed with payment if outstanding fees are found.`
      : `I have identified your request for **${title}** with ${agency}.\n\n` +
        `Here is the automated summary prepared by eBuddy:\n` +
        `• **Applicant:** ${applicantName}\n` +
        `• **Location:** ${applicantLocation}\n` +
        `• **Estimated Total Fees:** ₱${estimatedTotal.toLocaleString()} PHP\n` +
        `• **Integrations:** Verified via **eVerify**, Payments processed by **eGovPay**, SMS notices via **eMessage**.\n\n` +
        `You can review the fees below and click the button to launch your application immediately.`

  const action: AiBusinessAction = {
    serviceType,
    title,
    subtitle,
    agency,
    estimatedTotal,
    fees,
    applicantName,
    applicantLocation,
    eVerifyStatus: 'verified',
    eGovPayReady: true,
    eMessageNotifyNumber: user?.mobileNumber || '+639090000000',
  }

  return {
    isBusinessIntent: true,
    action,
    aiSummaryText,
  }
}
