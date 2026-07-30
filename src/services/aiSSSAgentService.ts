import { PaymentIntent } from './eGovPayService'
import {
  SSS_APPLICABLE_PERIODS,
  SSS_MEMBERSHIP_TYPES,
  SSSServiceType,
  getSSSServiceConfig,
  isValidSSSNumber,
  normalizeSSSNumber,
  normalizeSSSPRN,
  resolveSSSApplicablePeriod,
  resolveSSSMembershipType,
} from './sssService'

export type SSSAgentStage =
  | 'service'
  | 'identity'
  | 'sss_number'
  | 'membership'
  | 'period'
  | 'prn'
  | 'review'
  | 'payment'

export interface SSSIdentityVerification {
  verificationId: string
  citizenName?: string
  verifiedAt: string
}

export interface SSSAgentState {
  id: string
  stage: SSSAgentStage
  serviceType?: SSSServiceType
  identityVerification?: SSSIdentityVerification
  sssNumber?: string
  membershipType?: string
  applicablePeriod?: string
  prn?: string
  paymentStatus?: PaymentIntent['status']
  sourceMessages: string[]
  offTopicCount: number
}

export interface SSSAgentPrompt {
  conversationId: string
  stage: SSSAgentStage
}

export interface SSSTransactionDraft {
  serviceType: SSSServiceType
  serviceTitle: string
  sssNumber: string
  membershipType?: string
  applicablePeriod?: string
  prn?: string
  verificationId: string
  fees: Array<{ label: string; amount: number }>
  totalAmount: number
}

export interface SSSAgentTurn {
  state: SSSAgentState | null
  reply: string
  prompt?: SSSAgentPrompt
  draft?: SSSTransactionDraft
  paymentIntent?: PaymentIntent
  cancelled?: boolean
}

const cancellationPattern =
  /^(?:cancel|stop|exit|quit|never\s*mind|forget it)(?:\s+(?:this|the|my))?(?:\s+(?:sss|transaction|payment|service|draft))?[.!]?$/i

const informationalQuestionPattern = /^(?:what|why|when|where|who|how|is|are|do|does|can)\b/i

export const detectSSSServiceType = (message: string): SSSServiceType | undefined => {
  const normalized = message.toLowerCase()
  if (/\b(?:member record|record verification|verify (?:my )?(?:sss )?(?:record|membership)|link (?:my )?(?:sss|crn)|crn verification)\b/.test(normalized)) {
    return 'record_verification'
  }
  if (/\b(?:salary loan|loan amortization|loan payment|pay (?:my )?(?:sss )?loan)\b/.test(normalized)) {
    return 'salary_loan'
  }
  if (/\b(?:voluntary contribution|sss contribution|contribution payment|pay (?:my )?sss|self[- ]?employed contribution|ofw contribution)\b/.test(normalized)) {
    return 'contribution'
  }
  return undefined
}

export const isSSSAgentIntent = (message: string): boolean => {
  const normalized = message.trim()
  if (!/\b(?:sss|social security)\b/i.test(normalized) || cancellationPattern.test(normalized)) return false

  const isQuestion = informationalQuestionPattern.test(normalized) || normalized.endsWith('?')
  const firstPersonAction =
    /\b(?:i\s+(?:want|need|would like)\s+to|help me|please)\s+(?:pay|process|start|verify|link|use|manage)\b/i.test(normalized)
  const directAction =
    /\b(?:start|process|pay|verify|link|use|manage)\b.{0,60}\b(?:sss|social security)\b|\b(?:sss|social security)\b.{0,60}\b(?:payment|pay|verify|verification|service|transaction)\b/i.test(
      normalized
    )
  const explicitChatStart = /\bstart\s+sss\s+services?\s+in\s+chat\b/i.test(normalized)

  if (isQuestion && !firstPersonAction && !explicitChatStart) return false
  return firstPersonAction || directAction || explicitChatStart
}

