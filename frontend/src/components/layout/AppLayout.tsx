import { useEffect, useRef, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { Toaster } from '../ui/Toast/Toast';
import { useAuth } from '../../context/AuthContext';
import { listPendingApprovals } from '../../api/approvals';
import { listNotifications } from '../../api/notifications';
import { NavRole } from './nav-items';
import { ErrorBoundary } from '../ErrorBoundary';
import { useShortcuts } from '../../lib/shortcuts';
import type { ShortcutRole } from '../../lib/shortcuts';

const NOTIFICATION_POLL_INTERVAL_MS = 60_000;

export function AppLayout() {
  const { user } = useAuth();
  const role = user?.role as NavRole | undefined;
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const location = useLocation();
  const searchInputRef = useRef<HTMLInputElement>(null);

  useShortcuts({ role: role as ShortcutRole | undefined, searchInputRef });

  useEffect(() => {
    if (role !== 'approver' && role !== 'admin') {
      setPendingCount(0);
      return;
    }
    let cancelled = false;
    listPendingApprovals()
      .then((items) => {
        if (!cancelled) setPendingCount(items.length);
      })
      .catch((err) => {
        console.error('承認待ち件数の取得に失敗しました', err);
        if (!cancelled) setPendingCount(0);
      });
    return () => {
      cancelled = true;
    };
  }, [role, location.pathname]);

  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }
    const controller = new AbortController();
    let timer: ReturnType<typeof setInterval> | null = null;

    const fetchUnread = () => {
      listNotifications(controller.signal)
        .then((items) => {
          setUnreadCount(items.filter((n) => n.read_at === null).length);
        })
        .catch((err) => {
          if (controller.signal.aborted) return;
          console.error('通知件数の取得に失敗しました', err);
        });
    };

    const start = () => {
      if (timer !== null) return;
      fetchUnread();
      timer = setInterval(fetchUnread, NOTIFICATION_POLL_INTERVAL_MS);
    };
    const stop = () => {
      if (timer !== null) {
        clearInterval(timer);
        timer = null;
      }
    };
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        start();
      } else {
        stop();
      }
    };

    if (document.visibilityState === 'visible') {
      start();
    }
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      stop();
      controller.abort();
    };
  }, [user, location.pathname]);

  return (
    <div className="min-h-screen bg-bg text-text grid lg:grid-cols-[auto_1fr]">
      <div className="hidden lg:block">
        <Sidebar role={role} pendingApprovalsCount={pendingCount} variant="fixed" />
      </div>

      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute inset-y-0 left-0 z-50 shadow-lg">
            <Sidebar
              role={role}
              pendingApprovalsCount={pendingCount}
              variant="drawer"
              onNavigate={() => setDrawerOpen(false)}
            />
          </div>
        </div>
      )}

      <div className="flex flex-col min-w-0">
        <Topbar
          onOpenDrawer={() => setDrawerOpen(true)}
          notificationCount={unreadCount}
          searchInputRef={searchInputRef}
        />
        <main className="flex-1 p-4 sm:p-6">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
      <Toaster position="top-right" richColors />
    </div>
  );
}
