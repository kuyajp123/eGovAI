import {
  AiReportDraft,
  ReportCategory,
  ReportSeverity,
  categoryLabels,
  generateAiReportDraft,
} from './eReportService';

export type EReportAgentStage = 'incident' | 'title' | 'location' | 'severity' | 'photo' | 'review';

export interface EReportAgentState {
  id: string;
  stage: EReportAgentStage;
  category: ReportCategory;
  title?: string;
  suggestedTitle?: string;
  description?: string;
  location?: string;
  severity?: ReportSeverity;
  imageUrl?: string;
  imageName?: string;
  photoDecision?: 'attached' | 'skipped';
  incidentMessages: string[];
  sourceMessages: string[];
  offTopicCount: number;
}

export interface EReportAgentPrompt {
  conversationId: string;
  stage: EReportAgentStage;
  suggestedTitle?: string;
}

export interface EReportAgentTurn {
  state: EReportAgentState | null;
  reply: string;
  prompt?: EReportAgentPrompt;
  draft?: AiReportDraft;
  cancelled?: boolean;
}

const incidentTerms = [
  'accident',
  'collision',
  'injury',
  'injured',
  'pothole',
  'road damage',
  'broken road',
  'streetlight',
  'broken light',
  'garbage',
  'trash',
  'waste',
  'sewage',
  'drainage',
  'flood',
  'flooding',
  'fire',
  'landslide',
  'hazard',
  'illegal parking',
  'traffic',
  'crime',
  'theft',
  'robbery',
  'assault',
  'bribery',
  'corruption',
  'red tape',
  'extortion',
  'overcharging',
  'misconduct',
  'outage',
  'water leak',
  'public safety',
  'complaint',
];

const explicitReportPattern =
  /\b(?:create|make|draft|file|generate|prepare|submit|start)\b.{0,55}\b(?:e-?report|incident report|complaint|report)\b|\b(?:i\s+(?:want|need|would like)\s+to\s+)?(?:report|complain about)\s+(?:a|an|the|this|that|some)?\s*\w+/i;

const cancellationPattern =
  /^(?:cancel|stop|exit|quit|never\s*mind|forget it)(?:\s+(?:this|the|my))?(?:\s+(?:e-?report|report|draft))?[.!]?$/i;

const informationalQuestionPattern =
  /^(?:what|why|when|where|who|how|is|are|do|does|can you explain|tell me about)\b/i;

type IncidentReplyClassification = 'sufficient' | 'relevant_incomplete' | 'unrelated';

const incidentNarrativePattern =
  /\b(?:happened|occurred|caused|causing|because|when|while|hit|crashed|collided|fell|falling|blocked|blocking|damaged|injured|hurt|burning|leaking|overflowing|days?|hours?|since)\b/i;

const incidentImpactPattern =
  /\b(?:person|people|individuals?|resident|residents|child|children|driver|passenger|pedestrian|vehicle|car|motorcycle|property|home|house|building|business|road|traffic|injury|injuries|damage|danger|hazard|smoke|flames?)\b/i;

export const isGeneralHelpRequest = (message: string): boolean => {
  const normalized = message.trim();
  if (normalized.split(/\s+/).length > 9) return false;
  return /^(?:hello[,!]?\s+|hi[,!]?\s+)?(?:(?:i\s+)?(?:need|want)\s+(?:some\s+)?help|help me|can you help me|please help)[.!]?$/i.test(
    normalized
  );
};

export const isEReportAgentIntent = (message: string): boolean => {
  const normalized = message.trim();
  if (!normalized || cancellationPattern.test(normalized)) return false;
  if (explicitReportPattern.test(normalized)) return true;

  const lower = normalized.toLowerCase();
  const hasIncidentTerm = incidentTerms.some(term => lower.includes(term));
  if (!hasIncidentTerm) return false;

  // Informational questions about an incident remain normal AI questions unless
  // the user explicitly asks to file/create a report.
  if (informationalQuestionPattern.test(normalized)) return false;
  return true;
};

const isCancellation = (message: string): boolean => cancellationPattern.test(message.trim());

const hasLocationSignal = (message: string): boolean =>
  /\b(?:at|in|near|along|beside|outside|inside|corner of|location is|happened at|occurred at|barangay|brgy\.?|street|st\.?|road|rd\.?|avenue|ave\.?|highway|city|municipality|province)\b/i.test(
    message
  );

