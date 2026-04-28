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
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Button } from '../components/ui/Button';
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

  type ReportRow = {
    key: string;
    category_name: string;
    count: number | null;
    total: number;
    isTotal?: boolean;
  };

  const reportRows: ReportRow[] = useMemo(() => {
    if (!report) return [];
    const rows: ReportRow[] = report.categories.map((c) => ({
      key: `cat-${c.category_id}`,
      category_name: c.category_name,
      count: c.count,
      total: c.total,
    }));
    rows.push({
      key: 'total',
      category_name: '合計',
      count: null,
      total: report.total,
      isTotal: true,
    });
    return rows;
  }, [report]);

  const reportColumns: TableColumn<ReportRow>[] = [
    {
      key: 'category',
      header: 'カテゴリ',
      accessor: (row) =>
        row.isTotal ? <strong>{row.category_name}</strong> : row.category_name,
    },
    {
      key: 'count',
      header: '件数',
      align: 'right',
      accessor: (row) => (row.count === null ? '' : row.count),
    },
    {
      key: 'total',
      header: '合計金額',
      align: 'right',
      accessor: (row) =>
        row.isTotal ? (
          <strong>¥{row.total.toLocaleString()}</strong>
        ) : (
          `¥${row.total.toLocaleString()}`
        ),
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
          <Card padding="md" style={{ marginBottom: 16 }}>
            <form
              onSubmit={onSubmitReport}
              style={{
                display: 'flex',
                gap: 12,
                alignItems: 'flex-end',
                flexWrap: 'wrap',
              }}
            >
              <Input
                label="年"
                type="number"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                wrapperClassName="w-24"
              />
              <Select
                label="月"
                value={String(month)}
                onChange={(e) => setMonth(Number(e.target.value))}
                options={Array.from({ length: 12 }, (_, i) => i + 1).map((m) => ({
                  value: String(m),
                  label: String(m),
                }))}
              />
              <Button type="submit" variant="primary">
                表示
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  void handleDownload();
                }}
                disabled={downloading}
              >
                {downloading ? 'ダウンロード中...' : 'CSVダウンロード'}
              </Button>
            </form>
          </Card>
          {reportLoading ? (
            <Skeleton height={160} />
          ) : report ? (
            <>
              <h3 style={{ fontSize: 16 }}>
                {report.year}年{report.month}月
              </h3>
              <Table
                columns={reportColumns}
                data={reportRows}
                rowKey={(row) => row.key}
              />
            </>
          ) : null}
        </section>
      )}
    </div>
  );
}
