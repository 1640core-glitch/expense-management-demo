import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  downloadMonthlyCsv,
  getMonthlyReport,
  getSummary,
  MonthlyReport,
  Summary,
} from '../api/admin';
import { Expense, ExpenseStatus, listMyExpenses, statusLabel } from '../api/expenses';
import { Badge, BadgeVariant } from '../components/ui/Badge';
import { Skeleton } from '../components/ui/Skeleton';
import { Table } from '../components/ui/Table';
import type { TableColumn } from '../components/ui/Table/types';
import { notifyApiError } from '../lib/toast';

const STATUS_VARIANTS: Record<ExpenseStatus, BadgeVariant> = {
  draft: 'neutral',
  pending: 'info',
  approved: 'success',
  rejected: 'danger',
};

const STATUS_ORDER: ExpenseStatus[] = ['draft', 'pending', 'approved', 'rejected'];

function currentYearMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const isApproverOrAdmin = user?.role === 'approver' || user?.role === 'admin';

  const [myExpenses, setMyExpenses] = useState<Expense[] | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  const now = new Date();
  const [year, setYear] = useState<number>(now.getFullYear());
  const [month, setMonth] = useState<number>(now.getMonth() + 1);
  const [report, setReport] = useState<MonthlyReport | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([listMyExpenses(), getSummary(currentYearMonth())])
      .then(([list, sum]) => {
        if (cancelled) return;
        setMyExpenses(list);
        setSummary(sum);
      })
      .catch((err) => {
        console.error('ダッシュボードの読み込みに失敗しました', err);
        notifyApiError(err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const loadReport = async (y: number, m: number) => {
    setReportLoading(true);
    try {
      const r = await getMonthlyReport(y, m);
      setReport(r);
    } catch (err) {
      console.error('月次集計の読み込みに失敗しました', err);
      notifyApiError(err);
    } finally {
      setReportLoading(false);
    }
  };

  useEffect(() => {
    if (isApproverOrAdmin) {
      void loadReport(year, month);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isApproverOrAdmin]);

  const statusCounts = useMemo(() => {
    const counts: Record<ExpenseStatus, number> = {
      draft: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
    };
    for (const e of myExpenses ?? []) {
      counts[e.status] = (counts[e.status] ?? 0) + 1;
    }
    return counts;
  }, [myExpenses]);

  const recentExpenses = useMemo(() => {
    if (!myExpenses) return [];
    return [...myExpenses]
      .sort((a, b) => (a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0))
      .slice(0, 5);
  }, [myExpenses]);

  const handleDownload = async () => {
    setDownloading(true);
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
    } catch (err) {
      console.error('CSVダウンロードに失敗しました', err);
      notifyApiError(err);
    } finally {
      setDownloading(false);
    }
  };

  const onSubmitReport = (e: React.FormEvent) => {
    e.preventDefault();
    void loadReport(year, month);
  };

  const summaryColumns: TableColumn<Summary['byCategory'][number]>[] = [
    { key: 'category', header: 'カテゴリ', accessor: (row) => row.categoryName },
    {
      key: 'total',
      header: '合計金額',
      align: 'right',
      accessor: (row) => `¥${row.total.toLocaleString()}`,
    },
  ];

  const recentColumns: TableColumn<Expense>[] = [
    { key: 'date', header: '日付', accessor: (row) => row.expense_date },
    { key: 'category', header: 'カテゴリ', accessor: (row) => `#${row.category_id}` },
    { key: 'title', header: '件名', accessor: (row) => row.title || '-' },
    {
      key: 'amount',
      header: '金額',
      align: 'right',
      accessor: (row) => `¥${row.amount.toLocaleString()}`,
    },
    {
      key: 'status',
      header: 'ステータス',
      accessor: (row) => (
        <Badge variant={STATUS_VARIANTS[row.status]}>{statusLabel(row.status)}</Badge>
      ),
    },
  ];

  return (
    <div className="home" style={{ maxWidth: 1080 }}>
      <h1>ダッシュボード</h1>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 18 }}>申請状況サマリ</h2>
        {loading ? (
          <Skeleton height={48} />
        ) : (
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {STATUS_ORDER.map((s) => (
              <Badge key={s} variant={STATUS_VARIANTS[s]}>
                {statusLabel(s)}: {statusCounts[s]}
              </Badge>
            ))}
          </div>
        )}
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 18 }}>今月の承認済み合計（{currentYearMonth()}）</h2>
        {loading ? (
          <Skeleton height={120} />
        ) : summary ? (
          <>
            <p>合計: ¥{summary.total.toLocaleString()}</p>
            <Table
              columns={summaryColumns}
              data={summary.byCategory}
              rowKey={(row) => row.categoryId}
            />
          </>
        ) : null}
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 18 }}>最近の申請</h2>
        {loading ? (
          <Skeleton height={120} />
        ) : recentExpenses.length === 0 ? (
          <p>申請はまだありません。</p>
        ) : (
          <Table columns={recentColumns} data={recentExpenses} rowKey={(row) => row.id} />
        )}
      </section>

      {isApproverOrAdmin && (
        <section>
          <h2 style={{ fontSize: 18 }}>月次集計（承認済み）</h2>
          <form
            onSubmit={onSubmitReport}
            style={{
              background: '#fff',
              padding: 16,
              borderRadius: 8,
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              marginBottom: 16,
              display: 'flex',
              gap: 12,
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            <label>
              年
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                style={{ marginLeft: 6, width: 90 }}
              />
            </label>
            <label>
              月
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                style={{ marginLeft: 6 }}
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit">表示</button>
            <button
              type="button"
              onClick={() => {
                void handleDownload();
              }}
              disabled={downloading}
              style={{ background: '#0ea5e9' }}
            >
              {downloading ? 'ダウンロード中...' : 'CSVダウンロード'}
            </button>
          </form>
          {reportLoading ? (
            <Skeleton height={160} />
          ) : report ? (
            <div>
              <h3 style={{ fontSize: 16 }}>
                {report.year}年{report.month}月
              </h3>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  background: '#fff',
                  borderRadius: 8,
                  overflow: 'hidden',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                }}
              >
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
                      <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                        ¥{c.total.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  <tr
                    style={{
                      borderTop: '2px solid #cbd5e1',
                      background: '#f8fafc',
                      fontWeight: 'bold',
                    }}
                  >
                    <td style={{ padding: '10px 12px' }}>合計</td>
                    <td style={{ padding: '10px 12px' }}></td>
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                      ¥{report.total.toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : null}
        </section>
      )}
    </div>
  );
}
