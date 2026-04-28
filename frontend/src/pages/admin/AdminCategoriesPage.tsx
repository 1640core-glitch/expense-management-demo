import { useEffect, useState } from 'react';
import { Button, Table } from '../../components/ui';
import type { TableColumn } from '../../components/ui/Table/types';
import { ResourceListLayout } from './components/ResourceListLayout';
import { ConfirmDeleteDialog } from './components/ConfirmDeleteDialog';
import { CategoryFormDialog } from './components/CategoryFormDialog';
import {
  AdminCategory,
  AdminCategoryInput,
  create,
  list,
  remove,
  reorder,
  update,
} from '../../api/adminCategories';
import { notifyApiError, notifySuccess } from '../../lib/toast';
import { ApiError } from '../../api/errors';

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AdminCategory | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminCategory | null>(null);

  const reload = async () => {
    setLoading(true);
    try {
      const data = await list();
      const sorted = [...data].sort((a, b) => a.displayOrder - b.displayOrder);
      setCategories(sorted);
    } catch (err) {
      console.error('カテゴリ一覧の取得に失敗しました', err);
      notifyApiError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleReorder = async (index: number, direction: 'up' | 'down') => {
    const target = categories[index];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= categories.length) return;
    const other = categories[swapIndex];
    try {
      await reorder(target.id, other.displayOrder);
      await reorder(other.id, target.displayOrder);
      await reload();
    } catch (err) {
      console.error('表示順の更新に失敗しました', err);
      notifyApiError(err);
    }
  };

  useEffect(() => {
    void reload();
  }, []);

  const handleSubmit = async (input: AdminCategoryInput) => {
    if (editTarget) {
      await update(editTarget.id, input);
      notifySuccess('カテゴリを更新しました');
    } else {
      await create(input);
      notifySuccess('カテゴリを作成しました');
    }
    setEditTarget(null);
    setFormOpen(false);
    await reload();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await remove(deleteTarget.id);
      setDeleteTarget(null);
      await reload();
    } catch (err) {
      console.error('カテゴリの削除に失敗しました', err);
      notifyApiError(err);
      if (err instanceof ApiError) {
        err.silent = true;
      }
      throw err;
    }
  };

  const columns: TableColumn<AdminCategory>[] = [
    { key: 'id', header: 'ID', accessor: (row) => row.id },
    {
      key: 'displayOrder',
      header: '表示順',
      accessor: (row) => {
        const index = categories.findIndex((c) => c.id === row.id);
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span>{row.displayOrder}</span>
            <Button
              variant="ghost"
              size="sm"
              disabled={index <= 0}
              onClick={() => {
                void handleReorder(index, 'up');
              }}
              aria-label="表示順を上げる"
            >
              ↑
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={index < 0 || index >= categories.length - 1}
              onClick={() => {
                void handleReorder(index, 'down');
              }}
              aria-label="表示順を下げる"
            >
              ↓
            </Button>
          </div>
        );
      },
    },
    { key: 'name', header: 'カテゴリ名', accessor: (row) => row.name },
    {
      key: 'description',
      header: '説明',
      accessor: (row) => row.description ?? '-',
    },
    {
      key: 'monthlyLimit',
      header: '月次上限',
      accessor: (row) => (row.monthlyLimit != null ? row.monthlyLimit : '-'),
    },
    {
      key: 'isActive',
      header: '状態',
      accessor: (row) => (row.isActive ? '有効' : '無効'),
    },
    {
      key: 'actions',
      header: '操作',
      accessor: (row) => (
        <div style={{ display: 'flex', gap: 8 }}>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setEditTarget(row);
              setFormOpen(true);
            }}
          >
            編集
          </Button>
          <Button variant="danger" size="sm" onClick={() => setDeleteTarget(row)}>
            削除
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="home" style={{ maxWidth: 1200 }}>
      <ResourceListLayout
        title="カテゴリ管理"
        createLabel="新規作成"
        onCreate={() => {
          setEditTarget(null);
          setFormOpen(true);
        }}
      >
        {loading ? (
          <p>読み込み中...</p>
        ) : (
          <Table
            columns={columns}
            data={categories}
            rowKey={(row) => row.id}
            emptyText="カテゴリが登録されていません"
          />
        )}
      </ResourceListLayout>

      <CategoryFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditTarget(null);
        }}
        initial={editTarget}
        onSubmit={handleSubmit}
      />

      <ConfirmDeleteDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        onConfirm={handleDelete}
        itemLabel={deleteTarget ? deleteTarget.name : ''}
        successMessage="カテゴリを削除しました"
      />
    </div>
  );
}