const promptForState = (state: SSSAgentState, lead = ''): SSSAgentTurn => {
  const prefix = lead ? `${lead}\n\n` : ''

  if (!state.serviceType) {
    const next = { ...state, stage: 'service' as const }
    return {
      state: next,
      reply:
        prefix +
        'Which **SSS service** do you want to process inside this chat: Voluntary Contribution, Salary Loan Amortization, or Member Record Verification?',
      prompt: { conversationId: state.id, stage: 'service' },
    }
  }

  const service = getSSSServiceConfig(state.serviceType)!
  if (!state.identityVerification) {
    const next = { ...state, stage: 'identity' as const }
    return {
      state: next,
      reply:
        prefix +
        `Before collecting your SSS transaction details for **${service.title}**, you must complete the official PhilSys eVerify face-liveness check. This biometric step starts only when you choose **Verify Identity** below.`,
      prompt: { conversationId: state.id, stage: 'identity' },
    }
  }

  if (!state.sssNumber) {
    const next = { ...state, stage: 'sss_number' as const }
    return {
      state: next,
      reply:
        prefix +
        'Please enter your **SSS Number or CRN**. Use a 10-digit SSS number or 12-digit CRN; hyphens are optional. Do not provide your My.SSS password, OTP, PIN, or payment-card information.',
      prompt: { conversationId: state.id, stage: 'sss_number' },
    }
  }

  if (state.serviceType === 'contribution' && !state.membershipType) {
    const next = { ...state, stage: 'membership' as const }
    return {
      state: next,
      reply: prefix + 'Choose your **membership type** for this contribution.',
      prompt: { conversationId: state.id, stage: 'membership' },
    }
  }

  if (state.serviceType === 'contribution' && !state.applicablePeriod) {
    const next = { ...state, stage: 'period' as const }
    return {
      state: next,
      reply: prefix + 'Which **applicable payment period** should this contribution cover?',
      prompt: { conversationId: state.id, stage: 'period' },
    }
  }

  if (state.serviceType !== 'record_verification' && !state.prn) {
    const next = { ...state, stage: 'prn' as const }
    return {
      state: next,
      reply:
        prefix +
        (state.serviceType === 'contribution'
          ? 'Enter the **Payment Reference Number (PRN)** generated by the SSS Mobile App or My.SSS portal.'
          : 'Enter your **Salary Loan Account Number or PRN**.'),
      prompt: { conversationId: state.id, stage: 'prn' },
    }
  }

  const next = { ...state, stage: 'review' as const }
  const draft = buildSSSTransactionDraft(next)
  return {
    state: next,
    reply:
      prefix +
      'Your SSS transaction draft is ready. Review and edit every field below. **No payment transaction has been created and nothing has been paid yet.** When the information is correct, choose **Confirm & Create eGovPay Link**.',
    prompt: { conversationId: state.id, stage: 'review' },
    draft: draft || undefined,
  }
}

const offTopicTurn = (state: SSSAgentState, hint: string): SSSAgentTurn => {
  const count = state.offTopicCount + 1
  return promptForState(
    { ...state, offTopicCount: count },
    `That response does not answer the current SSS question, so I did not add it to the transaction. ${hint}${
      count >= 2 ? ' You can say **cancel SSS transaction** to leave this agent.' : ''
    }`
  )
}

export const selectSSSAgentService = (
  state: SSSAgentState,
  serviceType: SSSServiceType,
  sourceMessage: string = serviceType
): SSSAgentTurn => {
  const service = getSSSServiceConfig(serviceType)!
  return promptForState(
    {
      ...state,
      serviceType,
      sssNumber: undefined,
      membershipType: undefined,
      applicablePeriod: undefined,
      prn: undefined,
      sourceMessages: [...state.sourceMessages, sourceMessage],
      offTopicCount: 0,
    },
    `I selected **${service.title}**. Nothing has been submitted.`
  )
}

