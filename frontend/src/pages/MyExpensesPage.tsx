import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Category,
  Expense,
  ExpenseStatus,
  deleteExpense,
  listCategories,
  listMyExpenses,
  statusLabel,
  submitExpense,
} from '../api/expenses';
import { Table } from '../components/ui/Table';
import type { TableColumn } from '../components/ui/Table/types';
import { Pagination } from '../components/ui/Pagination';
import { Select } from '../components/ui/Select';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { notifyApiError, notifySuccess } from '../lib/toast';

interface Filters {
  status: ExpenseStatus | '';
  categoryId: string;
  from: string;
  to: string;
}

const PAGE_SIZE = 10;

const STATUS_OPTIONS: { value: ExpenseStatus | ''; label: string }[] = [
  { value: '', label: 'すべて' },
  { value: 'draft', label: '下書き' },
  { value: 'pending', label: '申請中' },
  { value: 'approved', label: '承認済み' },
  { value: 'rejected', label: '却下' },
];

export default function MyExpensesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const searchQuery = (searchParams.get('q') ?? '').trim().toLowerCase();
  const role = user?.role ?? 'employee';
  const isPrivileged = role === 'approver' || role === 'admin';

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [filters, setFilters] = useState<Filters>({ status: '', categoryId: '', from: '', to: '' });
  const [page, setPage] = useState(1);

  const reload = async () => {
    setLoading(true);
    try {
      const [list, cats] = await Promise.all([listMyExpenses(), listCategories()]);
      setExpenses(list);
      setCategories(cats);
    } catch (err) {
      console.error('読み込みに失敗しました', err);
      notifyApiError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
  }, []);

  const categoryName = (id: number): string =>
    categories.find((c) => c.id === id)?.name ?? `#${id}`;

  const filtered = useMemo(() => {
    return expenses.filter((e) => {
      if (filters.status && e.status !== filters.status) return false;
      if (isPrivileged) {
        if (filters.categoryId && e.category_id !== Number(filters.categoryId)) return false;
        if (filters.from && e.expense_date < filters.from) return false;
        if (filters.to && e.expense_date > filters.to) return false;
      }
      if (searchQuery) {
        const haystack = [
          e.title ?? '',
          e.description ?? '',
          categoryName(e.category_id),
          String(e.amount),
          e.expense_date,
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(searchQuery)) return false;
      }
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expenses, filters, isPrivileged, searchQuery, categories]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = useMemo(
    () => filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filtered, currentPage],
  );

  useEffect(() => {
    setPage(1);
  }, [filters, searchQuery]);

  const handleDelete = async (exp: Expense, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`「${exp.title || categoryName(exp.category_id)}」を削除しますか？`)) return;
    setBusyId(exp.id);
    try {
      await deleteExpense(exp.id);
      notifySuccess('削除しました');
      await reload();
    } catch (err) {
      console.error('削除に失敗しました', err);
      notifyApiError(err);
    } finally {
      setBusyId(null);
    }
  };

  const handleSubmit = async (exp: Expense, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('この下書きを申請しますか？申請後は編集できません。')) return;
    setBusyId(exp.id);
    try {
      await submitExpense(exp.id);
      notifySuccess('申請しました');
      await reload();
    } catch (err) {
      console.error('申請に失敗しました', err);
      notifyApiError(err);
    } finally {
      setBusyId(null);
    }
  };

  const handleEdit = (exp: Expense, e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/expenses/${exp.id}/edit`);
  };

  const columns: TableColumn<Expense>[] = [
    { key: 'expense_date', header: '申請日', accessor: (row) => row.expense_date },
    {
      key: 'amount',
      header: '金額',
      align: 'right',
      accessor: (row) => `¥${row.amount.toLocaleString()}`,
    },
    { key: 'category', header: 'カテゴリ', accessor: (row) => categoryName(row.category_id) },
    { key: 'title', header: '用途', accessor: (row) => row.title || '-' },
    { key: 'status', header: 'ステータス', accessor: (row) => statusLabel(row.status) },
    {
      key: 'actions',
      header: '操作',
      accessor: (row) => {
        const isDraft = row.status === 'draft';
        const busy = busyId === row.id;
        return (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {isDraft ? (
              <>
                <Button size="sm" variant="secondary" onClick={(e) => handleEdit(row, e)} disabled={busy}>
                  編集
                </Button>
                <Button size="sm" variant="primary" onClick={(e) => { void handleSubmit(row, e); }} disabled={busy}>
                  申請
                </Button>
                <Button size="sm" variant="danger" onClick={(e) => { void handleDelete(row, e); }} disabled={busy}>
                  削除
                </Button>
              </>
            ) : (
              <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); navigate(`/expenses/${row.id}`); }}>
                詳細
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="home" style={{ maxWidth: 1080 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>自分の申請一覧</h1>
        <Link to="/expenses/new"><Button variant="primary">新規申請</Button></Link>
      </div>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          background: '#fff',
          padding: 16,
          borderRadius: 8,
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          marginBottom: 16,
        }}
      >
        <Select
          label="ステータス"
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value as ExpenseStatus | '' })}
          options={STATUS_OPTIONS}
        />
        {isPrivileged && (
          <>
            <Select
              label="カテゴリ"
              value={filters.categoryId}
              onChange={(e) => setFilters({ ...filters, categoryId: e.target.value })}
              options={[
                { value: '', label: 'すべて' },
                ...categories.map((c) => ({ value: String(c.id), label: c.name })),
              ]}
            />
            <Input
              label="開始日"
              type="date"
              value={filters.from}
              onChange={(e) => setFilters({ ...filters, from: e.target.value })}
            />
            <Input
              label="終了日"
              type="date"
              value={filters.to}
              onChange={(e) => setFilters({ ...filters, to: e.target.value })}
            />
          </>
        )}
      </div>

      {loading ? (
        <p>読み込み中...</p>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="申請はまだありません"
          description="経費を申請してみましょう。"
        />
      ) : (
        <>
          <Table
            columns={columns}
            data={pageItems}
            rowKey={(row) => row.id}
            onRowClick={(row) => navigate(`/expenses/${row.id}`)}
          />
          <div style={{ marginTop: 12 }}>
            <Pagination
              page={currentPage}
              pageSize={PAGE_SIZE}
              total={filtered.length}
              onPageChange={setPage}
            />
          </div>
        </>
      )}
    </div>
  );
}
