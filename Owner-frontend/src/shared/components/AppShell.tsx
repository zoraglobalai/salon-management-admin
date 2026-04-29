import { useState, useEffect, useRef, type PropsWithChildren } from "react";
import { NavLink } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import { CircleHelp, Crown, LogOut, Moon, Settings2, UserCircle2 } from "lucide-react";
import { useAuth } from "../../modules/auth/hooks/useAuth";
import { fetchMe } from "../../core/api";
import { ProfileDetailsModal } from "./ProfileDetailsModal";
import { SupportTicketDrawer } from "./SupportTicketDrawer";
import { SubscriptionPlansModal } from "./SubscriptionPlansModal";
import { ThemeModal } from "./ThemeModal";
import { useDashboardTheme } from "../theme/ThemeProvider";

type NavigationItem = {
  label: string;
  to: string;
  icon: LucideIcon;
};

type AppShellProps = PropsWithChildren<{
  title: string;
  subtitle: string;
  navigation: NavigationItem[];
  ownerLocations?: { id: string; name: string; city?: string }[];
  totalManagers?: number;
  lowStockCount?: number;
  profileDetails?: {
    role: "OWNER" | "INDEPENDENT_OWNER" | "MANAGER" | "SUPER_ADMIN";
    fullName: string;
    email: string;
    phone: string;
    shopName: string;
  } | null;
  onRefreshProfile?: () => Promise<void> | void;
}>;

