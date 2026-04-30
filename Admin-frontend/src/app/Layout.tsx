import React from 'react';
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

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <TopNavbar title={title} />
      <main
        style={{
          marginLeft: 'var(--sidebar-width)',
          paddingTop: 'var(--navbar-height)',
          minHeight: '100vh',
        }}
        className="p-6"
      >
        <div className="fade-in">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;
