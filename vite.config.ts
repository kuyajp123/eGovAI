import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/egov-api': {
        target: 'https://hackathon-sso.e.gov.ph',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/egov-api/, ''),
        secure: true,
      },
      '/integration-api': {
        target: 'https://egov-ai-core-ws.oueg.info',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/integration-api/, ''),
        secure: true,
      },
      '/everify-api': {
        target: 'https://hackathon-sso.e.gov.ph',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/everify-api/, ''),
        secure: false,
      },
      '/emessage-api': {
        target: 'https://hackathon-sso.e.gov.ph',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/emessage-api/, ''),
        secure: false,
      },
      '/egovpay-api': {
        target: 'https://hackathon-sso.e.gov.ph',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/egovpay-api/, ''),
        secure: false,
      },
    },
  },
})
