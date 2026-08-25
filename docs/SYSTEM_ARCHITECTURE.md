# 🏛️ eBuddy System Architecture & API Integration Documentation

## Executive Summary

**eBuddy** is an AI-powered, multi-agent digital citizen portal engineered to unify and streamline public service delivery in the Philippines. Designed for integration with the Department of Information and Communications Technology (**DICT**) and **eGovPH** ecosystem, eBuddy orchestrates authentication, biometric verification, artificial intelligence, payments, and open budget transparency into a single citizen-centric platform.

---

## 1. High-Level System Architecture

The system is structured into four cohesive layers designed for high security, scalability, and loose coupling:

```mermaid
flowchart TB
    subgraph ClientTier ["📱 1. Client Presentation Tier"]
        direction TB
        UI["Citizen Web App\n(React 18 + TypeScript + Vite)"]
        AIAssistantUI["eBuddy Interactive Chat\n(Markdown & Rich Action Cards)"]
        ServicesUI["Modular Citizen Services Hub\n(Permits, SSS, LTO, DBM, eReport)"]
        FaceSDK["In-Browser Face Liveness SDK\n(Camera Biometric Stream)"]
    end

    subgraph AgentTier ["🤖 2. Agent Orchestration Tier"]
        direction TB
        Router["Intent Router & State Machine"]
        subgraph Agents ["Domain-Specific Sub-Agents"]
            PermitAgent["Business Permit Agent\n(LGU Trece Martires)"]
            SSSAgent["SSS Records Agent\n(PRN & Verification)"]
            ReportAgent["eReport Grievance Agent\n(Geotagged Incidents)"]
            TransAgent["DBM Transparency Agent\n(Budget & Allocations)"]
            DonationAgent["Civic Relief Agent\n(Disaster Campaigns)"]
            LegalAgent["Laws & Ordinances Agent"]
        end
        ContextStore["Citizen Context & Session Provider\n(Locked Profile State)"]
    end

    subgraph GatewayTier ["🛡️ 3. API Gateway & Secure Proxy Tier"]
        direction TB
        Proxy["Vite Dev Server / Vercel Edge Proxy"]
        TokenManager["Token Lifecycle & Quota Tracker"]
        CORSGuard["CORS & Origin Validation"]
    end

    subgraph ExternalTier ["🏛️ 4. DICT & eGovPH API Services Tier"]
        direction TB
        SSO["eGovPH SSO & Auth API\n(OAuth 2.0 / Partner Code)"]
        FaceAPI["DICT Face Liveness API\n(Anti-Spoofing Biometrics)"]
        AICore["eGov AI Core Web Services\n(Assistant, Laws, Tourism, OCR, TTS)"]
        eGovPay["eGovPay Gateway\n(Settlement UUIDs & Checkouts)"]
        DBM["DBM Compass Transparency API\n(SAAODB, NCA, SARO, LGSF)"]
        eVerify["eVerify Identity Service\n(PhilSys ID Validation)"]
        eMessage["eMessage Gateway\n(SMS & Push Alerts)"]
    end

    %% Connections between tiers
    UI --> Router
    AIAssistantUI --> Router
    ServicesUI --> Agents
    FaceSDK -.->|Biometric Stream| Proxy

    Router --> PermitAgent
    Router --> SSSAgent
    Router --> ReportAgent
    Router --> TransAgent
    Router --> DonationAgent
    Router --> LegalAgent

    Agents <--> ContextStore
    Agents --> Proxy

    Proxy --> CORSGuard
    CORSGuard --> TokenManager

    TokenManager -->|/egov-api| SSO
    TokenManager -->|/face-liveness-api| FaceAPI
    TokenManager -->|/integration-api| AICore
    TokenManager -->|/egovpay-api| eGovPay
    TokenManager -->|/compass-api| DBM
    TokenManager -->|/everify-api| eVerify
    TokenManager -->|/emessage-api| eMessage
```

---

## 2. End-to-End Citizen Transaction Flow

Below is the sequence diagram illustrating how eBuddy orchestrates multiple DICT APIs for a typical end-to-end citizen service (e.g. Business Permit or SSS verification with biometric check and payment):

