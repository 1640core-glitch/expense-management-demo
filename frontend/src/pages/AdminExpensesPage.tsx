import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Expense, Category, listCategories, statusLabel } from '../api/expenses';
import { AdminExpenseQuery, listAllExpenses } from '../api/admin';

export default function AdminExpensesPage() {
  const { user, logout } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<AdminExpenseQuery>({});

  const search = async (q: AdminExpenseQuery) => {
    setLoading(true);
    setError(null);
    try {
      const list = await listAllExpenses(q);
      setExpenses(list);
    } catch (err: unknown) {
      console.error('読み込みに失敗しました', err);
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? '読み込みに失敗しました';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    listCategories().then(setCategories).catch((err) => console.error('カテゴリ取得失敗', err));
    void search({});
  }, []);

  const categoryName = (id: number): string => categories.find((c) => c.id === id)?.name ?? `#${id}`;

  if (user && user.role !== 'admin') {
    return (
      <div className="container">
        <p>このページは管理者専用です。</p>
        <Link className="link" to="/">ホームへ戻る</Link>
      </div>
    );
  }

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void search(filters);
  };

  return (
    <>
      <nav>
        <strong>経費精算システム</strong>
        <Link className="link" to="/">ホーム</Link>
        <div className="spacer" />
        <span style={{ fontSize: 14 }}>{user?.name}（{user?.role}）</span>
        <button onClick={() => { void logout(); }}>ログアウト</button>
      </nav>
      <div className="home" style={{ maxWidth: 1200 }}>
        <h1>経費申請管理</h1>
        <form onSubmit={onSubmit} style={{ background: '#fff', padding: 16, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', marginBottom: 16, display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          <label>
            ステータス
            <select
              value={filters.status ?? ''}
              onChange={(e) => setFilters({ ...filters, status: e.target.value || undefined })}
              style={{ marginLeft: 6 }}
            >
              <option value="">すべて</option>
              <option value="draft">下書き</option>
              <option value="pending">申請中</option>
              <option value="approved">承認済み</option>
              <option value="rejected">却下</option>
            </select>
          </label>
          <label>
            カテゴリ
            <select
              value={filters.category_id ?? ''}
              onChange={(e) => setFilters({ ...filters, category_id: e.target.value ? Number(e.target.value) : undefined })}
              style={{ marginLeft: 6 }}
            >
              <option value="">すべて</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>
          <label>
            申請者ID
            <input
              type="number"
              value={filters.user_id ?? ''}
              onChange={(e) => setFilters({ ...filters, user_id: e.target.value ? Number(e.target.value) : undefined })}
              style={{ marginLeft: 6, width: 80 }}
            />
          </label>
          <label>
            開始日
            <input
              type="date"
              value={filters.from ?? ''}
              onChange={(e) => setFilters({ ...filters, from: e.target.value || undefined })}
              style={{ marginLeft: 6 }}
            />
          </label>
          <label>
            終了日
            <input
              type="date"
              value={filters.to ?? ''}
              onChange={(e) => setFilters({ ...filters, to: e.target.value || undefined })}
              style={{ marginLeft: 6 }}
            />
          </label>
          <button type="submit">検索</button>
          <button type="button" onClick={() => { setFilters({}); void search({}); }} style={{ background: '#64748b' }}>リセット</button>
        </form>
        {error && <div className="error">{error}</div>}
        {loading ? (
          <p>読み込み中...</p>
        ) : expenses.length === 0 ? (
          <p>該当する申請はありません。</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 8, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <thead>
              <tr style={{ background: '#f1f5f9', textAlign: 'left' }}>
                <th style={{ padding: '10px 12px' }}>ID</th>
                <th style={{ padding: '10px 12px' }}>申請日</th>
                <th style={{ padding: '10px 12px' }}>申請者</th>
                <th style={{ padding: '10px 12px' }}>カテゴリ</th>
                <th style={{ padding: '10px 12px' }}>用途</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>金額</th>
                <th style={{ padding: '10px 12px' }}>ステータス</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((exp) => (
                <tr key={exp.id} style={{ borderTop: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '10px 12px' }}>{exp.id}</td>
                  <td style={{ padding: '10px 12px' }}>{exp.expense_date}</td>
                  <td style={{ padding: '10px 12px' }}>#{exp.user_id}</td>
                  <td style={{ padding: '10px 12px' }}>{categoryName(exp.category_id)}</td>
                  <td style={{ padding: '10px 12px' }}>{exp.title || '-'}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right' }}>¥{exp.amount.toLocaleString()}</td>
                  <td style={{ padding: '10px 12px' }}>{statusLabel(exp.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
