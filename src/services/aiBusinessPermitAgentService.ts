import { PaymentIntent } from './eGovPayService'
import {
  BUSINESS_PERMIT_RENEWAL_DOCUMENTS,
  BUSINESS_PERMIT_TYPES,
  BusinessPermitDocumentAttachment,
  BusinessPermitDocumentType,
  BusinessPermitRenewalApplication,
  BusinessPermitRenewalDraft,
  getBusinessPermitRenewalFees,
  getBusinessPermitRenewalYears,
  getMissingBusinessPermitDocuments,
  normalizePermitNumber,
  normalizeTIN,
  resolveBusinessPermitType,
} from './businessPermitService'

export type BusinessPermitAgentStage =
  | 'identity'
  | 'permit_number'
  | 'business_name'
  | 'lgu'
  | 'business_address'
  | 'business_type'
  | 'tin'
  | 'renewal_year'
  | 'documents'
  | 'review'
  | 'submitted'
  | 'payment'

export interface BusinessPermitIdentityVerification {
  verificationId: string
  citizenName?: string
  verifiedAt: string
}

export interface BusinessPermitAgentState {
  id: string
  stage: BusinessPermitAgentStage
  identityVerification?: BusinessPermitIdentityVerification
  permitNumber?: string
  businessName?: string
  lgu?: string
  businessAddress?: string
  businessType?: string
  tin?: string
  renewalYear?: number
  paymentStatus?: PaymentIntent['status']
  documents: BusinessPermitDocumentAttachment[]
  submittedApplication?: BusinessPermitRenewalApplication
  sourceMessages: string[]
  offTopicCount: number
}

export interface BusinessPermitAgentPrompt {
  conversationId: string
  stage: BusinessPermitAgentStage
}

export interface BusinessPermitAgentTurn {
  state: BusinessPermitAgentState | null
  reply: string
  prompt?: BusinessPermitAgentPrompt
  draft?: BusinessPermitRenewalDraft
  application?: BusinessPermitRenewalApplication
  paymentIntent?: PaymentIntent
  cancelled?: boolean
}

const cancellationPattern =
  /^(?:cancel|stop|exit|quit|never\s*mind|forget it)(?:\s+(?:this|the|my))?(?:\s+(?:business\s+permit(?:\s+renewal)?|permit\s+renewal|business|permit|renewal|application|payment|draft))?[.!]?$/i

const informationalPattern =
  /^(?:what|why|when|where|who|how|is|are|do|does)\b|\b(?:requirements?|documents?|steps?|process|fees?|cost)\b.*\b(?:business|permit|renewal)\b/i

