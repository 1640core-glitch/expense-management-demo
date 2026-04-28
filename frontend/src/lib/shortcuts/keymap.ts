export type ShortcutRole = 'employee' | 'approver' | 'admin';

export type ShortcutAction =
  | { type: 'navigate'; path: string }
  | { type: 'focusSearch' };

export interface ShortcutEntry {
  keys: string[];
  action: ShortcutAction;
  roles?: ShortcutRole[];
}

export const SHORTCUTS: ShortcutEntry[] = [
  { keys: ['n'], action: { type: 'navigate', path: '/expenses/new' } },
  { keys: ['/'], action: { type: 'focusSearch' } },
  { keys: ['g', 'd'], action: { type: 'navigate', path: '/dashboard' } },
  { keys: ['g', 'l'], action: { type: 'navigate', path: '/expenses' } },
  {
    keys: ['g', 'a'],
    action: { type: 'navigate', path: '/approvals' },
    roles: ['approver', 'admin'],
  },
];
