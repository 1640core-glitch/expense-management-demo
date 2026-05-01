import { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Badge } from '../ui';
import { cn } from '../../lib/cn';
import { useAuth } from '../../context/AuthContext';
import { filterNavItemsByRole, NavRole } from './nav-items';

const COLLAPSE_KEY = 'sidebar:collapsed';

export interface SidebarProps {
  role: NavRole | undefined;
  pendingApprovalsCount?: number;
  variant?: 'fixed' | 'drawer';
  onNavigate?: () => void;
}

export function Sidebar({ role, pendingApprovalsCount = 0, variant = 'fixed', onNavigate }: SidebarProps) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (variant === 'drawer') return false;
    try {
      return window.localStorage.getItem(COLLAPSE_KEY) === '1';
    } catch {
      return false;
    }
  });

  const handleLogout = async () => {
    onNavigate?.();
    await logout();
    navigate('/login', { replace: true });
  };

  useEffect(() => {
    if (variant === 'drawer') return;
    try {
      window.localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0');
    } catch {
      // ignore
    }
  }, [collapsed, variant]);

  const items = filterNavItemsByRole(role);
  const isCollapsed = variant === 'fixed' && collapsed;

  return (
    <aside
      className={cn(
        'flex flex-col bg-surface border-r border-border h-full transition-[width] duration-200',
        isCollapsed ? 'w-16' : 'w-60',
      )}
      aria-label="メインナビゲーション"
    >
      <div className={cn('flex items-center gap-2 px-4 h-14 border-b border-border', isCollapsed && 'justify-center px-2')}>
        <button
          type="button"
          onClick={() => void handleLogout()}
          className={cn(
            'text-text text-lg font-bold whitespace-nowrap rounded-md px-1 hover:text-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
          )}
          aria-label="ログアウト"
          title="クリックでログアウト"
        >
          {isCollapsed ? '経' : '経費精算'}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-2">
        <ul className="flex flex-col gap-1 px-2">
          {items.map((item) => {
            const Icon = item.icon;
            const showBadge = item.badgeKey === 'pendingApprovals' && pendingApprovalsCount > 0;
            return (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.to === '/'}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-3 py-2 rounded-md text-sm text-text hover:bg-bg transition-colors',
                      isActive && 'bg-bg text-primary font-medium',
                      isCollapsed && 'justify-center px-2',
                    )
                  }
                  title={isCollapsed ? item.label : undefined}
                >
                  <Icon size={18} aria-hidden="true" />
                  {!isCollapsed && <span className="flex-1 truncate">{item.label}</span>}
                  {!isCollapsed && showBadge && (
                    <Badge variant="danger" size="sm">{pendingApprovalsCount}</Badge>
                  )}
                  {isCollapsed && showBadge && (
                    <Badge variant="danger" size="sm" className="absolute" aria-label={`${pendingApprovalsCount}件の承認待ち`}>
                      {pendingApprovalsCount}
                    </Badge>
                  )}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      {variant === 'fixed' && (
        <div className="border-t border-border p-2">
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className={cn(
              'flex items-center justify-center w-full h-9 rounded-md text-text-muted hover:bg-bg transition-colors',
            )}
            aria-label={collapsed ? 'サイドバーを展開' : 'サイドバーを折りたたむ'}
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>
      )}
    </aside>
  );
}
