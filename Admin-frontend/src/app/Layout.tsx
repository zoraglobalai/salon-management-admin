import React, { useEffect, useState } from 'react';
import Sidebar from '../components/layout/Sidebar';
import TopNavbar from '../components/layout/TopNavbar';
import { Outlet, useLocation } from 'react-router-dom';

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/users': 'All Users',
  '/users/active': 'Active Users',
  '/users/trial': 'Trial Users',
  '/users/expired': 'Expired Users',
  '/users/create': 'Create Owner',
  '/subscriptions': 'Subscriptions',
  '/revenue': 'Revenue',
  '/trials': 'Trial Management',
  '/support': 'Support Tickets',
  '/logs': 'Logs & Security',
};

const Layout: React.FC = () => {
  const { pathname } = useLocation();
  const title = pageTitles[pathname] || 'Salon Growth Engine';
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <TopNavbar title={title} onOpenSidebar={() => setIsSidebarOpen(true)} />
      <main className="min-h-screen px-4 pb-4 pt-[76px] sm:px-6 sm:pb-6 sm:pt-[84px] lg:ml-64">
        <div className="fade-in">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;
