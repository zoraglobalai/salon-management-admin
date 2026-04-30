import React, { useEffect, useState } from 'react';
import { Bell, Loader2, X } from 'lucide-react';
import { logsApi } from '../../services/api';

interface TopNavbarProps {
  title?: string;
}

interface NotificationItem {
  id: string;
  action: string;
  performedBy: string;
  details: string | null;
  createdAt: string;
}

const NOTIFICATION_ACTIONS = ['SUPPORT_TICKET_RAISED', 'SUBSCRIPTION_PAYMENT', 'TRIAL_ENDED'] as const;

const actionColors: Record<string, string> = {
  SUPPORT_TICKET_RAISED: 'bg-red-50 text-red-700',
  SUBSCRIPTION_PAYMENT: 'bg-green-50 text-green-700',
  TRIAL_ENDED: 'bg-amber-50 text-amber-700',
};

const TopNavbar: React.FC<TopNavbarProps> = ({ title }) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchNotifications = async (showLoader = false) => {
    if (showLoader) {
      setIsLoading(true);
    }

    try {
      const response = await logsApi.getNotifications(20);
      const items = response.data.data.filter((item: NotificationItem) =>
        NOTIFICATION_ACTIONS.includes(item.action as (typeof NOTIFICATION_ACTIONS)[number])
      );
      setNotifications(items);
    } catch (error) {
      console.error(error);
    } finally {
      if (showLoader) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    void fetchNotifications();
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      void fetchNotifications();
    }, 20000);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!isDrawerOpen) return;
    void fetchNotifications(true);
  }, [isDrawerOpen]);

  return (
    <>
      <header
        id="topnav"
        className="fixed top-0 right-0 flex items-center justify-between border-b border-[var(--color-border)] bg-surface px-6"
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

        <div className="flex items-center">
          <button
            className="btn-ghost relative p-2"
            aria-label="Notifications"
            onClick={() => setIsDrawerOpen(true)}
          >
            <Bell size={16} />
            {notifications.length ? (
              <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-red-500" />
            ) : null}
          </button>
        </div>
      </header>

      {isDrawerOpen ? (
        <>
          <div className="fixed inset-0 z-40 bg-black/20" onClick={() => setIsDrawerOpen(false)} />
          <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[380px] flex-col border-l border-[var(--color-border)] bg-surface shadow-[0_18px_60px_rgba(0,0,0,0.18)]">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-[var(--color-text-primary)]">Notifications</h2>
                <p className="mt-1 text-sm text-[var(--color-text-muted)]">Support, payments, and trial reminders</p>
              </div>
              <button
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                className="rounded-full border border-[var(--color-border)] p-2 text-[var(--color-text-muted)] transition hover:bg-[var(--color-surface-raised)]"
                aria-label="Close notifications"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center py-12 text-[var(--color-text-muted)]">
                  <Loader2 size={18} className="animate-spin" />
                  <span className="ml-2 text-sm">Loading notifications...</span>
                </div>
              ) : notifications.length ? (
                <div className="divide-y divide-[var(--color-border)]">
                  {notifications.map((item) => (
                    <div key={item.id} className="p-4 transition-colors hover:bg-[var(--color-surface-raised)]">
                      <div className="flex items-start gap-3">
                        <span
                          className={`mt-0.5 rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${
                            actionColors[item.action] || 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {item.action.replace(/_/g, ' ')}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-[var(--color-text-primary)]">
                            {item.details || item.action}
                          </p>
                          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                            by <strong>{item.performedBy}</strong>
                          </p>
                          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                            {new Date(item.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="px-5 py-12 text-center text-sm text-[var(--color-text-muted)]">
                  No notifications found.
                </div>
              )}
            </div>
          </aside>
        </>
      ) : null}
    </>
  );
};

export default TopNavbar;
