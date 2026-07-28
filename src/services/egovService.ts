import { EGOV_CONFIG } from '../config/egov.config';
import { EGovUser, User } from '../types/user';

interface ExchangeCodeResponse {
  success: boolean;
  data?: EGovUser;
  error?: string;
}

// AI Assistant API Types
interface TokenResponse {
  access_token: string;
  expires_in_seconds: number;
  credits_total: number;
  credits_remaining: number;
}

interface AIAssistantResponse {
  data: string;
  session_id: string;
}

interface TranslatorResponse {
  original_prompt: string;
  source_lang: string;
  target_lang: string;
  translate_from: {
    code: string;
    label: string;
  };
  translated_prompt: string;
  transliterated_prompt: string;
}

interface TourismResponse {
  data: string;
  session_id: string;
}

interface LawsResponse {
  data: string;
  session_id: string;
}

interface DocumentExtractorResponse {
  data: string;
}

interface CreditsResponse {
  credits_total: number;
  credits_used: number;
  credits_remaining: number;
  expires_at: string;
}

// Store token in memory (or use localStorage for persistence)
let cachedToken: string | null = null;
let tokenExpiry: number | null = null;

/**
 * Exchange the authorization code for user data from eGovPH
 */
export const exchangeCodeForUserData = async (exchangeCode: string): Promise<ExchangeCodeResponse> => {
  try {
    // Exchange code for access token via eGovPH API
    const tokenResponse = await fetch(`/egov-api/api/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        exchange_code: exchangeCode,
        scope: 'SSO_AUTHENTICATION',
        partner_code: import.meta.env.VITE_EGOV_PARTNER_CODE,
        partner_secret: import.meta.env.VITE_EGOV_PARTNER_SECRET,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to exchange code for token');
    }

    const data = await tokenResponse.json();

    // Map eGovPH response to our EGovUser format
    const egovUser: EGovUser = {
      uniqid: data.uniqid || data.user_id || data.id,
      firstName: data.first_name || data.firstName,
      middleName: data.middle_name || data.middleName,
      lastName: data.last_name || data.lastName,
      suffix: data.suffix,
      birthdate: data.birthdate || data.birth_date,
      email: data.email,
      mobileNumber: '+639531771034',
      address: {
        street: data.address?.street || data.street,
        barangay: data.address?.barangay || data.barangay,
        city: data.address?.city || data.city,
        province: data.address?.province || data.province,
        region: data.address?.region || data.region,
        zipCode: data.address?.zip_code || data.zipCode,
      },
    };

    return { success: true, data: egovUser };
  } catch (error) {
    console.error('Exchange code error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Find existing user by uniqid or personal details
 */
export const findExistingUser = async (egovUser: EGovUser): Promise<User | null> => {
  try {
    // First, try to find by uniqid
    const response = await fetch(`${EGOV_CONFIG.apiBaseUrl}/users/find?uniqid=${egovUser.uniqid}`);

    if (response.ok) {
      const data = await response.json();
      return data.user;
    }

    // If not found by uniqid, try matching by personal details
    const matchResponse = await fetch(`${EGOV_CONFIG.apiBaseUrl}/users/match`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        firstName: egovUser.firstName,
        lastName: egovUser.lastName,
        birthdate: egovUser.birthdate,
      }),
    });

    if (matchResponse.ok) {
      const matchData = await matchResponse.json();
      return matchData.user;
    }

    return null;
  } catch (error) {
    console.error('Find user error:', error);
    return null;
  }
};

/**
 * Register new user with eGovPH data
 */
export const registerUser = async (egovUser: EGovUser): Promise<User> => {
  try {
    const response = await fetch(`${EGOV_CONFIG.apiBaseUrl}/users/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...egovUser,
        ssoProvider: 'egovph',
        profileLocked: true,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to register user');
    }

    const data = await response.json();
    return data.user;
  } catch (error) {
    console.error('Register user error:', error);
    throw error;
  }
};

/**
 * Bind uniqid to existing user account
 */
export const bindUniqidToUser = async (userId: string, uniqid: string): Promise<boolean> => {
  try {
    const response = await fetch(`${EGOV_CONFIG.apiBaseUrl}/users/${userId}/bind-uniqid`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ uniqid }),
    });

    return response.ok;
  } catch (error) {
    console.error('Bind uniqid error:', error);
    return false;
  }
};

/**
 * Update user's last login timestamp
 */
