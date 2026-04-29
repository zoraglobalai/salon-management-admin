import { useState, useEffect, type PropsWithChildren } from "react";
import { NavLink } from "react-router-dom";
import { ChevronDown, Menu, X } from "lucide-react";
import { useAuth } from "../../modules/auth/hooks/useAuth";
import { fetchMe } from "../../core/api";
import type { LucideIcon } from "lucide-react";

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
}>;

export function AppShell({ navigation, lowStockCount = 0, children }: AppShellProps) {
  const { user } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    const intervalId = setInterval(() => {
      fetchMe().catch(() => {
        // session expiry handled upstream
      });
    }, 2000);
    return () => clearInterval(intervalId);
  }, [user]);

  return (
    <div className="min-h-screen bg-[#FAF7F4] font-sans text-[#1F2937]">
      {isSidebarOpen ? (
        <div className="fixed inset-0 z-40 bg-black/30 lg:hidden" onClick={() => setIsSidebarOpen(false)} />
      ) : null}

      <div className="mx-auto flex min-h-screen max-w-[1536px] gap-0">
        <aside
          className={`fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col border-r border-[#EEE6DD] bg-white transition-transform duration-200 lg:static lg:translate-x-0 ${
            isSidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex min-h-[104px] items-center justify-between border-b border-white/10 bg-[linear-gradient(135deg,#5A341F,#2F190E)] px-5 py-5 text-white">
            <div className="flex min-w-0 items-center gap-3">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/10 text-lg font-bold tracking-[0.08em]">SD</div>
              <div>
                <h1 className="text-[22px] font-semibold leading-none tracking-[-0.03em]">Salon Desk</h1>
                <p className="mt-1 text-sm leading-none text-white/80">Smart Salon Management</p>
              </div>
            </div>
            <button className="rounded-xl p-2 transition hover:bg-white/10 lg:hidden" onClick={() => setIsSidebarOpen(false)}>
              <X size={20} />
            </button>
          </div>

          <nav className="flex-1 space-y-2 px-3 py-5">
            {navigation.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setIsSidebarOpen(false)}
                className={({ isActive }) =>
                  `group flex items-center gap-3 rounded-[16px] px-4 py-3 text-[15px] font-medium transition-all ${
                    isActive
                      ? "bg-[linear-gradient(180deg,#F8F0E9,#F5ECE3)] text-[#6E432D] shadow-[inset_0_0_0_1px_rgba(215,180,150,0.38)]"
                      : "text-[#4B5563] hover:bg-[#FAF7F3] hover:text-[#1F2937]"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span className={`grid h-9 w-9 place-items-center rounded-xl transition ${isActive ? "bg-white text-[#6E432D]" : "bg-transparent text-[#8A6B5A] group-hover:bg-white group-hover:text-[#1F2937]"}`}>
                      <item.icon size={18} strokeWidth={1.9} />
                    </span>
                    <span className="truncate">{item.label}</span>
                    {item.to === "/dashboard/inventory" && lowStockCount > 0 ? (
                      <span className="ml-auto rounded-full bg-red-500 px-2 py-0.5 text-xs font-semibold text-white">
                        {lowStockCount}
                      </span>
                    ) : null}
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="mt-auto border-t border-[#F3F4F6] p-4">
            <div className="flex items-center justify-between rounded-[18px] border border-[#E8E1D8] bg-white px-4 py-4 shadow-[0_10px_30px_rgba(94,72,52,0.06)]">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-full bg-[#111827] text-sm font-semibold text-white">
                  {(user?.name || "A").charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-base font-medium text-[#111827]">{user?.name || "azar"}</p>
                  <p className="text-sm text-[#6B7280]">{user?.role === "MANAGER" ? "Manager" : "Owner"}</p>
                </div>
              </div>
              <ChevronDown size={16} className="text-[#6B7280]" />
            </div>
          </div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center justify-between border-b border-[#ECE7E1] px-4 py-4 lg:hidden">
            <button
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#E5E7EB] bg-white"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu size={20} />
            </button>
            <div className="text-sm font-semibold text-[#8B5E3C]">Salon Desk</div>
            <div className="w-10" />
          </div>

          <section className="flex-1 p-4 md:p-5 lg:p-5 xl:p-6">{children}</section>
        </main>
      </div>
    </div>
  );
}
