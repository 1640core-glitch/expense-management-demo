import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { downloadMonthlyCsv, getMonthlyReport, MonthlyReport } from '../api/admin';

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const now = new Date();
  const [year, setYear] = useState<number>(now.getFullYear());
  const [month, setMonth] = useState<number>(now.getMonth() + 1);
  const [report, setReport] = useState<MonthlyReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const load = async (y: number, m: number) => {
    setLoading(true);
    setError(null);
    try {
      const r = await getMonthlyReport(y, m);
      setReport(r);
    } catch (err: unknown) {
      console.error('読み込みに失敗しました', err);
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? '読み込みに失敗しました';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(year, month);
  }, []);

  if (user && user.role !== 'approver' && user.role !== 'admin') {
    return (
      <div className="container">
        <p>このページは承認者・管理者専用です。</p>
        <Link className="link" to="/">ホームへ戻る</Link>
      </div>
    );
  }

  const handleDownload = async () => {
    setDownloading(true);
    setError(null);
    try {
      const blob = await downloadMonthlyCsv(year, month);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report-${year}-${String(month).padStart(2, '0')}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      console.error('CSVダウンロードに失敗しました', err);
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'CSVダウンロードに失敗しました';
      setError(msg);
    } finally {
      setDownloading(false);
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void load(year, month);
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
      <div className="home" style={{ maxWidth: 960 }}>
        <h1>ダッシュボード</h1>
        <form onSubmit={onSubmit} style={{ background: '#fff', padding: 16, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', marginBottom: 16, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <label>
            年
            <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} style={{ marginLeft: 6, width: 90 }} />
          </label>
          <label>
            月
            <select value={month} onChange={(e) => setMonth(Number(e.target.value))} style={{ marginLeft: 6 }}>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </label>
          <button type="submit">表示</button>
          <button type="button" onClick={() => { void handleDownload(); }} disabled={downloading} style={{ background: '#0ea5e9' }}>
            {downloading ? 'ダウンロード中...' : 'CSVダウンロード'}
          </button>
        </form>
        {error && <div className="error">{error}</div>}
        {loading ? (
          <p>読み込み中...</p>
        ) : report ? (
          <div>
            <h2 style={{ fontSize: 18 }}>{report.year}年{report.month}月 月次集計（承認済み）</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 8, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <thead>
                <tr style={{ background: '#f1f5f9', textAlign: 'left' }}>
                  <th style={{ padding: '10px 12px' }}>カテゴリ</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>件数</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>合計金額</th>
                </tr>
              </thead>
              <tbody>
                {report.categories.map((c) => (
                  <tr key={c.category_id} style={{ borderTop: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '10px 12px' }}>{c.category_name}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>{c.count}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>¥{c.total.toLocaleString()}</td>
                  </tr>
                ))}
                <tr style={{ borderTop: '2px solid #cbd5e1', background: '#f8fafc', fontWeight: 'bold' }}>
                  <td style={{ padding: '10px 12px' }}>合計</td>
                  <td style={{ padding: '10px 12px' }}></td>
                  <td style={{ padding: '10px 12px', textAlign: 'right' }}>¥{report.total.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </>
  );
}
