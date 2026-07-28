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

