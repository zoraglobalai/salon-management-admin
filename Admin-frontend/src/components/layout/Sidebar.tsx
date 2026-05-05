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
  UserPlus,
  UserCheck,
  UserX,
  List,
  LogOut,
  X,
} from 'lucide-react';
import { useAuthStore } from '../../modules/auth/authStore';
import groovmyLogo from '../../assets/groovmy-logo.png';

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

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
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
    <>
      {isOpen ? (
        <div
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      ) : null}

      <aside
        id="sidebar"
        className={`fixed left-0 top-0 z-50 flex h-full w-64 flex-col border-r border-[var(--color-border)] bg-surface transition-transform duration-200 ease-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 border-b border-[var(--color-border)] px-5 py-4">
          <img
            src={groovmyLogo}
            alt="Groomvy logo"
            className="h-10 w-10 shrink-0 rounded-full border border-[var(--color-border)] object-cover"
          />
          <div className="min-w-0">
            <p className="text-sm font-bold leading-none text-[var(--color-text-primary)]">Groomvy</p>
            <p className="mt-0.5 text-[10px] text-[var(--color-text-muted)]">Admin Panel</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ml-auto rounded-full border border-[var(--color-border)] p-2 text-[var(--color-text-muted)] transition hover:bg-[var(--color-surface-raised)] lg:hidden"
            aria-label="Close navigation"
          >
            <X size={14} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {navItems.map((item) => {
            if (item.to) {
              return (
                <NavLink
                  key={item.label}
                  to={item.to}
                  onClick={onClose}
                  className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                >
                  <span className="shrink-0">{item.icon}</span>
                  <span>{item.label}</span>
                </NavLink>
              );
            }

            const isMenuOpen = openMenus.includes(item.label);
            return (
              <div key={item.label}>
                <button
                  onClick={() => toggleMenu(item.label)}
                  className="sidebar-link flex w-full items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="shrink-0">{item.icon}</span>
                    <span>{item.label}</span>
                  </div>
                  {isMenuOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>

                {isMenuOpen && (
                  <div className="slide-in ml-4 mt-1 space-y-1 border-l border-[var(--color-border)] pl-3">
                    {item.children?.map((child) => (
                      <NavLink
                        key={child.to}
                        to={child.to}
                        end
                        onClick={onClose}
                        className={({ isActive }) =>
                          `flex items-center gap-2 rounded px-2 py-1.5 text-xs font-medium transition-colors ${
                            isActive
                              ? 'bg-[var(--color-primary-light)] text-[var(--color-primary)]'
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
          <div className="mb-1 flex items-center gap-3 rounded-lg px-2 py-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)]">
              <span className="text-xs font-bold text-white">
                {user?.name?.charAt(0).toUpperCase() || 'A'}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-[var(--color-text-primary)]">{user?.name || 'Admin'}</p>
              <p className="truncate text-[10px] text-[var(--color-text-muted)]">{user?.email}</p>
            </div>
          </div>
          <button
            id="logout-btn"
            onClick={handleLogout}
            className="btn-ghost w-full justify-start gap-2 py-1.5 text-xs"
          >
            <LogOut size={14} />
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