export function AppShell({
  title,
  subtitle,
  navigation,
  ownerLocations,
  totalManagers,
  lowStockCount = 0,
  profileDetails = null,
  onRefreshProfile,
  children,
}: AppShellProps) {
  const { user, logout, updateUser } = useAuth();
  const { theme } = useDashboardTheme();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isSupportDrawerOpen, setIsSupportDrawerOpen] = useState(false);
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const isManager = user?.role === 'MANAGER';
  const canOpenHelpdesk = user?.role === "OWNER" || user?.role === "INDEPENDENT_OWNER";
  const isMonitorView = !isManager && (
    user?.mode === 'MONITOR' ||
    (totalManagers !== undefined && totalManagers > 0) ||
    ((ownerLocations?.length || 0) > 1)
  );

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  // Poll server to verify session validity
  useEffect(() => {
    if (!user) return;
    
    const intervalId = setInterval(() => {
      fetchMe().catch(() => {
        // The core/api.ts interceptor handles the 401 redirect automatically
      });
    }, 2000); // 2 seconds

    return () => clearInterval(intervalId);
  }, [user]);

  useEffect(() => {
    if (!isProfileMenuOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!profileMenuRef.current?.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsProfileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isProfileMenuOpen]);

  const menuItems = [
    { label: "Profile", icon: UserCircle2 },
    { label: "Theme", icon: Moon },
    ...(!isManager ? [{ label: "Upgrade Plans", icon: Crown }] : []),
    ...(canOpenHelpdesk ? [{ label: "Helpdesk", icon: CircleHelp }] : []),
  ];

  const userInitial = user?.name?.slice(0, 1)?.toUpperCase() || "O";
  const handleOpenProfile = () => {
    setIsProfileMenuOpen(false);
    setIsProfileModalOpen(true);
  };

  const handleOpenHelpdesk = () => {
    setIsProfileMenuOpen(false);
    setIsSupportDrawerOpen(true);
  };

  const handleOpenTheme = () => {
    setIsProfileMenuOpen(false);
    setIsThemeModalOpen(true);
  };

  const handleOpenSubscriptions = () => {
    setIsProfileMenuOpen(false);
    setIsSubscriptionModalOpen(true);
  };

  return (
    <div className={`flex min-h-screen flex-col gap-3 p-3 md:grid md:grid-cols-[274px_1fr] md:p-3 theme-${theme}`}>
      <ProfileDetailsModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        profile={profileDetails}
        onSaved={async () => {
          await onRefreshProfile?.();
        }}
        onUserUpdated={updateUser}
      />
      <SupportTicketDrawer
        isOpen={isSupportDrawerOpen}
        onClose={() => setIsSupportDrawerOpen(false)}
        shopName={profileDetails?.shopName}
      />
      <ThemeModal
        isOpen={isThemeModalOpen}
        onClose={() => setIsThemeModalOpen(false)}
      />
      <SubscriptionPlansModal
        isOpen={isSubscriptionModalOpen}
        onClose={() => setIsSubscriptionModalOpen(false)}
      />

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        sidebar fixed inset-y-0 left-0 z-50 w-[274px] transform transition-transform duration-200 ease-in-out bg-[var(--panel)] md:relative md:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex justify-between items-center px-2 py-4">
          <div className="brand-block border-b-0 pb-0">
            <div className="brand-badge">SG</div>
            <div>
              <div className="brand-title">Salon Growth</div>
              <div className="brand-subtitle">{subtitle}</div>
            </div>
          </div>
          <button className="md:hidden p-2 text-gray-500" onClick={() => setIsSidebarOpen(false)}>
            ✕
          </button>
        </div>

        <nav className="nav-list overflow-y-auto">
          {navigation.map((item) => {
            const Icon = item.icon;

            return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setIsSidebarOpen(false)}
              className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
            >
              <span className="nav-icon">
                <Icon size={18} />
              </span>
              <span className="flex items-center gap-2">
                <span>{item.label}</span>
                {item.to === "/dashboard/inventory" && lowStockCount > 0 ? (
                  <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {lowStockCount}
                  </span>
                ) : null}
              </span>
            </NavLink>
            );
          })}
        </nav>

        <div className="relative mt-auto px-2 pb-2" ref={profileMenuRef}>
          {isProfileMenuOpen ? (
            <div className="absolute bottom-[calc(100%+12px)] left-2 right-2 overflow-hidden rounded-[28px] border border-[var(--theme-border-strong)] bg-[var(--theme-surface-elevated)] p-3 shadow-[var(--theme-shadow-strong)] backdrop-blur-xl">
              <div className="flex items-center gap-3 rounded-[22px] px-3 py-3.5">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[linear-gradient(135deg,#b98a61,#8e6441)] text-lg font-semibold text-white">
                  {userInitial}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-[1.05rem] font-semibold text-[var(--theme-heading)]">
                    {user?.name || "Owner"}
                  </div>
                  <div className="truncate text-sm text-[var(--theme-muted)]">
                    {user?.email || "Not signed in"}
                  </div>
                </div>
              </div>

              <div className="my-2 h-px bg-[var(--theme-border-soft)]" />

              <div className="space-y-1.5">
                {menuItems.map(({ label, icon: Icon }, index) => (
                  <button
                    key={label}
                    type="button"
                    onClick={
                      label === "Profile"
                        ? handleOpenProfile
                        : label === "Theme"
                          ? handleOpenTheme
                        : label === "Upgrade Plans"
                          ? handleOpenSubscriptions
                        : label === "Helpdesk"
                          ? handleOpenHelpdesk
                          : () => setIsProfileMenuOpen(false)
                    }
                    className={`flex w-full items-center gap-3 rounded-[18px] px-4 py-3 text-left text-[1.02rem] text-[var(--theme-body)] transition hover:bg-[var(--theme-card-soft)] ${
                      index === 0 ? "bg-[var(--theme-card)] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]" : ""
                    }`}
                  >
                    <Icon size={18} className="text-[var(--theme-muted)]" />
                    <span className={index === 0 ? "font-semibold" : "font-medium"}>{label}</span>
                  </button>
                ))}
              </div>

              <div className="my-2 h-px bg-[var(--theme-border-soft)]" />

              <button
                type="button"
                onClick={logout}
                className="flex w-full items-center gap-3 rounded-[18px] px-4 py-3 text-left text-[1.02rem] font-semibold text-[var(--theme-heading)] transition hover:bg-[var(--theme-card-soft)]"
              >
                <LogOut size={18} className="text-[var(--theme-heading)]" />
                <span>Log Out</span>
              </button>
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => setIsProfileMenuOpen((current) => !current)}
            className="profile-card w-full text-left transition hover:border-[#e4d3ba] hover:bg-[rgba(255,249,240,0.94)]"
            aria-haspopup="menu"
            aria-expanded={isProfileMenuOpen}
          >
            <div className="profile-avatar">{userInitial}</div>
            <div className="profile-meta min-w-0">
              <strong>{user?.name || "Owner"}</strong>
              <span className="truncate w-40 text-xs">{user?.email || "Not signed in"}</span>
            </div>
            <Settings2 size={16} className="ml-auto shrink-0 text-[#8f7e6a]" />
          </button>
        </div>
      </aside>

      <main className="workspace flex flex-col min-h-0 overflow-hidden">
        <header className="topbar flex flex-wrap gap-4 items-center justify-between p-4 md:p-7 border-b border-[var(--line)] bg-white/75">
          <div className="flex items-center gap-3">
            <button className="md:hidden text-2xl" onClick={toggleSidebar}>
              ☰
            </button>
            <div>
              <h1 className="text-xl md:text-3xl font-bold font-['Outfit']">{title}</h1>
              <p className="text-sm text-[var(--muted)] hidden sm:block">{user?.role === 'SUPER_ADMIN' ? "Super Admin Platform" : "Client Platform"}</p>
            </div>
          </div>

          <div className="topbar-actions flex flex-wrap items-center gap-2 md:gap-3">
            {isManager ? (
              <span className="text-sm font-semibold text-gray-700 bg-gray-100 px-3 py-1.5 rounded-md border border-gray-200">
                Location: {user?.location || 'Assigned Location'}
              </span>
            ) : isMonitorView ? (
              <select className="text-sm font-semibold bg-white border border-[var(--line)] px-3 py-1.5 rounded-md outline-none cursor-pointer">
                <option value="all">All Locations</option>
                {ownerLocations?.map(b => (
                  <option key={b.id} value={b.id}>{b.city || b.name}</option>
                ))}
              </select>
            ) : (
              <span className="text-sm font-semibold text-gray-700 bg-gray-100 px-3 py-1.5 rounded-md border border-gray-200">
                Location: {ownerLocations?.[0]?.city || ownerLocations?.[0]?.name || 'Business Location'}
              </span>
            )}
            <button className="ghost-button text-sm px-3 py-1.5 hidden sm:block" type="button" onClick={logout}>
              Sign out
            </button>
          </div>
        </header>

        <section className="workspace-content flex-1 overflow-auto p-4 md:p-6 flex flex-col gap-5">
          {children}
        </section>
      </main>
    </div>
  );
}
