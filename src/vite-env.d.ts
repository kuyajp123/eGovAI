/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_BASE_URL: string
  readonly VITE_EGOV_SSO_URL: string
  readonly VITE_API_BASE_URL: string
  readonly VITE_EGOV_PARTNER_CODE: string
  readonly VITE_EGOV_PARTNER_SECRET: string
  readonly DEV: boolean
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