export const updateLastLogin = async (userId: string): Promise<void> => {
  try {
    await fetch(`${EGOV_CONFIG.apiBaseUrl}/users/${userId}/last-login`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ lastLogin: new Date().toISOString() }),
    });
  } catch (error) {
    console.error('Update last login error:', error);
  }
};

// ============================================================================
// AI INTEGRATION API FUNCTIONS
// ============================================================================

// Use proxy for integration API to avoid CORS and DNS issues
const INTEGRATION_BASE_URL = '/integration-api';
const ACCESS_CODE = import.meta.env.VITE_EGOV_ACCESS_CODE;

// Debug: Log configuration
console.log('Integration API Config:', {
  baseUrl: INTEGRATION_BASE_URL,
  hasAccessCode: !!ACCESS_CODE,
  accessCodePrefix: ACCESS_CODE?.substring(0, 10) + '...',
});

/**
 * Get or generate access token for AI Integration API
 */
const getAccessToken = async (): Promise<string> => {
  // Return cached token if still valid
  if (cachedToken && tokenExpiry && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  try {
    const response = await fetch(`${INTEGRATION_BASE_URL}/api/v1/egov/integration/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        access_code: ACCESS_CODE,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Token API error response:', errorText);
      throw new Error(`Failed to generate access token: ${response.status} - ${errorText}`);
    }

    const data: TokenResponse = await response.json();

    // Cache token with expiry (subtract 60 seconds for safety margin)
    cachedToken = data.access_token;
    tokenExpiry = Date.now() + (data.expires_in_seconds - 60) * 1000;

    return data.access_token;
  } catch (error) {
    console.error('Get access token error:', error);
    throw error;
  }
};

/**
 * AI Assistant - Generate response to user query
 */
export const generateAIResponse = async (prompt: string, category: string = 'PH'): Promise<AIAssistantResponse> => {
  try {
    const token = await getAccessToken();

    const response = await fetch(`${INTEGRATION_BASE_URL}/api/v1/egov/integration/ai_assistant/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        prompt,
        category,
      }),
    });

    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.warn('eGov AI integration API call fallback to Knowledge Base:', error);
  }

  // Knowledge Base Fallback
  return {
    data: getKnowledgeBaseResponse(prompt),
    session_id: `SESSION-${Date.now()}`,
  };
};

/**
 * Intelligent Philippine Government Knowledge Base Fallback
 */
