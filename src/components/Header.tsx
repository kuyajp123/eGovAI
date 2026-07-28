import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const Header = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated } = useAuth()

  const showNotifications = isAuthenticated && !['/', '/egovph/sso', '/test-sso'].includes(location.pathname)

  return (
    <header className="bg-surface flex justify-between items-center px-margin-mobile h-touch-target w-full z-50 fixed top-0 border-b border-outline-variant/10">
      <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate(isAuthenticated ? '/home' : '/')}>
        <span className="material-symbols-outlined text-primary">account_balance</span>
        <h1 className="font-headline-lg-mobile text-[20px] font-bold text-primary">GovAssistant</h1>
      </div>
      <div className="flex items-center gap-4">
        {showNotifications && (
          <button 
            onClick={() => navigate('/notifications')} 
            className="hover:bg-surface-container-high p-2 rounded-full active:scale-95 transition-transform duration-100"
          >
            <span className="material-symbols-outlined text-on-surface-variant">notifications</span>
          </button>
        )}
      </div>
    </header>
  )
}

export default Header
