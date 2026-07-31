# GovAssistant - Digital Citizen Portal

A modern, accessible digital portal for government services built with React, TypeScript, and Tailwind CSS. Integrated with **eGovPH Single Sign-On (SSO)** for secure, seamless authentication.

## Features

- 🏛️ Government service discovery and management
- 🔐 **eGovPH SSO Integration** - Secure authentication via eGovPH
- 📱 Mobile-first responsive design
- ♿ Accessibility-compliant UI components
- 👤 Profile management locked to eGovPH
- 📄 Document upload and verification
- 💳 Payment processing interface
- 📊 Application tracking and history
- 🔒 SSL-secured data transmission

## Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **React Router 6** - Routing
- **Tailwind CSS** - Styling
- **Vite** - Build tool
- **Material Symbols** - Icons

## Getting Started

### Prerequisites

- Node.js 16+ and npm/yarn/pnpm

### Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Start the development server:

```bash
npm run dev
```

4. Open your browser to `http://localhost:5173`

## Available Scripts

- `npm run dev` - Start development server
- `npm run echain:generate-wallet` - Create a dedicated test-only eGovChain signer in `.env.local`
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Project Structure

```
src/
├── components/        # Reusable components
│   ├── Header.tsx
│   └── BottomNav.tsx
├── pages/            # Page components
│   ├── WelcomePage.tsx
│   ├── Dashboard.tsx
│   ├── IDRegistration.tsx
│   ├── DocumentUpload.tsx
│   ├── BiometricPage.tsx
│   ├── ReviewPage.tsx
│   ├── PaymentPage.tsx
│   ├── SuccessPage.tsx
│   ├── ActivityPage.tsx
│   ├── ProfilePage.tsx
│   └── NotificationsPage.tsx
├── App.tsx           # Main app component
├── main.tsx          # Entry point
└── index.css         # Global styles
```

## License

MIT

## eGovPH SSO Integration

This application is integrated with eGovPH Single Sign-On (SSO) for secure authentication.

### Setup Instructions

1. **Configure Environment Variables**

Create a `.env` file in the project root:

```bash
VITE_APP_BASE_URL=https://your-domain.com
VITE_EGOV_SSO_URL=https://sso.egovph.gov.ph
VITE_API_BASE_URL=https://your-domain.com/api
```

2. **Register with eGovPH**

- Register your application with eGovPH
- Provide your SSO callback URL: `https://your-domain.com/egovph/sso`
- Obtain necessary credentials

3. **SSL Certificate**

- Ensure your production environment has a valid SSL certificate
- SSL is mandatory for eGovPH SSO integration

### SSO Features

✅ **Auto-Login**: Users authenticated automatically via eGovPH  
✅ **Profile Locking**: User profiles managed exclusively through eGovPH  
✅ **User Matching**: Existing users matched by uniqid or personal details  
✅ **New User Registration**: Automatic registration for first-time users  
✅ **Session Management**: 30-minute secure sessions  
✅ **Mobile Optimized**: Fully responsive on all devices

### Documentation

Detailed SSO integration documentation: [docs/EGOV_SSO_INTEGRATION.md](docs/EGOV_SSO_INTEGRATION.md)

## eGovChain donation anchoring

Paid donations retain their full append-only SHA-256 ledger in the current browser. After the eGovPay API verifies `PAID` or `SUCCESS`, the server re-verifies the payment and sends only the 32-byte confirmation-block hash to eGovChain in a signed, zero-value transaction. Donor identity, campaign details, dedication, and payment details are not placed in the transaction input.

1. Confirm with the eGovChain administrator that a self-generated signer is allowed on chain ID `13371`.
2. Generate a dedicated prototype signer locally:

```bash
npm run echain:generate-wallet
```

The command writes the private key to ignored `.env.local` without printing it. Never use a personal wallet and never add `VITE_` to the private-key variable.

3. Copy these server-only variables to Vercel Project Settings → Environment Variables:

```env
ECHAIN_RPC_URL=https://hackathon-blockchain.e.gov.ph
ECHAIN_EXPLORER_URL=https://hackathon-explorer.e.gov.ph
ECHAIN_EXPLORER_TX_URL_TEMPLATE=https://hackathon-explorer.e.gov.ph/tx/{txHash}
ECHAIN_CHAIN_ID=13371
ECHAIN_PRIVATE_KEY=0x...
EGOVPAY_API_KEY=test_...
EGOVPAY_API_URL=https://egovpay-pgi-ws-dev.oueg.info
```

4. Redeploy the Vercel project. During local development, `npm run dev` exposes equivalent `/api/echain/*` middleware on the Vite server. Production continues to use the Vercel Functions.

Anchoring failures do not change a donation's verified payment status or corrupt its local ledger. The Donations module shows the submitted transaction, receipt state, explorer link, and a retry action.