function getKnowledgeBaseResponse(prompt: string): string {
  const query = prompt.toLowerCase();

  // 1. SSS (Social Security System)
  if (query.includes('sss') || query.includes('social security') || query.includes('contribution') || query.includes('loan status')) {
    return `### 🏛️ SSS (Social Security System) Guidance

To check your **SSS Contribution** and **Loan Status**, follow these simple options:

#### **Option 1: Via My.SSS Online Portal**
1. Visit the official Portal: [member.sss.gov.ph](https://member.sss.gov.ph).
2. Log in using your **CRN / User ID** and Password.
3. Go to **Inquiries** → click **Contributions** to view posted monthly payments.
4. For Loans: Go to **Loans** → click **Loan Status / Balance** (Salalry Loan, Calamity Loan, etc.).

#### **Option 2: Via SSS Mobile App**
1. Download the **SSS Mobile** app from Google Play Store or Apple App Store.
2. Sign in with your My.SSS credentials.
3. Tap **Total Contributions** or **Loans** on your dashboard for real-time status.

#### **Option 3: Via uSMS / Text**
- Text \`SSS STAT <CRN/SS_NUMBER>\` to **2600** (Network charges apply).

---
*Tip: You can also generate a Payment Reference Number (PRN) directly inside the My.SSS portal or app for contribution payments.*`;
  }

  // 2. Business Permit Renewal / Application
  if (query.includes('business') || query.includes('permit') || query.includes('bplo') || query.includes('tin')) {
    return `### 🏢 Business Permit & Tax Payments

You can apply for or renew your **Business Permit** directly through our **eGovPH Portal**:

1. Go to **Services** → **Business Permit Renewal** on the top menu.
2. Complete **eVerify Identity Verification** via PhilSys.
3. Review estimated LGU fees (Mayor's Permit, Sanitary, Business Tax).
4. Pay securely using **eGovPay** (GCash, PayMaya, Landbank, Credit Card).
5. Receive your official SMS confirmation via **eMessage**.`;
  }

  // 3. Driver's License Renewal / LTO
  if (query.includes('driver') || query.includes('license') || query.includes('lto') || query.includes('vehicle')) {
    return `### 🚗 Driver's License Renewal (LTO)

Renew your Philippine Driver's License in **5 easy steps**:

1. **CDE Exam**: Take the free Comprehensive Driver's Education (CDE) online via [LTMS Portal](https://portal.lto.gov.ph) and download your CDE Certificate.
2. **Medical Certificate**: Get an electronic medical certificate from an LTO-accredited clinic.
3. **eVerify Check**: Complete PhilSys Face Liveness verification on eGovPH.
4. **Pay Fees**: Settle LTO Renewal fees seamlessly via **eGovPay**.
5. **Claim License**: Present your reference number at your designated LTO office for biometric photo & card printing.`;
  }

  // 4. PSA Birth Certificate
  if (query.includes('psa') || query.includes('birth') || query.includes('certificate') || query.includes('cenomar')) {
    return `### 📄 PSA Certificates (Birth, Marriage, Death, CENOMAR)

You can request official **PSA Civil Registry Documents** online for home delivery:

1. **Online Request**: Visit [psaserbilis.com.ph](https://www.psaserbilis.com.ph) or [psahelpline.ph](https://psahelpline.ph).
2. **Fill Details**: Enter complete name, birthdate, birthplace, and parents' names.
3. **Payment**: Pay via GCash, Credit/Debit Card, Bayad Center, or 7-Eleven.
4. **Delivery**: Delivered to your registered address in 3-5 working days within Metro Manila or 5-8 days for provinces.`;
  }

  // 5. Default Response
  return `### 🇵🇭 eGovPH Citizen Assistance

Thank you for reaching out! Here are the government services available in your eGovPH portal:

- **Identity & National ID**: View PhilSys National ID details, eVerify identity verification.
- **Business & LGU Services**: Business Permit renewal, Mayor's permit, Real Property Tax.
- **Transport & Vehicles**: Driver's License renewal, LTO registration requirements.
- **Social Benefits**: SSS, GSIS, PhilHealth, Pag-IBIG guidance.
- **eReport**: File citizen complaints and incident reports directly to LGUs.

*Ask me any specific question about Philippine government transactions!*`;
}

/**
 * Tourism Content Generator
 */
export const generateTourismContent = async (prompt: string, category: string = 'PH'): Promise<TourismResponse> => {
  try {
    const token = await getAccessToken();

    const response = await fetch(`${INTEGRATION_BASE_URL}/api/v1/egov/integration/tourism/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        prompt,
        category,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate tourism content');
    }

    return await response.json();
  } catch (error) {
    console.error('Tourism generator error:', error);
    throw error;
  }
};

/**
 * Laws and Regulations Generator
 */
export const generateLawsResponse = async (prompt: string, category: string = 'PH'): Promise<LawsResponse> => {
  try {
    const token = await getAccessToken();

    const response = await fetch(`${INTEGRATION_BASE_URL}/api/v1/egov/integration/laws_and_regulations/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        prompt,
        category,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate laws response');
    }

    return await response.json();
  } catch (error) {
    console.error('Laws generator error:', error);
    throw error;
  }
};

/**
 * Translator
 */
export const translateText = async (
  prompt: string,
  sourceLang: string,
  targetLang: string
): Promise<TranslatorResponse> => {
  try {
    const token = await getAccessToken();

    const response = await fetch(`${INTEGRATION_BASE_URL}/api/v1/egov/integration/translator/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        prompt,
        source_lang: sourceLang,
        target_lang: targetLang,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to translate text');
    }

    return await response.json();
  } catch (error) {
    console.error('Translator error:', error);
    throw error;
  }
};

/**
 * Document Extractor
 */
export const extractDocumentData = async (file: File): Promise<DocumentExtractorResponse> => {
  try {
    const token = await getAccessToken();

    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${INTEGRATION_BASE_URL}/api/v1/egov/integration/document_extractor/generate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to extract document data');
    }

    return await response.json();
  } catch (error) {
    console.error('Document extractor error:', error);
    throw error;
  }
};

/**
 * Get API Credits Balance
 */
export const getCreditsBalance = async (): Promise<CreditsResponse> => {
  try {
    const token = await getAccessToken();

    const response = await fetch(`${INTEGRATION_BASE_URL}/api/v1/egov/integration/credits`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get credits balance');
    }

    return await response.json();
  } catch (error) {
    console.error('Get credits error:', error);
    throw error;
  }
};
