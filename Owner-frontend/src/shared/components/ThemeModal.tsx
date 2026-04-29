import { MoonStar, SunMedium, X } from "lucide-react";
import { useDashboardTheme, type DashboardTheme } from "../theme/ThemeProvider";

type ThemeModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

const themeOptions: Array<{
  id: DashboardTheme;
  label: string;
  description: string;
  icon: typeof SunMedium;
}> = [
  {
    id: "light",
    label: "Light",
    description: "Warm and airy workspace",
    icon: SunMedium,
  },
  {
    id: "dark",
    label: "Dark",
    description: "Focused low-light workspace",
    icon: MoonStar,
  },
];

export function ThemeModal({ isOpen, onClose }: ThemeModalProps) {
  const { theme, setTheme } = useDashboardTheme();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-xl rounded-[28px] border border-[var(--theme-border-strong)] bg-[var(--theme-surface-elevated)] p-6 shadow-[var(--theme-shadow-strong)]">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 rounded-full border border-[var(--theme-border-strong)] p-2 text-[var(--theme-muted)] transition hover:bg-[var(--theme-card-soft)]"
          aria-label="Close theme picker"
        >
          <X size={18} />
        </button>

        <div className="pr-10">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--theme-accent)]">Appearance</p>
          <h2 className="mt-2 font-['Outfit'] text-3xl font-semibold text-[var(--theme-heading)]">Theme</h2>
          <p className="mt-2 text-sm text-[var(--theme-muted)]">
            Switch the dashboard style for both owner and branch manager workspaces.
          </p>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {themeOptions.map(({ id, label, description, icon: Icon }) => {
            const isActive = theme === id;

            return (
              <button
                key={id}
                type="button"
                onClick={() => setTheme(id)}
                className={`rounded-[22px] border px-5 py-5 text-left transition ${
                  isActive
                    ? "border-[var(--theme-accent-strong)] bg-[var(--theme-toggle-active-bg)] shadow-[0_0_0_2px_var(--theme-accent-glow),0_18px_32px_rgba(0,0,0,0.16)]"
                    : "border-[var(--theme-border-soft)] bg-[var(--theme-card)] hover:border-[var(--theme-border-strong)] hover:bg-[var(--theme-card-soft)]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-full ${
                      isActive ? "bg-[var(--theme-toggle-icon-bg)] text-[var(--theme-toggle-icon)]" : "bg-[var(--theme-card-soft)] text-[var(--theme-muted)]"
                    }`}
                  >
                    <Icon size={22} />
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-[var(--theme-heading)]">{label}</div>
                    <div className="text-sm text-[var(--theme-muted)]">{description}</div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-[14px] bg-[var(--theme-action-chip)] px-4 py-2.5 text-sm font-semibold text-[var(--theme-heading)] transition hover:opacity-90"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
