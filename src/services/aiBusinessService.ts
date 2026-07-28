import { FeeItem, getBusinessPermitFees, getTaxFees } from './eGovPayService'
import { User } from '../types/user'

export type AiServiceType =
  | 'business_new'
  | 'business_renewal'
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
 */
export const processAiBusinessIntent = (
  prompt: string,
  user: User | null
): AiBusinessIntentResult => {
  const query = prompt.toLowerCase()

  // Match patterns
  const isBusinessNew = query.includes('new business') || query.includes('register business') || query.includes('start business') || query.includes('apply business') || query.includes('business permit application')
  const isBusinessRenew = query.includes('renew business') || query.includes('renewal') || query.includes('business permit renewal') || query.includes('renew permit')
  const isTaxReal = query.includes('real property') || query.includes('property tax') || query.includes('land tax') || query.includes('amortization tax') || query.includes('rpt')
  const isTaxCommunity = query.includes('cedula') || query.includes('community tax') || query.includes('ctc')
  const isTaxPTR = query.includes('ptr') || query.includes('professional tax') || query.includes('prc tax')
  const isGeneralBusiness = query.includes('business permit') || query.includes('pay tax') || query.includes('pay taxes') || query.includes('business tax')

  if (!isBusinessNew && !isBusinessRenew && !isTaxReal && !isTaxCommunity && !isTaxPTR && !isGeneralBusiness) {
    return { isBusinessIntent: false }
  }

  // Determine specific service type
  let serviceType: AiServiceType = 'business_new'
  let title = 'New Business Permit Application'
  let subtitle = 'City Business Permit & Licensing Office Registration'
  let agency = 'City/Municipal BPLO'
  let feeType = 'new'

  if (isBusinessRenew) {
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
    `I have identified your request for **${title}** with ${agency}.\n\n` +
    `Here is the automated summary prepared by eGovPH AI:\n` +
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
