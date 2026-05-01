import { Link } from 'react-router-dom';
import { BarChart3, ChevronRight, FileText, Inbox, Receipt, Settings, type LucideIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface NavCard {
  to: string;
  label: string;
  description: string;
  Icon: LucideIcon;
}

export default function HomePage() {
  const { user } = useAuth();

  const cards: NavCard[] = [
    { to: '/expenses/new', label: '経費を申請する', description: '新しい経費申請を作成します', Icon: Receipt },
    { to: '/expenses',     label: '自分の申請一覧', description: '提出済みの申請状況を確認',  Icon: FileText },
  ];
  if (user?.role === 'approver' || user?.role === 'admin') {
    cards.push(
      { to: '/approvals', label: '承認待ち一覧',     description: '承認待ちの申請を処理',     Icon: Inbox },
      { to: '/dashboard', label: 'ダッシュボード',   description: '月次の経費集計を確認',     Icon: BarChart3 },
    );
  }
  if (user?.role === 'admin') {
    cards.push(
      { to: '/admin/expenses', label: '経費申請管理', description: '管理者向け 全申請の一覧', Icon: Settings },
    );
  }

  return (
    <div className="home">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-text mb-1">ホーム</h1>
        <p className="text-sm text-text-muted">ようこそ、{user?.name} さん。</p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-3xl">
        {cards.map(({ to, label, description, Icon }) => (
          <Link
            key={to}
            to={to}
            className="group flex items-center gap-3 p-4 bg-surface border border-border rounded-md hover:border-primary hover:shadow-sm transition-colors"
          >
            <span className="flex-shrink-0 w-9 h-9 rounded-md bg-bg border border-border flex items-center justify-center text-primary">
              <Icon size={18} aria-hidden="true" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-medium text-text">{label}</span>
              <span className="block text-xs text-text-muted mt-0.5">{description}</span>
            </span>
            <ChevronRight
              size={16}
              aria-hidden="true"
              className="flex-shrink-0 text-text-muted group-hover:text-primary transition-colors"
            />
          </Link>
        ))}
      </div>
    </div>
  );
}