export const startSSSAgent = (message: string): SSSAgentTurn => {
  const state: SSSAgentState = {
    id: `sss-agent-${Date.now()}`,
    stage: 'service',
    sourceMessages: [message],
    offTopicCount: 0,
  }
  const detectedService = detectSSSServiceType(message)
  return detectedService
    ? selectSSSAgentService({ ...state, sourceMessages: [] }, detectedService, message)
    : promptForState(state)
}

export const markSSSIdentityVerified = (
  state: SSSAgentState,
  verification: SSSIdentityVerification
): SSSAgentTurn =>
  promptForState(
    {
      ...state,
      identityVerification: verification,
      sourceMessages: [...state.sourceMessages, `PhilSys eVerify completed: ${verification.verificationId}`],
      offTopicCount: 0,
    },
    `PhilSys identity verification succeeded. Verification reference: **${verification.verificationId}**.`
  )

export const continueSSSAgent = (state: SSSAgentState, message: string): SSSAgentTurn => {
  const normalized = message.trim()
  if (cancellationPattern.test(normalized)) {
    return {
      state: null,
      cancelled: true,
      reply:
        state.stage === 'payment'
          ? 'I closed the SSS agent. Nothing was marked as paid. Any eGovPay link already created remains pending until it is paid, cancelled, or expires.'
          : 'The SSS transaction draft was cancelled. No payment transaction was created and nothing was paid.',
    }
  }

  if (state.stage === 'service') {
    const serviceType = detectSSSServiceType(normalized)
    return serviceType
      ? selectSSSAgentService(state, serviceType, normalized)
      : offTopicTurn(state, 'Please choose Voluntary Contribution, Salary Loan Amortization, or Member Record Verification.')
  }

  if (state.stage === 'identity') {
    return offTopicTurn(state, 'Use the **Verify Identity** button so the official face-liveness check can run.')
  }

  if (state.stage === 'sss_number') {
    const sssNumber = normalizeSSSNumber(normalized)
    if (!sssNumber) {
      if (/\d/.test(normalized)) {
        return promptForState(
          state,
          'That number is incomplete or has the wrong length. Enter a 10-digit SSS number or 12-digit CRN; hyphens are optional.'
        )
      }
      return offTopicTurn(state, 'Please enter your 10-digit SSS number or 12-digit CRN.')
    }
    return promptForState({
      ...state,
      sssNumber,
      sourceMessages: [...state.sourceMessages, 'SSS Number / CRN provided'],
      offTopicCount: 0,
    })
  }

  if (state.stage === 'membership') {
    const membershipType = resolveSSSMembershipType(normalized)
    if (!membershipType) {
      return offTopicTurn(state, `Choose ${SSS_MEMBERSHIP_TYPES.join(', ')}.`)
    }
    return promptForState({
      ...state,
      membershipType,
      sourceMessages: [...state.sourceMessages, membershipType],
      offTopicCount: 0,
    })
  }

  if (state.stage === 'period') {
    const applicablePeriod = resolveSSSApplicablePeriod(normalized)
    if (!applicablePeriod) {
      return offTopicTurn(state, `Choose ${SSS_APPLICABLE_PERIODS.join(', ')}.`)
    }
    return promptForState({
      ...state,
      applicablePeriod,
      sourceMessages: [...state.sourceMessages, applicablePeriod],
      offTopicCount: 0,
    })
  }

  if (state.stage === 'prn') {
    const prn = normalizeSSSPRN(normalized)
    if (!prn) {
      if (/\d/.test(normalized)) {
        return promptForState(
          state,
          'That PRN or loan account number is incomplete. Use 8–40 letters, numbers, or hyphens.'
        )
      }
      return offTopicTurn(state, 'Please provide the PRN or loan account number shown in My.SSS or the SSS Mobile App.')
    }
    return promptForState({
      ...state,
      prn,
      sourceMessages: [...state.sourceMessages, 'SSS PRN / loan account number provided'],
      offTopicCount: 0,
    })
  }

  if (state.stage === 'payment') {
    if (state.paymentStatus === 'paid') {
      return {
        state,
        reply: 'eGovPay has confirmed this SSS payment. The card above now shows **Paid · Confirmed**. You do not need to pay again.',
      }
    }
    if (state.paymentStatus === 'failed' || state.paymentStatus === 'cancelled') {
      return {
        state,
        reply: `eGovPay reports this checkout as **${state.paymentStatus}**. Use Refresh Payment Status before starting another transaction if you believe payment completed.`,
      }
    }
    return {
      state,
      reply:
        'Your eGovPay checkout link is ready in the payment card above. Open that official link to pay. I will not mark the SSS transaction as paid from a chat message; payment status is verified by eGovPay after its redirect.',
    }
  }

  const sssMatch = normalized.match(/(?:sss\s+(?:number|crn)|crn)\s*(?:to|is|:|-)?\s*([\d\s-]{10,20})/i)
  const prnMatch = normalized.match(/(?:prn|loan account(?: number)?)\s*(?:to|is|:|-)?\s*([a-z0-9-]{8,40})/i)
  const membershipType = /\b(?:membership|member type|ofw|voluntary|self[- ]?employed|spouse)\b/i.test(normalized)
    ? resolveSSSMembershipType(normalized)
    : undefined
  const applicablePeriod = /\b(?:period|month|quarter|q[1-4])\b/i.test(normalized)
    ? resolveSSSApplicablePeriod(normalized)
    : undefined

  if (sssMatch?.[1]) {
    const sssNumber = normalizeSSSNumber(sssMatch[1])
    if (!sssNumber) return promptForState(state, 'The revised SSS number or CRN is not valid.')
    return promptForState({ ...state, sssNumber }, 'I updated the SSS number / CRN. Please review the draft again.')
  }
  if (prnMatch?.[1]) {
    const prn = normalizeSSSPRN(prnMatch[1])
    if (!prn) return promptForState(state, 'The revised PRN or loan account number is not valid.')
    return promptForState({ ...state, prn }, 'I updated the PRN / loan account number. Please review the draft again.')
  }
  if (membershipType) {
    return promptForState({ ...state, membershipType }, 'I updated the membership type. Please review the draft again.')
  }
  if (applicablePeriod) {
    return promptForState({ ...state, applicablePeriod }, 'I updated the applicable period. Please review the draft again.')
  }

  return {
    ...promptForState(state),
    reply:
      'I did not change the SSS draft because the requested field was unclear. Edit the fields directly in the review card, or say something like **change PRN to PRN-202607-12345678**.',
  }
}

