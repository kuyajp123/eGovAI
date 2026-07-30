import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import EBuddyMascot from './EBuddyMascot'

const Header = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated } = useAuth()

  const showNotifications = isAuthenticated && !['/', '/egovph/sso'].includes(location.pathname)

  return (
    <header className="bg-surface flex justify-between items-center px-4 md:px-8 h-touch-target md:h-16 w-full z-50 fixed top-0 border-b border-outline-variant/10 md:border-outline-variant/20 shadow-sm md:shadow-md transition-all">
      <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate(isAuthenticated ? '/home' : '/')}>
        <div className="w-9 h-9 rounded-full bg-white border border-primary/20 shadow-sm overflow-hidden">
          <EBuddyMascot alt="" className="w-full h-full p-0.5" />
        </div>
        <h1 className="font-headline-lg-mobile text-[20px] font-bold text-primary">eBuddy</h1>
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
