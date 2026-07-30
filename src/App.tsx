import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import Header from './components/Header'
import BottomNav from './components/BottomNav'
import ProtectedRoute from './components/ProtectedRoute'
import WelcomePage from './pages/WelcomePage'
import SSOCallbackPage from './pages/SSOCallbackPage'
import AIChatHome from './pages/AIChatHome'
import Dashboard from './pages/Dashboard'
import IDRegistration from './pages/IDRegistration'
import DocumentUpload from './pages/DocumentUpload'
import BiometricPage from './pages/BiometricPage'
import FaceLivenessPage from './pages/FaceLivenessPage'
import ReviewPage from './pages/ReviewPage'
import PaymentPage from './pages/PaymentPage'
import SuccessPage from './pages/SuccessPage'
import ActivityPage from './pages/ActivityPage'
import ProfilePage from './pages/ProfilePage'
import NotificationsPage from './pages/NotificationsPage'
import EReportPage from './pages/EReportPage'
import BusinessServicesPage from './pages/BusinessServicesPage'
import DriversLicenseRenewalPage from './pages/DriversLicenseRenewalPage'
import SSSServicesPage from './pages/SSSServicesPage'
import LawsPage from './pages/LawsPage'
import PaymentReturnPage from './pages/PaymentReturnPage'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Header />
        <Routes>
          <Route path="/" element={<WelcomePage />} />
          <Route path="/egovph/sso" element={<SSOCallbackPage />} />
          <Route path="/home" element={<ProtectedRoute><AIChatHome /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/services" element={<ProtectedRoute><BusinessServicesPage /></ProtectedRoute>} />
          <Route path="/services/business" element={<ProtectedRoute><BusinessServicesPage /></ProtectedRoute>} />
          <Route path="/services/lto/license-renewal" element={<ProtectedRoute><DriversLicenseRenewalPage /></ProtectedRoute>} />
          <Route path="/services/sss" element={<ProtectedRoute><SSSServicesPage /></ProtectedRoute>} />
          <Route path="/services/laws" element={<ProtectedRoute><LawsPage /></ProtectedRoute>} />
          <Route path="/payment-return" element={<ProtectedRoute><PaymentReturnPage /></ProtectedRoute>} />
          <Route path="/payment-success" element={<ProtectedRoute><PaymentReturnPage /></ProtectedRoute>} />
          <Route path="/payment-callback" element={<ProtectedRoute><PaymentReturnPage /></ProtectedRoute>} />
          <Route path="/ereport" element={<ProtectedRoute><EReportPage /></ProtectedRoute>} />
          <Route path="/report" element={<ProtectedRoute><EReportPage /></ProtectedRoute>} />
          <Route path="/activity" element={<ProtectedRoute><ActivityPage /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
          <Route path="/id-registration" element={<ProtectedRoute><IDRegistration /></ProtectedRoute>} />
          <Route path="/document-upload" element={<ProtectedRoute><DocumentUpload /></ProtectedRoute>} />
          <Route path="/biometric" element={<ProtectedRoute><BiometricPage /></ProtectedRoute>} />
          <Route path="/face-liveness" element={<ProtectedRoute><FaceLivenessPage /></ProtectedRoute>} />
          <Route path="/review" element={<ProtectedRoute><ReviewPage /></ProtectedRoute>} />
          <Route path="/payment" element={<ProtectedRoute><PaymentPage /></ProtectedRoute>} />
          <Route path="/success" element={<ProtectedRoute><SuccessPage /></ProtectedRoute>} />
        </Routes>
        <BottomNav />
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
