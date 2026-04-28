import { useEffect, useState } from 'react';
import { Table } from '../../components/ui/Table';
import type { TableColumn } from '../../components/ui/Table/types';
import { EmptyState } from '../../components/ui/EmptyState';
import { Category, Expense, listCategories, statusLabel } from '../../api/expenses';
import { approveExpense, listPendingApprovals, rejectExpense } from '../../api/approvals';
import { notifyApiError, notifySuccess } from '../../lib/toast';
import ApprovalDetailDialog from './ApprovalDetailDialog';

export default function ApprovalsListPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Expense | null>(null);
  const [busy, setBusy] = useState(false);

  const reload = async () => {
    try {
      const [list, cats] = await Promise.all([listPendingApprovals(), listCategories()]);
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

  const closeDialog = () => {
    setSelected(null);
  };

  const handleApprove = async (id: number, comment: string | undefined) => {
    setBusy(true);
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    try {
      await approveExpense(id, comment);
      notifySuccess('承認しました');
      setSelected(null);
      await reload();
    } catch (err) {
      console.error('承認に失敗しました', err);
      notifyApiError(err);
      await reload();
    } finally {
      setBusy(false);
    }
  };

  const handleReject = async (id: number, comment: string) => {
    setBusy(true);
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    try {
      await rejectExpense(id, comment);
      notifySuccess('却下しました');
      setSelected(null);
      await reload();
    } catch (err) {
      console.error('却下に失敗しました', err);
      notifyApiError(err);
      await reload();
    } finally {
      setBusy(false);
    }
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
  ];

  return (
    <div className="home" style={{ maxWidth: 1080 }}>
      <h1>承認待ち一覧</h1>
      {loading ? (
        <p>読み込み中...</p>
      ) : expenses.length === 0 ? (
        <EmptyState title="承認待ちの申請はありません" />
      ) : (
        <Table
          columns={columns}
          data={expenses}
          rowKey={(row) => row.id}
          onRowClick={(row) => setSelected(row)}
        />
      )}
      <ApprovalDetailDialog
        expense={selected}
        categories={categories}
        busy={busy}
        onClose={closeDialog}
        onApprove={handleApprove}
        onReject={handleReject}
      />
    </div>
  );
}