const looksLikeUnrelatedAnswer = (value: string): boolean =>
  !value.trim() ||
  value.includes('?') ||
  /^(?:what|why|when|where|who|how|help|thanks?|i don'?t know|not sure)\b/i.test(value.trim())

const cleanText = (value: string, maxLength: number): string | undefined => {
  const normalized = value.trim().replace(/\s+/g, ' ')
  return normalized.length >= 2 && normalized.length <= maxLength && !looksLikeUnrelatedAnswer(normalized)
    ? normalized
    : undefined
}

export const isBusinessPermitRenewalIntent = (message: string): boolean => {
  const normalized = message.trim()
  if (cancellationPattern.test(normalized)) return false
  if (/^(?:business|mayor'?s?) permit renewal[.!]?$/i.test(normalized)) return true
  if (informationalPattern.test(normalized)) return false

  const permitKeyword = /\b(?:business permit|mayor'?s? permit|business license)\b/i.test(normalized)
  const renewalAction =
    /\b(?:renew|renewal|process|start|submit)\b/i.test(normalized) &&
    /\b(?:i|my|our|please|help|want|need|apply)\b/i.test(normalized)
  return permitKeyword && renewalAction
}

const promptForState = (state: BusinessPermitAgentState, lead = ''): BusinessPermitAgentTurn => {
  const prefix = lead ? `${lead}\n\n` : ''

  if (!state.identityVerification) {
    const next = { ...state, stage: 'identity' as const }
    return {
      state: next,
      reply:
        prefix +
        'Before collecting permit details, complete the official **PhilSys eVerify face-liveness check**. It starts only when you choose **Verify Identity** below.',
      prompt: { conversationId: state.id, stage: 'identity' },
    }
  }

  if (!state.permitNumber) {
    const next = { ...state, stage: 'permit_number' as const }
    return {
      state: next,
      reply:
        prefix +
        'Enter the **existing business permit number** exactly as shown on the previous permit. Do not provide passwords, OTPs, PINs, or payment-card information.',
      prompt: { conversationId: state.id, stage: 'permit_number' },
    }
  }

  if (!state.businessName) {
    const next = { ...state, stage: 'business_name' as const }
    return {
      state: next,
      reply: prefix + 'What is the **registered business name** shown on the permit?',
      prompt: { conversationId: state.id, stage: 'business_name' },
    }
  }

  if (!state.lgu) {
    const next = { ...state, stage: 'lgu' as const }
    return {
      state: next,
      reply:
        prefix +
        'Which **city or municipality (LGU)** issued the permit? You can type it or use your eGovPH profile location below.',
      prompt: { conversationId: state.id, stage: 'lgu' },
    }
  }

  if (!state.businessAddress) {
    const next = { ...state, stage: 'business_address' as const }
    return {
      state: next,
      reply: prefix + 'Enter the complete **business address** covered by this permit.',
      prompt: { conversationId: state.id, stage: 'business_address' },
    }
  }

  if (!state.businessType) {
    const next = { ...state, stage: 'business_type' as const }
    return {
      state: next,
      reply: prefix + 'Choose the **nature of business** that best matches the permit.',
      prompt: { conversationId: state.id, stage: 'business_type' },
    }
  }

  if (!state.tin) {
    const next = { ...state, stage: 'tin' as const }
    return {
      state: next,
      reply: prefix + 'Enter the business **Tax Identification Number (TIN)** using 9 or 12 digits.',
      prompt: { conversationId: state.id, stage: 'tin' },
    }
  }

  if (!state.renewalYear) {
    const next = { ...state, stage: 'renewal_year' as const }
    return {
      state: next,
      reply: prefix + 'Select the **permit year** you want to renew.',
      prompt: { conversationId: state.id, stage: 'renewal_year' },
    }
  }

  const missingDocuments = getMissingBusinessPermitDocuments(state.documents)
  if (missingDocuments.length > 0) {
    const next = { ...state, stage: 'documents' as const }
    return {
      state: next,
      reply:
        prefix +
        `Attach the required renewal documents below. **${missingDocuments.length} of ${BUSINESS_PERMIT_RENEWAL_DOCUMENTS.length}** still need a file. PDF, JPG, PNG, and WebP files up to 10 MB are accepted. Your LGU may request additional documents after assessment.`,
      prompt: { conversationId: state.id, stage: 'documents' },
    }
  }

  const next = { ...state, stage: 'review' as const }
  return {
    state: next,
    reply:
      prefix +
      'Your Business Permit Renewal draft is ready. Review and edit every field below. **Nothing has been submitted and no payment link has been created.** Choose **Submit Renewal for Assessment** only when everything is correct.',
    prompt: { conversationId: state.id, stage: 'review' },
    draft: buildBusinessPermitRenewalDraft(next) || undefined,
  }
}

const offTopicTurn = (state: BusinessPermitAgentState, hint: string): BusinessPermitAgentTurn => {
  const count = state.offTopicCount + 1
  return promptForState(
    { ...state, offTopicCount: count },
    `That response does not answer the current permit-renewal question, so I did not add it to the draft. ${hint}${
      count >= 2 ? ' You can say **cancel permit renewal** to leave this agent.' : ''
    }`
  )
}

export const startBusinessPermitAgent = (message: string): BusinessPermitAgentTurn =>
  promptForState(
    {
      id: `business-permit-agent-${Date.now()}`,
      stage: 'identity',
      documents: [],
      sourceMessages: [message],
      offTopicCount: 0,
    },
    'I started a **Business Permit Renewal** draft inside this chat. Nothing has been submitted.'
  )

export const markBusinessPermitIdentityVerified = (
  state: BusinessPermitAgentState,
  verification: BusinessPermitIdentityVerification
): BusinessPermitAgentTurn =>
  promptForState(
    {
      ...state,
      identityVerification: verification,
      sourceMessages: [...state.sourceMessages, `PhilSys eVerify completed: ${verification.verificationId}`],
      offTopicCount: 0,
    },
    `PhilSys identity verification succeeded. Verification reference: **${verification.verificationId}**.`
  )

export const attachBusinessPermitDocument = (
  state: BusinessPermitAgentState,
  attachment: BusinessPermitDocumentAttachment
): BusinessPermitAgentTurn => {
  if (state.stage !== 'documents') return promptForState(state)
  const documents = [...state.documents.filter(item => item.id !== attachment.id), attachment]
  const requirement = BUSINESS_PERMIT_RENEWAL_DOCUMENTS.find(item => item.id === attachment.id)
  return promptForState(
    {
      ...state,
      documents,
      sourceMessages: [...state.sourceMessages, `${requirement?.label || attachment.id} attached`],
      offTopicCount: 0,
    },
    `Attached **${attachment.fileName}** as ${requirement?.label || 'a renewal document'}.`
  )
}

export const removeBusinessPermitDocument = (
  state: BusinessPermitAgentState,
  documentType: BusinessPermitDocumentType
): BusinessPermitAgentTurn =>
  promptForState({
    ...state,
    documents: state.documents.filter(item => item.id !== documentType),
  }, 'I removed that document. Attach a replacement to continue.')

export const reopenBusinessPermitDocuments = (
  state: BusinessPermitAgentState
): BusinessPermitAgentTurn => {
  const next = { ...state, stage: 'documents' as const }
  return {
    state: next,
    reply: 'You can now replace or remove the attached renewal documents. The draft will return to review after all required files are attached.',
    prompt: { conversationId: state.id, stage: 'documents' },
  }
}

export const continueBusinessPermitAgent = (
  state: BusinessPermitAgentState,
  message: string
): BusinessPermitAgentTurn => {
  const normalized = message.trim()
  if (cancellationPattern.test(normalized)) {
    const submitted = !!state.submittedApplication
    return {
      state: null,
      cancelled: true,
      reply: submitted
        ? `I closed the permit agent. Application **${state.submittedApplication?.trackingId}** remains submitted. Nothing was marked as paid; any existing eGovPay link remains pending until paid, cancelled, or expired.`
        : 'The Business Permit Renewal draft was cancelled. Nothing was submitted, no payment link was created, and nothing was paid.',
    }
  }

  if (state.stage === 'identity') {
    return offTopicTurn(state, 'Use **Verify Identity** so the official face-liveness check can run.')
  }

  if (state.stage === 'permit_number') {
    const permitNumber = normalizePermitNumber(normalized)
    if (!permitNumber) {
      return offTopicTurn(state, 'Enter a 5–40 character permit number containing letters, numbers, slashes, or hyphens.')
    }
    return promptForState({
      ...state,
      permitNumber,
      sourceMessages: [...state.sourceMessages, 'Existing permit number provided'],
      offTopicCount: 0,
    })
  }

  if (state.stage === 'business_name') {
    const businessName = cleanText(normalized, 120)
    if (!businessName) return offTopicTurn(state, 'Enter the registered business name from the permit.')
    return promptForState({
      ...state,
      businessName,
      sourceMessages: [...state.sourceMessages, 'Registered business name provided'],
      offTopicCount: 0,
    })
  }

  if (state.stage === 'lgu') {
    const lgu = cleanText(normalized.replace(/^(?:use|select)\s+(?:my\s+)?(?:profile\s+)?(?:lgu|location)\s*:?\s*/i, ''), 120)
    if (!lgu) return offTopicTurn(state, 'Type the issuing city or municipality, such as Quezon City.')
    return promptForState({
      ...state,
      lgu,
      sourceMessages: [...state.sourceMessages, 'Issuing LGU provided'],
      offTopicCount: 0,
    })
  }

  if (state.stage === 'business_address') {
    const businessAddress = cleanText(normalized, 240)
    if (!businessAddress || businessAddress.length < 5) {
      return offTopicTurn(state, 'Enter the complete address of the business location.')
    }
    return promptForState({
      ...state,
      businessAddress,
      sourceMessages: [...state.sourceMessages, 'Business address provided'],
      offTopicCount: 0,
    })
  }

  if (state.stage === 'business_type') {
    const businessType = resolveBusinessPermitType(normalized)
    if (!businessType) return offTopicTurn(state, `Choose ${BUSINESS_PERMIT_TYPES.join(', ')}.`)
    return promptForState({
      ...state,
      businessType,
      sourceMessages: [...state.sourceMessages, businessType],
      offTopicCount: 0,
    })
  }

  if (state.stage === 'tin') {
    const tin = normalizeTIN(normalized)
    if (!tin) return offTopicTurn(state, 'Enter a valid 9-digit or 12-digit TIN; hyphens are optional.')
    return promptForState({
      ...state,
      tin,
      sourceMessages: [...state.sourceMessages, 'Business TIN provided'],
      offTopicCount: 0,
    })
  }

  if (state.stage === 'renewal_year') {
    const requestedYear = normalized.match(/\b(20\d{2})\b/)?.[1]
    const renewalYear = requestedYear ? Number(requestedYear) : undefined
    if (!renewalYear || !getBusinessPermitRenewalYears().includes(renewalYear)) {
      return offTopicTurn(state, `Choose ${getBusinessPermitRenewalYears().join(' or ')}.`)
    }
    return promptForState({
      ...state,
      renewalYear,
      sourceMessages: [...state.sourceMessages, `Renewal year ${renewalYear}`],
      offTopicCount: 0,
    })
  }

  if (state.stage === 'documents') {
    return offTopicTurn(state, 'Use the upload control beside each missing document. Required files cannot be skipped.')
  }

  if (state.stage === 'submitted') {
    return {
      state,
      reply:
        'Your renewal application is already submitted for assessment. Use **Create eGovPay Link** in the submission card when you are ready. A chat message cannot create a charge or mark the application as paid.',
      application: state.submittedApplication,
      draft: buildBusinessPermitRenewalDraft(state) || undefined,
    }
  }

  if (state.stage === 'payment') {
    if (state.paymentStatus === 'paid') {
      return {
        state,
        reply: 'eGovPay has confirmed the permit-renewal payment. The application is now **Payment Confirmed - Under Assessment**. You do not need to pay again.',
        application: state.submittedApplication,
        draft: buildBusinessPermitRenewalDraft(state) || undefined,
      }
    }
    if (state.paymentStatus === 'failed' || state.paymentStatus === 'cancelled') {
      return {
        state,
        reply: `eGovPay reports this checkout as **${state.paymentStatus}**. Refresh the official status before starting another renewal if you believe payment completed.`,
        application: state.submittedApplication,
        draft: buildBusinessPermitRenewalDraft(state) || undefined,
      }
    }
    return {
      state,
      reply:
        'The official eGovPay checkout link is in the payment card above. I will not mark the permit renewal as paid from a chat message; payment status is verified only after the eGovPay redirect.',
      application: state.submittedApplication,
      draft: buildBusinessPermitRenewalDraft(state) || undefined,
    }
  }

  const permitMatch = normalized.match(/permit(?: number)?\s*(?:to|is|:|-)?\s*([a-z0-9/-]{5,40})/i)
  const tinMatch = normalized.match(/\btin\s*(?:to|is|:|-)?\s*([\d\s-]{9,20})/i)
  const yearMatch = normalized.match(/(?:year|renewal year)\s*(?:to|is|:|-)?\s*(20\d{2})/i)
  const nameMatch = normalized.match(/business name\s*(?:to|is|:|-)?\s*(.+)$/i)
  const lguMatch = normalized.match(/\blgu\s*(?:to|is|:|-)?\s*(.+)$/i)
  const addressMatch = normalized.match(/business address\s*(?:to|is|:|-)?\s*(.+)$/i)
  const businessType = /(?:nature|business type)\b/i.test(normalized)
    ? resolveBusinessPermitType(normalized)
    : undefined

  if (permitMatch?.[1]) {
    const permitNumber = normalizePermitNumber(permitMatch[1])
    if (!permitNumber) return promptForState(state, 'The revised permit number is invalid.')
    return promptForState({ ...state, permitNumber }, 'I updated the permit number. Please review the draft again.')
  }
  if (tinMatch?.[1]) {
    const tin = normalizeTIN(tinMatch[1])
    if (!tin) return promptForState(state, 'The revised TIN is invalid.')
    return promptForState({ ...state, tin }, 'I updated the TIN. Please review the draft again.')
  }
  if (yearMatch?.[1] && getBusinessPermitRenewalYears().includes(Number(yearMatch[1]))) {
    return promptForState({ ...state, renewalYear: Number(yearMatch[1]) }, 'I updated the renewal year. Please review the draft again.')
  }
  if (nameMatch?.[1]) {
    const businessName = cleanText(nameMatch[1], 120)
    if (!businessName) return promptForState(state, 'The revised business name is invalid.')
    return promptForState({ ...state, businessName }, 'I updated the business name. Please review the draft again.')
  }
  if (lguMatch?.[1]) {
    const lgu = cleanText(lguMatch[1], 120)
    if (!lgu) return promptForState(state, 'The revised LGU is invalid.')
    return promptForState({ ...state, lgu }, 'I updated the issuing LGU. Please review the draft again.')
  }
  if (addressMatch?.[1]) {
    const businessAddress = cleanText(addressMatch[1], 240)
    if (!businessAddress) return promptForState(state, 'The revised business address is invalid.')
    return promptForState({ ...state, businessAddress }, 'I updated the business address. Please review the draft again.')
  }
  if (businessType) {
    return promptForState({ ...state, businessType }, 'I updated the nature of business. Please review the draft again.')
  }

  return {
    ...promptForState(state),
    reply:
      'I did not change the permit draft because the requested field was unclear. Edit the fields directly in the review card, or say something like **change TIN to 123-456-789-000**.',
  }
}

export const buildBusinessPermitRenewalDraft = (
  state: BusinessPermitAgentState
): BusinessPermitRenewalDraft | null => {
  const permitNumber = state.permitNumber ? normalizePermitNumber(state.permitNumber) : undefined
  const tin = state.tin ? normalizeTIN(state.tin) : undefined
  const validYear = !!state.renewalYear && getBusinessPermitRenewalYears().includes(state.renewalYear)
  if (
    !state.identityVerification ||
    !permitNumber ||
    !state.businessName?.trim() ||
    !state.lgu?.trim() ||
    !state.businessAddress?.trim() ||
    !state.businessType ||
    !tin ||
    !validYear ||
    getMissingBusinessPermitDocuments(state.documents).length > 0
  ) return null

  const fees = getBusinessPermitRenewalFees()
  return {
    permitNumber,
    businessName: state.businessName.trim(),
    lgu: state.lgu.trim(),
    businessAddress: state.businessAddress.trim(),
    businessType: state.businessType,
    tin,
    renewalYear: state.renewalYear!,
    verificationId: state.identityVerification.verificationId,
    documents: state.documents.map(document => ({ ...document })),
    fees,
    totalAmount: fees.reduce((sum, fee) => sum + fee.amount, 0),
  }
}

export const markBusinessPermitSubmitted = (
  state: BusinessPermitAgentState,
  application: BusinessPermitRenewalApplication
): BusinessPermitAgentTurn => {
  const next = { ...state, stage: 'submitted' as const, submittedApplication: application }
  return {
  state: next,
  reply:
    `Your Business Permit Renewal was submitted for LGU assessment. Tracking number: **${application.trackingId}**. Payment is still pending and nothing has been charged. Review the assessment card, then explicitly create an eGovPay link when ready.`,
  draft: buildBusinessPermitRenewalDraft(state) || undefined,
  application,
  prompt: { conversationId: state.id, stage: 'submitted' },
  }
}

export const markBusinessPermitPaymentCreated = (
  state: BusinessPermitAgentState,
  paymentIntent: PaymentIntent
): BusinessPermitAgentTurn => ({
  state: { ...state, stage: 'payment', paymentStatus: 'pending' },
  reply:
    'Your eGovPay test checkout link is ready. **The link is pending and nothing has been paid.** Payment happens only after you open the official hosted gateway and complete checkout.',
  draft: buildBusinessPermitRenewalDraft(state) || undefined,
  application: state.submittedApplication,
  paymentIntent,
})
