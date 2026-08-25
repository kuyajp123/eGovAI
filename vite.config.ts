import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { eChainLocalApiPlugin } from './server/eChainVitePlugin'

export default defineConfig(({ mode }) => {
  // Vite exposes only VITE_* values to browser code. Loading all values here
  // makes server-only ECHAIN_* secrets available solely to the local middleware.
  const localEnvironment = loadEnv(mode, process.cwd(), '')
  Object.entries(localEnvironment).forEach(([key, value]) => {
    process.env[key] = value
  })

  return {
    plugins: [react(), eChainLocalApiPlugin()],
    server: {
      proxy: {
      // eGovPH SSO — login, token exchange, profile
      '/egov-api': {
        target: 'https://platforms-api.e.gov.ph/egov-sso',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/egov-api/, ''),
        secure: true,
      },
      // eGov AI Core — chat completions, tourism, speech, laws, translator
      '/integration-api': {
        target: 'https://platforms-api.e.gov.ph/egov-ai',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/integration-api/, ''),
        secure: true,
      },
      // eVerify — identity verification (PhilSys)
      '/everify-api': {
        target: 'https://platforms-api.e.gov.ph/everify',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/everify-api/, ''),
        secure: true,
      },
      // eMessage — SMS / notification delivery
      '/emessage-api': {
        target: 'https://platforms-api.e.gov.ph/emessage',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/emessage-api/, ''),
        secure: true,
      },
      // eGovPay — government payment gateway
      '/egovpay-api': {
        target: 'https://platforms-api.e.gov.ph/egovpay',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/egovpay-api/, ''),
        secure: true,
      },
      // Face Liveness REST API (session creation + result retrieval)
      '/face-liveness-api': {
        target: 'https://platforms-api.e.gov.ph/face-liveness',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/face-liveness-api/, ''),
        secure: true,
      },
      // eReport — citizen incident & complaint reporting
      '/ereport-api': {
        target: 'https://platforms-api.e.gov.ph/ereport',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ereport-api/, ''),
        secure: true,
      },
      // DBM Transparency (Compass API) — SAAODB, NCA, SARO, LGSF records
      '/compass-api': {
        target: 'https://platforms-api.e.gov.ph/compass',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/compass-api/, ''),
        secure: true,
      },
      },
    },
  }
})
