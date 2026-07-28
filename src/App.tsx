import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import Header from './components/Header'
import BottomNav from './components/BottomNav'
import DevTestButton from './components/DevTestButton'
import ProtectedRoute from './components/ProtectedRoute'
import WelcomePage from './pages/WelcomePage'
import SSOCallbackPage from './pages/SSOCallbackPage'
import TestSSOPage from './pages/TestSSOPage'
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

function App() {
  const isDevelopment = import.meta.env.DEV

  return (
    <AuthProvider>
      <BrowserRouter>
        <Header />
        <Routes>
          <Route path="/" element={<WelcomePage />} />
          <Route path="/egovph/sso" element={<SSOCallbackPage />} />
          {isDevelopment && <Route path="/test-sso" element={<TestSSOPage />} />}
          <Route path="/home" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/services" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
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
        <DevTestButton />
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
