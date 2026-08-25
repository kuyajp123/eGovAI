import { useCallback, useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { useNavigate } from 'react-router-dom';
import {
  SSSAgentPromptCard,
  SSSPaymentCard,
  SSSTransactionReviewCard,
} from '../components/SSSAgentCards';
import {
  BusinessPermitPaymentCard,
  BusinessPermitPromptCard,
  BusinessPermitReviewCard,
  BusinessPermitSubmissionCard,
} from '../components/BusinessPermitAgentCards';
import { TourismDestinationPickerCard, TourismResultCard } from '../components/TourismResultCard';
import EBuddyMascot from '../components/EBuddyMascot';
import {
  DonationHistoryCard,
  DonationPaymentCard,
  DonationPromptCard,
  DonationReviewCard,
} from '../components/DonationAgentCards';
import { useAuth } from '../context/AuthContext';
import { AiBusinessAction, processAiBusinessIntent } from '../services/aiBusinessService';
import { CtaAction, detectCtaAction } from '../services/aiCtaService';
import { IdentityCardData, processAiIdentityIntent } from '../services/aiIdentityService';
import { TransparencyResult, processTransparencyIntent } from '../services/aiTransparencyService';
import { generateAIResponse, generateSpeech, translateText } from '../services/egovService';
import {
  PAYMENT_STATUS_STORAGE_PREFIX,
  PaymentIntent,
  PaymentStatusSignal,
  createPaymentIntent,
  getPublishedPaymentStatus,
  getTransactionDetails,
  publishPaymentStatus,
} from '../services/eGovPayService';
import { sendVerificationConfirmation } from '../services/eMessageService';
import { triggerEVerifyLivenessSDK, verifyIdentity } from '../services/eVerifyService';
import {
  AiReportDraft,
  IncidentReport,
  ReportCategory,
  ReportSeverity,
  categoryLabels,
  submitIncidentReport,
} from '../services/eReportService';
import {
  EReportAgentPrompt,
  EReportAgentState,
  EReportAgentTurn,
  attachEReportPhoto,
  buildEReportDraft,
  continueEReportAgent,
  isEReportAgentIntent,
  isGeneralHelpRequest,
  startEReportAgent,
  useEReportLocation,
} from '../services/aiEReportAgentService';
import {
  SSSAgentPrompt,
  SSSAgentState,
  SSSAgentTurn,
  SSSTransactionDraft,
  buildSSSTransactionDraft,
  continueSSSAgent,
  isSSSAgentIntent,
  markSSSIdentityVerified,
  markSSSPaymentCreated,
  startSSSAgent,
} from '../services/aiSSSAgentService';
import {
  BusinessPermitAgentPrompt,
  BusinessPermitAgentState,
  BusinessPermitAgentTurn,
  attachBusinessPermitDocument,
  buildBusinessPermitRenewalDraft,
  continueBusinessPermitAgent,
  isBusinessPermitRenewalIntent,
  markBusinessPermitIdentityVerified,
  markBusinessPermitPaymentCreated,
  markBusinessPermitSubmitted,
  reopenBusinessPermitDocuments,
  removeBusinessPermitDocument,
  startBusinessPermitAgent,
} from '../services/aiBusinessPermitAgentService';
import {
  BusinessPermitDocumentType,
  BusinessPermitRenewalApplication,
  BusinessPermitRenewalDraft,
  submitBusinessPermitRenewal,
  validateBusinessPermitDocument,
} from '../services/businessPermitService';
import { sendApplicationConfirmation } from '../services/eMessageService';
import {
  TourismPlannerPrompt,
  TourismPlannerState,
  TourismPlannerTurn,
  TourismResult,
  continueTourismPlanner,
  isTourismIntent,
  processTourismIntent,
  shouldAskForTourismDestination,
  startTourismPlanner,
} from '../services/aiTourismService';
import {
  DonationAgentPrompt,
  DonationAgentState,
  DonationAgentTurn,
  buildDonationDraft,
  continueDonationAgent,
  isDonationAgentIntent,
  isDonationTrackingIntent,
  markDonationPaymentCreated,
  processDonationTrackingIntent,
  startDonationAgent,
} from '../services/aiDonationAgentService';
import {
  DonationDraft,
  DonationSummary,
  getDonationLedger,
  recordDonationPaymentLink,
  recordDonationPaymentStatus,
} from '../services/donationService';
import { syncDonationChainAnchors } from '../services/eChainService';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sessionId?: string;
  reportDraft?: AiReportDraft;
  reportAgentPrompt?: EReportAgentPrompt;
  submittedReport?: IncidentReport;
  imagePreview?: string;
  sssAgentPrompt?: SSSAgentPrompt;
  sssStateSnapshot?: SSSAgentState;
  sssDraft?: SSSTransactionDraft;
  sssPaymentIntent?: PaymentIntent;
  businessPermitAgentPrompt?: BusinessPermitAgentPrompt;
  businessPermitStateSnapshot?: BusinessPermitAgentState;
  businessPermitDraft?: BusinessPermitRenewalDraft;
  businessPermitApplication?: BusinessPermitRenewalApplication;
  businessPermitPaymentIntent?: PaymentIntent;
  tourismPlannerPrompt?: TourismPlannerPrompt;
  tourismResult?: TourismResult;
  donationAgentPrompt?: DonationAgentPrompt;
  donationStateSnapshot?: DonationAgentState;
  donationDraft?: DonationDraft;
  donationPaymentIntent?: PaymentIntent;
  donationHistory?: DonationSummary[];
  businessAction?: AiBusinessAction;
  identityCard?: IdentityCardData;
  ctaAction?: CtaAction;
  transparencyResult?: TransparencyResult;
  /** Set when the message triggered the Laws & Regulations page */
  lawsQuery?: string;
  /** Set when the user's message was auto-translated before processing */
  translatedFrom?: { originalText: string; sourceLang: string; sourceLabel: string };
}

const EREPORT_AGENT_PLACEHOLDERS: Record<EReportAgentState['stage'], string> = {
  incident: 'Describe what happened and what was affected...',
  title: 'Type a short incident title, or use the suggestion...',
  location: 'Type the incident address or nearest landmark...',
  severity: 'Choose Low, Medium, High, or Critical...',
  photo: 'Use the photo buttons, or type “skip photo”...',
  review: 'Edit the review card, or tell me what to change...',
};

const SSS_AGENT_PLACEHOLDERS: Record<SSSAgentState['stage'], string> = {
  service: 'Choose an SSS service...',
  identity: 'Use Verify Identity to continue...',
  sss_number: 'Enter your 10-digit SSS number or 12-digit CRN...',
  membership: 'Choose your SSS membership type...',
  period: 'Choose the contribution payment period...',
  prn: 'Enter your SSS PRN or loan account number...',
  review: 'Edit the SSS review card, or tell me what to change...',
  payment: 'Payment status and next actions are shown above...',
};

const isSSSCtaAction = (action?: CtaAction): boolean =>
  action?.actionType === 'sss_services' || action?.actionType === 'sss_contribution';

const BUSINESS_PERMIT_AGENT_PLACEHOLDERS: Record<BusinessPermitAgentState['stage'], string> = {
  identity: 'Use Verify Identity to continue...',
  permit_number: 'Enter the existing business permit number...',
  business_name: 'Enter the registered business name...',
  lgu: 'Enter the issuing city or municipality...',
  business_address: 'Enter the complete business address...',
  business_type: 'Choose the nature of business...',
  tin: 'Enter the 9-digit or 12-digit TIN...',
  renewal_year: 'Choose the permit renewal year...',
  documents: 'Use the document upload controls above...',
  review: 'Edit the permit review card, or tell me what to change...',
  submitted: 'Use Create eGovPay Link above, or close the agent...',
  payment: 'Payment status and next actions are shown above...',
};

const TOURISM_PLANNER_PLACEHOLDER = 'Type any Philippine destination...';

const DONATION_AGENT_PLACEHOLDERS: Record<DonationAgentState['stage'], string> = {
  campaign: 'Choose a configured donation campaign...',
  amount: 'Enter a donation amount from ₱1 to ₱100,000...',
  review: 'Edit the donation review card, or tell me what to change...',
  payment: 'Open eGovPay or ask me to check the donation status...',
};

const isBusinessPermitRenewalCtaAction = (action?: CtaAction): boolean =>
  action?.actionType === 'business_permit_renewal';

// ── Language detection helper ─────────────────────────────────────────────────
// Detects Filipino/Tagalog and other non-English languages using common function
// words and character patterns. Returns ISO 639-1 code or null for English.
const FILIPINO_MARKERS = [
  'ako', 'mo', 'ko', 'niya', 'namin', 'natin', 'nila', 'siya', 'sila',
  'ang', 'ng', 'mga', 'sa', 'na', 'ay', 'at', 'ito', 'iyon', 'ito',
  'hindi', 'oo', 'wala', 'mayroon', 'may', 'kung', 'dahil', 'para',
  'bayaran', 'bayad', 'gawin', 'gusto', 'kailangan', 'pwede', 'puwede',
  'yung', 'yun', 'dito', 'doon', 'sino', 'ano', 'bakit', 'kailan',
  'paano', 'saan', 'akin', 'amin', 'atin', 'kanila',
  'permit ko', 'business ko', 'lisensya ko', 'id ko',
]

const detectNonEnglish = (text: string): { lang: string; label: string } | null => {
  const lower = text.toLowerCase()
  const words = lower.split(/\s+/)
  const filMatches = FILIPINO_MARKERS.filter(m => lower.includes(m)).length
  // Require at least 2 marker matches, or 1 strong compound marker to avoid false positives
  const strongMatch = ['bayaran', 'bayad', 'gawin', 'gusto', 'kailangan', 'pwede', 'puwede',
    'permit ko', 'business ko', 'lisensya ko', 'id ko', 'yung', 'paano', 'bakit']
    .some(m => lower.includes(m))
  if (filMatches >= 2 || strongMatch) return { lang: 'fil', label: 'Filipino' }
  // Detect Spanish-like (basic heuristic)
  const esMarkers = ['quiero', 'necesito', 'cómo', 'como', 'qué', 'que', 'mi', 'licencia', 'permiso']
  if (esMarkers.filter(m => words.includes(m)).length >= 2) return { lang: 'es', label: 'Spanish' }
  return null
}

