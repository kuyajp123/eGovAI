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
    { path: '/ereport', label: 'eReport', icon: 'campaign' },
    { path: '/activity', label: 'Activity', icon: 'history' },
    { path: '/profile', label: 'Profile', icon: 'person' }
  ]

  return (
    <nav className="fixed bottom-0 md:top-0 md:left-0 w-full md:w-64 md:h-screen md:flex-col md:justify-start md:pt-24 md:border-r md:border-outline-variant/20 md:bg-surface md:shadow-none z-40 flex justify-around items-center px-4 py-2 md:px-4 md:py-6 bg-surface-container rounded-t-xl md:rounded-none shadow-[0_-2px_10px_rgba(0,0,0,0.05)] md:shadow-none transition-all">
      {navItems.map(item => {
      const isActive = item.path === '/services'
        ? location.pathname.startsWith('/services')
        : location.pathname === item.path
        return (
          <Link
            key={item.path}
            to={item.path}
            className={`flex flex-col md:flex-row md:justify-start items-center md:gap-4 md:w-full md:mb-1 px-4 py-1 md:px-4 md:py-3 active:scale-90 md:active:scale-95 transition-all ${
              isActive ? 'bg-primary-container text-on-primary-container rounded-full md:rounded-xl' : 'text-on-surface-variant hover:bg-surface-variant/50 md:rounded-xl'
            }`}
          >
            <span 
              className="material-symbols-outlined" 
              style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
            >
              {item.icon}
            </span>
            <span className="text-[10px] md:text-sm font-medium">{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}

export default BottomNav