const hasSpecificLocationSignal = (message: string): boolean => {
  if (/\b(?:barangay|brgy\.?|street|st\.?|road|rd\.?|avenue|ave\.?|highway|city|municipality|province|hall|school|hospital|market|terminal|coordinates?)\b/i.test(message)) {
    return true;
  }

  const match = message.match(/\b(?:at|in|near|along|beside|outside|inside)\s+([^,.!?\n]{3,100})/i);
  if (!match?.[1]) return false;
  return !/^(?:me|here|my\s+(?:place|area|location)|our\s+(?:place|area|location)|the\s+area)\b/i.test(
    match[1].trim()
  );
};

const normalizeGeneratedLocation = (location: string): string | undefined => {
  const normalized = location.trim();
  if (!normalized) return undefined;
  if (/^(?:\(?none available\)?|none|unknown|not provided|n\/?a|near me|here|my location|current location)$/i.test(normalized)) {
    return undefined;
  }
  return normalized.slice(0, 250);
};

const getExplicitTitle = (message: string): string | undefined => {
  const match = message.match(/(?:incident\s+)?(?:title|summary)\s*(?:is|:|-)?\s*["“]?([^"”\n.]{4,140})/i);
  return match?.[1]?.trim();
};

const normalizeSeverity = (message: string): ReportSeverity | undefined => {
  const normalized = message.toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').replace(/\s+/g, ' ').trim();
  if (/\b(?:not urgent|minor|low|level 1|1)\b/.test(normalized)) return 'low';
  if (/\b(?:medium|moderate|normal|level 2|2)\b/.test(normalized)) return 'medium';
  if (/\b(?:high|urgent|serious|major|level 3|3)\b/.test(normalized)) return 'high';
  if (/\b(?:critical|life threatening|life-threatening|emergency|severe|level 4|4)\b/.test(normalized)) {
    return 'critical';
  }
  return undefined;
};

const isExplicitSeverity = (message: string): boolean =>
  /\b(?:severity|urgency|priority|not urgent|minor|low|medium|moderate|high|urgent|serious|major|critical|life-threatening|emergency|severe|level [1-4])\b/i.test(
    message
  );

const isSufficientIncidentDescription = (message: string): boolean => {
  const normalized = message.trim();
  if (!normalized || (informationalQuestionPattern.test(normalized) && normalized.endsWith('?'))) return false;

  const lower = normalized.toLowerCase();
  const hasIncidentTerm = incidentTerms.some(term => lower.includes(term));
  const wordCount = normalized.split(/\s+/).filter(Boolean).length;
  const hasNarrativeSignal = incidentNarrativePattern.test(normalized);
  const hasImpactSignal = incidentImpactPattern.test(normalized);
  return (
    (wordCount >= 12 && (hasIncidentTerm || hasNarrativeSignal)) ||
    (wordCount >= 8 && hasIncidentTerm && (hasNarrativeSignal || hasImpactSignal))
  );
};

const classifyIncidentReply = (
  message: string,
  priorIncidentMessages: string[]
): IncidentReplyClassification => {
  const normalized = message.trim();
  if (!normalized) return 'unrelated';
  if (informationalQuestionPattern.test(normalized) && normalized.endsWith('?')) return 'unrelated';

  const lower = normalized.toLowerCase();
  const hasIncidentTerm = incidentTerms.some(term => lower.includes(term));
  const hasPriorIncidentContext = priorIncidentMessages.length > 0;
  const isRelevant =
    explicitReportPattern.test(normalized) ||
    hasIncidentTerm ||
    incidentNarrativePattern.test(normalized) ||
    incidentImpactPattern.test(normalized) ||
    (hasPriorIncidentContext && (hasLocationSignal(normalized) || isExplicitSeverity(normalized)));

  if (!isRelevant) return 'unrelated';

  const combinedIncident = [...priorIncidentMessages, normalized].join(' ').trim();
  return isSufficientIncidentDescription(combinedIncident) ? 'sufficient' : 'relevant_incomplete';
};

const containsIncidentDetail = (message: string): boolean => {
  const lower = message.toLowerCase();
  return (
    incidentTerms.some(term => lower.includes(term)) ||
    incidentNarrativePattern.test(message) ||
    incidentImpactPattern.test(message) ||
    hasSpecificLocationSignal(message) ||
    isExplicitSeverity(message)
  );
};

