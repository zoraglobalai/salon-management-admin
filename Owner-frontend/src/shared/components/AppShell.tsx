import { useEffect, useRef, useState, type PropsWithChildren } from "react";
import { NavLink } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import { CircleHelp, Crown, LogOut, Menu, Moon, Settings2, UserCircle2, X } from "lucide-react";
import brandLogo from "../../assets/Groomvy Logo icon.png";
import { fetchMe } from "../../core/api";
import { useAuth } from "../../modules/auth/hooks/useAuth";
import { ProfileDetailsModal } from "./ProfileDetailsModal";
import { SubscriptionPlansModal } from "./SubscriptionPlansModal";
import { SupportTicketDrawer } from "./SupportTicketDrawer";
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

function getRoleLabel(role?: string) {
  if (role === "MANAGER") return "Branch Manager";
  if (role === "SUPER_ADMIN") return "Platform Admin";
  return "Salon Owner";
}

export function AppShell({
  title: _title,
  subtitle: _subtitle,
  navigation,
  lowStockCount = 0,
  profileDetails = null,
  onRefreshProfile,
  children,
}: AppShellProps) {
  const { user, logout, updateUser } = useAuth();
  const { theme } = useDashboardTheme();
  const isDark = theme === "dark";
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isSupportDrawerOpen, setIsSupportDrawerOpen] = useState(false);
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const isManager = user?.role === "MANAGER";
  const canOpenHelpdesk = user?.role === "OWNER" || user?.role === "INDEPENDENT_OWNER";

  const toggleSidebar = () => setIsSidebarOpen((current) => !current);

  useEffect(() => {
    if (!user) return;

    const intervalId = window.setInterval(() => {
      fetchMe().catch(() => {
        // The core/api.ts interceptor handles auth failures.
      });
    }, 2000);

    return () => window.clearInterval(intervalId);
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

  /* ── Dark mode class helpers ── */
  const sidebarBg       = isDark ? "bg-[#0F1115] border-r border-[rgba(255,255,255,0.06)]" : "bg-white";
  const sidebarShadow   = isDark ? "shadow-[4px_0_40px_rgba(0,0,0,0.45)]" : "shadow-[0_18px_42px_rgba(88,56,32,0.18)]";
  const headerBg        = isDark ? "bg-[linear-gradient(160deg,#1e2235_0%,#12151e_100%)]" : "bg-[linear-gradient(180deg,#5b321c_0%,#5a3422_100%)]";
  const navItemBase     = isDark
    ? "text-[#C8BFB4] hover:bg-[rgba(255,255,255,0.04)] hover:text-[#F0EBE3]"
    : "text-[#54473d] hover:bg-[#faf5ef]";
  const navItemActive   = isDark
    ? "bg-[linear-gradient(90deg,rgba(201,169,110,0.18)_0%,rgba(201,169,110,0.05)_100%)] border-l-[3px] border-[#C9A96E] !pl-[11px] text-[#E8C98A]"
    : "bg-[linear-gradient(180deg,#fbf5ef_0%,#f6eee5_100%)] text-[#2d2119] shadow-[inset_0_0_0_1px_rgba(127,84,53,0.08)]";
  const navIconActive   = isDark ? "bg-[rgba(201,169,110,0.14)] text-[#C9A96E]" : "bg-[#ffffff] text-[#7d4b2a] shadow-sm";
  const navIconDefault  = isDark ? "text-[#7A7572]" : "text-[#8a6b58]";
  const mainBg          = isDark ? "bg-[#0F1115]" : "bg-white";
  const mainBorder      = isDark ? "border-[rgba(255,255,255,0.05)]" : "border-[rgba(133,91,59,0.08)]";
  const mainShadow      = isDark ? "shadow-[0_1px_3px_rgba(0,0,0,0.5),0_8px_32px_rgba(0,0,0,0.35)]" : "shadow-[0_18px_42px_rgba(88,56,32,0.1)]";
  const menuBg          = isDark ? "bg-[#1C2030] border-[rgba(255,255,255,0.08)]" : "bg-white border-[rgba(136,94,60,0.12)]";
  const menuHeaderBg    = isDark ? "bg-[#222637]" : "bg-[#fbf7f2]";
  const menuItemHover   = isDark ? "hover:bg-[rgba(201,169,110,0.08)] text-[#C8BFB4]" : "hover:bg-[#faf4ee] text-[#372d25]";
  const menuItemIcon    = isDark ? "text-[#C9A96E]" : "text-[#8f7e6a]";
  const menuDivider     = isDark ? "bg-[rgba(255,255,255,0.06)]" : "bg-[#eee4da]";
  const profileBtnBg    = isDark ? "bg-[#151821] border-[rgba(255,255,255,0.08)] hover:bg-[#1C2030]" : "bg-[#fcfaf7] border-[#ede3d8] hover:bg-white";
  const profileAvatarBg = isDark ? "bg-[linear-gradient(135deg,#C9A96E,#A67C3D)] text-[#0F1115]" : "bg-[#17181f] text-white";
  const profileNameColor= isDark ? "text-[#F0EBE3]" : "text-[#17181F]";
  const profileRoleColor= isDark ? "text-[#7A7572]" : "text-[#8d837b]";
  const settingsIcon    = isDark ? "text-[#C9A96E]" : "text-[#8f7e6a]";
  const closeBtnStyle   = isDark ? "border-[rgba(255,255,255,0.12)] text-[#C8BFB4]" : "border-white/20 text-white/80";
  const hamburgerStyle  = isDark 
    ? "border-[rgba(255,255,255,0.12)] bg-[#151821]/80 backdrop-blur-md text-[#C8BFB4]" 
    : "border-[rgba(234,223,213,0.6)] bg-white/70 backdrop-blur-md text-[#3a2a20]";

  return (
    <div className={`min-h-screen p-2.5 md:h-screen md:overflow-hidden md:p-3 theme-${theme} ${isDark ? "bg-[#0F1115]" : "bg-[#f7f1ea]"}`}>
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
      <ThemeModal isOpen={isThemeModalOpen} onClose={() => setIsThemeModalOpen(false)} />
      <SubscriptionPlansModal
        isOpen={isSubscriptionModalOpen}
        onClose={() => setIsSubscriptionModalOpen(false)}
      />

      {isSidebarOpen ? (
        <div className={`fixed inset-0 z-40 md:hidden ${isDark ? "bg-[rgba(0,0,0,0.65)] backdrop-blur-sm" : "bg-[rgba(34,20,11,0.32)]"}`} onClick={toggleSidebar} />
      ) : null}

      <div className="mx-auto flex h-full max-w-[1540px] flex-col gap-3 md:grid md:grid-cols-[260px_minmax(0,1fr)]">
        {/* ── Sidebar ── */}
        <aside
          className={[
            `fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col overflow-hidden rounded-r-[30px] transition-transform duration-200 ease-out md:relative md:inset-auto md:h-full md:rounded-[30px] md:translate-x-0`,
            sidebarBg,
            sidebarShadow,
            isSidebarOpen ? "translate-x-0" : "-translate-x-full",
          ].join(" ")}
        >
          {/* Brand header */}
          <div className={`rounded-b-[30px] px-5 py-4 text-white ${headerBg}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <img src={brandLogo} alt="Salon Desk" className="h-10 w-10 rounded-2xl object-contain" />
                <div>
                  <h1 className="mt-0.5 text-[1.5rem] font-semibold leading-none tracking-[-0.04em]">Groomvy</h1>
                  <p className="mt-1 text-[11px] text-white/75">Smart Salon Management</p>
                </div>
              </div>
              <button
                type="button"
                className={`rounded-full border p-2 md:hidden transition-all hover:bg-white/10 ${closeBtnStyle}`}
                onClick={() => setIsSidebarOpen(false)}
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Nav */}
          <div className="flex min-h-0 flex-1 flex-col px-3 pb-3 pt-3">
            <nav className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto scrollbar-hide">
              {navigation.map((item) => {
                const Icon = item.icon;

                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === "/dashboard"}
                    onClick={() => setIsSidebarOpen(false)}
                    className={({ isActive }) =>
                      [
                        "group flex min-h-[42px] items-center gap-3 rounded-[14px] px-3.5 text-[14px] font-medium transition-all duration-150",
                        isActive ? navItemActive : navItemBase,
                      ].join(" ")
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span
                          className={[
                            "grid h-7 w-7 shrink-0 place-items-center rounded-lg transition-all duration-150",
                            isActive ? navIconActive : navIconDefault,
                          ].join(" ")}
                        >
                          <Icon size={16} />
                        </span>
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="truncate">{item.label}</span>
                          {item.to === "/dashboard/inventory" && lowStockCount > 0 ? (
                            <span className={`inline-flex min-w-4 items-center justify-center rounded-full px-1 py-0.5 text-[9px] font-bold ${isDark ? "bg-[#F87171] text-[#0F1115]" : "bg-[#d34c3b] text-white"}`}>
                              {lowStockCount}
                            </span>
                          ) : null}
                        </span>
                      </>
                    )}
                  </NavLink>
                );
              })}
            </nav>

            {/* Profile area */}
            <div className="relative mt-2" ref={profileMenuRef}>
              {isProfileMenuOpen ? (
                <div className={`absolute bottom-[calc(100%+12px)] left-0 right-0 overflow-hidden rounded-[24px] border p-3 shadow-[0_18px_48px_rgba(0,0,0,0.32)] ${menuBg} ${isDark ? "backdrop-blur-md" : ""}`}>
                  <div className={`flex items-center gap-3 rounded-[18px] px-3 py-3 ${menuHeaderBg}`}>
                    <div className={`grid h-12 w-12 place-items-center rounded-full text-base font-semibold ${isDark ? "bg-[linear-gradient(135deg,#C9A96E,#A67C3D)] text-[#0F1115]" : "bg-[linear-gradient(135deg,#b98a61,#8e6441)] text-white"}`}>
                      {userInitial}
                    </div>
                    <div className="min-w-0">
                      <div className={`truncate text-[0.98rem] font-semibold ${isDark ? "text-[#F0EBE3]" : "text-[#1f1b17]"}`}>{user?.name || "Owner"}</div>
                      <div className={`truncate text-sm ${isDark ? "text-[#7A7572]" : "text-[#7f746c]"}`}>{user?.email || "Not signed in"}</div>
                    </div>
                  </div>

                  <div className={`my-3 h-px ${menuDivider}`} />

                  <div className="space-y-1">
                    {menuItems.map(({ label, icon: Icon }) => (
                      <button
                        key={label}
                        type="button"
                        onClick={
                          label === "Profile"
                            ? () => { setIsProfileMenuOpen(false); setIsProfileModalOpen(true); }
                            : label === "Theme"
                              ? () => { setIsProfileMenuOpen(false); setIsThemeModalOpen(true); }
                              : label === "Upgrade Plans"
                                ? () => { setIsProfileMenuOpen(false); setIsSubscriptionModalOpen(true); }
                                : label === "Helpdesk"
                                  ? () => { setIsProfileMenuOpen(false); setIsSupportDrawerOpen(true); }
                                  : () => setIsProfileMenuOpen(false)
                        }
                        className={`flex w-full items-center gap-3 rounded-[14px] px-4 py-3 text-left text-[0.95rem] font-medium transition-all ${menuItemHover}`}
                      >
                        <Icon size={17} className={menuItemIcon} />
                        <span>{label}</span>
                      </button>
                    ))}
                  </div>

                  <div className={`my-3 h-px ${menuDivider}`} />

                  <button
                    type="button"
                    onClick={logout}
                    className={`flex w-full items-center gap-3 rounded-[14px] px-4 py-3 text-left text-[0.96rem] font-semibold transition-all ${isDark ? "text-[#F87171] hover:bg-[rgba(248,113,113,0.08)]" : "text-[#211b17] hover:bg-[#faf4ee]"}`}
                  >
                    <LogOut size={17} className={isDark ? "text-[#F87171]" : "text-[#211b17]"} />
                    <span>Log Out</span>
                  </button>
                </div>
              ) : null}

              <button
                type="button"
                onClick={() => setIsProfileMenuOpen((current) => !current)}
                className={`flex w-full items-center gap-3 rounded-[18px] border px-3.5 py-3 text-left transition-all hover:shadow-sm ${profileBtnBg}`}
                aria-haspopup="menu"
                aria-expanded={isProfileMenuOpen}
              >
                <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-full text-base font-semibold ${profileAvatarBg}`}>
                  {userInitial}
                </div>
                <div className="min-w-0 flex-1">
                  <strong className={`block truncate text-[15px] font-semibold ${profileNameColor}`}>{user?.name || "Owner"}</strong>
                  <span className={`block truncate text-[12px] ${profileRoleColor}`}>{getRoleLabel(user?.role)}</span>
                </div>
                <Settings2 size={16} className={`shrink-0 ${settingsIcon}`} />
              </button>
            </div>
          </div>
        </aside>

        {/* ── Main workspace ── */}
        <main className={`workspace relative flex min-h-0 flex-col overflow-hidden rounded-[30px] border md:h-[calc(100vh-24px)] ${mainBg} ${mainBorder} ${mainShadow}`}>
          <button
            type="button"
            className={`fixed left-6 top-6 z-[60] flex h-11 w-11 items-center justify-center rounded-full border shadow-lg md:hidden ${hamburgerStyle}`}
            onClick={toggleSidebar}
            aria-label="Open navigation"
          >
            <Menu size={22} />
          </button>

          <section className="flex-1 overflow-y-auto px-4 pb-4 pt-16 md:min-h-0 md:px-6 md:pb-5 md:pt-5 xl:px-7 xl:pb-6 xl:pt-5">
            {children}
          </section>
        </main>
      </div>
    </div>
  );
}
