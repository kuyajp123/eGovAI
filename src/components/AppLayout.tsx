import { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import Header from './Header';
import BottomNav from './BottomNav';

interface AppLayoutProps {
  children: ReactNode;
}

const AppLayout = ({ children }: AppLayoutProps) => {
  const location = useLocation();
  const hidePaths = ['/', '/id-registration', '/document-upload', '/biometric', '/review', '/success', '/payment'];
  const hideSidebar = hidePaths.includes(location.pathname);

  return (
    <>
      <Header />
      <main className={`pt-touch-target md:pt-16 min-h-screen transition-all ${hideSidebar ? '' : 'pb-20 md:pb-0 md:pl-64'}`}>
        {children}
      </main>
      <BottomNav />
    </>
  );
};

export default AppLayout;
