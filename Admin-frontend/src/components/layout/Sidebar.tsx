import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  DollarSign,
  FlaskConical,
  HeadphonesIcon,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
  Scissors,
  UserPlus,
  UserCheck,
  UserX,
  List,
  LogOut,
} from 'lucide-react';
import { useAuthStore } from '../../modules/auth/authStore';

interface NavItem {
  label: string;
  icon: React.ReactNode;
  to?: string;
  children?: { label: string; to: string; icon?: React.ReactNode }[];
}

const navItems: NavItem[] = [
  { label: 'Dashboard', icon: <LayoutDashboard size={18} />, to: '/dashboard' },
  {
    label: 'Users',
    icon: <Users size={18} />,
    children: [
      { label: 'All Users', to: '/users', icon: <List size={14} /> },
      { label: 'Active Users', to: '/users/active', icon: <UserCheck size={14} /> },
      { label: 'Trial Users', to: '/users/trial', icon: <FlaskConical size={14} /> },
      { label: 'Expired Users', to: '/users/expired', icon: <UserX size={14} /> },
      { label: 'Create Owner', to: '/users/create', icon: <UserPlus size={14} /> },
    ],
  },
  { label: 'Subscriptions', icon: <CreditCard size={18} />, to: '/subscriptions' },
  { label: 'Revenue', icon: <DollarSign size={18} />, to: '/revenue' },
  { label: 'Trials', icon: <FlaskConical size={18} />, to: '/trials' },
  { label: 'Support', icon: <HeadphonesIcon size={18} />, to: '/support' },
  { label: 'Logs & Security', icon: <ShieldCheck size={18} />, to: '/logs' },
];

const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [openMenus, setOpenMenus] = useState<string[]>(['Users']);

  const toggleMenu = (label: string) => {
    setOpenMenus((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]
    );
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside
      id="sidebar"
      className="fixed top-0 left-0 h-full bg-surface border-r border-[var(--color-border)] flex flex-col"
      style={{ width: 'var(--sidebar-width)', zIndex: 40 }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--color-border)]">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--color-primary)]">
          <Scissors size={16} className="text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-[var(--color-text-primary)] leading-none">Salon Growth</p>
          <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">Admin Panel</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navItems.map((item) => {
          if (item.to) {
            return (
              <NavLink
                key={item.label}
                to={item.to}
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              >
                <span className="shrink-0">{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            );
          }

          const isOpen = openMenus.includes(item.label);
          return (
            <div key={item.label}>
              <button
                onClick={() => toggleMenu(item.label)}
                className="sidebar-link w-full flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <span className="shrink-0">{item.icon}</span>
                  <span>{item.label}</span>
                </div>
                {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>

              {isOpen && (
                <div className="ml-4 mt-1 space-y-1 border-l border-[var(--color-border)] pl-3 slide-in">
                  {item.children?.map((child) => (
                    <NavLink
                      key={child.to}
                      to={child.to}
                      end
                      className={({ isActive }) =>
                        `flex items-center gap-2 px-2 py-1.5 rounded text-xs font-medium transition-colors ${
                          isActive
                            ? 'text-[var(--color-primary)] bg-[var(--color-primary-light)]'
                            : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
                        }`
                      }
                    >
                      {child.icon && <span>{child.icon}</span>}
                      {child.label}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* User Footer */}
      <div className="border-t border-[var(--color-border)] p-3">
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg mb-1">
          <div className="w-7 h-7 rounded-full bg-[var(--color-primary)] flex items-center justify-center shrink-0">
            <span className="text-white text-xs font-bold">
              {user?.name?.charAt(0).toUpperCase() || 'A'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-[var(--color-text-primary)] truncate">{user?.name || 'Admin'}</p>
            <p className="text-[10px] text-[var(--color-text-muted)] truncate">{user?.email}</p>
          </div>
        </div>
        <button
          id="logout-btn"
          onClick={handleLogout}
          className="btn-ghost w-full text-xs justify-start gap-2 py-1.5"
        >
          <LogOut size={14} />
          Sign out
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
