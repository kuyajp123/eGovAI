import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // eGovPH SSO — login, token exchange, profile
      '/egov-api': {
        target: 'https://hackathon-sso.e.gov.ph',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/egov-api/, ''),
        secure: true,
      },
      // eGov AI Core — chat completions
      '/integration-api': {
        target: 'https://egov-ai-core-ws.oueg.info',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/integration-api/, ''),
        secure: true,
      },
      // eVerify — identity verification (PhilSys)
      '/everify-api': {
        target: 'https://hackathon-everify-api.e.gov.ph',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/everify-api/, ''),
        secure: true,
      },
      // eMessage — SMS / notification delivery
      '/emessage-api': {
        target: 'https://ws-message.e.gov.ph',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/emessage-api/, ''),
        secure: true,
      },
      // eGovPay — government payment gateway
      '/egovpay-api': {
        target: 'https://egovpay-pgi-ws-dev.oueg.info',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/egovpay-api/, ''),
        secure: true,
      },
      // Face Liveness REST API (session creation + result retrieval)
      '/face-liveness-api': {
        target: 'https://hackathon-face-liveness-api.e.gov.ph',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/face-liveness-api/, ''),
        secure: true,
      },
      // DBM Transparency (Compass API) — SAAODB, NCA, SARO, LGSF records
      '/compass-api': {
        target: 'https://dbm-ws.oueg.info',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/compass-api/, ''),
        secure: true,
      },
    },
  },
})