```mermaid
sequenceDiagram
    autonumber
    actor Citizen as 👤 Citizen
    participant App as 📱 eBuddy App
    participant Agent as 🤖 eBuddy AI Agent
    participant Gateway as 🛡️ API Gateway / Proxy
    participant SSO as 🔐 eGovPH SSO
    participant Face as 👁️ Face Liveness API
    participant AICore as 🧠 eGov AI Core WS
    participant Pay as 💳 eGovPay Gateway

    %% Authentication
    Citizen->>App: 1. Launch App & Click "Sign In with eGovPH"
    App->>SSO: 2. Redirect to SSO Portal
    SSO-->>App: 3. Return Authorization Code
    App->>Gateway: 4. POST /egov-api/api/token (Exchange Code)
    Gateway->>SSO: 5. Exchange code + Partner Secret
    SSO-->>App: 6. Return Verified User Profile & Token
    App->>App: 7. Lock Profile in Context (PhilSys ID, Name, Address)

    %% Conversational Interaction
    Citizen->>Agent: 8. "I want to apply for a business permit in Trece Martires"
    Agent->>Gateway: 9. POST /integration-api/.../ai_assistant/generate
    Gateway->>AICore: 10. Pass Context + User Request
    AICore-->>Agent: 11. Return Guided Steps & Dynamic Form Widget
    Agent-->>Citizen: 12. Display Form with Auto-filled Profile Data

    %% Biometric Verification
    Citizen->>App: 13. Perform Face Check
    App->>Gateway: 14. POST /face-liveness-api/session
    Gateway->>Face: 15. Real-time liveness & anti-spoofing check
    Face-->>App: 16. Verification Result (PASSED)

    %% Payment Processing
    Citizen->>App: 17. Confirm Application & Settle Fee
    App->>Gateway: 18. POST /egovpay-api/checkout (Settlement UUID)
    Gateway->>Pay: 19. Generate Payment Transaction Voucher
    Pay-->>App: 20. Return Checkout URL & PRN
    App-->>Citizen: 21. Open Secure eGovPay Portal

    %% Callback & Receipt
    Citizen->>Pay: 22. Complete Payment (eWallet / Card / Bank)
    Pay-->>App: 23. Redirect to /payment-return with Transaction Reference
    App->>Citizen: 24. Issue Digital Official Receipt & Update Activity Log
```

---

## 3. Detailed eGov API Integration Touchpoints

| Gateway Proxy Path | Remote Host Endpoint | Protocol | Purpose & Data Scope |
| :--- | :--- | :---: | :--- |
| `/egov-api` | `https://hackathon-sso.e.gov.ph` | `HTTPS` | **eGovPH Single Sign-On:** Exchanges authorization codes for citizen tokens; fetches verified personal records (Name, Birthdate, Address, PhilSys ID). |
| `/face-liveness-api` | `https://hackathon-face-liveness-api.e.gov.ph` | `HTTPS` | **DICT Biometric Face Liveness:** Provides active anti-spoofing and face verification for high-security transactions. |
| `/integration-api` | `https://egov-ai-core-ws.oueg.info` | `HTTPS` | **eGov AI Core Web Services:**<br>• `/ai_assistant/generate`: Contextual citizen chat.<br>• `/laws_and_regulations/generate`: Legal knowledge base.<br>• `/tourism/generate`: Travel & cultural inquiries.<br>• `/translator/generate`: Filipino transliteration.<br>• `/document_extractor/generate`: ID OCR parsing.<br>• `/speech_maker/generate`: Voice synthesis.<br>• `/credits`: Real-time API allowance tracking. |
| `/egovpay-api` | `https://egovpay-pgi-ws-dev.oueg.info` | `HTTPS` | **eGovPay Gateway:** Settlement template routing, transaction creation, QRPh/PRN voucher generation, payment callbacks. |
| `/compass-api` | `https://dbm-ws.oueg.info` | `HTTPS` | **DBM Budget Transparency (Compass):** Queries live fiscal records (SAAODB, NCA, SARO, and LGSF allocations) for local and national expenditures. |
| `/everify-api` | `https://hackathon-everify-api.e.gov.ph` | `HTTPS` | **eVerify PhilSys Service:** Direct citizen verification against Philippine National ID registry. |
| `/emessage-api` | `https://ws-message.e.gov.ph` | `HTTPS` | **eMessage Notifications:** Dispatches SMS receipts, application progress updates, and civic alerts. |

---

## 4. Security, Privacy & Reliability Architecture

1. **Zero Client-Side Secret Leakage:**
   - Partner secrets and private credentials are never exposed directly to the public web browser. All requests are routed through the configured proxy gateway (`/egov-api`, `/integration-api`, `/face-liveness-api`, etc.).
2. **Ephemeral Biometric Frame Handling:**
   - The Face Liveness camera stream is evaluated strictly in-memory. No raw citizen video frames or biometric face encodings are stored persistently on the client or local database.
3. **Profile Integrity & Anti-Tampering:**
   - Citizen identity fields (Full Name, Address, PhilSys UniqID) are locked upon eGovPH SSO authentication and cannot be arbitrarily modified during transaction submissions.
4. **Resilient Rate-Limiting & Credit Monitoring:**
   - eBuddy continuously monitors token expiration and remaining credit counts via `/api/v1/egov/integration/credits`, providing graceful fallback and caching when API thresholds are approached.
