import { generateTourismContent } from './egovService'

export type TourismRequestType = 'itinerary' | 'destinations' | 'activities' | 'budget' | 'transport' | 'general'

export interface TourismResult {
  prompt: string
  destination?: string
  requestType: TourismRequestType
  source: 'egov_tourism_api' | 'unavailable'
  sessionId?: string
  generatedAt: string
  followUpPrompts: string[]
  error?: string
}

export interface TourismIntentResult {
  isTourismIntent: boolean
  content?: string
  result?: TourismResult
}

export interface TourismPlannerState {
  id: string
  stage: 'destination'
  originalPrompt: string
  offTopicCount: number
}

export interface TourismPlannerPrompt {
  conversationId: string
  stage: 'destination'
}

export interface TourismPlannerTurn {
  state: TourismPlannerState | null
  reply: string
  prompt?: TourismPlannerPrompt
  result?: TourismResult
  cancelled?: boolean
}

const PHILIPPINE_DESTINATIONS = [
  'Boracay',
  'Palawan',
  'El Nido',
  'Coron',
  'Puerto Princesa',
  'Cebu',
  'Bohol',
  'Siargao',
  'Baguio',
  'Vigan',
  'Batanes',
  'Davao',
  'Iloilo',
  'Bacolod',
  'Camiguin',
  'Siquijor',
  'Sagada',
  'La Union',
  'Manila',
  'Intramuros',
  'Tagaytay',
  'Batangas',
  'Bicol',
  'Albay',
  'Banaue',
  'Dumaguete',
  'General Santos',
  'Subic',
  'Clark',
  'Mt. Apo',
] as const

const strongTourismPattern =
  /\b(?:tourism|tourist|travel itinerary|trip itinerary|vacation plan|travel plan|plan (?:a|my|our) (?:trip|vacation|holiday)|places to visit|things to do|tourist spots?|travel guide|destination guide|tourism assistance)\b/i
const genericTourismPlanningPattern =
  /\b(?:help me (?:plan|with) (?:a |my |our )?(?:trip|vacation|travel)|i (?:want|would like|need) to (?:travel|take a trip|go on vacation)|where should i (?:travel|go)|choose (?:a |my )?(?:travel )?destination)\b/i
const travelActionPattern =
  /\b(?:visit|travel|go|fly|explore|trip|vacation|holiday|tour|itinerary|stay|hotel|resort|attractions?|activities|budget|transport|commute|get(?:ting)? around|ferry|flight|bus|van)\b/i
const governmentTravelDocumentPattern =
  /\b(?:passport|visa|immigration|travel document|dfa|departure clearance|arrival card|etravel|e-travel)\b/i

