import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Category,
  Expense,
  deleteExpense,
  listCategories,
  listMyExpenses,
  statusLabel,
  submitExpense,
} from '../api/expenses';

export default function MyExpensesPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);

  const reload = async () => {
    setError(null);
    try {
      const [list, cats] = await Promise.all([listMyExpenses(), listCategories()]);
      setExpenses(list);
      setCategories(cats);
    } catch (err: unknown) {
      console.error('読み込みに失敗しました', err);
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        '読み込みに失敗しました';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
  }, []);

  const categoryName = (id: number): string => {
    const c = categories.find((x) => x.id === id);
    return c ? c.name : `#${id}`;
  };

  const handleDelete = async (exp: Expense) => {
    if (!window.confirm(`「${exp.title || categoryName(exp.category_id)}」を削除しますか？`)) return;
    setBusyId(exp.id);
    setError(null);
    try {
      await deleteExpense(exp.id);
      await reload();
    } catch (err: unknown) {
      console.error('削除に失敗しました', err);
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        '削除に失敗しました';
      setError(msg);
    } finally {
      setBusyId(null);
    }
  };

  const handleSubmit = async (exp: Expense) => {
    if (!window.confirm('この下書きを申請しますか？申請後は編集できません。')) return;
    setBusyId(exp.id);
    setError(null);
    try {
      await submitExpense(exp.id);
      await reload();
    } catch (err: unknown) {
      console.error('申請に失敗しました', err);
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        '申請に失敗しました';
      setError(msg);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <nav>
        <strong>経費精算システム</strong>
        <Link className="link" to="/">ホーム</Link>
        <Link className="link" to="/expenses/new">新規申請</Link>
        <div className="spacer" />
        <span style={{ fontSize: 14 }}>{user?.name}（{user?.role}）</span>
        <button onClick={() => { void logout(); }}>ログアウト</button>
      </nav>
      <div className="home" style={{ maxWidth: 1080 }}>
        <h1>自分の申請一覧</h1>
        {error && <div className="error">{error}</div>}
        {loading ? (
          <p>読み込み中...</p>
        ) : expenses.length === 0 ? (
          <p>
            申請はまだありません。<Link className="link" to="/expenses/new">経費を申請する</Link>
          </p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 8, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <thead>
              <tr style={{ background: '#f1f5f9', textAlign: 'left' }}>
                <th style={{ padding: '10px 12px' }}>申請日</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>金額</th>
                <th style={{ padding: '10px 12px' }}>カテゴリ</th>
                <th style={{ padding: '10px 12px' }}>用途</th>
                <th style={{ padding: '10px 12px' }}>ステータス</th>
                <th style={{ padding: '10px 12px' }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((exp) => {
                const isDraft = exp.status === 'draft';
                const busy = busyId === exp.id;
                return (
                  <tr key={exp.id} style={{ borderTop: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '10px 12px' }}>{exp.expense_date}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>¥{exp.amount.toLocaleString()}</td>
                    <td style={{ padding: '10px 12px' }}>{categoryName(exp.category_id)}</td>
                    <td style={{ padding: '10px 12px' }}>{exp.title || '-'}</td>
                    <td style={{ padding: '10px 12px' }}>{statusLabel(exp.status)}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {isDraft ? (
                          <>
                            <button
                              type="button"
                              onClick={() => navigate(`/expenses/${exp.id}/edit`)}
                              disabled={busy}
                              style={{ padding: '4px 10px', fontSize: 13 }}
                            >
                              編集
                            </button>
                            <button
                              type="button"
                              onClick={() => { void handleSubmit(exp); }}
                              disabled={busy}
                              style={{ padding: '4px 10px', fontSize: 13, background: '#16a34a' }}
                            >
                              申請
                            </button>
                            <button
                              type="button"
                              onClick={() => { void handleDelete(exp); }}
                              disabled={busy}
                              style={{ padding: '4px 10px', fontSize: 13, background: '#dc2626' }}
                            >
                              削除
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => navigate(`/expenses/${exp.id}/edit`)}
                            style={{ padding: '4px 10px', fontSize: 13, background: '#64748b' }}
                          >
                            閲覧
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
