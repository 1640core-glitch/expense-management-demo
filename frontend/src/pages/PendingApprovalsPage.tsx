import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Expense, Category, listCategories, statusLabel, getReceiptBlob } from '../api/expenses';
import { approveExpense, listPendingApprovals, rejectExpense } from '../api/approvals';

export default function PendingApprovalsPage() {
  const { user, logout } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Expense | null>(null);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);

  const reload = async () => {
    setError(null);
    try {
      const [list, cats] = await Promise.all([listPendingApprovals(), listCategories()]);
      setExpenses(list);
      setCategories(cats);
    } catch (err: unknown) {
      console.error('読み込みに失敗しました', err);
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? '読み込みに失敗しました';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
  }, []);

  const categoryName = (id: number): string => categories.find((c) => c.id === id)?.name ?? `#${id}`;

  const openDetail = async (exp: Expense) => {
    setSelected(exp);
    setComment('');
    setReceiptUrl(null);
    if (exp.receipt_path) {
      try {
        const blob = await getReceiptBlob(exp.id);
        setReceiptUrl(URL.createObjectURL(blob));
      } catch (err) {
        console.error('領収書取得に失敗しました', err);
      }
    }
  };

  const closeDetail = () => {
    if (receiptUrl) URL.revokeObjectURL(receiptUrl);
    setReceiptUrl(null);
    setSelected(null);
    setComment('');
  };

  const handleAction = async (action: 'approve' | 'reject') => {
    if (!selected) return;
    if (action === 'reject' && !comment.trim()) {
      setError('却下する場合はコメントを入力してください');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (action === 'approve') await approveExpense(selected.id, comment.trim() || undefined);
      else await rejectExpense(selected.id, comment.trim() || undefined);
      closeDetail();
      await reload();
    } catch (err: unknown) {
      console.error('処理に失敗しました', err);
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? '処理に失敗しました';
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  if (user && user.role !== 'approver' && user.role !== 'admin') {
    return (
      <div className="container">
        <p>このページは承認者専用です。</p>
        <Link className="link" to="/">ホームへ戻る</Link>
      </div>
    );
  }

  return (
    <>
      <nav>
        <strong>経費精算システム</strong>
        <Link className="link" to="/">ホーム</Link>
        <div className="spacer" />
        <span style={{ fontSize: 14 }}>{user?.name}（{user?.role}）</span>
        <button onClick={() => { void logout(); }}>ログアウト</button>
      </nav>
      <div className="home" style={{ maxWidth: 1080 }}>
        <h1>承認待ち一覧</h1>
        {error && <div className="error">{error}</div>}
        {loading ? (
          <p>読み込み中...</p>
        ) : expenses.length === 0 ? (
          <p>承認待ちの申請はありません。</p>
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
              {expenses.map((exp) => (
                <tr key={exp.id} style={{ borderTop: '1px solid #e5e7eb', cursor: 'pointer' }} onClick={() => { void openDetail(exp); }}>
                  <td style={{ padding: '10px 12px' }}>{exp.expense_date}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right' }}>¥{exp.amount.toLocaleString()}</td>
                  <td style={{ padding: '10px 12px' }}>{categoryName(exp.category_id)}</td>
                  <td style={{ padding: '10px 12px' }}>{exp.title || '-'}</td>
                  <td style={{ padding: '10px 12px' }}>{statusLabel(exp.status)}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <button type="button" onClick={(e) => { e.stopPropagation(); void openDetail(exp); }} style={{ padding: '4px 10px', fontSize: 13 }}>
                      詳細
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {selected && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={closeDetail}
        >
          <div
            style={{ background: '#fff', padding: 24, borderRadius: 8, width: 'min(640px, 92vw)', maxHeight: '90vh', overflow: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ marginTop: 0 }}>申請詳細</h2>
            <dl style={{ lineHeight: 1.8 }}>
              <div><strong>申請日:</strong> {selected.expense_date}</div>
              <div><strong>カテゴリ:</strong> {categoryName(selected.category_id)}</div>
              <div><strong>用途:</strong> {selected.title || '-'}</div>
              <div><strong>金額:</strong> ¥{selected.amount.toLocaleString()}</div>
              <div><strong>備考:</strong> {selected.description || '-'}</div>
              <div><strong>ステータス:</strong> {statusLabel(selected.status)}</div>
            </dl>
            {receiptUrl && (
              <div style={{ margin: '12px 0' }}>
                <strong>領収書:</strong>
                <div style={{ marginTop: 6 }}>
                  <a className="link" href={receiptUrl} target="_blank" rel="noreferrer">別ウィンドウで開く</a>
                </div>
                <img src={receiptUrl} alt="領収書" style={{ maxWidth: '100%', maxHeight: 300, marginTop: 8, border: '1px solid #e5e7eb' }} />
              </div>
            )}
            <label style={{ display: 'block', marginTop: 12 }}>
              コメント
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                style={{ width: '100%', padding: 8, marginTop: 4 }}
              />
            </label>
            <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
              <button type="button" onClick={closeDetail} disabled={busy} style={{ background: '#64748b' }}>閉じる</button>
              <button type="button" onClick={() => { void handleAction('reject'); }} disabled={busy} style={{ background: '#dc2626' }}>却下</button>
              <button type="button" onClick={() => { void handleAction('approve'); }} disabled={busy} style={{ background: '#16a34a' }}>承認</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