const nonDestinationPattern =
  /^(?:a |my |our |the )?(?:trip|travel|vacation|tour|itinerary|destination|family|friends?|partner|holiday|somewhere|anywhere|i don'?t know|not sure|surprise me|help me)$/i
const monthOrTimePattern =
  /^(?:today|tomorrow|this (?:week|month|year|weekend)|next (?:week|month|year|weekend)|january|february|march|april|may|june|july|august|september|october|november|december)$/i

const formatDestinationName = (value: string): string => {
  const lowerCaseWords = new Set(['and', 'of', 'the', 'in', 'at'])
  return value
    .split(/(\s+|-)/)
    .map((part, index) => {
      if (/^(?:\s+|-)$/.test(part)) return part
      if (/^[A-Z]{2,}$/.test(part)) return part
      const lower = part.toLocaleLowerCase()
      if (index > 0 && lowerCaseWords.has(lower)) return lower
      return lower.charAt(0).toLocaleUpperCase() + lower.slice(1)
    })
    .join('')
}

const cleanDestinationCandidate = (rawValue: string): string | undefined => {
  let candidate = rawValue
    .trim()
    .replace(/^["'`]+|["'`,.;:!?]+$/g, '')
    .replace(/\s+in\s+(?:the\s+)?philippines$/i, '')
    .replace(/\s+(?:for\s+(?:\d+|one|two|three|four|five|six|seven|a)\b.*)$/i, '')
    .replace(/\s+(?:with|during|by)\s+(?:my|our|the|a|an|bus|van|car|ferry|plane)\b.*$/i, '')
    .replace(/\s+on\s+(?:a\s+)?(?:budget|weekend|holiday)\b.*$/i, '')
    .trim()

  if (candidate.length < 2 || candidate.length > 80) return undefined
  if (/^(?:the\s+)?philippines$/i.test(candidate)) return 'Philippines'
  if (nonDestinationPattern.test(candidate) || monthOrTimePattern.test(candidate)) return undefined
  if (!/^[\p{L}\p{N}][\p{L}\p{N} .,'&()-]*$/u.test(candidate)) return undefined
  if (candidate.split(/\s+/).length > 12) return undefined

  const knownDestination = PHILIPPINE_DESTINATIONS.find(place =>
    place.localeCompare(candidate, undefined, { sensitivity: 'base' }) === 0
  )
  return knownDestination || formatDestinationName(candidate)
}

export const detectTourismDestination = (prompt: string): string | undefined => {
  const destination = PHILIPPINE_DESTINATIONS.find(place =>
    new RegExp(`\\b${place.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+')}\\b`, 'i').test(prompt)
  )
  if (destination) return destination

  const destinationPatterns = [
    /\b(?:destination\s*(?:is|:)|selected destination\s*(?:is|:)|choose)\s+([^\n.!?]{2,80})/i,
    /\b(?:travel|go|fly|visit|explore|vacation|tour)(?:\s+(?:to|in|around))?\s+([^\n.!?]{2,80})/i,
    /\b(?:trip|holiday|itinerary|travel plan|vacation plan|travel guide|destination guide)\s+(?:to|for|in|around)\s+([^\n.!?]{2,80})/i,
    /\b(?:things to do|places to visit|tourist spots?|attractions?|activities|hotels?|resorts?|get(?:ting)? around)\s+(?:in|at|around|for)\s+([^\n.!?]{2,80})/i,
  ]

  for (const pattern of destinationPatterns) {
    const match = prompt.match(pattern)
    const candidate = match?.[1] ? cleanDestinationCandidate(match[1]) : undefined
    if (candidate) return candidate
  }
  if (/\bphilippines\b/i.test(prompt)) return 'Philippines'
  return undefined
}

export const detectTourismRequestType = (prompt: string): TourismRequestType => {
  if (/\b(?:itinerary|day trip|\d+[- ]day|plan (?:a|my|our) trip)\b/i.test(prompt)) return 'itinerary'
  if (/\b(?:budget|cost|cheap|affordable|expenses?|how much)\b/i.test(prompt)) return 'budget'
  if (/\b(?:transport|commute|getting around|ferry|flight|bus|van)\b/i.test(prompt)) return 'transport'
  if (/\b(?:activities|things to do|what to do|adventure|food trip)\b/i.test(prompt)) return 'activities'
  if (/\b(?:places to visit|tourist spots?|destinations?|where to go|attractions?)\b/i.test(prompt)) return 'destinations'
  return 'general'
}

export const isTourismIntent = (prompt: string): boolean => {
  const normalized = prompt.trim()
  if (!normalized) return false
  const strongIntent = strongTourismPattern.test(normalized) || genericTourismPlanningPattern.test(normalized)
  if (governmentTravelDocumentPattern.test(normalized) && !strongIntent) return false

  const destination = detectTourismDestination(normalized)
  return strongIntent || (!!destination && travelActionPattern.test(normalized))
}

export const shouldAskForTourismDestination = (prompt: string): boolean =>
  isTourismIntent(prompt) && (!detectTourismDestination(prompt) || detectTourismDestination(prompt) === 'Philippines')

export const normalizeTourismDestination = (message: string): string | undefined => {
  const normalized = message
    .trim()
    .replace(/[.!?]+$/g, '')
    .replace(/^(?:how about|maybe|perhaps)\s+/i, '')
    .replace(/^(?:please\s+)?(?:i(?:'d| would)? like to\s+|i want to\s+|let'?s\s+)?(?:visit|travel|go|fly|take a trip)\s+(?:to\s+)?/i, '')
    .replace(/^(?:please\s+)?(?:i\s+|let'?s\s+)?(?:choose|select|pick|want|prefer)\s+/i, '')
    .replace(/^(?:my\s+)?destination\s*(?:is|:)?\s*/i, '')
    .replace(/,?\s+please$/i, '')
    .replace(/\s+(?:sounds good|would be good|is fine)$/i, '')

  if (!normalized || normalized.includes('?')) return undefined
  if (/^(?:what|why|when|where|who|how|can|could|would|should|do|does|is|are)\b/i.test(normalized)) return undefined
  if (/^(?:hello|hi|hey|thanks?|thank you|yes|no|okay|ok|sure|help|help me|i need help|good morning|good afternoon|good evening)$/i.test(normalized)) return undefined
  if (/\b(?:passport|visa|sss|social security|business permit|driver'?s license|tax|incident|accident|report|payment|loan)\b/i.test(normalized)) return undefined
  return cleanDestinationCandidate(normalized)
}

const isTourismPlannerCancellation = (message: string): boolean =>
  /^\s*(?:cancel|stop|exit)(?:\s+(?:the\s+)?(?:tourism|travel|trip)(?:\s+(?:planner|planning))?)?\s*[.!]?\s*$/i.test(message)

export const startTourismPlanner = (prompt: string): TourismPlannerTurn => {
  const state: TourismPlannerState = {
    id: `tourism-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    stage: 'destination',
    originalPrompt: prompt.trim(),
    offTopicCount: 0,
  }

  return {
    state,
    reply:
      'Which destination in the Philippines would you like to explore? Choose a suggestion below or type any city, province, island, municipality, or attraction in the chat.',
    prompt: { conversationId: state.id, stage: 'destination' },
  }
}

export const continueTourismPlanner = async (
  state: TourismPlannerState,
  message: string
): Promise<TourismPlannerTurn> => {
  if (isTourismPlannerCancellation(message)) {
    return {
      state: null,
      cancelled: true,
      reply: 'Tourism planning was cancelled. No booking, payment, or transaction was created.',
    }
  }

  const destination = normalizeTourismDestination(message)
  if (!destination) {
    const nextState = { ...state, offTopicCount: state.offTopicCount + 1 }
    return {
      state: nextState,
      reply:
        'That does not look like a Philippine destination, so I did not send it to the Tourism service. Please type a city, province, island, municipality, or attraction—for example, Banaue, Dumaguete, Bohol, or Chocolate Hills.',
      prompt: { conversationId: state.id, stage: 'destination' },
    }
  }

  const apiPrompt = [
    `Selected Philippine destination: ${destination}.`,
    `Traveler request: ${state.originalPrompt}`,
    'Provide practical tourism guidance for this selected destination. Do not claim that a booking, reservation, or payment has been made.',
  ].join('\n')
  const response = await processTourismIntent(apiPrompt, destination)

  return {
    state: null,
    reply: response.content || 'The Tourism service did not return readable content.',
    result: response.result,
  }
}

const createFollowUps = (destination?: string): string[] => {
  const place = destination || 'the Philippines'
  return [
    `Create a 3-day itinerary for ${place}`,
    `Give me a budget-friendly travel plan for ${place}`,
    `How do I get around ${place} safely?`,
  ]
}

export const processTourismIntent = async (
  prompt: string,
  destinationOverride?: string
): Promise<TourismIntentResult> => {
  if (!destinationOverride && !isTourismIntent(prompt)) return { isTourismIntent: false }

  const destination = destinationOverride || detectTourismDestination(prompt)
  const requestType = detectTourismRequestType(prompt)
  const baseResult: Omit<TourismResult, 'source'> = {
    prompt,
    destination,
    requestType,
    generatedAt: new Date().toISOString(),
    followUpPrompts: createFollowUps(destination),
  }

  try {
    const response = await generateTourismContent(prompt, 'PH')
    return {
      isTourismIntent: true,
      content: response.data,
      result: {
        ...baseResult,
        source: 'egov_tourism_api',
        sessionId: response.session_id,
      },
    }
  } catch (error) {
    console.warn('Tourism API request could not be completed:', error)
    return {
      isTourismIntent: true,
      content:
        'The eGovPH Tourism service is temporarily unavailable, so I could not generate a reliable travel response. Please try again in a moment. No booking or transaction was created.',
      result: {
        ...baseResult,
        source: 'unavailable',
        error: 'Tourism service temporarily unavailable',
      },
    }
  }
}
