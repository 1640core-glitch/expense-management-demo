import {
  FilePlus,
  ListChecks,
  ClipboardCheck,
  LayoutDashboard,
  Settings,
  FileText,
  LucideIcon,
} from 'lucide-react';

export type NavRole = 'employee' | 'approver' | 'admin';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  roles: NavRole[];
  badgeKey?: 'pendingApprovals';
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/expenses/new', label: '経費を申請', icon: FilePlus, roles: ['employee', 'approver', 'admin'] },
  { to: '/expenses', label: '自分の申請', icon: ListChecks, roles: ['employee', 'approver', 'admin'] },
  { to: '/templates', label: 'テンプレート', icon: FileText, roles: ['employee', 'approver', 'admin'] },
  { to: '/approvals', label: '承認待ち', icon: ClipboardCheck, roles: ['approver', 'admin'], badgeKey: 'pendingApprovals' },
  { to: '/dashboard', label: 'ダッシュボード', icon: LayoutDashboard, roles: ['approver', 'admin'] },
  { to: '/admin/expenses', label: '経費申請管理', icon: Settings, roles: ['admin'] },
  { to: '/admin/users', label: 'ユーザー管理', icon: Settings, roles: ['admin'] },
];

export function filterNavItemsByRole(role: NavRole | undefined): NavItem[] {
  if (!role) return [];
  return NAV_ITEMS.filter((item) => item.roles.includes(role));
}