export const buildSSSTransactionDraft = (state: SSSAgentState): SSSTransactionDraft | null => {
  const service = getSSSServiceConfig(state.serviceType)
  if (!service || !state.identityVerification || !state.sssNumber || !isValidSSSNumber(state.sssNumber)) return null
  if (state.serviceType === 'contribution' && (!state.membershipType || !state.applicablePeriod || !state.prn)) return null
  if (state.serviceType === 'salary_loan' && !state.prn) return null
  if (state.prn && !normalizeSSSPRN(state.prn)) return null

  const fees = service.defaultFees.map(fee => ({ ...fee }))
  return {
    serviceType: service.id,
    serviceTitle: service.title,
    sssNumber: normalizeSSSNumber(state.sssNumber)!,
    membershipType: state.membershipType,
    applicablePeriod: state.applicablePeriod,
    prn: state.prn ? normalizeSSSPRN(state.prn) : undefined,
    verificationId: state.identityVerification.verificationId,
    fees,
    totalAmount: fees.reduce((sum, fee) => sum + fee.amount, 0),
  }
}

export const markSSSPaymentCreated = (
  state: SSSAgentState,
  paymentIntent: PaymentIntent
): SSSAgentTurn => ({
  state: { ...state, stage: 'payment', paymentStatus: 'pending' },
  reply:
    'Your eGovPay test checkout link is ready. **This transaction is still pending and has not been paid.** Review the reference and amount, then use the official gateway button below when you are ready.',
  draft: buildSSSTransactionDraft(state) || undefined,
  paymentIntent,
})
