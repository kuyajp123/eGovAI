export interface SandboxAccount {
  username: string
  name: string
  otp: string
  pin: string
}

export const EGOV_SANDBOX_ACCOUNTS: SandboxAccount[] = [
  { username: '+639090000001', name: 'JOSE CRUZ DELA PEÑA III', otp: '123456', pin: '000000' },
  { username: '+639090000002', name: 'PEDRO DELA CRUZ II', otp: '123456', pin: '000000' },
  { username: '+639090000003', name: 'JOHN GARCIA REYES JR', otp: '123456', pin: '000000' },
  { username: '+639090000004', name: 'JOSIELYN RAMOS MENDOZA', otp: '123456', pin: '000000' },
  { username: '+639090000005', name: 'RONALYN SANTOS FLORES', otp: '123456', pin: '000000' },
]

export const EGOV_CONFIG = {
  // Your application's base URL
  baseUrl: import.meta.env.VITE_APP_BASE_URL || 'http://localhost:5173',
  
  // eGovPH SSO Gateway Base URL
  egovSsoUrl: import.meta.env.VITE_EGOV_SSO_URL || 'https://platforms-api.e.gov.ph/egov-sso',

  // Partner credentials
  partnerCode: import.meta.env.VITE_EGOV_PARTNER_CODE || 'a101db722afd40a2b33d39ed14b274e5',
  partnerSecret: import.meta.env.VITE_EGOV_PARTNER_SECRET || 'bfacc31fe03042ccbd843ffd44b3e431',
  
  // Your SSO callback endpoint (Mode A)
  ssoCallbackPath: '/egovph/sso',
  
  // API endpoints
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'https://platforms-api.e.gov.ph/egov-sso/api/partner/sso_authentication',
  
  // Session configuration
  sessionTimeout: 30 * 60 * 1000, // 30 minutes
  
  // Required for SSL
  requireSSL: import.meta.env.PROD,
} as const

export const getFullSsoCallbackUrl = () => {
  return `${EGOV_CONFIG.baseUrl}${EGOV_CONFIG.ssoCallbackPath}`
}
