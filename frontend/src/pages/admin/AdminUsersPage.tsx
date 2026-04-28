import { useEffect, useState } from 'react';
import { Button, Table } from '../../components/ui';
import type { TableColumn } from '../../components/ui/Table/types';
import { ResourceListLayout } from './components/ResourceListLayout';
import { ConfirmDeleteDialog } from './components/ConfirmDeleteDialog';
import { UserFormDialog } from './components/UserFormDialog';
import { AdminUser, AdminUserInput, create, list, remove, update } from '../../api/adminUsers';
import { notifyApiError, notifySuccess } from '../../lib/toast';

const ROLE_LABELS: Record<AdminUser['role'], string> = {
  employee: '一般社員',
  approver: '承認者',
  accounting: '経理',
  admin: '管理者',
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AdminUser | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);

  const reload = async () => {
    setLoading(true);
    try {
      const data = await list();
      setUsers(data);
    } catch (err) {
      console.error('ユーザー一覧の取得に失敗しました', err);
      notifyApiError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
  }, []);

  const handleSubmit = async (input: AdminUserInput) => {
    if (editTarget) {
      await update(editTarget.id, input);
      notifySuccess('ユーザーを更新しました');
    } else {
      await create(input);
      notifySuccess('ユーザーを作成しました');
    }
    setEditTarget(null);
    setFormOpen(false);
    await reload();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await remove(deleteTarget.id);
    setDeleteTarget(null);
    await reload();
  };

  const columns: TableColumn<AdminUser>[] = [
    { key: 'id', header: 'ID', accessor: (row) => row.id },
    { key: 'email', header: 'メールアドレス', accessor: (row) => row.email },
    { key: 'name', header: '氏名', accessor: (row) => row.name },
    { key: 'role', header: 'ロール', accessor: (row) => ROLE_LABELS[row.role] ?? row.role },
    {
      key: 'managerId',
      header: 'マネージャーID',
      accessor: (row) => (row.managerId != null ? row.managerId : '-'),
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
        title="ユーザー管理"
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
            data={users}
            rowKey={(row) => row.id}
            emptyText="ユーザーが登録されていません"
          />
        )}
      </ResourceListLayout>

      <UserFormDialog
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
        itemLabel={deleteTarget ? `${deleteTarget.name} (${deleteTarget.email})` : ''}
        successMessage="ユーザーを削除しました"
      />
    </div>
  );
}
