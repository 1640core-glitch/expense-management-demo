import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Table } from '../../components/ui/Table';
import type { TableColumn } from '../../components/ui/Table/types';
import { EmptyState } from '../../components/ui/EmptyState';
import { Button } from '../../components/ui/Button';
import { Dialog, DialogContent, DialogFooter } from '../../components/ui/Dialog';
import { Category, listCategories } from '../../api/expenses';
import { Template, deleteTemplate, listTemplates } from '../../api/templates';
import { notifyApiError, notifySuccess } from '../../lib/toast';

export default function TemplatesListPage() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [target, setTarget] = useState<Template | null>(null);
  const [busy, setBusy] = useState(false);

  const reload = async () => {
    try {
      const [list, cats] = await Promise.all([listTemplates(), listCategories()]);
      setTemplates(list);
      setCategories(cats);
    } catch (err) {
      console.error('テンプレートの取得に失敗しました', err);
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

  const handleDelete = async () => {
    if (!target) return;
    setBusy(true);
    try {
      await deleteTemplate(target.id);
      notifySuccess('テンプレートを削除しました');
      setTarget(null);
      await reload();
    } catch (err) {
      console.error('削除に失敗しました', err);
      notifyApiError(err);
    } finally {
      setBusy(false);
    }
  };

  const columns: TableColumn<Template>[] = [
    { key: 'name', header: 'テンプレート名', accessor: (row) => row.name },
    { key: 'category', header: 'カテゴリ', accessor: (row) => categoryName(row.category_id) },
    { key: 'title', header: '用途', accessor: (row) => row.title || '-' },
    {
      key: 'amount',
      header: '金額',
      align: 'right',
      accessor: (row) => (row.amount != null ? `¥${row.amount.toLocaleString()}` : '-'),
    },
    {
      key: 'actions',
      header: '操作',
      accessor: (row) => (
        <div style={{ display: 'flex', gap: 8 }} onClick={(e) => e.stopPropagation()}>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate(`/templates/${row.id}/edit`)}
          >
            編集
          </Button>
          <Button variant="danger" size="sm" onClick={() => setTarget(row)}>
            削除
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="home" style={{ maxWidth: 1080 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1>経費テンプレート</h1>
        <Link to="/templates/new">
          <Button variant="primary">新規作成</Button>
        </Link>
      </div>
      {loading ? (
        <p>読み込み中...</p>
      ) : templates.length === 0 ? (
        <EmptyState
          title="テンプレートはまだありません"
          description="よく使う経費パターンをテンプレートとして登録できます。"
          action={
            <Link to="/templates/new">
              <Button variant="primary">新規作成</Button>
            </Link>
          }
        />
      ) : (
        <Table columns={columns} data={templates} rowKey={(row) => row.id} />
      )}
      <Dialog
        open={target !== null}
        onOpenChange={(open) => {
          if (!open) setTarget(null);
        }}
      >
        <DialogContent title="テンプレートを削除">
          {target && (
            <>
              <p>「{target.name}」を削除します。よろしいですか？</p>
              <DialogFooter>
                <Button variant="secondary" onClick={() => setTarget(null)} disabled={busy}>
                  キャンセル
                </Button>
                <Button variant="danger" onClick={() => void handleDelete()} disabled={busy}>
                  {busy ? '削除中...' : '削除する'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
