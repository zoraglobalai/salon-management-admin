import React from 'react';
import { Bell, Search } from 'lucide-react';
import { useAuthStore } from '../../modules/auth/authStore';

interface TopNavbarProps {
  title?: string;
}

const TopNavbar: React.FC<TopNavbarProps> = ({ title }) => {
  const { user } = useAuthStore();

  return (
    <header
      id="topnav"
      className="fixed top-0 right-0 bg-surface border-b border-[var(--color-border)] flex items-center justify-between px-6"
      style={{
        left: 'var(--sidebar-width)',
        height: 'var(--navbar-height)',
        zIndex: 30,
      }}
    >
      <div className="flex items-center gap-4">
        {title && (
          <h1 className="text-sm font-semibold text-[var(--color-text-primary)]">{title}</h1>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* Search */}
        <button className="btn-ghost p-2" aria-label="Search">
          <Search size={16} />
        </button>

        {/* Notifications */}
        <button className="btn-ghost p-2 relative" aria-label="Notifications">
          <Bell size={16} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full"></span>
        </button>

        {/* Avatar */}
        <div className="w-7 h-7 rounded-full bg-[var(--color-primary)] flex items-center justify-center ml-1">
          <span className="text-white text-xs font-bold">
            {user?.name?.charAt(0).toUpperCase() || 'A'}
          </span>
        </div>
      </div>
    </header>
  );
};

export default TopNavbar;