const isUsableTitle = (message: string): boolean => {
  const normalized = message.trim().replace(/^["“]|["”]$/g, '');
  if (normalized.length < 4 || normalized.length > 140) return false;
  if (informationalQuestionPattern.test(normalized) || normalized.endsWith('?')) return false;
  if (/^(?:i don't know|idk|not sure|none|skip)$/i.test(normalized)) return false;
  return true;
};

const normalizeLocationReply = (message: string): string | undefined => {
  const normalized = message
    .trim()
    .replace(/^(?:the\s+)?(?:location|place|landmark)\s*(?:is|:|-)?\s*/i, '')
    .replace(/^it\s+(?:happened|occurred)\s+(?:at|in|near)\s+/i, '')
    .trim();
  if (normalized.length < 3 || normalized.endsWith('?')) return undefined;
  if (/^(?:i don't know|idk|not sure|unknown|none|skip|no)$/i.test(normalized)) return undefined;
  if (normalizeSeverity(normalized)) return undefined;
  return normalized.slice(0, 250);
};

const promptForState = (state: EReportAgentState, lead = ''): EReportAgentTurn => {
  const prefix = lead ? `${lead}\n\n` : '';

  if (!state.description) {
    const next = { ...state, stage: 'incident' as const };
    return {
      state: next,
      reply:
        prefix +
        'I can help you prepare an eReport. First, please describe **what happened** with enough detail for an agency reviewer. Include who or what was affected and any immediate danger. Do not include passwords or financial information.',
      prompt: { conversationId: state.id, stage: 'incident' },
    };
  }

  if (!state.title) {
    const next = { ...state, stage: 'title' as const };
    return {
      state: next,
      reply:
        prefix +
        `What should the **Incident Title / Summary** be? I suggest **${state.suggestedTitle || categoryLabels[state.category]}**. You can use that suggestion or type your own short title.`,
      prompt: {
        conversationId: state.id,
        stage: 'title',
        suggestedTitle: state.suggestedTitle || categoryLabels[state.category],
      },
    };
  }

  if (!state.location) {
    const next = { ...state, stage: 'location' as const };
    return {
      state: next,
      reply:
        prefix +
        'Where did this happen? Choose one of the two options below: enter a **Specific Location / Landmark** manually, or enable **Current Location**. Your browser will ask for permission before sharing coordinates.',
      prompt: { conversationId: state.id, stage: 'location' },
    };
  }

  if (!state.severity) {
    const next = { ...state, stage: 'severity' as const };
    return {
      state: next,
      reply:
        prefix +
        'How urgent is the incident? Choose the **Urgency / Severity Level**: Low, Medium, High, or Critical. If someone is in immediate danger, call **911** instead of waiting for an eReport response.',
      prompt: { conversationId: state.id, stage: 'severity' },
    };
  }

  if (!state.photoDecision) {
    const next = { ...state, stage: 'photo' as const };
    return {
      state: next,
      reply:
        prefix +
        'Would you like to **attach photo evidence**? This is optional. You can upload an image now or continue without one.',
      prompt: { conversationId: state.id, stage: 'photo' },
    };
  }

  const next = { ...state, stage: 'review' as const };
  const draft = buildEReportDraft(next);
  return {
    state: next,
    reply:
      prefix +
      'Your eReport draft is ready. Review and edit the fields below. Nothing has been submitted yet. When everything is accurate, use **Submit eReport** as the final action.',
    prompt: { conversationId: state.id, stage: 'review' },
    draft: draft || undefined,
  };
};

const offTopicTurn = (state: EReportAgentState, fieldHint: string): EReportAgentTurn => {
  const count = state.offTopicCount + 1;
  return promptForState(
    { ...state, offTopicCount: count },
    `That response does not appear to answer the current eReport question, so I did not add it to your draft. ${fieldHint}${
      count >= 2 ? ' You can also say **cancel report** to leave the eReport agent.' : ''
    }`
  );
};

const partialIncidentTurn = (state: EReportAgentState, message: string): EReportAgentTurn => {
  const shouldStoreDetail = containsIncidentDetail(message);
  const incidentMessages = shouldStoreDetail
    ? [...state.incidentMessages, message]
    : state.incidentMessages;
  const lower = incidentMessages.join(' ').toLowerCase();
  const incidentTerm = incidentTerms.find(term => lower.includes(term));
  const needsEmergencyReminder = /\b(?:accident|collision|injured|injury|fire|assault|danger|emergency)\b/i.test(lower);

  const acknowledgement = incidentTerm
    ? `I understand that this report concerns **${incidentTerm}**. I saved that as a partial detail, but I need a little more information.`
    : 'I can create the eReport with you. First, I need the details of the incident or community problem.';
  const followUp = incidentNarrativePattern.test(incidentMessages.join(' '))
    ? 'Who or what was affected, and is there any injury, damage, or continuing danger?'
    : 'What exactly happened? Please include who or what was affected and any injury, damage, or continuing danger.';
  const emergencyReminder = needsEmergencyReminder
    ? ' If anyone is in immediate danger or needs urgent medical assistance, call **911** now.'
    : '';

  const next: EReportAgentState = {
    ...state,
    stage: 'incident',
    incidentMessages,
    sourceMessages: [...state.sourceMessages, message],
    offTopicCount: 0,
  };

  return {
    state: next,
    reply: `${acknowledgement}\n\n${followUp}${emergencyReminder}\n\nDo not include passwords or financial information.`,
    prompt: { conversationId: state.id, stage: 'incident' },
  };
};

const addIncidentDetails = async (
  state: EReportAgentState,
  message: string
): Promise<EReportAgentTurn> => {
  const classification = classifyIncidentReply(message, state.incidentMessages);
  if (classification === 'unrelated') {
    return offTopicTurn(
      state,
      'Please describe what happened, what was affected, and any danger or damage.'
    );
  }
  if (classification === 'relevant_incomplete') return partialIncidentTurn(state, message);

  const combinedIncident = [...state.incidentMessages, message].join(' ').trim();
  const generated = await generateAiReportDraft(combinedIncident, null);
  const explicitTitle = getExplicitTitle(combinedIncident);
  const generatedLocation = normalizeGeneratedLocation(generated.location);
  const location = hasSpecificLocationSignal(combinedIncident) ? generatedLocation : undefined;
  const severity = isExplicitSeverity(combinedIncident) ? normalizeSeverity(combinedIncident) : undefined;
  const updated: EReportAgentState = {
    ...state,
    category: generated.category,
    description: generated.description,
    suggestedTitle: generated.title,
    title: explicitTitle,
    location,
    severity,
    incidentMessages: [...state.incidentMessages, message],
    sourceMessages: [...state.sourceMessages, message],
    offTopicCount: 0,
  };
  return promptForState(updated);
};

export const startEReportAgent = async (message: string): Promise<EReportAgentTurn> => {
  const state: EReportAgentState = {
    id: `ereport-agent-${Date.now()}`,
    stage: 'incident',
    category: 'other',
    incidentMessages: [],
    sourceMessages: [],
    offTopicCount: 0,
  };

  return addIncidentDetails(state, message);
};

const applyReviewEdit = (state: EReportAgentState, message: string): EReportAgentTurn => {
  const titleMatch = message.match(/(?:change|update|set|edit)?\s*(?:the\s+)?(?:title|summary)\s*(?:to|as|is|:|-)?\s*["“]?([^"”\n]{4,140})/i);
  const locationMatch = message.match(/(?:change|update|set|edit)?\s*(?:the\s+)?(?:location|place|landmark)\s*(?:to|as|is|:|-)?\s*(.{3,250})/i);
  const descriptionMatch = message.match(/(?:change|update|set|edit)?\s*(?:the\s+)?(?:description|details)\s*(?:to|as|is|:|-)?\s*(.{8,2000})/i);
  const severity = /\b(?:severity|urgency|priority)\b/i.test(message) ? normalizeSeverity(message) : undefined;

  let updated = state;
  let changedField = '';
  if (titleMatch?.[1]) {
    updated = { ...updated, title: titleMatch[1].trim() };
    changedField = 'title';
  } else if (locationMatch?.[1]) {
    updated = { ...updated, location: locationMatch[1].trim() };
    changedField = 'location';
  } else if (descriptionMatch?.[1]) {
    updated = { ...updated, description: descriptionMatch[1].trim() };
    changedField = 'description';
  } else if (severity) {
    updated = { ...updated, severity };
    changedField = 'severity';
  }

  if (!changedField) {
    return {
      ...promptForState(state, 'I did not change the draft because that message was unrelated or the requested field was unclear.'),
      reply:
        'I did not change the draft because that message was unrelated or the requested field was unclear. Edit the fields directly in the review card, or say something like **change the location to Quezon City Hall**.',
    };
  }

  return promptForState(
    { ...updated, sourceMessages: [...state.sourceMessages, message], offTopicCount: 0 },
    `I updated the report ${changedField}. Please review the revised draft.`
  );
};

export const continueEReportAgent = async (
  state: EReportAgentState,
  message: string
): Promise<EReportAgentTurn> => {
  const normalized = message.trim();
  if (isCancellation(normalized)) {
    return {
      state: null,
      cancelled: true,
      reply: 'The eReport draft was cancelled. Nothing was submitted. You can ask me about another service or start a new report anytime.',
    };
  }

  if (state.stage === 'incident') return addIncidentDetails(state, normalized);

  if (state.stage === 'title') {
    const useSuggestion = /^(?:yes|okay|ok|use it|use that|use the suggestion|use suggested title|use the suggested title|accept|looks good)[.!]?$/i.test(
      normalized
    );
    if (useSuggestion && state.suggestedTitle) {
      return promptForState({
        ...state,
        title: state.suggestedTitle,
        sourceMessages: [...state.sourceMessages, normalized],
        offTopicCount: 0,
      });
    }
    if (!isUsableTitle(normalized)) {
      return offTopicTurn(state, 'Please enter a short incident title or choose the suggested title.');
    }
    return promptForState({
      ...state,
      title: normalized.replace(/^["“]|["”]$/g, '').slice(0, 140),
      sourceMessages: [...state.sourceMessages, normalized],
      offTopicCount: 0,
    });
  }

  if (state.stage === 'location') {
    const location = normalizeLocationReply(normalized);
    if (!location) {
      return offTopicTurn(
        state,
        'A location is required. Enter an address or landmark manually, or enable current location.'
      );
    }
    return useEReportLocation(state, location, normalized);
  }

  if (state.stage === 'severity') {
    const severity = normalizeSeverity(normalized);
    if (!severity) {
      return offTopicTurn(state, 'Please choose Low, Medium, High, or Critical.');
    }
    return promptForState({
      ...state,
      severity,
      sourceMessages: [...state.sourceMessages, normalized],
      offTopicCount: 0,
    });
  }

  if (state.stage === 'photo') {
    if (/^(?:no|none|skip|skip photo|continue without photo|not now|no photo|without photo)[.!]?$/i.test(normalized)) {
      return skipEReportPhoto(state);
    }
    return offTopicTurn(state, 'Use **Attach Photo** or choose **Continue without photo**.');
  }

  return applyReviewEdit(state, normalized);
};

export const useEReportLocation = (
  state: EReportAgentState,
  location: string,
  sourceMessage = location
): EReportAgentTurn =>
  promptForState({
    ...state,
    location: location.trim().slice(0, 250),
    sourceMessages: [...state.sourceMessages, sourceMessage],
    offTopicCount: 0,
  });

export const attachEReportPhoto = (
  state: EReportAgentState,
  imageUrl: string,
  imageName: string
): EReportAgentTurn =>
  promptForState({
    ...state,
    imageUrl,
    imageName,
    photoDecision: 'attached',
    sourceMessages: [...state.sourceMessages, `Attached photo evidence: ${imageName}`],
    offTopicCount: 0,
  });

export const skipEReportPhoto = (state: EReportAgentState): EReportAgentTurn =>
  promptForState({
    ...state,
    imageUrl: undefined,
    imageName: undefined,
    photoDecision: 'skipped',
    sourceMessages: [...state.sourceMessages, 'Photo evidence skipped'],
    offTopicCount: 0,
  });

export const buildEReportDraft = (state: EReportAgentState): AiReportDraft | null => {
  if (!state.title || !state.description || !state.location || !state.severity) return null;
  return {
    category: state.category,
    title: state.title,
    description: state.description,
    location: state.location,
    severity: state.severity,
    imageUrl: state.imageUrl,
    sourcePrompt: state.sourceMessages.join('\n'),
    generatedAt: new Date().toISOString(),
  };
};
