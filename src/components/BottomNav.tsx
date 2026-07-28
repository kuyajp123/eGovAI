import { Link, useLocation } from 'react-router-dom'

interface NavItem {
  path: string
  label: string
  icon: string
}

const BottomNav = () => {
  const location = useLocation()
  const hidePaths = ['/', '/id-registration', '/document-upload', '/biometric', '/review', '/success', '/payment']
  
  if (hidePaths.includes(location.pathname)) return null

  const navItems: NavItem[] = [
    { path: '/home', label: 'Home', icon: 'home' },
    { path: '/services', label: 'Services', icon: 'account_balance_wallet' },
    { path: '/activity', label: 'Activity', icon: 'history' },
    { path: '/profile', label: 'Profile', icon: 'person' }
  ]

  return (
    <nav className="fixed bottom-0 w-full z-50 flex justify-around items-center px-4 py-2 bg-surface-container rounded-t-xl shadow-md">
      {navItems.map(item => {
        const isActive = location.pathname === item.path
        return (
          <Link
            key={item.path}
            to={item.path}
            className={`flex flex-col items-center justify-center px-4 py-1 active:scale-90 transition-all ${
              isActive ? 'bg-primary-container text-on-primary-container rounded-full' : 'text-on-surface-variant'
            }`}
          >
            <span 
              className="material-symbols-outlined" 
              style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
            >
              {item.icon}
            </span>
            <span className="text-[10px] font-medium">{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}

export default BottomNav
