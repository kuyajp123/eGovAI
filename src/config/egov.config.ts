export const EGOV_CONFIG = {
  // Your application's base URL
  baseUrl: import.meta.env.VITE_APP_BASE_URL || 'https://govassistant.example.com',
  
  // eGovPH SSO endpoint
  egovSsoUrl: import.meta.env.VITE_EGOV_SSO_URL || 'https://sso.egovph.gov.ph',
  
  // Your SSO callback endpoint
  ssoCallbackPath: '/egovph/sso',
  
  // API endpoints
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || '/api',
  
  // Session configuration
  sessionTimeout: 30 * 60 * 1000, // 30 minutes
  
  // Required for SSL
  requireSSL: import.meta.env.PROD,
} as const

export const getFullSsoCallbackUrl = () => {
  return `${EGOV_CONFIG.baseUrl}${EGOV_CONFIG.ssoCallbackPath}`
}