const AIChatHome = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [inputValue, setInputValue] = useState('');
  const [inputOriginal, setInputOriginal] = useState<string | null>(null); // pre-translation original
  const [isTranslatingInput, setIsTranslatingInput] = useState(false);
  const translateDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesRef = useRef<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [category] = useState('PH');
  const [isListening, setIsListening] = useState(false);
  const [eReportAgent, setEReportAgent] = useState<EReportAgentState | null>(null);
  const [activeEReportMessageId, setActiveEReportMessageId] = useState<string | null>(null);
  const [isSubmittingEReport, setIsSubmittingEReport] = useState(false);
  const [manualEReportLocation, setManualEReportLocation] = useState('');
  const [isFetchingEReportLocation, setIsFetchingEReportLocation] = useState(false);
  const eReportLocationRequestRef = useRef(0);
  const [sssAgent, setSSSAgent] = useState<SSSAgentState | null>(null);
  const [activeSSSMessageId, setActiveSSSMessageId] = useState<string | null>(null);
  const [isVerifyingSSS, setIsVerifyingSSS] = useState(false);
  const [isCreatingSSSPayment, setIsCreatingSSSPayment] = useState(false);
  const sssOperationRequestRef = useRef(0);
  const [businessPermitAgent, setBusinessPermitAgent] = useState<BusinessPermitAgentState | null>(null);
  const [activeBusinessPermitMessageId, setActiveBusinessPermitMessageId] = useState<string | null>(null);
  const [isVerifyingBusinessPermit, setIsVerifyingBusinessPermit] = useState(false);
  const [isSubmittingBusinessPermit, setIsSubmittingBusinessPermit] = useState(false);
  const [isCreatingBusinessPermitPayment, setIsCreatingBusinessPermitPayment] = useState(false);
  const [businessPermitDocumentError, setBusinessPermitDocumentError] = useState<string | null>(null);
  const [tourismPlanner, setTourismPlanner] = useState<TourismPlannerState | null>(null);
  const [activeTourismMessageId, setActiveTourismMessageId] = useState<string | null>(null);
  const [donationAgent, setDonationAgent] = useState<DonationAgentState | null>(null);
  const [activeDonationMessageId, setActiveDonationMessageId] = useState<string | null>(null);
  const [isCreatingDonationPayment, setIsCreatingDonationPayment] = useState(false);
  const [checkingPaymentIds, setCheckingPaymentIds] = useState<string[]>([]);
  const checkingPaymentIdsRef = useRef(new Set<string>());
  const businessPermitOperationRequestRef = useRef(0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  const placeholders = [
    "How do I renew my driver's license online?",
    'What are the requirements for National ID?',
    'How to apply for a Business Permit in 2026?',
    'How to request PSA Birth Certificate online?',
    'Where is the nearest Social Security office?',
    'Help me choose a travel destination',
    'I want to donate to a community campaign',
  ];

  const featureCards = [
    {
      icon: 'badge',
      title: 'National ID & Civil Docs',
      desc: 'Check PhilSys ID, PSA certificates, birth/marriage records',
      query: 'How do I request a digital National ID or PSA Birth Certificate?',
    },
    {
      icon: 'storefront',
      title: 'Business & Taxes',
      desc: 'Business permit renewal, BIR TIN, Tax filing guides',
      query: 'What are the requirements for renewing a Business Permit?',
    },
    {
      icon: 'directions_car',
      title: 'LTO & Vehicle Permits',
      desc: "Driver's license renewal, vehicle registration, LTFRB",
      query: "How do I renew my driver's license and vehicle registration?",
    },
    {
      icon: 'shield_person',
      title: 'Social Benefits & SSS',
      desc: 'SSS, GSIS, PhilHealth, Pag-IBIG contributions & loans',
      query: 'How can I check my SSS contribution and loan status?',
    },
    {
      icon: 'travel_explore',
      title: 'Tourism & Travel',
      desc: 'Philippine destinations, itineraries, budgets, and transport tips',
      query: 'Help me plan a trip',
    },
    {
      icon: 'volunteer_activism',
      title: 'Donations & Giving',
      desc: 'Donate through eGovPay and track your local ledger',
      query: 'I want to make a donation',
    },
  ];

  const quickPrompts = [
    "Renew Driver's License",
    'Digital National ID',
    'Business Permit Renewal',
    'PSA Birth Certificate',
    'PhilHealth Membership',
    'TIN Application',
    'Choose a Travel Destination',
    'Make a Donation',
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex(prev => (prev + 1) % placeholders.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, error]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const applyChatPaymentStatus = useCallback((paymentId: string, signal: PaymentStatusSignal) => {
    const updateIntent = (intent?: PaymentIntent): PaymentIntent | undefined => {
      if (!intent || intent.paymentId !== paymentId) return intent;
      return {
        ...intent,
        status: signal.status,
        referenceNumber: signal.referenceNumber || intent.referenceNumber,
        amount: signal.amount > 0 ? signal.amount : intent.amount,
        paidAt: signal.paidAt,
        statusUpdatedAt: signal.updatedAt,
      };
    };

    setMessages(prev => prev.map(message => {
      const sssPaymentIntent = updateIntent(message.sssPaymentIntent);
      const businessPermitPaymentIntent = updateIntent(message.businessPermitPaymentIntent);
      const donationPaymentIntent = signal.status === 'paid' && signal.verificationSource !== 'egovpay_api'
        ? message.donationPaymentIntent
        : updateIntent(message.donationPaymentIntent);
      const paymentMatched =
        sssPaymentIntent !== message.sssPaymentIntent ||
        businessPermitPaymentIntent !== message.businessPermitPaymentIntent ||
        donationPaymentIntent !== message.donationPaymentIntent;
      if (!paymentMatched) return message;

      return {
        ...message,
        sssPaymentIntent,
        businessPermitPaymentIntent,
        donationPaymentIntent,
        businessPermitApplication:
          signal.status === 'paid' && message.businessPermitApplication
            ? { ...message.businessPermitApplication, status: 'Payment Confirmed - Under Assessment' }
            : message.businessPermitApplication,
      };
    }));

    setSSSAgent(prev => prev?.stage === 'payment' ? { ...prev, paymentStatus: signal.status } : prev);
    setBusinessPermitAgent(prev => prev?.stage === 'payment'
      ? {
          ...prev,
          paymentStatus: signal.status,
          submittedApplication:
            signal.status === 'paid' && prev.submittedApplication
              ? { ...prev.submittedApplication, status: 'Payment Confirmed - Under Assessment' }
              : prev.submittedApplication,
        }
      : prev
    );
    if (signal.status !== 'paid' || signal.verificationSource === 'egovpay_api') {
      setDonationAgent(prev => prev?.stage === 'payment' ? { ...prev, paymentStatus: signal.status } : prev);
    }
    if (user?.id) void recordDonationPaymentStatus(user.id, paymentId, signal)
      .then(() => syncDonationChainAnchors(user.id, getDonationLedger(user.id)))
      .catch(error => {
        console.warn('Donation ledger or eGovChain synchronization could not apply the payment status:', error);
      });
  }, [user?.id]);

  const checkChatPaymentStatus = useCallback(async (paymentId: string) => {
    if (checkingPaymentIdsRef.current.has(paymentId)) return;
    checkingPaymentIdsRef.current.add(paymentId);
    setCheckingPaymentIds(prev => prev.includes(paymentId) ? prev : [...prev, paymentId]);
    try {
      const published = getPublishedPaymentStatus(paymentId);
      if (published && published.status !== 'pending') {
        applyChatPaymentStatus(paymentId, published);
        return;
      }

      const details = await getTransactionDetails(paymentId);
      const signal = publishPaymentStatus(details);
      applyChatPaymentStatus(paymentId, signal);
    } catch {
      // The gateway can remain INITIAL briefly after checkout. Keep the card
      // pending and let focus, storage, interval, or manual refresh retry.
    } finally {
      checkingPaymentIdsRef.current.delete(paymentId);
      setCheckingPaymentIds(prev => prev.filter(id => id !== paymentId));
    }
  }, [applyChatPaymentStatus]);

  const syncPendingChatPayments = useCallback(() => {
    const pendingIds = new Set<string>();
    messagesRef.current.forEach(message => {
      if (message.sssPaymentIntent?.status === 'pending') pendingIds.add(message.sssPaymentIntent.paymentId);
      if (message.businessPermitPaymentIntent?.status === 'pending') pendingIds.add(message.businessPermitPaymentIntent.paymentId);
      if (message.donationPaymentIntent?.status === 'pending') pendingIds.add(message.donationPaymentIntent.paymentId);
    });
    pendingIds.forEach(paymentId => void checkChatPaymentStatus(paymentId));
  }, [checkChatPaymentStatus]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    const handleFocus = () => syncPendingChatPayments();
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') syncPendingChatPayments();
    };
    const handleStorage = (event: StorageEvent) => {
      if (!event.key?.startsWith(PAYMENT_STATUS_STORAGE_PREFIX) || !event.newValue) return;
      try {
        const signal = JSON.parse(event.newValue) as PaymentStatusSignal;
        const paymentId = event.key.slice(PAYMENT_STATUS_STORAGE_PREFIX.length);
        if (signal.status && signal.updatedAt) applyChatPaymentStatus(paymentId, signal);
      } catch {
        // Ignore malformed status messages from unrelated or stale storage.
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('storage', handleStorage);
    const interval = window.setInterval(syncPendingChatPayments, 8000);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('storage', handleStorage);
      window.clearInterval(interval);
    };
  }, [applyChatPaymentStatus, syncPendingChatPayments]);

  // ── Live input translation ─────────────────────────────────────────────────
  // When the user types or speaks Filipino/non-English, debounce 600ms then
  // translate the input to English in-place, showing the original as a hint.
  useEffect(() => {
    if (translateDebounceRef.current) clearTimeout(translateDebounceRef.current);

    const trimmed = inputValue.trim();
    // Clear original hint if input is cleared or already English
    if (!trimmed) {
      setInputOriginal(null);
      return;
    }

    const detectedLang = detectNonEnglish(trimmed);
    if (!detectedLang) {
      setInputOriginal(null);
      return;
    }

    // Debounce: wait 600ms after last keystroke before calling API
    translateDebounceRef.current = setTimeout(async () => {
      setIsTranslatingInput(true);
      try {
        const result = await translateText(trimmed, detectedLang.lang, 'en');
        const translated = result.translated_prompt?.trim();
        if (translated && translated !== trimmed) {
          setInputOriginal(trimmed); // keep original for the hint
          setInputValue(translated); // replace input with English
        }
      } catch {
        // silently fail — keep what the user typed
      } finally {
        setIsTranslatingInput(false);
      }
    }, 600);

    return () => {
      if (translateDebounceRef.current) clearTimeout(translateDebounceRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputValue]);

  const handleSuggestionClick = async (query: string, suppressCta = false) => {
    setInputValue(query);
    await handleSend(query, suppressCta);
  };

  const buildContextualPrompt = (userQuery: string): string => {
    if (!user || !user.firstName) {
      return userQuery;
    }

    const userContext = [
      `User Information:`,
      `- Name: ${[user.firstName, user.middleName, user.lastName, user.suffix].filter(Boolean).join(' ')}`,
      user.email && `- Email: ${user.email}`,
      user.mobileNumber && `- Mobile: ${user.mobileNumber}`,
      user.birthdate && `- Birthdate: ${user.birthdate}`,
      user.address?.city && `- Location: ${[user.address.city, user.address.province].filter(Boolean).join(', ')}`,
      ``,
      `User Query: ${userQuery}`,
    ]
      .filter(Boolean)
      .join('\n');

    return userContext;
  };

  const appendEReportAgentTurn = (turn: EReportAgentTurn) => {
    setEReportAgent(turn.state);
    const messageId = `${Date.now()}-ereport-agent`;
    setActiveEReportMessageId(turn.state && turn.prompt ? messageId : null);
    const assistantMessage: Message = {
      id: messageId,
      role: 'assistant',
      content: turn.reply,
      timestamp: new Date(),
      reportAgentPrompt: turn.prompt,
      reportDraft: turn.draft,
    };
    setMessages(prev => [...prev, assistantMessage]);
  };

  const appendTourismPlannerTurn = (turn: TourismPlannerTurn) => {
    setTourismPlanner(turn.state);
    const messageId = `${Date.now()}-tourism-planner`;
    setActiveTourismMessageId(turn.state && turn.prompt ? messageId : null);
    const assistantMessage: Message = {
      id: messageId,
      role: 'assistant',
      content: turn.reply,
      timestamp: new Date(),
      tourismPlannerPrompt: turn.prompt,
      tourismResult: turn.result,
      sessionId: turn.result?.sessionId,
    };
    setMessages(prev => [...prev, assistantMessage]);
  };

  const appendDonationAgentTurn = (turn: DonationAgentTurn) => {
    setDonationAgent(turn.state);
    const messageId = `${Date.now()}-donation-agent`;
    setActiveDonationMessageId(turn.state && turn.prompt ? messageId : null);
    setMessages(prev => [...prev, {
      id: messageId,
      role: 'assistant',
      content: turn.reply,
      timestamp: new Date(),
      donationAgentPrompt: turn.prompt,
      donationStateSnapshot: turn.state ? { ...turn.state } : undefined,
      donationDraft: turn.draft,
      donationPaymentIntent: turn.paymentIntent,
    }]);
  };

  const appendDonationActionTurn = (userContent: string, turn: DonationAgentTurn) => {
    const now = Date.now();
    const assistantMessageId = `${now}-donation-action-assistant`;
    setDonationAgent(turn.state);
    setActiveDonationMessageId(turn.state && turn.prompt ? assistantMessageId : null);
    setMessages(prev => [
      ...prev,
      { id: `${now}-donation-action-user`, role: 'user', content: userContent, timestamp: new Date() },
      {
        id: assistantMessageId,
        role: 'assistant',
        content: turn.reply,
        timestamp: new Date(),
        donationAgentPrompt: turn.prompt,
        donationStateSnapshot: turn.state ? { ...turn.state } : undefined,
        donationDraft: turn.draft,
        donationPaymentIntent: turn.paymentIntent,
      },
    ]);
  };

  const updateDonationReview = (updates: Partial<DonationAgentState>) => {
    if (!donationAgent || donationAgent.stage !== 'review') return;
    const updated = { ...donationAgent, ...updates };
    setDonationAgent(updated);
    setMessages(prev => prev.map(message => message.id === activeDonationMessageId
      ? { ...message, donationStateSnapshot: { ...updated }, donationDraft: buildDonationDraft(updated) || undefined }
      : message));
  };

  const isActiveDonationReview = (message: Message): boolean =>
    message.id === activeDonationMessageId &&
    donationAgent?.id === message.donationAgentPrompt?.conversationId &&
    donationAgent?.stage === 'review';

  const handleCreateDonationPayment = async () => {
    if (!user || !donationAgent || donationAgent.stage !== 'review' || isCreatingDonationPayment) return;
    const draft = buildDonationDraft(donationAgent);
    if (!draft) {
      appendDonationAgentTurn(continueDonationAgent(donationAgent, 'confirm'));
      return;
    }
    setIsCreatingDonationPayment(true);
    try {
      const citizenName = [user.firstName, user.middleName, user.lastName].filter(Boolean).join(' ');
      const paymentIntent = await createPaymentIntent({
        amount: draft.amount,
        description: `Donation ${draft.donationId} — ${draft.campaign.title}`,
        citizenName,
        citizenEmail: user.email,
        citizenMobile: user.mobileNumber,
        settlementTemplateUuid: draft.campaign.settlementTemplateUuid,
        context: {
          kind: 'donation',
          entityId: draft.donationId,
          userId: user.id,
          campaignId: draft.campaign.id,
          campaignTitle: draft.campaign.title,
          recipientName: draft.campaign.recipientName,
          destination: draft.campaign.location,
        },
        items: [{ name: `Donation — ${draft.campaign.title}`, amount: draft.amount }],
      });
      await recordDonationPaymentLink(user.id, draft, paymentIntent);
      appendDonationActionTurn('Create the eGovPay donation link', markDonationPaymentCreated(donationAgent, paymentIntent));
    } catch (paymentError) {
      setMessages(prev => [...prev, {
        id: `${Date.now()}-donation-error`,
        role: 'assistant',
        content: `The donation checkout could not be created: ${paymentError instanceof Error ? paymentError.message : 'Unknown eGovPay error'}. Your review draft is still available and nothing was paid.`,
        timestamp: new Date(),
      }]);
    } finally {
      setIsCreatingDonationPayment(false);
    }
  };

  const appendSSSAgentTurn = (turn: SSSAgentTurn) => {
    setSSSAgent(turn.state);
    const messageId = `${Date.now()}-sss-agent`;
    setActiveSSSMessageId(turn.state && turn.prompt ? messageId : null);
    const assistantMessage: Message = {
      id: messageId,
      role: 'assistant',
      content: turn.reply,
      timestamp: new Date(),
      sssAgentPrompt: turn.prompt,
      sssStateSnapshot: turn.state ? { ...turn.state } : undefined,
      sssDraft: turn.draft,
      sssPaymentIntent: turn.paymentIntent,
    };
    setMessages(prev => [...prev, assistantMessage]);
  };

  const appendSSSAgentActionTurn = (userContent: string, turn: SSSAgentTurn) => {
    const now = Date.now();
    const assistantMessageId = `${now}-sss-action-assistant`;
    setSSSAgent(turn.state);
    setActiveSSSMessageId(turn.state && turn.prompt ? assistantMessageId : null);
    setMessages(prev => [
      ...prev,
      {
        id: `${now}-sss-action-user`,
        role: 'user',
        content: userContent,
        timestamp: new Date(),
      },
      {
        id: assistantMessageId,
        role: 'assistant',
        content: turn.reply,
        timestamp: new Date(),
        sssAgentPrompt: turn.prompt,
        sssStateSnapshot: turn.state ? { ...turn.state } : undefined,
        sssDraft: turn.draft,
        sssPaymentIntent: turn.paymentIntent,
      },
    ]);
  };

  const appendSSSAgentNotice = (content: string, prompt?: SSSAgentPrompt) => {
    const messageId = `${Date.now()}-sss-notice`;
    if (prompt) setActiveSSSMessageId(messageId);
    const reviewState = prompt?.stage === 'review' && sssAgent ? { ...sssAgent } : undefined;
    setMessages(prev => [
      ...prev,
      {
        id: messageId,
        role: 'assistant',
        content,
        timestamp: new Date(),
        sssAgentPrompt: prompt,
        sssStateSnapshot: reviewState,
        sssDraft: reviewState ? buildSSSTransactionDraft(reviewState) || undefined : undefined,
      },
    ]);
  };

  const handleVerifySSSIdentity = async () => {
    if (!sssAgent || sssAgent.stage !== 'identity' || isVerifyingSSS) return;
    const requestId = ++sssOperationRequestRef.current;
    setIsVerifyingSSS(true);

    try {
      let livenessSessionId = '';
      try {
        livenessSessionId = await triggerEVerifyLivenessSDK();
      } catch (sdkError) {
        console.warn('SSS chat eVerify Web SDK popup error or cancelled:', sdkError);
        livenessSessionId = localStorage.getItem('egov_liveness_token') || '';
      }

      if (!livenessSessionId) {
        throw new Error('Face Liveness Session Required: complete the camera verification to continue.');
      }

      const result = await verifyIdentity({
        firstName: user?.firstName || 'Citizen',
        middleName: user?.middleName || '',
        lastName: user?.lastName || '',
        suffix: user?.suffix || '',
        birthDate: user?.birthdate || '1990-01-01',
        faceLivenessSessionId: livenessSessionId,
      });
      if (requestId !== sssOperationRequestRef.current) return;
      if (!result.verified) throw new Error(result.message || 'PhilSys identity verification was not successful.');

      if (user?.mobileNumber) {
        try {
          await sendVerificationConfirmation(user.mobileNumber, user.firstName || 'Citizen');
        } catch (notificationError) {
          console.warn('SSS verification SMS could not be sent:', notificationError);
        }
      }

      appendSSSAgentActionTurn(
        'Complete PhilSys eVerify identity verification',
        markSSSIdentityVerified(sssAgent, {
          verificationId: result.verificationId,
          citizenName: result.citizenName,
          verifiedAt: result.verifiedAt,
        })
      );
    } catch (verificationError) {
      if (requestId !== sssOperationRequestRef.current) return;
      const message = verificationError instanceof Error
        ? verificationError.message
        : 'Identity verification failed. Please try again.';
      appendSSSAgentNotice(`SSS identity verification was not completed: ${message}`, {
        conversationId: sssAgent.id,
        stage: 'identity',
      });
    } finally {
      if (requestId === sssOperationRequestRef.current) setIsVerifyingSSS(false);
    }
  };

  const updateSSSReview = (updates: Partial<SSSAgentState>) => {
    if (!sssAgent || sssAgent.stage !== 'review') return;
    const updated = { ...sssAgent, ...updates };
    setSSSAgent(updated);
    setMessages(prev =>
      prev.map(message =>
        message.id === activeSSSMessageId
          ? {
              ...message,
              sssStateSnapshot: { ...updated },
              sssDraft: buildSSSTransactionDraft(updated) || message.sssDraft,
            }
          : message
      )
    );
  };

  const isActiveSSSReview = (message: Message): boolean =>
    message.id === activeSSSMessageId &&
    sssAgent?.id === message.sssAgentPrompt?.conversationId &&
    sssAgent?.stage === 'review';

  const handleCreateSSSPayment = async () => {
    if (!sssAgent || sssAgent.stage !== 'review' || isCreatingSSSPayment) return;
    const draft = buildSSSTransactionDraft(sssAgent);
    if (!draft) {
      appendSSSAgentNotice(
        'The SSS draft contains a missing or invalid field. Review the SSS number / CRN and any required PRN before continuing.',
        { conversationId: sssAgent.id, stage: 'review' }
      );
      return;
    }

    const requestId = ++sssOperationRequestRef.current;
    setIsCreatingSSSPayment(true);
    try {
      const citizenName = user
        ? [user.firstName, user.middleName, user.lastName].filter(Boolean).join(' ')
        : 'Citizen';
      const paymentIntent = await createPaymentIntent({
        amount: draft.totalAmount,
        description: `${draft.serviceTitle} — ${citizenName}`,
        citizenName,
        citizenEmail: user?.email,
        citizenMobile: user?.mobileNumber,
        items: draft.fees.map(fee => ({ name: fee.label, amount: fee.amount })),
      });
      if (requestId !== sssOperationRequestRef.current) return;

      appendSSSAgentActionTurn(
        'Confirm this SSS draft and create an eGovPay payment link',
        markSSSPaymentCreated(sssAgent, paymentIntent)
      );
    } catch (paymentError) {
      if (requestId !== sssOperationRequestRef.current) return;
      const message = paymentError instanceof Error
        ? paymentError.message
        : 'Unable to create the eGovPay transaction link.';
      appendSSSAgentNotice(`The eGovPay link could not be created: ${message}`, {
        conversationId: sssAgent.id,
        stage: 'review',
      });
    } finally {
      if (requestId === sssOperationRequestRef.current) setIsCreatingSSSPayment(false);
    }
  };

  const handleStartAnotherSSS = () => {
    const turn = startSSSAgent('Start SSS services in chat');
    appendSSSAgentActionTurn('Start another SSS transaction', turn);
  };

  const appendBusinessPermitAgentTurn = (turn: BusinessPermitAgentTurn) => {
    setBusinessPermitAgent(turn.state);
    const messageId = `${Date.now()}-business-permit-agent`;
    setActiveBusinessPermitMessageId(turn.state && turn.prompt ? messageId : null);
    setBusinessPermitDocumentError(null);
    setMessages(prev => [
      ...prev,
      {
        id: messageId,
        role: 'assistant',
        content: turn.reply,
        timestamp: new Date(),
        businessPermitAgentPrompt: turn.prompt,
        businessPermitStateSnapshot: turn.state ? { ...turn.state } : undefined,
        businessPermitDraft: turn.draft,
        businessPermitApplication: turn.application,
        businessPermitPaymentIntent: turn.paymentIntent,
      },
    ]);
  };

  const appendBusinessPermitActionTurn = (userContent: string, turn: BusinessPermitAgentTurn) => {
    const now = Date.now();
    const assistantMessageId = `${now}-business-permit-action-assistant`;
    setBusinessPermitAgent(turn.state);
    setActiveBusinessPermitMessageId(turn.state && turn.prompt ? assistantMessageId : null);
    setBusinessPermitDocumentError(null);
    setMessages(prev => [
      ...prev,
      { id: `${now}-business-permit-action-user`, role: 'user', content: userContent, timestamp: new Date() },
      {
        id: assistantMessageId,
        role: 'assistant',
        content: turn.reply,
        timestamp: new Date(),
        businessPermitAgentPrompt: turn.prompt,
        businessPermitStateSnapshot: turn.state ? { ...turn.state } : undefined,
        businessPermitDraft: turn.draft,
        businessPermitApplication: turn.application,
        businessPermitPaymentIntent: turn.paymentIntent,
      },
    ]);
  };

  const appendBusinessPermitNotice = (content: string, prompt?: BusinessPermitAgentPrompt) => {
    const messageId = `${Date.now()}-business-permit-notice`;
    if (prompt) setActiveBusinessPermitMessageId(messageId);
    const snapshot = prompt && businessPermitAgent ? { ...businessPermitAgent } : undefined;
    setMessages(prev => [
      ...prev,
      {
        id: messageId,
        role: 'assistant',
        content,
        timestamp: new Date(),
        businessPermitAgentPrompt: prompt,
        businessPermitStateSnapshot: snapshot,
        businessPermitDraft: snapshot ? buildBusinessPermitRenewalDraft(snapshot) || undefined : undefined,
        businessPermitApplication: snapshot?.submittedApplication,
      },
    ]);
  };

  const handleVerifyBusinessPermitIdentity = async () => {
    if (!businessPermitAgent || businessPermitAgent.stage !== 'identity' || isVerifyingBusinessPermit) return;
    const requestId = ++businessPermitOperationRequestRef.current;
    setIsVerifyingBusinessPermit(true);

    try {
      let livenessSessionId = '';
      try {
        livenessSessionId = await triggerEVerifyLivenessSDK();
      } catch (sdkError) {
        console.warn('Business permit chat eVerify Web SDK popup error or cancelled:', sdkError);
        livenessSessionId = localStorage.getItem('egov_liveness_token') || '';
      }
      if (!livenessSessionId) {
        throw new Error('Face Liveness Session Required: complete the camera verification to continue.');
      }

      const result = await verifyIdentity({
        firstName: user?.firstName || 'Citizen',
        middleName: user?.middleName || '',
        lastName: user?.lastName || '',
        suffix: user?.suffix || '',
        birthDate: user?.birthdate || '1990-01-01',
        faceLivenessSessionId: livenessSessionId,
      });
      if (requestId !== businessPermitOperationRequestRef.current) return;
      if (!result.verified) throw new Error(result.message || 'PhilSys identity verification was not successful.');

      if (user?.mobileNumber) {
        try {
          await sendVerificationConfirmation(user.mobileNumber, user.firstName || 'Citizen');
        } catch (notificationError) {
          console.warn('Business permit verification SMS could not be sent:', notificationError);
        }
      }

      appendBusinessPermitActionTurn(
        'Complete PhilSys eVerify identity verification',
        markBusinessPermitIdentityVerified(businessPermitAgent, {
          verificationId: result.verificationId,
          citizenName: result.citizenName,
          verifiedAt: result.verifiedAt,
        })
      );
    } catch (verificationError) {
      if (requestId !== businessPermitOperationRequestRef.current) return;
      const message = verificationError instanceof Error
        ? verificationError.message
        : 'Identity verification failed. Please try again.';
      appendBusinessPermitNotice(`Permit-renewal identity verification was not completed: ${message}`, {
        conversationId: businessPermitAgent.id,
        stage: 'identity',
      });
    } finally {
      if (requestId === businessPermitOperationRequestRef.current) setIsVerifyingBusinessPermit(false);
    }
  };

  const handleAttachBusinessPermitDocument = (documentType: BusinessPermitDocumentType, file: File) => {
    if (!businessPermitAgent || businessPermitAgent.stage !== 'documents') return;
    const validationError = validateBusinessPermitDocument(file);
    if (validationError) {
      setBusinessPermitDocumentError(`${file.name}: ${validationError}`);
      return;
    }
    const turn = attachBusinessPermitDocument(businessPermitAgent, {
      id: documentType,
      fileName: file.name,
      mimeType: file.type,
      size: file.size,
      attachedAt: new Date().toISOString(),
    });
    appendBusinessPermitActionTurn(`Attach ${file.name}`, turn);
  };

  const handleRemoveBusinessPermitDocument = (documentType: BusinessPermitDocumentType) => {
    if (!businessPermitAgent || businessPermitAgent.stage !== 'documents') return;
    appendBusinessPermitActionTurn(
      'Remove attached permit document',
      removeBusinessPermitDocument(businessPermitAgent, documentType)
    );
  };

  const updateBusinessPermitReview = (updates: Partial<BusinessPermitAgentState>) => {
    if (!businessPermitAgent || businessPermitAgent.stage !== 'review') return;
    const updated = { ...businessPermitAgent, ...updates };
    setBusinessPermitAgent(updated);
    setMessages(prev => prev.map(message =>
      message.id === activeBusinessPermitMessageId
        ? {
            ...message,
            businessPermitStateSnapshot: { ...updated },
            businessPermitDraft: buildBusinessPermitRenewalDraft(updated) || message.businessPermitDraft,
          }
        : message
    ));
  };

  const handleEditBusinessPermitDocuments = () => {
    if (!businessPermitAgent || businessPermitAgent.stage !== 'review') return;
    appendBusinessPermitActionTurn(
      'Review or replace the attached permit documents',
      reopenBusinessPermitDocuments(businessPermitAgent)
    );
  };

  const isActiveBusinessPermitReview = (message: Message): boolean =>
    message.id === activeBusinessPermitMessageId &&
    businessPermitAgent?.id === message.businessPermitAgentPrompt?.conversationId &&
    businessPermitAgent?.stage === 'review';

  const isActiveBusinessPermitSubmission = (message: Message): boolean =>
    message.id === activeBusinessPermitMessageId &&
    businessPermitAgent?.id === message.businessPermitAgentPrompt?.conversationId &&
    businessPermitAgent?.stage === 'submitted';

  const handleSubmitBusinessPermit = async () => {
    if (!businessPermitAgent || businessPermitAgent.stage !== 'review' || isSubmittingBusinessPermit) return;
    const draft = buildBusinessPermitRenewalDraft(businessPermitAgent);
    if (!draft) {
      appendBusinessPermitNotice('The permit draft has a missing or invalid field. Review every field and all five required documents before submitting.', {
        conversationId: businessPermitAgent.id,
        stage: 'review',
      });
      return;
    }

    const requestId = ++businessPermitOperationRequestRef.current;
    setIsSubmittingBusinessPermit(true);
    try {
      const applicantName = user
        ? [user.firstName, user.middleName, user.lastName].filter(Boolean).join(' ')
        : 'Authenticated Citizen';
      const application = await submitBusinessPermitRenewal({
        draft,
        applicantName,
        applicantEmail: user?.email,
        applicantMobile: user?.mobileNumber,
      });
      if (requestId !== businessPermitOperationRequestRef.current) return;

      if (user?.mobileNumber) {
        try {
          await sendApplicationConfirmation(
            user.mobileNumber,
            user.firstName || 'Citizen',
            'Business Permit Renewal',
            application.trackingId
          );
        } catch (notificationError) {
          console.warn('Business permit submission SMS could not be sent:', notificationError);
        }
      }

      appendBusinessPermitActionTurn(
        'Submit this Business Permit Renewal for assessment',
        markBusinessPermitSubmitted(businessPermitAgent, application)
      );
    } catch (submissionError) {
      if (requestId !== businessPermitOperationRequestRef.current) return;
      const message = submissionError instanceof Error ? submissionError.message : 'Unable to submit the renewal application.';
      appendBusinessPermitNotice(`The renewal could not be submitted: ${message}`, {
        conversationId: businessPermitAgent.id,
        stage: 'review',
      });
    } finally {
      if (requestId === businessPermitOperationRequestRef.current) setIsSubmittingBusinessPermit(false);
    }
  };

  const handleCreateBusinessPermitPayment = async () => {
    if (!businessPermitAgent || businessPermitAgent.stage !== 'submitted' || isCreatingBusinessPermitPayment) return;
    const draft = buildBusinessPermitRenewalDraft(businessPermitAgent);
    const application = businessPermitAgent.submittedApplication;
    if (!draft || !application) return;

    const requestId = ++businessPermitOperationRequestRef.current;
    setIsCreatingBusinessPermitPayment(true);
    try {
      const paymentIntent = await createPaymentIntent({
        amount: draft.totalAmount,
        description: `Business Permit Renewal ${application.trackingId} — ${application.businessName}`,
        citizenName: application.applicantName,
        citizenEmail: application.applicantEmail,
        citizenMobile: application.applicantMobile,
        items: draft.fees.map(fee => ({ name: fee.label, amount: fee.amount })),
      });
      if (requestId !== businessPermitOperationRequestRef.current) return;
      appendBusinessPermitActionTurn(
        'Create an eGovPay link for this submitted permit renewal',
        markBusinessPermitPaymentCreated(businessPermitAgent, paymentIntent)
      );
    } catch (paymentError) {
      if (requestId !== businessPermitOperationRequestRef.current) return;
      const message = paymentError instanceof Error ? paymentError.message : 'Unable to create the eGovPay transaction link.';
      appendBusinessPermitNotice(`The eGovPay link could not be created: ${message}`, {
        conversationId: businessPermitAgent.id,
        stage: 'submitted',
      });
    } finally {
      if (requestId === businessPermitOperationRequestRef.current) setIsCreatingBusinessPermitPayment(false);
    }
  };

  const handleStartAnotherBusinessPermit = () => {
    appendBusinessPermitActionTurn(
      'Start another Business Permit Renewal',
      startBusinessPermitAgent('Start another Business Permit Renewal')
    );
  };

  const handleSend = async (messageText?: string, suppressCta = false) => {
    const text = messageText || inputValue.trim();
    if (
      !text ||
      isLoading ||
      isFetchingEReportLocation ||
      isVerifyingSSS ||
      isCreatingSSSPayment ||
      isVerifyingBusinessPermit ||
      isSubmittingBusinessPermit ||
      isCreatingBusinessPermitPayment ||
      isCreatingDonationPayment
    ) return;

    setError(null);
    setInputValue('');
    setInputOriginal(null);

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // ── Auto-translation layer ─────────────────────────────────────────────
      // Detect non-English input, translate silently to English, then run all
      // intent detectors on the English text. The original message is kept in
      // the chat bubble; a badge will show the source language.
      let processText = text;
      let translatedFrom: Message['translatedFrom'] | undefined;

      const detectedLang = detectNonEnglish(text);
      if (detectedLang) {
        try {
          const translationResult = await translateText(text, detectedLang.lang, 'en');
          processText = translationResult.translated_prompt || text;
          translatedFrom = {
            originalText: text,
            sourceLang: detectedLang.lang,
            sourceLabel: detectedLang.label,
          };
          // Patch the user message with translatedFrom so the badge renders
          setMessages(prev =>
            prev.map(m => m.id === userMessage.id ? { ...m, translatedFrom } : m)
          );
        } catch {
          // Translation failed — fall back to original text, no badge
          processText = text;
        }
      }

      // Continue an active eReport agent before routing the message to other services.
      // Unrelated replies are handled inside the agent without contaminating its draft.
      if (eReportAgent) {
        const turn = await continueEReportAgent(eReportAgent, processText);
        appendEReportAgentTurn(turn);
        return;
      }

      // Keep an active SSS transaction inside its own agent until it is cancelled
      // or handed off to the official eGovPay checkout.
      if (sssAgent) {
        const turn = continueSSSAgent(sssAgent, processText);
        appendSSSAgentTurn(turn);
        return;
      }

      // Keep an active permit renewal inside its own guarded conversation.
      // Identifiers and document metadata are handled deterministically here
      // and are not forwarded to the general AI assistant.
      if (businessPermitAgent) {
        const turn = continueBusinessPermitAgent(businessPermitAgent, processText);
        appendBusinessPermitAgentTurn(turn);
        return;
      }

      if (donationAgent) {
        appendDonationAgentTurn(continueDonationAgent(donationAgent, processText));
        return;
      }

      // A generic travel request becomes a guarded destination-selection turn.
      // Only a validated destination is sent to the dedicated Tourism endpoint.
      if (tourismPlanner) {
        const turn = await continueTourismPlanner(tourismPlanner, processText);
        appendTourismPlannerTurn(turn);
        return;
      }

      // Donation history questions are answered only from this signed-in
      // user's local ledger; the general AI never invents financial records.
      if (user && isDonationTrackingIntent(processText)) {
        const tracking = processDonationTrackingIntent(processText, user.id);
        if (tracking.isTrackingIntent) {
          setMessages(prev => [...prev, {
            id: `${Date.now()}-donation-history`,
            role: 'assistant',
            content: tracking.content || 'No donation records were found in this browser.',
            timestamp: new Date(),
            donationHistory: tracking.donations,
          }]);
          return;
        }
      }

      // Broad help requests stay conversational until the citizen identifies a need.
      if (isGeneralHelpRequest(processText)) {
        const assistantMessage: Message = {
          id: `${Date.now()}-help`,
          role: 'assistant',
          content:
            'Of course. What type of help do you need? You can describe a government service, ask a question, or tell me about a community incident that you want to report.',
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, assistantMessage]);
        return;
      }

      // Start the multi-turn eReport agent only for a report request or incident narrative.
      if (isEReportAgentIntent(processText)) {
        const turn = await startEReportAgent(processText);
        appendEReportAgentTurn(turn);
        return;
      }

      // Actionable SSS requests use the in-chat agent. Informational SSS
      // questions continue to the normal assistant below.
      if (isSSSAgentIntent(processText)) {
        appendSSSAgentTurn(startSSSAgent(processText));
        return;
      }

      // Actionable Business Permit Renewal requests use the in-chat agent.
      // Informational questions such as requirements and fee inquiries still
      // go to the normal assistant below.
      if (isBusinessPermitRenewalIntent(processText)) {
        appendBusinessPermitAgentTurn(startBusinessPermitAgent(processText));
        return;
      }

      if (isDonationAgentIntent(processText)) {
        appendDonationAgentTurn(startDonationAgent(processText));
        return;
      }

      // Philippine destination, itinerary, activity, budget, and transport
      // requests use the dedicated eGovPH Tourism endpoint. Passport, visa,
      // and other travel-document requests remain with their proper services.
      if (isTourismIntent(processText)) {
        if (shouldAskForTourismDestination(processText)) {
          appendTourismPlannerTurn(startTourismPlanner(processText));
          return;
        }

        const tourismIntent = await processTourismIntent(processText);
        if (!tourismIntent.result) return;
        const assistantMessage: Message = {
          id: `${Date.now()}-tourism`,
          role: 'assistant',
          content: tourismIntent.content || 'The Tourism service did not return readable content.',
          timestamp: new Date(),
          tourismResult: tourismIntent.result,
          sessionId: tourismIntent.result.sessionId,
        };
        setMessages(prev => [...prev, assistantMessage]);
        return;
      }

      // 0. Check if user is asking a DBM budget/transparency question (SAAODB, NCA, SARO, LGSF)
      const transparencyResult = await processTransparencyIntent(processText);
      if (transparencyResult.isTransparencyIntent) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: transparencyResult.aiSummaryText ?? 'Here is the official budget transparency data from the Department of Budget and Management.',
          timestamp: new Date(),
          transparencyResult,
        };
        setMessages(prev => [...prev, assistantMessage]);
        setIsLoading(false);
        return;
      }

      // 0b. Check if user is asking about laws, rules, regulations, or legal rights
      const lawsQ = processText.toLowerCase()
      const LAWS_KEYWORDS = [
        'law', 'laws', 'legal', 'regulation', 'regulations', 'rights',
        'republic act', 'ra ', 'batas', 'code', 'statute', 'ordinance',
        'penalty', 'penalties', 'violation', 'illegal', 'legal basis',
        'labor code', 'family code', 'civil code', 'criminal', 'crime',
        'court', 'offense', 'fine', 'imprisonment', 'prohibited',
        'rights and', 'legal rights', 'my rights', 'know my rights',
        'anti-', 'data privacy', 'constitution', 'constitutional',
        'what does the law', 'is it legal', 'is it illegal',
        'legal advice', 'legal question', 'legal concern',
        'rule', 'rules', 'policy', 'policies', 'act of', 'act no',
      ]
      const INFO_BLOCKLIST = ['how to apply', 'how to renew', 'requirements for', 'how do i pay']
      const isLawsIntent =
        !INFO_BLOCKLIST.some(p => lawsQ.includes(p)) &&
        LAWS_KEYWORDS.some(k => lawsQ.includes(k))

      if (isLawsIntent) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `I've detected a legal question. Opening the **Laws & Regulations** assistant now with your query pre-loaded — you'll get a detailed answer based on Philippine law.`,
          timestamp: new Date(),
          lawsQuery: processText,
        }
        setMessages(prev => [...prev, assistantMessage])
        // Auto-navigate after a brief moment so the user sees the card first
        setTimeout(() => {
          navigate(`/services/laws?q=${encodeURIComponent(processText)}`)
        }, 1200)
        setIsLoading(false)
        return
      }

      // 1. Check if user is asking for their own ID / passport / profile details
      const aiIdentityResult = processAiIdentityIntent(processText, user);
      if (aiIdentityResult.isIdentityIntent && aiIdentityResult.card) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: aiIdentityResult.aiSummaryText || 'Here are your identity details from your eGovPH SSO account.',
          timestamp: new Date(),
          identityCard: aiIdentityResult.card,
        };
        setMessages(prev => [...prev, assistantMessage]);
        setIsLoading(false);
        return;
      }

      // 2. Check if user is requesting Business Permit or Tax Payment
      const aiBusinessResult = processAiBusinessIntent(processText, user);

      if (aiBusinessResult.isBusinessIntent && aiBusinessResult.action) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: aiBusinessResult.aiSummaryText || 'Here is your automated business application.',
          timestamp: new Date(),
          businessAction: aiBusinessResult.action,
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        // Normal AI assistant inquiry — send translated text to AI for an accurate response
        const contextualPrompt = buildContextualPrompt(processText);
        const response = await generateAIResponse(contextualPrompt, category);

        // Detect if the AI response implies a submittable action (skip if this was a CTA follow-through)
        const ctaResult = suppressCta ? { hasCta: false } : detectCtaAction(processText, response.data, user);

        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: response.data,
          timestamp: new Date(),
          sessionId: response.session_id,
          ctaAction: ctaResult.hasCta ? ctaResult.action : undefined,
        };
        setMessages(prev => [...prev, assistantMessage]);
      }
    } catch (err) {
      setError('Unable to fetch a response from eBuddy. Please try again.');
      console.error('AI Chat error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const appendEReportActionTurn = (
    userContent: string,
    turn: EReportAgentTurn,
    imagePreview?: string
  ) => {
    const now = Date.now();
    const assistantMessageId = `${now}-ereport-action-assistant`;
    setEReportAgent(turn.state);
    setActiveEReportMessageId(turn.state && turn.prompt ? assistantMessageId : null);
    setMessages(prev => [
      ...prev,
      {
        id: `${now}-ereport-action-user`,
        role: 'user',
        content: userContent,
        timestamp: new Date(),
        imagePreview,
      },
      {
        id: assistantMessageId,
        role: 'assistant',
        content: turn.reply,
        timestamp: new Date(),
        reportAgentPrompt: turn.prompt,
        reportDraft: turn.draft,
      },
    ]);
  };

  const appendEReportAgentNotice = (content: string, prompt?: EReportAgentPrompt) => {
    const messageId = `${Date.now()}-ereport-notice`;
    if (prompt) setActiveEReportMessageId(messageId);
    setMessages(prev => [
      ...prev,
      {
        id: messageId,
        role: 'assistant',
        content,
        timestamp: new Date(),
        reportAgentPrompt: prompt,
      },
    ]);
  };

  const handleUseManualLocation = () => {
    if (!eReportAgent || eReportAgent.stage !== 'location') return;
    const location = manualEReportLocation.trim();
    if (location.length < 3) {
      appendEReportAgentNotice(
        'Please enter a specific address or nearby landmark, or choose **Enable Current Location**.',
        { conversationId: eReportAgent.id, stage: 'location' }
      );
      return;
    }

    appendEReportActionTurn(
      `Use this incident location: ${location}`,
      useEReportLocation(eReportAgent, location, `Manually entered incident location: ${location}`)
    );
    setManualEReportLocation('');
  };

  const handleUseCurrentLocation = async () => {
    if (!eReportAgent || eReportAgent.stage !== 'location' || isFetchingEReportLocation) return;
    if (!navigator.geolocation) {
      appendEReportAgentNotice(
        'Location services are not supported by this browser. Please type an address or landmark instead.',
        { conversationId: eReportAgent.id, stage: 'location' }
      );
      return;
    }

    const requestId = ++eReportLocationRequestRef.current;
    setIsFetchingEReportLocation(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 12000,
          maximumAge: 60000,
        });
      });
      if (requestId !== eReportLocationRequestRef.current) return;
      const latitude = position.coords.latitude.toFixed(6);
      const longitude = position.coords.longitude.toFixed(6);
      const location = `Current coordinates: ${latitude}, ${longitude}`;
      appendEReportActionTurn(
        'Enable my current location for this report',
        useEReportLocation(eReportAgent, location, 'Shared current browser coordinates')
      );
      setManualEReportLocation('');
    } catch (err) {
      if (requestId !== eReportLocationRequestRef.current) return;
      console.warn('Unable to access browser location for eReport:', err);
      const geolocationError = err as GeolocationPositionError;
      const locationErrorMessage =
        geolocationError.code === 1
          ? 'Location permission was denied. You can still enter the incident address or landmark manually.'
          : geolocationError.code === 2
            ? 'Your current location could not be determined. Check that device location services are enabled, or enter the location manually.'
            : geolocationError.code === 3
              ? 'Getting your current location timed out. Please try again or enter the location manually.'
              : 'I could not access your current location. Please enter an address or landmark manually.';
      appendEReportAgentNotice(
        locationErrorMessage,
        { conversationId: eReportAgent.id, stage: 'location' }
      );
    } finally {
      if (requestId === eReportLocationRequestRef.current) {
        setIsFetchingEReportLocation(false);
      }
    }
  };

  const handleEReportPhoto = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !eReportAgent || eReportAgent.stage !== 'photo') return;

    if (!file.type.startsWith('image/')) {
      appendEReportAgentNotice('Please choose an image file for photo evidence.', {
        conversationId: eReportAgent.id,
        stage: 'photo',
      });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      appendEReportAgentNotice('That image is larger than 5 MB. Please choose a smaller photo.', {
        conversationId: eReportAgent.id,
        stage: 'photo',
      });
      return;
    }

    setIsLoading(true);
    try {
      const imageUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
      appendEReportActionTurn(
        `Attached photo evidence: ${file.name}`,
        attachEReportPhoto(eReportAgent, imageUrl, file.name),
        imageUrl
      );
    } catch (err) {
      console.error('Unable to read eReport photo:', err);
      appendEReportAgentNotice('I could not read that image. Please try another photo or continue without one.', {
        conversationId: eReportAgent.id,
        stage: 'photo',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateEReportReview = (updates: Partial<EReportAgentState>) => {
    setEReportAgent(prev => {
      if (!prev || prev.stage !== 'review') return prev;
      return { ...prev, ...updates };
    });
  };

  const isActiveEReportReview = (message: Message): boolean =>
    message.id === activeEReportMessageId &&
    eReportAgent?.id === message.reportAgentPrompt?.conversationId &&
    eReportAgent?.stage === 'review';

  const handleSubmitEReportFromChat = async () => {
    if (!eReportAgent || eReportAgent.stage !== 'review' || isSubmittingEReport) return;
    const draft = buildEReportDraft(eReportAgent);
    if (!draft) {
      appendEReportAgentNotice(
        'The draft is missing a required field. Please complete the title, description, location, and severity before submitting.',
        { conversationId: eReportAgent.id, stage: 'review' }
      );
      return;
    }

    setIsSubmittingEReport(true);
    setMessages(prev => [
      ...prev,
      {
        id: `${Date.now()}-ereport-submit-user`,
        role: 'user',
        content: 'Submit this eReport',
        timestamp: new Date(),
      },
    ]);

    try {
      const citizenName = user
        ? [user.firstName, user.middleName, user.lastName].filter(Boolean).join(' ')
        : 'Authenticated Citizen';
      const report = await submitIncidentReport({
        category: draft.category,
        title: draft.title.trim(),
        description: draft.description.trim(),
        location: draft.location.trim(),
        severity: draft.severity,
        imageUrl: draft.imageUrl,
        citizenName,
        citizenEmail: user?.email || '',
        citizenMobile: user?.mobileNumber || '',
      });

      setEReportAgent(null);
      setActiveEReportMessageId(null);
      setMessages(prev => [
        ...prev,
        {
          id: `${Date.now()}-ereport-submitted`,
          role: 'assistant',
          content: `Your eReport has been submitted successfully. Your tracking number is **${report.trackingId}**.`,
          timestamp: new Date(),
          submittedReport: report,
        },
      ]);
    } catch (err) {
      console.error('Unable to submit eReport from chat:', err);
      appendEReportAgentNotice(
        'The report could not be submitted. Your draft is still available in this chat—please review it and try again.',
        { conversationId: eReportAgent.id, stage: 'review' }
      );
    } finally {
      setIsSubmittingEReport(false);
    }
  };

  const handleCopy = (id: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSpeak = async (id: string, content: string) => {
    // Stop any current speech
    window.speechSynthesis.cancel();
    if (speakingId === id) {
      setSpeakingId(null);
      return;
    }

    setSpeakingId(id);
    try {
      // Strip markdown for cleaner TTS — replace headers/bold/bullets with plain text
      const plainText = content
        .replace(/#{1,6}\s+/g, '')
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/\*(.*?)\*/g, '$1')
        .replace(/`{1,3}[^`]*`{1,3}/g, '')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/^[-*+]\s+/gm, '')
        .replace(/\n{2,}/g, '. ')
        .trim();

      // Use the Speech Maker API to get a well-structured spoken version
      const speechResult = await generateSpeech(
        `Read this response aloud naturally and concisely: ${plainText.substring(0, 800)}`,
        'PH'
      );

      const spokenText = speechResult.data || plainText;

      const utterance = new SpeechSynthesisUtterance(spokenText);
      utterance.lang = 'en-PH';
      utterance.rate = 0.95;
      utterance.pitch = 1;

      // Prefer a Filipino/English voice if available
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(v => v.lang.startsWith('en') && v.name.toLowerCase().includes('female'))
        || voices.find(v => v.lang.startsWith('en'));
      if (preferred) utterance.voice = preferred;

      utterance.onend = () => setSpeakingId(null);
      utterance.onerror = () => setSpeakingId(null);

      window.speechSynthesis.speak(utterance);
    } catch {
      // Fallback: speak raw content directly if API fails
      const utterance = new SpeechSynthesisUtterance(content.replace(/[#*`[\]()]/g, '').substring(0, 800));
      utterance.lang = 'en-PH';
      utterance.rate = 0.95;
      utterance.onend = () => setSpeakingId(null);
      utterance.onerror = () => setSpeakingId(null);
      window.speechSynthesis.speak(utterance);
    }
  };

  const clearChat = () => {
    setMessages([]);
    setError(null);
    setInputOriginal(null);
    setEReportAgent(null);
    setActiveEReportMessageId(null);
    setIsSubmittingEReport(false);
    setManualEReportLocation('');
    setIsFetchingEReportLocation(false);
    eReportLocationRequestRef.current += 1;
    setSSSAgent(null);
    setActiveSSSMessageId(null);
    setIsVerifyingSSS(false);
    setIsCreatingSSSPayment(false);
    sssOperationRequestRef.current += 1;
    setBusinessPermitAgent(null);
    setActiveBusinessPermitMessageId(null);
    setIsVerifyingBusinessPermit(false);
    setIsSubmittingBusinessPermit(false);
    setIsCreatingBusinessPermitPayment(false);
    setBusinessPermitDocumentError(null);
    setTourismPlanner(null);
    setActiveTourismMessageId(null);
    setDonationAgent(null);
    setActiveDonationMessageId(null);
    setIsCreatingDonationPayment(false);
    setCheckingPaymentIds([]);
    checkingPaymentIdsRef.current.clear();
    businessPermitOperationRequestRef.current += 1;
  };

  // ── Voice command detection ───────────────────────────────────────────────
  // Keywords that mean "yes, launch / confirm / proceed with the last action"
  const VOICE_CONFIRM_PHRASES = [
    'launch', 'launch transaction', 'launch the transaction',
    'proceed', 'proceed now', 'proceed with',
    'confirm', 'confirm now', 'yes confirm',
    'go', 'go ahead', 'go now',
    'start', 'start now', 'start transaction',
    'trigger', 'trigger the', 'trigger launch',
    'click', 'click the button', 'click button',
    'submit', 'submit now',
    'yes', 'yes please', 'yes go ahead',
    'continue', 'continue now',
    'apply', 'apply now',
    'pay', 'pay now',
    'renew', 'renew now',
    'open', 'open it',
    'do it', 'execute',
  ];

  const isVoiceConfirmCommand = (text: string): boolean => {
    const normalized = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
    return VOICE_CONFIRM_PHRASES.some(phrase => normalized === phrase || normalized.startsWith(phrase + ' ') || normalized.endsWith(' ' + phrase) || normalized.includes(phrase));
  };

  // Fire the last actionable button in the conversation
  const triggerLastActionButton = (): boolean => {
    if (eReportAgent) {
      if (eReportAgent.stage === 'review') {
        handleSubmitEReportFromChat();
        return true;
      }
      // Keep active eReport answers inside the agent instead of triggering an
      // unrelated action card from an older conversation message.
      return false;
    }

    if (sssAgent) {
      if (sssAgent.stage === 'identity') {
        handleVerifySSSIdentity();
        return true;
      }
      if (sssAgent.stage === 'review') {
        handleCreateSSSPayment();
        return true;
      }
      // Never infer a service choice, SSS number, PRN, or paid status from a
      // generic voice confirmation.
      return false;
    }

    if (businessPermitAgent) {
      if (businessPermitAgent.stage === 'identity') {
        handleVerifyBusinessPermitIdentity();
        return true;
      }
      if (businessPermitAgent.stage === 'review') {
        handleSubmitBusinessPermit();
        return true;
      }
      if (businessPermitAgent.stage === 'submitted') {
        handleCreateBusinessPermitPayment();
        return true;
      }
      // Generic voice confirmation never supplies permit fields, attaches
      // documents, or claims that an eGovPay transaction was paid.
      return false;
    }

    // Walk messages in reverse to find the last assistant message with an action
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (msg.role !== 'assistant') continue;

      // Business card — navigates directly to the correct service type
      if (msg.businessAction) {
        const confirmUtterance = new SpeechSynthesisUtterance(
          `Launching your ${msg.businessAction.title} transaction now.`
        );
        confirmUtterance.lang = 'en-PH';
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(confirmUtterance);
        confirmUtterance.onend = () => navigate(`/services/business?service=${msg.businessAction!.serviceType}`);
        return true;
      }

      // CTA card
      if (msg.ctaAction) {
        const label = msg.ctaAction.ctaLabel;
        const confirmUtterance = new SpeechSynthesisUtterance(`Got it. ${label}.`);
        confirmUtterance.lang = 'en-PH';
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(confirmUtterance);
        if (isSSSCtaAction(msg.ctaAction)) {
          confirmUtterance.onend = () => handleSuggestionClick('Start SSS services in chat', true);
        } else if (isBusinessPermitRenewalCtaAction(msg.ctaAction)) {
          confirmUtterance.onend = () => handleSuggestionClick('Renew my business permit in chat', true);
        } else if (msg.ctaAction.targetRoute) {
          confirmUtterance.onend = () => navigate(msg.ctaAction!.targetRoute!);
        } else {
          confirmUtterance.onend = () =>
            handleSuggestionClick(
              msg.ctaAction?.actionType === 'drivers_license_renewal'
                ? "I want to renew my driver's license"
                : msg.ctaAction?.actionType === 'national_id_application'
                  ? 'I want to apply for a National ID'
                  : msg.ctaAction?.actionType === 'passport_application'
                    ? 'I want to apply for a passport'
                    : msg.ctaAction?.actionType === 'sss_contribution'
                      ? 'I want to pay my SSS contribution'
                      : msg.ctaAction?.actionType === 'philhealth_registration'
                        ? 'I want to register for PhilHealth'
                        : msg.ctaAction?.actionType === 'civil_registration'
                          ? 'I want to request a PSA document'
                          : msg.ctaAction?.actionType === 'vehicle_registration'
                            ? 'I want to register my vehicle'
                            : `Process ${msg.ctaAction?.agency} application`,
              true
            );
        }
        return true;
      }

      // Identity card — offer profile navigation
      if (msg.identityCard) {
        const confirmUtterance = new SpeechSynthesisUtterance('Opening your full profile now.');
        confirmUtterance.lang = 'en-PH';
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(confirmUtterance);
        confirmUtterance.onend = () => navigate('/profile');
        return true;
      }
    }
    return false;
  };

  const startVoiceInput = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      setError('Voice input is not supported in this browser. Try Chrome or Edge.');
      return;
    }

    // Stop ongoing recognition if already listening
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = 'en-PH';
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results as ArrayLike<{ [index: number]: { transcript: string } }>)
        .map((r) => r[0].transcript)
        .join('');
      setInputValue(transcript);
      // On final result — check for voice confirm command first, then send normally
      if (event.results[event.results.length - 1].isFinal) {
        recognition.stop();
        if (isVoiceConfirmCommand(transcript) && triggerLastActionButton()) {
          setInputValue('');
          return; // Action triggered — don't send to AI
        }
        handleSend(transcript);
      }
    };

    recognition.start();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-surface via-surface-container-low to-surface flex flex-col justify-between">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl bg-primary text-white shadow-2xl text-xs font-bold flex items-center gap-2 animate-bounce pointer-events-none">
          <span className="material-symbols-outlined text-base">check_circle</span>
          {toastMessage}
        </div>
      )}
      {/* Top Header Spacing */}
      <main className="flex-grow pt-20 pb-40 px-4 md:px-8 max-w-4xl mx-auto w-full flex flex-col">
        {messages.length === 0 ? (
          /* Landing / Hero Screen */
          <div className="flex-grow flex flex-col justify-center items-center text-center my-auto py-6 space-y-8 animate-fadeIn">
            {/* eBuddy Core Badge */}
            <div className="relative group cursor-pointer" onClick={() => inputRef.current?.focus()}>
              <div className="w-28 h-28 md:w-36 md:h-36 rounded-full bg-gradient-to-tr from-primary via-surface-tint to-secondary p-1 shadow-xl hover:scale-105 transition-all duration-300">
                <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden shadow-inner">
                  <EBuddyMascot className="w-full h-full p-1" />
                </div>
              </div>
              <div className="absolute bottom-0 right-0 bg-tertiary text-on-tertiary p-1.5 rounded-full shadow-lg border-2 border-white flex items-center justify-center">
                <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>
                  verified
                </span>
              </div>
            </div>

            {/* Greeting & Headline */}
            <div className="space-y-3 max-w-2xl">
              <h2 className="text-3xl md:text-4xl font-bold text-on-surface tracking-tight leading-tight">
                {user?.firstName ? (
                  <>
                    Magandang araw, <span className="text-primary">{user.firstName}</span>!
                  </>
                ) : (
                  'Welcome! I am eBuddy'
                )}
              </h2>
              <p className="text-on-surface-variant text-base md:text-lg">
                Your instant AI guide for Philippine government services, permits, requirements, and agency support.
              </p>
            </div>

            {/* User Authenticated Status Chip */}
            {user?.firstName && (
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-container/15 text-primary border border-primary/20 shadow-sm">
                <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>
                  account_circle
                </span>
                <span className="text-sm font-semibold">
                  Verified Citizen: {user.firstName} {user.lastName}
                </span>
                {user.uniqid && <span className="text-xs opacity-75 font-mono">({user.uniqid})</span>}
              </div>
            )}

            {/* eReport Quick Action Banner */}
            <div
              onClick={() => navigate('/ereport')}
              className="w-full p-4 rounded-2xl bg-gradient-to-r from-red-200 to-rose-300 text-black shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center justify-between gap-4 group"
            >
              <div className="flex items-center gap-3 text-left">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                    campaign
                  </span>
                </div>
                <div>
                  <h3 className="font-bold text-sm flex items-center gap-1.5">
                    File an Emergency or Public Report (eReport)
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-white/20 text-slate-800">
                      Live
                    </span>
                  </h3>
                  <p className="text-xs text-black/90">
                    Report potholes, public hazards, sanitation, or emergency incidents instantly.
                  </p>
                </div>
              </div>
              <span className="material-symbols-outlined text-xl group-hover:translate-x-1 transition-transform">
                arrow_forward
              </span>
            </div>

            {/* Feature Bento Grid */}
            <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-4 text-left pt-2">
              {featureCards.map((card, idx) => (
                <div
                  key={idx}
                  onClick={() => handleSuggestionClick(card.query)}
                  className="group p-5 rounded-2xl bg-white/80 hover:bg-white border border-outline-variant/40 hover:border-primary/40 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-primary-container/20 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                      <span className="material-symbols-outlined text-2xl">{card.icon}</span>
                    </div>
                    <span className="material-symbols-outlined text-outline group-hover:text-primary group-hover:translate-x-1 transition-all text-xl">
                      arrow_forward
                    </span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-on-surface group-hover:text-primary transition-colors text-base">
                      {card.title}
                    </h3>
                    <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">{card.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Prompts Carousel */}
            <div className="w-full pt-2">
              <p className="text-xs font-semibold text-outline uppercase tracking-wider mb-3">Suggested Topics</p>
              <div className="flex flex-wrap justify-center gap-2">
                {quickPrompts.map((prompt, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestionClick(
                      prompt === 'Choose a Travel Destination'
                        ? 'Help me plan a trip'
                        : prompt === 'Make a Donation'
                          ? 'I want to make a donation'
                        : `How to apply or renew ${prompt}?`
                    )}
                    className="px-4 py-2 rounded-full bg-white hover:bg-primary-container/20 border border-outline-variant/40 hover:border-primary/40 text-on-surface-variant hover:text-primary text-xs font-medium transition-all shadow-sm active:scale-95"
                  >
                    ✨ {prompt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Active Chat Conversation Container */
          <div className="flex-grow flex flex-col space-y-4">
            {/* Sticky Chat Header Bar */}
            <div className="sticky top-20 z-30 bg-white/90 backdrop-blur-md px-5 py-3 rounded-2xl shadow-sm border border-outline-variant/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-primary to-secondary p-0.5 shadow-sm">
                  <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden">
                    <EBuddyMascot alt="" className="w-full h-full p-0.5" />
                  </div>
                </div>
                <div>
                  <h3 className="font-bold text-on-surface text-sm flex items-center gap-1.5">
                    eBuddy
                    <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse"></span>
                  </h3>
                  <p className="text-xs text-on-surface-variant">
                    {user?.firstName ? `Tailored for ${user.firstName}` : 'Official Philippine Government AI'}
                  </p>
                </div>
              </div>
              <button
                onClick={clearChat}
                className="px-3.5 py-1.5 rounded-full bg-surface-container hover:bg-error-container hover:text-on-error-container text-on-surface-variant text-xs font-semibold transition-all flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-base">delete</span>
                Clear Chat
              </button>
            </div>

            {/* Messages Feed */}
            <div className="space-y-5 pt-2">
              {messages.map(message => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`}
                >
                  {message.role === 'assistant' && (
                    <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center shrink-0 shadow-sm border border-primary/20 overflow-hidden">
                      <EBuddyMascot alt="" className="w-full h-full p-0.5" />
                    </div>
                  )}

                  <div
                    className={`group relative max-w-[85%] md:max-w-[78%] rounded-2xl px-5 py-4 shadow-sm ${
                      message.role === 'user'
                        ? 'bg-primary text-white rounded-br-none'
                        : 'bg-white text-on-surface border border-outline-variant/30 rounded-bl-none'
                    }`}
                  >
                    {message.role === 'assistant' ? (
                      <div
                        className="prose prose-sm max-w-none text-on-surface
                        prose-p:leading-relaxed prose-p:my-1.5
                        prose-strong:font-semibold prose-strong:text-on-surface
                        prose-ul:my-2 prose-ul:pl-5 prose-li:my-0.5
                        prose-ol:my-2 prose-ol:pl-5
                        prose-h1:text-base prose-h1:font-bold prose-h1:mt-3 prose-h1:mb-1
                        prose-h2:text-sm prose-h2:font-bold prose-h2:mt-2.5 prose-h2:mb-1
                        prose-h3:text-sm prose-h3:font-semibold prose-h3:mt-2 prose-h3:mb-1
                        prose-a:text-primary prose-a:underline hover:prose-a:opacity-80
                        prose-code:bg-surface-container prose-code:px-1 prose-code:rounded prose-code:text-xs prose-code:font-mono
                        prose-blockquote:border-l-2 prose-blockquote:border-primary/40 prose-blockquote:pl-3 prose-blockquote:text-on-surface-variant prose-blockquote:italic
                        break-words"
                      >
                        <ReactMarkdown>{message.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-sm md:text-base leading-relaxed whitespace-pre-wrap break-words">
                          {message.content}
                        </p>
                        {message.imagePreview && (
                          <img
                            src={message.imagePreview}
                            alt="Attached eReport evidence"
                            className="max-h-48 max-w-full rounded-xl border border-white/30 object-cover"
                          />
                        )}
                      </div>
                    )}

                    {/* 🌐 AUTO-TRANSLATION BADGE — shown on user messages that were translated */}
                    {message.translatedFrom && (
                      <div className="mt-2 flex items-start gap-1.5 px-2 py-1.5 rounded-lg bg-white/15 border border-white/20">
                        <span className="material-symbols-outlined text-white/80 text-sm shrink-0 mt-0.5">translate</span>
                        <div className="min-w-0">
                          <p className="text-[10px] text-white/70 font-semibold leading-none mb-0.5">
                            Auto-translated from {message.translatedFrom.sourceLabel}
                          </p>
                          <p className="text-[11px] text-white/90 italic leading-snug">
                            "{message.translatedFrom.originalText}"
                          </p>
                        </div>
                      </div>
                    )}

                    {/* ACTIVE EREPORT AGENT QUESTION ACTIONS */}
                    {message.reportAgentPrompt &&
                      message.reportAgentPrompt.stage !== 'review' &&
                      message.id === activeEReportMessageId &&
                      eReportAgent?.id === message.reportAgentPrompt.conversationId &&
                      eReportAgent.stage === message.reportAgentPrompt.stage && (
                        <div className="mt-4 p-3.5 rounded-xl bg-blue-50 border border-blue-200 space-y-3">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-800 flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-sm">assignment</span>
                              eReport Agent · {message.reportAgentPrompt.stage}
                            </span>
                            <span className="text-[10px] font-semibold text-amber-700">Draft only</span>
                          </div>

                          {message.reportAgentPrompt.stage === 'title' && message.reportAgentPrompt.suggestedTitle && (
                            <button
                              type="button"
                              onClick={() => handleSend('Use the suggested title')}
                              disabled={isLoading}
                              className="w-full px-3 py-2.5 rounded-lg bg-white border border-blue-200 text-blue-800 font-semibold text-xs hover:bg-blue-100 disabled:opacity-50 text-left"
                            >
                              Use suggestion: “{message.reportAgentPrompt.suggestedTitle}”
                            </button>
                          )}

                          {message.reportAgentPrompt.stage === 'location' && (
                            <div className="space-y-3">
                              <div className="space-y-1.5">
                                <label
                                  htmlFor={`manual-ereport-location-${message.id}`}
                                  className="block text-[10px] font-bold uppercase tracking-wide text-blue-900"
                                >
                                  Option 1 · Enter location manually
                                </label>
                                <div className="flex flex-col sm:flex-row gap-2">
                                  <input
                                    id={`manual-ereport-location-${message.id}`}
                                    type="text"
                                    value={manualEReportLocation}
                                    onChange={event => setManualEReportLocation(event.target.value.slice(0, 250))}
                                    onKeyDown={event => {
                                      if (event.key === 'Enter' && !isLoading && !isFetchingEReportLocation) {
                                        event.preventDefault();
                                        handleUseManualLocation();
                                      }
                                    }}
                                    disabled={isLoading || isFetchingEReportLocation}
                                    placeholder="Address, barangay, or nearest landmark"
                                    className="min-w-0 flex-1 px-3 py-2.5 rounded-lg bg-white border border-blue-200 text-xs text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 disabled:opacity-50"
                                  />
                                  <button
                                    type="button"
                                    onClick={handleUseManualLocation}
                                    disabled={isLoading || isFetchingEReportLocation || manualEReportLocation.trim().length < 3}
                                    className="px-3 py-2.5 rounded-lg bg-white border border-blue-200 text-blue-800 font-semibold text-xs flex items-center justify-center gap-1.5 disabled:opacity-50"
                                  >
                                    <span className="material-symbols-outlined text-base">add_location_alt</span>
                                    Use Manual Location
                                  </button>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-on-surface-variant">
                                <span className="h-px flex-1 bg-blue-200" />
                                or
                                <span className="h-px flex-1 bg-blue-200" />
                              </div>

                              <button
                                type="button"
                                onClick={handleUseCurrentLocation}
                                disabled={isLoading || isFetchingEReportLocation}
                                className="w-full px-3 py-2.5 rounded-lg bg-primary text-white font-semibold text-xs flex items-center justify-center gap-1.5 disabled:opacity-50"
                              >
                                <span className={`material-symbols-outlined text-base ${isFetchingEReportLocation ? 'animate-spin' : ''}`}>
                                  {isFetchingEReportLocation ? 'progress_activity' : 'my_location'}
                                </span>
                                {isFetchingEReportLocation ? 'Getting Current Location...' : 'Option 2 · Enable Current Location'}
                              </button>
                              <p className="text-[10px] leading-relaxed text-on-surface-variant">
                                Your browser will ask permission. Only the coordinates are added to this editable draft, and nothing is submitted until you choose Submit eReport.
                              </p>
                            </div>
                          )}

                          {message.reportAgentPrompt.stage === 'severity' && (
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                              {(['Low', 'Medium', 'High', 'Critical'] as const).map(level => (
                                <button
                                  key={level}
                                  type="button"
                                  onClick={() => handleSend(level)}
                                  disabled={isLoading}
                                  className="px-2 py-2 rounded-lg bg-white border border-blue-200 text-on-surface font-semibold text-xs hover:bg-blue-100 disabled:opacity-50"
                                >
                                  {level}
                                </button>
                              ))}
                            </div>
                          )}

                          {message.reportAgentPrompt.stage === 'photo' && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <label className="cursor-pointer px-3 py-2.5 rounded-lg bg-primary text-white font-semibold text-xs flex items-center justify-center gap-1.5">
                                <span className="material-symbols-outlined text-base">add_a_photo</span>
                                Attach Photo
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={handleEReportPhoto}
                                  disabled={isLoading}
                                  className="hidden"
                                />
                              </label>
                              <button
                                type="button"
                                onClick={() => handleSend('Continue without photo')}
                                disabled={isLoading}
                                className="px-3 py-2.5 rounded-lg bg-white border border-blue-200 text-blue-800 font-semibold text-xs disabled:opacity-50"
                              >
                                Continue without photo
                              </button>
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={() => handleSend('Cancel report')}
                            disabled={isLoading || isFetchingEReportLocation}
                            className="text-[11px] text-on-surface-variant hover:text-error font-semibold"
                          >
                            Cancel eReport draft
                          </button>
                        </div>
                      )}

                    {/* AI-GENERATED EREPORT DRAFT CARD */}
                    {message.reportDraft && (
                      <div className="mt-4 p-4 rounded-xl bg-blue-50 border border-primary/25 space-y-4">
                        <div className="flex items-center justify-between gap-2 border-b border-primary/10 pb-2">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
                            <span className="material-symbols-outlined text-base">rate_review</span>
                            <span>Review eReport Draft</span>
                          </div>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                            Not submitted
                          </span>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">
                            Incident Title / Summary
                          </label>
                          <input
                            type="text"
                            value={
                              isActiveEReportReview(message)
                                ? eReportAgent?.title || ''
                                : message.reportDraft.title
                            }
                            onChange={event => updateEReportReview({ title: event.target.value.slice(0, 140) })}
                            disabled={
                              !isActiveEReportReview(message) ||
                              isSubmittingEReport
                            }
                            className="w-full px-3 py-2.5 rounded-lg bg-white border border-outline-variant/50 text-xs font-semibold text-on-surface disabled:opacity-70"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">
                              Category
                            </label>
                            <select
                              value={
                                isActiveEReportReview(message)
                                  ? eReportAgent?.category
                                  : message.reportDraft.category
                              }
                              onChange={event => updateEReportReview({ category: event.target.value as ReportCategory })}
                              disabled={
                                !isActiveEReportReview(message) ||
                                isSubmittingEReport
                              }
                              className="w-full px-3 py-2.5 rounded-lg bg-white border border-outline-variant/50 text-xs text-on-surface disabled:opacity-70"
                            >
                              {(Object.entries(categoryLabels) as Array<[ReportCategory, string]>).map(([value, label]) => (
                                <option key={value} value={value}>{label}</option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">
                              Urgency / Severity
                            </label>
                            <select
                              value={
                                isActiveEReportReview(message)
                                  ? eReportAgent?.severity || 'medium'
                                  : message.reportDraft.severity
                              }
                              onChange={event => updateEReportReview({ severity: event.target.value as ReportSeverity })}
                              disabled={
                                !isActiveEReportReview(message) ||
                                isSubmittingEReport
                              }
                              className="w-full px-3 py-2.5 rounded-lg bg-white border border-outline-variant/50 text-xs capitalize text-on-surface disabled:opacity-70"
                            >
                              {(['low', 'medium', 'high', 'critical'] as ReportSeverity[]).map(value => (
                                <option key={value} value={value}>{value}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">
                            Specific Location / Landmark
                          </label>
                          <input
                            type="text"
                            value={
                              isActiveEReportReview(message)
                                ? eReportAgent?.location || ''
                                : message.reportDraft.location
                            }
                            onChange={event => updateEReportReview({ location: event.target.value.slice(0, 250) })}
                            disabled={
                              !isActiveEReportReview(message) ||
                              isSubmittingEReport
                            }
                            className="w-full px-3 py-2.5 rounded-lg bg-white border border-outline-variant/50 text-xs text-on-surface disabled:opacity-70"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">
                            Detailed Description
                          </label>
                          <textarea
                            rows={4}
                            value={
                              isActiveEReportReview(message)
                                ? eReportAgent?.description || ''
                                : message.reportDraft.description
                            }
                            onChange={event => updateEReportReview({ description: event.target.value.slice(0, 2000) })}
                            disabled={
                              !isActiveEReportReview(message) ||
                              isSubmittingEReport
                            }
                            className="w-full px-3 py-2.5 rounded-lg bg-white border border-outline-variant/50 text-xs text-on-surface resize-y disabled:opacity-70"
                          />
                        </div>

                        {(isActiveEReportReview(message)
                          ? eReportAgent?.imageUrl
                          : message.reportDraft.imageUrl) && (
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">
                              Photo Evidence
                            </label>
                            <div className="relative w-fit">
                              <img
                                src={
                                  isActiveEReportReview(message)
                                    ? eReportAgent?.imageUrl
                                    : message.reportDraft.imageUrl
                                }
                                alt="eReport evidence preview"
                                className="h-28 max-w-full rounded-lg border border-outline-variant object-cover"
                              />
                              {isActiveEReportReview(message) && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateEReportReview({
                                        imageUrl: undefined,
                                        imageName: undefined,
                                        photoDecision: 'skipped',
                                      })
                                    }
                                    disabled={isSubmittingEReport}
                                    className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-error text-white flex items-center justify-center"
                                    title="Remove photo"
                                  >
                                    <span className="material-symbols-outlined text-sm">close</span>
                                  </button>
                                )}
                            </div>
                          </div>
                        )}

                        <div className="pt-2 border-t border-primary/10 space-y-2">
                          <p className="text-[10px] text-on-surface-variant text-center">
                            By submitting, you confirm that you reviewed the details above.
                          </p>
                          <button
                            type="button"
                            onClick={handleSubmitEReportFromChat}
                            disabled={
                              !isActiveEReportReview(message) ||
                              isSubmittingEReport ||
                              !eReportAgent?.title?.trim() ||
                              !eReportAgent?.description?.trim() ||
                              !eReportAgent?.location?.trim()
                            }
                            className="w-full py-2.5 rounded-lg bg-primary text-white font-bold text-xs hover:bg-primary/90 transition-colors flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
                          >
                            <span className={`material-symbols-outlined text-sm ${isSubmittingEReport ? 'animate-spin' : ''}`}>
                              {isSubmittingEReport ? 'progress_activity' : 'send'}
                            </span>
                            {isSubmittingEReport ? 'Submitting eReport...' : 'Submit eReport'}
                          </button>
                          {isActiveEReportReview(message) && (
                              <button
                                type="button"
                                onClick={() => handleSend('Cancel report')}
                                disabled={isSubmittingEReport}
                                className="w-full py-1.5 text-[11px] text-on-surface-variant hover:text-error font-semibold"
                              >
                                Cancel draft
                              </button>
                            )}
                        </div>
                      </div>
                    )}

                    {/* SUCCESSFUL IN-CHAT EREPORT SUBMISSION */}
                    {message.submittedReport && (
                      <div className="mt-4 p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-3">
                        <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                          <span className="material-symbols-outlined">check_circle</span>
                          eReport Submitted
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          <div className="p-2.5 rounded-lg bg-white border border-emerald-100">
                            <span className="text-[10px] text-on-surface-variant block">Tracking Number</span>
                            <span className="font-mono font-bold text-emerald-800">{message.submittedReport.trackingId}</span>
                          </div>
                          <div className="p-2.5 rounded-lg bg-white border border-emerald-100">
                            <span className="text-[10px] text-on-surface-variant block">Status</span>
                            <span className="font-bold text-on-surface">{message.submittedReport.status}</span>
                          </div>
                        </div>
                        <p className="text-xs text-on-surface-variant">
                          Assigned to: <strong>{message.submittedReport.agencyAssigned}</strong>
                        </p>
                        <button
                          type="button"
                          onClick={() => navigate('/ereport')}
                          className="w-full py-2 rounded-lg bg-emerald-700 text-white font-bold text-xs"
                        >
                          Open eReport Tracking
                        </button>
                      </div>
                    )}

                    {/* ACTIVE IN-CHAT SSS AGENT */}
                    {message.sssAgentPrompt &&
                      message.sssAgentPrompt.stage !== 'review' &&
                      message.id === activeSSSMessageId &&
                      sssAgent?.id === message.sssAgentPrompt.conversationId &&
                      sssAgent.stage === message.sssAgentPrompt.stage && (
                        <SSSAgentPromptCard
                          prompt={message.sssAgentPrompt}
                          citizenName={
                            user
                              ? [user.firstName, user.middleName, user.lastName].filter(Boolean).join(' ')
                              : 'Authenticated Citizen'
                          }
                          busy={isLoading || isVerifyingSSS || isCreatingSSSPayment}
                          onReply={reply => handleSend(reply)}
                          onVerifyIdentity={handleVerifySSSIdentity}
                          onCancel={() => handleSend('Cancel SSS transaction')}
                        />
                      )}

                    {/* EDITABLE SSS REVIEW CARD */}
                    {message.sssAgentPrompt?.stage === 'review' && message.sssDraft && message.sssStateSnapshot && (
                      <SSSTransactionReviewCard
                        state={isActiveSSSReview(message) && sssAgent ? sssAgent : message.sssStateSnapshot}
                        active={isActiveSSSReview(message)}
                        busy={isCreatingSSSPayment}
                        onUpdate={updateSSSReview}
                        onConfirm={handleCreateSSSPayment}
                        onCancel={() => handleSend('Cancel SSS transaction')}
                      />
                    )}

                    {/* PENDING EGOVPAY HANDOFF — PAYMENT ONLY OCCURS ON HOSTED PAGE */}
                    {message.sssPaymentIntent && message.sssDraft && (
                      <SSSPaymentCard
                        draft={message.sssDraft}
                        paymentIntent={message.sssPaymentIntent}
                        checking={checkingPaymentIds.includes(message.sssPaymentIntent.paymentId)}
                        onRefreshStatus={() => void checkChatPaymentStatus(message.sssPaymentIntent!.paymentId)}
                        onStartAnother={handleStartAnotherSSS}
                      />
                    )}

                    {/* ACTIVE IN-CHAT BUSINESS PERMIT RENEWAL AGENT */}
                    {message.businessPermitAgentPrompt &&
                      !['review', 'submitted', 'payment'].includes(message.businessPermitAgentPrompt.stage) &&
                      message.id === activeBusinessPermitMessageId &&
                      businessPermitAgent?.id === message.businessPermitAgentPrompt.conversationId &&
                      businessPermitAgent.stage === message.businessPermitAgentPrompt.stage &&
                      message.businessPermitStateSnapshot && (
                        <BusinessPermitPromptCard
                          prompt={message.businessPermitAgentPrompt}
                          state={businessPermitAgent}
                          citizenName={
                            user
                              ? [user.firstName, user.middleName, user.lastName].filter(Boolean).join(' ')
                              : 'Authenticated Citizen'
                          }
                          profileLgu={user?.address?.city
                            ? [user.address.city, user.address.province].filter(Boolean).join(', ')
                            : undefined}
                          busy={
                            isLoading ||
                            isVerifyingBusinessPermit ||
                            isSubmittingBusinessPermit ||
                            isCreatingBusinessPermitPayment
                          }
                          documentError={businessPermitDocumentError}
                          onReply={reply => handleSend(reply)}
                          onVerifyIdentity={handleVerifyBusinessPermitIdentity}
                          onAttachDocument={handleAttachBusinessPermitDocument}
                          onRemoveDocument={handleRemoveBusinessPermitDocument}
                          onCancel={() => handleSend('Cancel permit renewal')}
                        />
                      )}

                    {/* EDITABLE BUSINESS PERMIT REVIEW */}
                    {message.businessPermitAgentPrompt?.stage === 'review' &&
                      message.businessPermitDraft &&
                      message.businessPermitStateSnapshot && (
                        <BusinessPermitReviewCard
                          state={isActiveBusinessPermitReview(message) && businessPermitAgent
                            ? businessPermitAgent
                            : message.businessPermitStateSnapshot}
                          active={isActiveBusinessPermitReview(message)}
                          busy={isSubmittingBusinessPermit}
                          onUpdate={updateBusinessPermitReview}
                          onEditDocuments={handleEditBusinessPermitDocuments}
                          onSubmit={handleSubmitBusinessPermit}
                          onCancel={() => handleSend('Cancel permit renewal')}
                        />
                      )}

                    {/* SUBMITTED APPLICATION — PAYMENT REQUIRES A SECOND EXPLICIT ACTION */}
                    {message.businessPermitAgentPrompt?.stage === 'submitted' &&
                      message.businessPermitApplication && (
                        <BusinessPermitSubmissionCard
                          application={message.businessPermitApplication}
                          busy={isCreatingBusinessPermitPayment}
                          active={isActiveBusinessPermitSubmission(message)}
                          onCreatePayment={handleCreateBusinessPermitPayment}
                          onClose={() => handleSend('Cancel permit renewal')}
                        />
                      )}

                    {/* PENDING BUSINESS PERMIT EGOVPAY HANDOFF */}
                    {message.businessPermitPaymentIntent &&
                      message.businessPermitDraft &&
                      message.businessPermitApplication && (
                        <BusinessPermitPaymentCard
                          draft={message.businessPermitDraft}
                          application={message.businessPermitApplication}
                          paymentIntent={message.businessPermitPaymentIntent}
                          checking={checkingPaymentIds.includes(message.businessPermitPaymentIntent.paymentId)}
                          onRefreshStatus={() => void checkChatPaymentStatus(message.businessPermitPaymentIntent!.paymentId)}
                          onStartAnother={handleStartAnotherBusinessPermit}
                        />
                      )}

                    {/* ACTIVE AGENTIC DONATION FLOW */}
                    {message.donationAgentPrompt &&
                      ['campaign', 'amount'].includes(message.donationAgentPrompt.stage) &&
                      message.id === activeDonationMessageId &&
                      donationAgent?.id === message.donationAgentPrompt.conversationId &&
                      message.donationStateSnapshot && (
                        <DonationPromptCard
                          prompt={message.donationAgentPrompt}
                          state={donationAgent}
                          busy={isLoading || isCreatingDonationPayment}
                          onReply={reply => handleSend(reply)}
                          onCancel={() => handleSend('Cancel donation')}
                        />
                      )}

                    {message.donationAgentPrompt?.stage === 'review' && message.donationStateSnapshot && (
                      <DonationReviewCard
                        state={isActiveDonationReview(message) && donationAgent ? donationAgent : message.donationStateSnapshot}
                        active={isActiveDonationReview(message)}
                        busy={isCreatingDonationPayment}
                        onUpdate={updateDonationReview}
                        onConfirm={handleCreateDonationPayment}
                        onCancel={() => handleSend('Cancel donation')}
                      />
                    )}

                    {message.donationPaymentIntent && message.donationDraft && (
                      <DonationPaymentCard
                        draft={message.donationDraft}
                        paymentIntent={message.donationPaymentIntent}
                        checking={checkingPaymentIds.includes(message.donationPaymentIntent.paymentId)}
                        onRefreshStatus={() => void checkChatPaymentStatus(message.donationPaymentIntent!.paymentId)}
                        onOpenDonations={() => navigate('/donations')}
                      />
                    )}

                    {message.donationHistory && (
                      <DonationHistoryCard donations={message.donationHistory} onOpen={() => navigate('/donations')} />
                    )}

                    {/* ACTIVE TOURISM DESTINATION SELECTION */}
                    {message.tourismPlannerPrompt &&
                      message.id === activeTourismMessageId &&
                      tourismPlanner?.id === message.tourismPlannerPrompt.conversationId && (
                        <TourismDestinationPickerCard
                          prompt={message.tourismPlannerPrompt}
                          busy={isLoading}
                          onReply={destination => handleSend(destination)}
                          onCancel={() => handleSend('Cancel tourism planning')}
                        />
                      )}

                    {/* EGOVPH TOURISM API RESULT */}
                    {message.tourismResult && (
                      <TourismResultCard
                        result={message.tourismResult}
                        onFollowUp={prompt => handleSuggestionClick(prompt, true)}
                      />
                    )}

                    {/* ⚖️ LAWS & REGULATIONS CTA CARD */}
                    {message.lawsQuery && (
                      <div className="mt-4 rounded-2xl overflow-hidden border border-indigo-200 shadow-md">
                        {/* Card header */}
                        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-white text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                              balance
                            </span>
                            <div className="text-white">
                              <p className="text-xs font-bold leading-none">Laws & Regulations AI</p>
                              <p className="text-[10px] opacity-80 mt-0.5">Philippine Jurisdiction · eGovPH</p>
                            </div>
                          </div>
                          <span className="px-2.5 py-1 rounded-full bg-white/20 text-white text-[9px] font-bold uppercase tracking-wide backdrop-blur-sm">
                            Legal Query
                          </span>
                        </div>

                        {/* Card body */}
                        <div className="bg-white px-4 py-3 space-y-3">
                          {/* Query preview */}
                          <div className="p-2.5 rounded-lg bg-indigo-50 border border-indigo-100">
                            <p className="text-[9px] font-bold text-indigo-700 uppercase tracking-wider mb-1">Your Question</p>
                            <p className="text-xs text-on-surface leading-snug line-clamp-2 italic">"{message.lawsQuery}"</p>
                          </div>

                          {/* Feature badges */}
                          <div className="flex flex-wrap gap-1.5">
                            {[
                              { icon: 'verified', label: 'PH Laws Database', color: 'bg-indigo-100 text-indigo-800' },
                              { icon: 'translate', label: 'Multi-language', color: 'bg-violet-100 text-violet-800' },
                              { icon: 'history_edu', label: 'Republic Acts', color: 'bg-purple-100 text-purple-800' },
                            ].map(b => (
                              <span key={b.label} className={`px-2 py-0.5 rounded-full text-[9px] font-bold flex items-center gap-1 ${b.color}`}>
                                <span className="material-symbols-outlined text-[11px]">{b.icon}</span>
                                {b.label}
                              </span>
                            ))}
                          </div>

                          {/* Disclaimer */}
                          <p className="text-[9px] text-on-surface-variant leading-snug">
                            General legal information only. Not a substitute for professional legal advice.
                          </p>

                          {/* CTA button */}
                          <button
                            onClick={() => navigate(`/services/laws?q=${encodeURIComponent(message.lawsQuery!)}`)}
                            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold text-xs hover:opacity-95 transition-all flex items-center justify-center gap-2 shadow-md active:scale-[0.98]"
                          >
                            <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>balance</span>
                            Open Laws & Regulations Assistant
                            <span className="material-symbols-outlined text-sm ml-auto">arrow_forward</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* 🔵 AI AUTOMATED BUSINESS & TAX TRANSACTION CARD */}
                    {message.businessAction && (
                      <div className="mt-4 p-4 rounded-xl bg-gradient-to-br from-primary/5 to-secondary/5 border border-primary/20 space-y-3">
                        <div className="flex items-center justify-between gap-2 border-b border-primary/15 pb-2">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
                            <span className="material-symbols-outlined text-base">account_balance</span>
                            <span>{message.businessAction.title}</span>
                          </div>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-primary-container text-primary">
                            AI Ready • ₱{message.businessAction.estimatedTotal.toLocaleString()}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="p-2 rounded bg-white border border-outline-variant/30">
                            <span className="text-[10px] text-on-surface-variant block">Agency</span>
                            <span className="font-semibold text-on-surface truncate block">
                              {message.businessAction.agency}
                            </span>
                          </div>
                          <div className="p-2 rounded bg-white border border-outline-variant/30">
                            <span className="text-[10px] text-on-surface-variant block">Applicant</span>
                            <span className="font-semibold text-on-surface truncate block">
                              {message.businessAction.applicantName}
                            </span>
                          </div>
                        </div>

                        {/* Integration Badges */}
                        <div className="flex flex-wrap gap-1.5">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[12px]">verified</span>
                            eVerify PhilSys
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[12px]">lock</span>
                            eGovPay Gateway
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[12px]">sms</span>
                            eMessage SMS
                          </span>
                        </div>

                        <button
                          onClick={() => navigate(`/services/business?service=${message.businessAction?.serviceType ?? 'business_renewal'}`)}
                          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-primary to-secondary text-white font-bold text-xs hover:opacity-95 transition-all flex items-center justify-center gap-2 shadow-md active:scale-98"
                        >
                          <span className="material-symbols-outlined text-base">payments</span>
                          Launch Transaction (eVerify + eGovPay) →
                        </button>
                      </div>
                    )}

                    {/* 🆔 IDENTITY CARD — PASSPORT / NATIONAL ID / PROFILE */}
                    {message.identityCard && (
                      <div className="mt-4 rounded-2xl overflow-hidden shadow-lg border-2 border-primary/30 bg-gradient-to-br from-blue-50 via-white to-indigo-50">
                        {/* Card Header */}
                        <div className="bg-gradient-to-r from-primary via-secondary to-tertiary px-4 py-3 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span
                              className="material-symbols-outlined text-white text-xl"
                              style={{ fontVariationSettings: "'FILL' 1" }}
                            >
                              {message.identityCard.documentType === 'passport'
                                ? 'flight_takeoff'
                                : message.identityCard.documentType === 'national_id'
                                  ? 'badge'
                                  : 'account_circle'}
                            </span>
                            <div className="text-white">
                              <p className="text-xs font-bold leading-none">
                                {message.identityCard.documentType === 'passport'
                                  ? 'Philippine Passport (DFA)'
                                  : message.identityCard.documentType === 'national_id'
                                    ? 'PhilSys National ID'
                                    : 'eGovPH Citizen Profile'}
                              </p>
                              <p className="text-[10px] opacity-90 mt-0.5">Republic of the Philippines</p>
                            </div>
                          </div>
                          <span className="px-2.5 py-1 rounded-full bg-white/20 text-white text-[9px] font-bold uppercase tracking-wide backdrop-blur-sm">
                            SSO Verified
                          </span>
                        </div>

                        {/* Card Body */}
                        <div className="p-4 space-y-4">
                          {/* Profile Photo + Name Block */}
                          <div className="flex items-start gap-4">
                            {/* Photo */}
                            <div className="shrink-0">
                              <div className="w-20 h-24 rounded-lg overflow-hidden border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/5 flex items-center justify-center shadow-sm">
                                {message.identityCard.profilePhotoUrl ? (
                                  <img
                                    src={message.identityCard.profilePhotoUrl}
                                    alt="Citizen photo"
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <span className="text-3xl font-bold text-primary/40">
                                    {message.identityCard.firstName?.[0]}
                                    {message.identityCard.lastName?.[0]}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Name & Core Info */}
                            <div className="flex-1 min-w-0 space-y-2">
                              <div>
                                <p className="text-[9px] uppercase tracking-wider font-bold text-primary/70 mb-0.5">
                                  Full Legal Name
                                </p>
                                <p className="text-base font-bold text-on-surface leading-tight">
                                  {message.identityCard.fullName}
                                </p>
                              </div>

                              <div className="grid grid-cols-2 gap-2 text-[11px]">
                                <div>
                                  <p className="text-[9px] uppercase tracking-wider font-semibold text-on-surface-variant mb-0.5">
                                    Date of Birth
                                  </p>
                                  <p className="font-semibold text-on-surface">{message.identityCard.birthdateFmt}</p>
                                </div>
                                <div>
                                  <p className="text-[9px] uppercase tracking-wider font-semibold text-on-surface-variant mb-0.5">
                                    PhilSys ID
                                  </p>
                                  <p className="font-mono font-bold text-primary text-[10px]">
                                    {message.identityCard.uniqid || 'N/A'}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Contact & Address Section */}
                          <div className="border-t border-primary/10 pt-3 space-y-2.5 text-xs">
                            <div className="flex items-start gap-2">
                              <span className="material-symbols-outlined text-primary/70 text-sm mt-0.5 shrink-0">
                                mail
                              </span>
                              <div className="flex-1 min-w-0">
                                <p className="text-[9px] uppercase tracking-wider font-semibold text-on-surface-variant">
                                  Email Address
                                </p>
                                <p className="font-medium text-on-surface truncate">
                                  {message.identityCard.email || 'N/A'}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-start gap-2">
                              <span className="material-symbols-outlined text-primary/70 text-sm mt-0.5 shrink-0">
                                phone
                              </span>
                              <div className="flex-1 min-w-0">
                                <p className="text-[9px] uppercase tracking-wider font-semibold text-on-surface-variant">
                                  Mobile Number
                                </p>
                                <p className="font-mono font-medium text-on-surface">
                                  {message.identityCard.mobileNumber || 'N/A'}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-start gap-2">
                              <span className="material-symbols-outlined text-primary/70 text-sm mt-0.5 shrink-0">
                                home_pin
                              </span>
                              <div className="flex-1 min-w-0">
                                <p className="text-[9px] uppercase tracking-wider font-semibold text-on-surface-variant">
                                  Registered Address
                                </p>
                                <p className="font-medium text-on-surface leading-snug">
                                  {message.identityCard.address.full || 'N/A'}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Footer Badges */}
                          <div className="border-t border-primary/10 pt-3 flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-wrap gap-1.5">
                              <span className="px-2 py-1 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                                <span className="material-symbols-outlined text-[11px]">verified</span>
                                SSO Verified
                              </span>
                              <span className="px-2 py-1 rounded-full text-[9px] font-bold bg-blue-100 text-blue-800 flex items-center gap-1">
                                <span className="material-symbols-outlined text-[11px]">shield_person</span>
                                eGovPH Registry
                              </span>
                              {message.identityCard.profilePhotoUrl && (
                                <span className="px-2 py-1 rounded-full text-[9px] font-bold bg-purple-100 text-purple-800 flex items-center gap-1">
                                  <span className="material-symbols-outlined text-[11px]">face_retouching_natural</span>
                                  Face Liveness
                                </span>
                              )}
                            </div>
                            <p className="text-[9px] text-on-surface-variant font-mono">
                              Retrieved{' '}
                              {new Date(message.identityCard.retrievedAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          </div>

                          {/* Action Buttons */}
                          <div className="grid grid-cols-2 gap-2 pt-2">
                            <button
                              onClick={() => navigate('/profile')}
                              className="py-2 rounded-lg bg-white border-2 border-primary/30 text-primary font-bold text-xs hover:bg-primary/5 transition-all flex items-center justify-center gap-1.5"
                            >
                              <span className="material-symbols-outlined text-sm">person</span>
                              View Full Profile
                            </button>
                            <button
                              onClick={() => {
                                const text = `${message.identityCard!.fullName}\nPhilSys ID: ${message.identityCard!.uniqid}\nBirthdate: ${message.identityCard!.birthdateFmt}\nEmail: ${message.identityCard!.email}\nMobile: ${message.identityCard!.mobileNumber}\nAddress: ${message.identityCard!.address.full}`;
                                navigator.clipboard.writeText(text);
                                setToastMessage('Identity details copied to clipboard!');
                                setTimeout(() => setToastMessage(null), 2500);
                              }}
                              className="py-2 rounded-lg bg-gradient-to-r from-primary to-secondary text-white font-bold text-xs hover:opacity-95 transition-all flex items-center justify-center gap-1.5 shadow-sm"
                            >
                              <span className="material-symbols-outlined text-sm">content_copy</span>
                              Copy Details
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 📊 DBM TRANSPARENCY DATA CARD — only for actual data queries */}
                    {message.transparencyResult && !message.transparencyResult.error && message.transparencyResult.queryType !== 'dataset_overview' && (
                      <div className="mt-4 rounded-2xl overflow-hidden border border-blue-200 shadow-md">
                        {/* Card header */}
                        <div className="bg-gradient-to-r from-blue-700 to-indigo-700 px-4 py-3 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-white text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                              account_balance
                            </span>
                            <div className="text-white">
                              <p className="text-xs font-bold leading-none">DBM Transparency Portal</p>
                              <p className="text-[10px] opacity-80 mt-0.5">Official Government Budget Records</p>
                            </div>
                          </div>
                          <span className="px-2.5 py-1 rounded-full bg-white/20 text-white text-[9px] font-bold uppercase tracking-wide backdrop-blur-sm">
                            {message.transparencyResult.queryType?.replace(/_/g, ' ').toUpperCase() ?? 'RECORDS'}
                          </span>
                        </div>

                        {/* ── SAAODB Dashboard ────────────────────────────────────── */}
                        {message.transparencyResult.saaodbDashboard && (
                          <div className="bg-white px-4 py-4 space-y-4">
                            {/* Cascade KPI grid */}
                            <div>
                              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-2">
                                Budget Execution — FY {message.transparencyResult.saaodbDashboard.reportYear}
                              </p>
                              <div className="grid grid-cols-2 gap-2">
                                {[
                                  { label: 'Appropriations', val: message.transparencyResult.saaodbDashboard.cascade.appropriations, icon: 'summarize' },
                                  { label: 'Allotments', val: message.transparencyResult.saaodbDashboard.cascade.allotments, icon: 'receipt_long' },
                                  { label: 'Obligations', val: message.transparencyResult.saaodbDashboard.cascade.obligations, icon: 'assignment_turned_in' },
                                  { label: 'Disbursements', val: message.transparencyResult.saaodbDashboard.cascade.disbursements, icon: 'payments' },
                                  { label: 'Unobligated', val: message.transparencyResult.saaodbDashboard.cascade.unobligated, icon: 'pending_actions' },
                                  { label: 'Total Available', val: message.transparencyResult.saaodbDashboard.cascade.totalAvailable, icon: 'savings' },
                                ].map(item => (
                                  <div key={item.label} className="flex items-start gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100">
                                    <span className="material-symbols-outlined text-blue-600 text-base mt-0.5 shrink-0">{item.icon}</span>
                                    <div className="min-w-0">
                                      <p className="text-[9px] text-on-surface-variant uppercase tracking-wide">{item.label}</p>
                                      <p className="text-[11px] font-bold text-on-surface truncate">
                                        ₱{(item.val / 1e9).toFixed(2)}B
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Utilization rates */}
                            <div>
                              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-2">Utilization Rates</p>
                              <div className="space-y-2">
                                {[
                                  { label: 'Obligation Rate', rate: message.transparencyResult.saaodbDashboard.rates.obligationRate, color: 'bg-blue-500' },
                                  { label: 'Disbursement vs Obligations', rate: message.transparencyResult.saaodbDashboard.rates.disbRateOblig, color: 'bg-indigo-500' },
                                  { label: 'Disbursement vs Appropriations', rate: message.transparencyResult.saaodbDashboard.rates.disbRateAppro, color: 'bg-violet-500' },
                                ].map(r => (
                                  <div key={r.label}>
                                    <div className="flex justify-between text-[10px] mb-0.5">
                                      <span className="text-on-surface-variant">{r.label}</span>
                                      <span className="font-bold text-on-surface">{(r.rate * 100).toFixed(2)}%</span>
                                    </div>
                                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                      <div
                                        className={`h-full rounded-full ${r.color}`}
                                        style={{ width: `${Math.min(r.rate * 100, 100)}%` }}
                                      />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Expense class breakdown */}
                            {message.transparencyResult.saaodbDashboard.classBreakdown.length > 0 && (
                              <div>
                                <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-2">By Expense Class</p>
                                <div className="grid grid-cols-2 gap-1.5">
                                  {message.transparencyResult.saaodbDashboard.classBreakdown.map(c => (
                                    <div key={c.class} className="flex justify-between items-center px-2.5 py-1.5 rounded-lg bg-blue-50 border border-blue-100">
                                      <span className="text-[10px] font-bold text-blue-700">{c.class}</span>
                                      <span className="text-[10px] font-semibold text-on-surface">₱{(c.amount / 1e9).toFixed(1)}B</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* ── SAAODB Records list ──────────────────────────────────── */}
                        {message.transparencyResult.queryType === 'saaodb_records' &&
                          message.transparencyResult.saaodbRecords &&
                          message.transparencyResult.saaodbRecords.length > 0 &&
                          !message.transparencyResult.saaodbDashboard && (
                          <div className="bg-white px-4 py-3 space-y-2">
                            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
                              {message.transparencyResult.saaodbTotal?.toLocaleString()} records found — top {message.transparencyResult.saaodbRecords.length}
                            </p>
                            <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                              {message.transparencyResult.saaodbRecords.slice(0, 10).map((r, i) => (
                                <div key={i} className="flex items-start justify-between gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100 text-[11px]">
                                  <div className="min-w-0">
                                    <p className="font-semibold text-on-surface truncate">{r.entityName}</p>
                                    <p className="text-on-surface-variant">{r.fundSource} · {r.class} · {r.period}</p>
                                  </div>
                                  <div className="text-right shrink-0">
                                    <p className="font-bold text-blue-700">₱{(r.obligations / 1e6).toFixed(1)}M</p>
                                    <p className="text-[9px] text-on-surface-variant">obligations</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* ── NCA Records ──────────────────────────────────────────── */}
                        {message.transparencyResult.queryType === 'nca_records' &&
                          message.transparencyResult.ncaRecords &&
                          message.transparencyResult.ncaRecords.length > 0 && (
                          <div className="bg-white px-4 py-3 space-y-2">
                            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
                              {message.transparencyResult.ncaTotal?.toLocaleString()} NCA records — top {message.transparencyResult.ncaRecords.length}
                            </p>
                            <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                              {message.transparencyResult.ncaRecords.slice(0, 10).map((r, i) => (
                                <div key={i} className="flex items-start justify-between gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100 text-[11px]">
                                  <div className="min-w-0">
                                    <p className="font-semibold text-on-surface font-mono truncate">{r.agencyCode}</p>
                                    <p className="text-on-surface-variant">Dept: {r.deptCode} · Class: {r.expenseClass}</p>
                                  </div>
                                  <div className="text-right shrink-0">
                                    <p className="font-bold text-blue-700">₱{Number(r.amount ?? 0).toLocaleString()}</p>
                                    <p className="text-[9px] text-on-surface-variant">{String((r as Record<string,unknown>).dateIssued ?? (r as Record<string,unknown>).releasedDate ?? '').split('T')[0]}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* ── SARO Records ─────────────────────────────────────────── */}
                        {message.transparencyResult.queryType === 'saro_records' &&
                          message.transparencyResult.saroRecords &&
                          message.transparencyResult.saroRecords.length > 0 && (
                          <div className="bg-white px-4 py-3 space-y-2">
                            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
                              {message.transparencyResult.saroTotal?.toLocaleString()} SARO records — top {message.transparencyResult.saroRecords.length}
                            </p>
                            <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                              {message.transparencyResult.saroRecords.slice(0, 10).map((r, i) => (
                                <div key={i} className="flex items-start justify-between gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100 text-[11px]">
                                  <div className="min-w-0">
                                    <p className="font-semibold text-on-surface font-mono truncate">{r.saroNo}</p>
                                    <p className="text-on-surface-variant">Dept: {r.deptCode} · Agency: {r.agencyCode}</p>
                                  </div>
                                  <div className="text-right shrink-0">
                                    <p className="font-bold text-blue-700">₱{Number(r.amount ?? 0).toLocaleString()}</p>
                                    <p className="text-[9px] text-on-surface-variant">{r.releasedDate?.split('T')[0]}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* ── LGSF Dashboard ───────────────────────────────────────── */}
                        {message.transparencyResult.lgsfDashboard && (
                          <div className="bg-white px-4 py-4 space-y-4">
                            <div>
                              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-2">
                                LGSF {message.transparencyResult.lgsfDashboard.programCode} — Key Performance Indicators
                              </p>
                              <div className="grid grid-cols-2 gap-2">
                                {[
                                  { label: 'Total Released', val: `₱${(message.transparencyResult.lgsfDashboard.kpis.totalReleased / 1e9).toFixed(2)}B`, icon: 'payments' },
                                  { label: 'Projects', val: message.transparencyResult.lgsfDashboard.kpis.projectCount.toLocaleString(), icon: 'construction' },
                                  { label: 'LGUs Covered', val: message.transparencyResult.lgsfDashboard.kpis.lguCount.toLocaleString(), icon: 'location_city' },
                                  { label: 'Barangays', val: message.transparencyResult.lgsfDashboard.kpis.barangayCount.toLocaleString(), icon: 'home_pin' },
                                  { label: 'Regions', val: message.transparencyResult.lgsfDashboard.kpis.regionCount.toString(), icon: 'map' },
                                  { label: 'Provinces', val: message.transparencyResult.lgsfDashboard.kpis.provinceCount.toString(), icon: 'terrain' },
                                ].map(item => (
                                  <div key={item.label} className="flex items-start gap-2 p-2 rounded-lg bg-indigo-50 border border-indigo-100">
                                    <span className="material-symbols-outlined text-indigo-600 text-base mt-0.5 shrink-0">{item.icon}</span>
                                    <div>
                                      <p className="text-[9px] text-on-surface-variant uppercase tracking-wide">{item.label}</p>
                                      <p className="text-[11px] font-bold text-on-surface">{item.val}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Projects list preview */}
                            {message.transparencyResult.lgsfDashboard.projects.rows.length > 0 && (
                              <div>
                                <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-2">
                                  Projects ({message.transparencyResult.lgsfDashboard.projects.total.toLocaleString()} total)
                                </p>
                                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                                  {message.transparencyResult.lgsfDashboard.projects.rows.slice(0, 5).map((p, i) => (
                                    <div key={i} className="flex items-start justify-between gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100 text-[11px]">
                                      <div className="min-w-0">
                                        <p className="font-semibold text-on-surface truncate">{p.cityMunicipality}, {p.province}</p>
                                        <p className="text-on-surface-variant">{p.regionCode}</p>
                                      </div>
                                      <div className="text-right shrink-0">
                                        <p className="font-bold text-indigo-700">₱{Number(p.amount ?? 0).toLocaleString()}</p>
                                        <p className="text-[9px] text-on-surface-variant">FY {p.fiscalYear}</p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* ── LGSF Records (non-dashboard) ─────────────────────────── */}
                        {message.transparencyResult.queryType === 'lgsf_records' &&
                          message.transparencyResult.lgsfRecords &&
                          message.transparencyResult.lgsfRecords.length > 0 && (
                          <div className="bg-white px-4 py-3 space-y-2">
                            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
                              {message.transparencyResult.lgsfTotal?.toLocaleString()} LGSF records — top {message.transparencyResult.lgsfRecords.length}
                            </p>
                            <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                              {message.transparencyResult.lgsfRecords.slice(0, 10).map((r, i) => (
                                <div key={i} className="flex items-start justify-between gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100 text-[11px]">
                                  <div className="min-w-0">
                                    <p className="font-semibold text-on-surface truncate">{r.cityMunicipality}, {r.province}</p>
                                    <p className="text-on-surface-variant">{r.programCode} · {r.regionCode}</p>
                                  </div>
                                  <div className="text-right shrink-0">
                                    <p className="font-bold text-indigo-700">₱{Number(r.amount ?? 0).toLocaleString()}</p>
                                    <p className="text-[9px] text-on-surface-variant">FY {r.fiscalYear}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Footer source attribution */}
                        <div className="bg-slate-50 border-t border-slate-100 px-4 py-2 flex items-center justify-between">
                          <span className="text-[9px] text-on-surface-variant font-medium">
                            Source: Department of Budget and Management (DBM Transparency Portal)
                          </span>
                          <a
                            href="https://www.dbm.gov.ph"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[9px] text-blue-600 font-semibold hover:underline flex items-center gap-0.5"
                          >
                            dbm.gov.ph
                            <span className="material-symbols-outlined text-[10px]">open_in_new</span>
                          </a>
                        </div>
                      </div>
                    )}

                    {/* Error state for transparency queries */}
                    {message.transparencyResult?.error && (
                      <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2 text-xs">
                        <span className="material-symbols-outlined text-amber-600 text-base shrink-0">warning</span>
                        <p className="text-amber-800">{message.transparencyResult.error}</p>
                      </div>
                    )}

                    {/* 📚 Available Transparency Datasets — shown for transparency queries */}
                    {message.transparencyResult && !message.transparencyResult.error && (
                      <div className="mt-4 rounded-2xl overflow-hidden border border-blue-200/60 shadow-sm bg-gradient-to-br from-blue-50/40 to-indigo-50/40">
                        {/* Header */}
                        <div className="px-4 py-3 border-b border-blue-100/60">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="material-symbols-outlined text-blue-700 text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>
                              database
                            </span>
                            <h4 className="text-sm font-bold text-blue-900">Available DBM Transparency Datasets</h4>
                          </div>
                          <p className="text-[10px] text-blue-700/80">
                            Ask me about any of these datasets to view verified government budget allocation records.
                          </p>
                        </div>

                        {/* Dataset Cards Grid */}
                        <div className="p-3 grid grid-cols-1 gap-2">
                          {[
                            {
                              name: 'SAAODB',
                              fullName: 'Statement of Appropriations, Allotments, Obligations, Disbursements & Balances',
                              icon: 'account_balance',
                              color: 'bg-blue-500',
                              prompt: 'Show me the SAAODB dashboard summary for 2026',
                              examples: ['Budget execution by agency', 'Obligation rates', 'Disbursement status', 'Unobligated balances'],
                            },
                            {
                              name: 'NCA',
                              fullName: 'Notice of Cash Allocation',
                              icon: 'payments',
                              color: 'bg-indigo-500',
                              prompt: 'Show me NCA records for 2026',
                              examples: ['Cash allocation releases', 'Treasury releases', 'Agency-wise NCA', 'Operating unit allocations'],
                            },
                            {
                              name: 'SARO',
                              fullName: 'Special Allotment Release Order',
                              icon: 'receipt_long',
                              color: 'bg-violet-500',
                              prompt: 'Show me SARO records for 2026',
                              examples: ['Allotment release orders', 'SARO by department', 'SARO numbers lookup', 'Expense class breakdown'],
                            },
                            {
                              name: 'LGSF',
                              fullName: 'Local Government Support Fund',
                              icon: 'location_city',
                              color: 'bg-purple-500',
                              prompt: 'Show me LGSF FALGU dashboard',
                              examples: ['LGU allocations', 'Barangay funding', 'Provincial support', 'FALGU, GEF, GGG programs'],
                            },
                          ].map((dataset, idx) => (
                            <div
                              key={idx}
                              className="group bg-white border border-blue-100 rounded-xl p-3 hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer"
                              onClick={() => handleSuggestionClick(dataset.prompt)}
                            >
                              <div className="flex items-start gap-2.5">
                                {/* Icon */}
                                <div className={`w-8 h-8 rounded-lg ${dataset.color} text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform`}>
                                  <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>
                                    {dataset.icon}
                                  </span>
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-2 mb-1">
                                    <div>
                                      <h5 className="text-xs font-bold text-blue-900 leading-none">{dataset.name}</h5>
                                      <p className="text-[10px] text-blue-700/70 mt-0.5 line-clamp-1">{dataset.fullName}</p>
                                    </div>
                                    <span className="material-symbols-outlined text-blue-400 text-sm group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all shrink-0">
                                      arrow_forward
                                    </span>
                                  </div>

                                  {/* Example queries */}
                                  <div className="flex flex-wrap gap-1 mt-1.5">
                                    {dataset.examples.map((ex, i) => (
                                      <span
                                        key={i}
                                        className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-blue-50 text-blue-700 border border-blue-100"
                                      >
                                        {ex}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Footer */}
                        <div className="px-4 py-2 bg-blue-50/60 border-t border-blue-100/60">
                          <p className="text-[9px] text-blue-700/80 text-center">
                            💡 Try asking: <span className="font-semibold">"Show budget execution for Department of Health 2026"</span> or{' '}
                            <span className="font-semibold">"LGSF allocations for Bulacan"</span>
                          </p>
                        </div>
                      </div>
                    )}

                    {/* ⚡ SMART CTA — Pre-filled action panel */}
                    {message.ctaAction && !message.transparencyResult && (
                      <div className="mt-4 rounded-2xl overflow-hidden border border-primary/20 shadow-md">
                        {/* Panel Header */}
                        <div
                          className={`px-4 py-2.5 flex items-center gap-2 ${
                            message.ctaAction.colorTheme === 'secondary'
                              ? 'bg-gradient-to-r from-secondary to-tertiary'
                              : message.ctaAction.colorTheme === 'tertiary'
                                ? 'bg-gradient-to-r from-tertiary to-secondary'
                                : 'bg-gradient-to-r from-primary to-secondary'
                          }`}
                        >
                          <span
                            className="material-symbols-outlined text-white text-base"
                            style={{ fontVariationSettings: "'FILL' 1" }}
                          >
                            {message.ctaAction.icon}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-xs font-bold leading-none">{message.ctaAction.agency}</p>
                            <p className="text-white/80 text-[10px] mt-0.5">Ready to submit with your details</p>
                          </div>
                          <span className="px-2 py-0.5 rounded-full bg-white/20 text-white text-[9px] font-bold uppercase tracking-wide shrink-0">
                            Auto-Filled
                          </span>
                        </div>

                        {/* Pre-filled Details Preview */}
                        <div className="bg-white px-4 py-3 space-y-2">
                          <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
                            Your details, ready to go
                          </p>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="flex items-center gap-1.5 bg-surface-container/60 rounded-lg px-2.5 py-1.5">
                              <span className="material-symbols-outlined text-primary/60 text-sm shrink-0">person</span>
                              <div className="min-w-0">
                                <p className="text-[9px] text-on-surface-variant">Name</p>
                                <p className="text-xs font-semibold text-on-surface truncate">
                                  {message.ctaAction.preFilled.name}
                                </p>
                              </div>
                            </div>
                            {message.ctaAction.preFilled.location && (
                              <div className="flex items-center gap-1.5 bg-surface-container/60 rounded-lg px-2.5 py-1.5">
                                <span className="material-symbols-outlined text-primary/60 text-sm shrink-0">
                                  home_pin
                                </span>
                                <div className="min-w-0">
                                  <p className="text-[9px] text-on-surface-variant">Location</p>
                                  <p className="text-xs font-semibold text-on-surface truncate">
                                    {message.ctaAction.preFilled.location}
                                  </p>
                                </div>
                              </div>
                            )}
                            {message.ctaAction.preFilled.email && (
                              <div className="flex items-center gap-1.5 bg-surface-container/60 rounded-lg px-2.5 py-1.5">
                                <span className="material-symbols-outlined text-primary/60 text-sm shrink-0">mail</span>
                                <div className="min-w-0">
                                  <p className="text-[9px] text-on-surface-variant">Email</p>
                                  <p className="text-xs font-semibold text-on-surface truncate">
                                    {message.ctaAction.preFilled.email}
                                  </p>
                                </div>
                              </div>
                            )}
                            {message.ctaAction.preFilled.mobile && (
                              <div className="flex items-center gap-1.5 bg-surface-container/60 rounded-lg px-2.5 py-1.5">
                                <span className="material-symbols-outlined text-primary/60 text-sm shrink-0">
                                  phone
                                </span>
                                <div className="min-w-0">
                                  <p className="text-[9px] text-on-surface-variant">Mobile</p>
                                  <p className="text-xs font-semibold text-on-surface font-mono">
                                    {message.ctaAction.preFilled.mobile}
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Requirements checklist */}
                          {message.ctaAction.requirements && message.ctaAction.requirements.length > 0 && (
                            <div className="border border-amber-200 bg-amber-50/60 rounded-xl p-3 space-y-1.5">
                              <p className="text-[10px] font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-sm text-amber-600">checklist</span>
                                Prepare these before you proceed
                              </p>
                              <ul className="space-y-1">
                                {message.ctaAction.requirements.map((req, i) => (
                                  <li key={i} className="flex items-start gap-1.5 text-[11px] text-amber-900">
                                    <span className="material-symbols-outlined text-amber-500 text-sm shrink-0 mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>
                                      check_circle
                                    </span>
                                    {req}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Trust row */}
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                              <span className="material-symbols-outlined text-[11px]">verified</span>
                              SSO Verified Identity
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-100 text-blue-800 flex items-center gap-1">
                              <span className="material-symbols-outlined text-[11px]">lock</span>
                              eGovPH Secured
                            </span>
                            {message.ctaAction.estimatedTime && (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-100 text-amber-800 flex items-center gap-1">
                                <span className="material-symbols-outlined text-[11px]">schedule</span>~
                                {message.ctaAction.estimatedTime}
                              </span>
                            )}
                          </div>

                          {/* CTA Button */}
                          <button
                            onClick={() => {
                              if (isSSSCtaAction(message.ctaAction)) {
                                handleSuggestionClick('Start SSS services in chat', true);
                              } else if (isBusinessPermitRenewalCtaAction(message.ctaAction)) {
                                handleSuggestionClick('Renew my business permit in chat', true);
                              } else if (message.ctaAction?.targetRoute) {
                                navigate(message.ctaAction.targetRoute);
                              } else {
                                // Pre-fill the input to trigger the business flow — suppress CTA so it doesn't loop
                                handleSuggestionClick(
                                  message.ctaAction?.actionType === 'drivers_license_renewal'
                                    ? "I want to renew my driver's license"
                                    : message.ctaAction?.actionType === 'national_id_application'
                                      ? 'I want to apply for a National ID'
                                      : message.ctaAction?.actionType === 'passport_application'
                                        ? 'I want to apply for a passport'
                                        : message.ctaAction?.actionType === 'sss_contribution'
                                          ? 'I want to pay my SSS contribution'
                                          : message.ctaAction?.actionType === 'philhealth_registration'
                                            ? 'I want to register for PhilHealth'
                                            : message.ctaAction?.actionType === 'civil_registration'
                                              ? 'I want to request a PSA document'
                                              : message.ctaAction?.actionType === 'vehicle_registration'
                                                ? 'I want to register my vehicle'
                                                : `Process ${message.ctaAction?.agency} application`,
                                  true // suppressCta — prevent a new CTA card from appearing
                                );
                              }
                            }}
                            className={`mt-1 w-full py-2.5 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 shadow-md hover:opacity-95 active:scale-[0.98] transition-all ${
                              message.ctaAction.colorTheme === 'secondary'
                                ? 'bg-gradient-to-r from-secondary to-tertiary'
                                : message.ctaAction.colorTheme === 'tertiary'
                                  ? 'bg-gradient-to-r from-tertiary to-secondary'
                                  : 'bg-gradient-to-r from-primary to-secondary'
                            }`}
                          >
                            <span
                              className="material-symbols-outlined text-lg"
                              style={{ fontVariationSettings: "'FILL' 1" }}
                            >
                              {message.ctaAction.icon}
                            </span>
                            {message.ctaAction.ctaLabel}
                            <span className="material-symbols-outlined text-base ml-auto">arrow_forward</span>
                          </button>
                          <p className="text-[10px] text-center text-on-surface-variant pb-1">
                            {message.ctaAction.ctaDescription}
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-4 mt-2.5 pt-1 border-t border-black/5 text-[11px] opacity-70">
                      <span>{message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>

                      {message.role === 'assistant' && (
                        <div className="flex items-center gap-3">
                          {/* Speak button */}
                          <button
                            onClick={() => handleSpeak(message.id, message.content)}
                            className={`hover:opacity-100 flex items-center gap-1 transition-all ${speakingId === message.id ? 'text-primary opacity-100' : ''}`}
                            title={speakingId === message.id ? 'Stop reading' : 'Read aloud'}
                          >
                            <span
                              className={`material-symbols-outlined text-sm ${speakingId === message.id ? 'animate-pulse' : ''}`}
                              style={{ fontVariationSettings: "'FILL' 1" }}
                            >
                              {speakingId === message.id ? 'stop_circle' : 'volume_up'}
                            </span>
                            {speakingId === message.id ? 'Stop' : 'Read'}
                          </button>
                          {/* Copy button */}
                          <button
                            onClick={() => handleCopy(message.id, message.content)}
                            className="hover:opacity-100 flex items-center gap-1 transition-opacity"
                          >
                            <span className="material-symbols-outlined text-sm">
                              {copiedId === message.id ? 'check' : 'content_copy'}
                            </span>
                            {copiedId === message.id ? 'Copied' : 'Copy'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {message.role === 'user' && (
                    <div className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center shrink-0 shadow-sm font-bold text-sm">
                      {user?.firstName?.[0] || 'U'}
                    </div>
                  )}
                </div>
              ))}

              {/* Thinking / Loading State */}
              {isLoading && (
                <div className="flex gap-3 justify-start items-center animate-pulse">
                  <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center shrink-0 border border-primary/20 overflow-hidden">
                    <EBuddyMascot alt="" className="w-full h-full p-0.5" />
                  </div>
                  <div className="bg-white border border-outline-variant/30 rounded-2xl rounded-bl-none px-5 py-4 shadow-sm flex items-center gap-2">
                    <span className="text-xs text-on-surface-variant font-medium">
                      eBuddy is searching government databases
                    </span>
                    <div className="flex gap-1">
                      <span
                        className="w-2 h-2 bg-primary rounded-full animate-bounce"
                        style={{ animationDelay: '0ms' }}
                      ></span>
                      <span
                        className="w-2 h-2 bg-primary rounded-full animate-bounce"
                        style={{ animationDelay: '150ms' }}
                      ></span>
                      <span
                        className="w-2 h-2 bg-primary rounded-full animate-bounce"
                        style={{ animationDelay: '300ms' }}
                      ></span>
                    </div>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="flex gap-3 justify-start">
                  <div className="w-9 h-9 rounded-full bg-error-container text-on-error-container flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-xl">error</span>
                  </div>
                  <div className="bg-error-container/40 border border-error/30 text-on-error-container rounded-2xl px-5 py-4 shadow-sm flex flex-col gap-2">
                    <p className="text-sm font-medium">{error}</p>
                    <button
                      onClick={() => handleSend(messages[messages.length - 1]?.content)}
                      className="text-xs font-bold text-error underline text-left hover:opacity-80"
                    >
                      Retry last request
                    </button>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>
        )}
      </main>

      {/* 🟢 FIXED & ENHANCED CHAT INPUT SHELL */}
      <div className="fixed bottom-[64px] md:bottom-0 left-0 md:left-64 right-0 z-40 flex flex-col pointer-events-none">
        {/* Gradient fade to hide scrolling content elegantly */}
        <div className="h-8 w-full bg-gradient-to-t from-surface to-transparent"></div>
        
        {/* Solid background container */}
        <div className="bg-surface w-full px-4 md:px-8 pb-4 pt-1 pointer-events-auto flex justify-center">
          <div className="w-full max-w-3xl">
            <div className="bg-white p-2 md:p-3 rounded-3xl shadow-md border border-outline-variant/40 hover:border-primary/50 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10 transition-all duration-300 flex items-center gap-2">
              
              {/* Input Field */}
              <div className="flex-grow relative">
                <input
                  ref={inputRef}
                  className="w-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-on-surface text-sm md:text-base placeholder:text-outline/80 px-3 py-2 font-medium"
                  placeholder={
                    eReportAgent
                      ? EREPORT_AGENT_PLACEHOLDERS[eReportAgent.stage]
                      : sssAgent
                        ? SSS_AGENT_PLACEHOLDERS[sssAgent.stage]
                        : businessPermitAgent
                          ? BUSINESS_PERMIT_AGENT_PLACEHOLDERS[businessPermitAgent.stage]
                          : donationAgent
                            ? DONATION_AGENT_PLACEHOLDERS[donationAgent.stage]
                            : tourismPlanner
                              ? TOURISM_PLANNER_PLACEHOLDER
                              : placeholders[placeholderIndex]
                  }
                  type="text"
                  value={inputValue}
                  onChange={e => {
                    setInputOriginal(null);
                    setInputValue(e.target.value);
                  }}
                  onKeyDown={e => e.key === 'Enter' && !isLoading && handleSend()}
                  disabled={
                    isLoading ||
                    isFetchingEReportLocation ||
                    isVerifyingSSS ||
                    isCreatingSSSPayment ||
                    isVerifyingBusinessPermit ||
                    isSubmittingBusinessPermit ||
                    isCreatingBusinessPermitPayment ||
                    isCreatingDonationPayment
                  }
                />
                {/* Translation hint — shows original Filipino text below input */}
                {inputOriginal && !isTranslatingInput && (
                  <p className="absolute -top-6 left-3 text-[10px] text-outline/70 flex items-center gap-1 whitespace-nowrap overflow-hidden text-ellipsis max-w-full">
                    <span className="material-symbols-outlined text-[12px] text-primary/60">translate</span>
                    <span className="italic truncate">"{inputOriginal}"</span>
                  </p>
                )}
                {/* Translating spinner */}
                {isTranslatingInput && (
                  <p className="absolute -top-6 left-3 text-[10px] text-primary/70 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[12px] animate-spin">progress_activity</span>
                    Translating…
                  </p>
                )}
              </div>

              {/* Mic Button */}
              <button
                type="button"
                onClick={startVoiceInput}
                disabled={
                  isLoading ||
                  isFetchingEReportLocation ||
                  isVerifyingSSS ||
                  isCreatingSSSPayment ||
                  isVerifyingBusinessPermit ||
                  isSubmittingBusinessPermit ||
                  isCreatingBusinessPermitPayment ||
                  isCreatingDonationPayment
                }
                className={`w-10 h-10 md:w-11 md:h-11 flex items-center justify-center rounded-full transition-all duration-200 shrink-0 disabled:opacity-40 disabled:cursor-not-allowed ${
                  isListening
                    ? 'bg-red-500 text-white shadow-lg shadow-red-200 animate-pulse'
                    : 'text-on-surface-variant hover:bg-surface-container hover:text-primary'
                }`}
                title={isListening ? 'Listening… tap to stop' : 'Speak your question'}
              >
                <span className="material-symbols-outlined text-xl md:text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                  {isListening ? 'mic' : 'mic_none'}
                </span>
              </button>

              {/* Auto Suggest Prompt */}
              <button
                type="button"
                onClick={() => setInputValue('What are the requirements for National ID?')}
                className="hidden md:flex w-10 h-10 md:w-11 md:h-11 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container hover:text-primary transition-colors shrink-0"
                title="Quick sample prompt"
              >
                <span className="material-symbols-outlined text-xl md:text-2xl">auto_awesome</span>
              </button>

              {/* Send Button */}
              <button
                type="button"
                onClick={() => handleSend()}
                disabled={
                  isLoading ||
                  isFetchingEReportLocation ||
                  isVerifyingSSS ||
                  isCreatingSSSPayment ||
                  isVerifyingBusinessPermit ||
                  isSubmittingBusinessPermit ||
                  isCreatingBusinessPermitPayment ||
                  isCreatingDonationPayment ||
                  !inputValue.trim()
                }
                className="w-10 h-10 md:w-11 md:h-11 flex items-center justify-center rounded-full bg-primary text-white shadow-md hover:bg-primary/90 hover:scale-105 active:scale-95 transition-all duration-200 disabled:opacity-40 disabled:hover:scale-100 disabled:cursor-not-allowed shrink-0 mr-1"
                title="Send Message"
              >
                <span
                  className="material-symbols-outlined text-xl md:text-[22px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  {isLoading ? 'progress_activity' : 'send'}
                </span>
              </button>
            </div>
            <p className="text-[10px] md:text-[11px] text-center text-on-surface-variant/70 mt-2 font-medium">
              eBuddy provides official informational guidance for Philippine government services.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIChatHome;
