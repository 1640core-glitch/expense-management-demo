import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Attachment,
  AuditLog,
  Category,
  Expense,
  getExpense,
  listAttachments,
  listAuditLogs,
  listCategories,
  receiptUrl,
  statusLabel,
} from '../api/expenses';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/Tabs';
import { Dialog, DialogContent } from '../components/ui/Dialog';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { notifyApiError } from '../lib/toast';

interface ExpenseSummaryCardProps {
  expense: Expense;
  categoryName: string;
}

function ExpenseSummaryCard({ expense, categoryName }: ExpenseSummaryCardProps) {
  return (
    <Card padding="md" elevated>
      <CardHeader>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>{expense.title || categoryName}</h2>
          <Badge>{statusLabel(expense.status)}</Badge>
        </div>
      </CardHeader>
      <CardBody>
        <dl style={{ display: 'grid', gridTemplateColumns: '120px 1fr', rowGap: 8, columnGap: 12, margin: 0 }}>
          <dt>申請日</dt>
          <dd style={{ margin: 0 }}>{expense.expense_date}</dd>
          <dt>カテゴリ</dt>
          <dd style={{ margin: 0 }}>{categoryName}</dd>
          <dt>金額</dt>
          <dd style={{ margin: 0 }}>¥{expense.amount.toLocaleString()}</dd>
          <dt>備考</dt>
          <dd style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{expense.description || '-'}</dd>
          <dt>提出日時</dt>
          <dd style={{ margin: 0 }}>{expense.submitted_at ?? '-'}</dd>
        </dl>
      </CardBody>
    </Card>
  );
}

interface ReceiptPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expenseId: number;
  attachment: Attachment | null;
}

function ReceiptPreviewDialog({ open, onOpenChange, expenseId, attachment }: ReceiptPreviewDialogProps) {
  if (!attachment) return null;
  // legacy receipt: fetch via expense receipt endpoint
  const src = receiptUrl(expenseId);
  const isPdf =
    (attachment.mime_type ?? '').toLowerCase() === 'application/pdf' ||
    /\.pdf$/i.test(attachment.filename) ||
    /\.pdf$/i.test(attachment.path);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={`領収書プレビュー: ${attachment.filename}`}
        className="receipt-preview-dialog"
      >
        <div style={{ width: '100%', maxWidth: 800, height: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
          {isPdf ? (
            <iframe
              src={src}
              title="領収書プレビュー"
              style={{ width: '100%', height: '100%', border: 'none' }}
            />
          ) : (
            <img
              src={src}
              alt="領収書プレビュー"
              style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

const AUDIT_ACTION_LABEL: Record<string, string> = {
  create: '作成',
  update: '更新',
  submit: '申請',
  approve: '承認',
  reject: '却下',
  withdraw: '取り下げ',
};

export default function ExpenseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const expenseId = Number(id);

  const [expense, setExpense] = useState<Expense | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewTarget, setPreviewTarget] = useState<Attachment | null>(null);

  useEffect(() => {
    if (!Number.isFinite(expenseId) || expenseId <= 0) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const [exp, cats, atts, logs] = await Promise.all([
          getExpense(expenseId),
          listCategories(),
          listAttachments(expenseId).catch(() => [] as Attachment[]),
          listAuditLogs(expenseId).catch(() => [] as AuditLog[]),
        ]);
        if (cancelled) return;
        setExpense(exp);
        setCategories(cats);
        setAttachments(atts);
        setAuditLogs(logs);
      } catch (err) {
        console.error('読み込みに失敗しました', err);
        notifyApiError(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [expenseId]);

  const categoryName = (cid: number): string =>
    categories.find((c) => c.id === cid)?.name ?? `#${cid}`;

  if (loading) {
    return <div className="home" style={{ maxWidth: 960 }}><p>読み込み中...</p></div>;
  }
  if (!expense) {
    return (
      <div className="home" style={{ maxWidth: 960 }}>
        <p>申請が見つかりません。</p>
        <Link className="link" to="/expenses">一覧に戻る</Link>
      </div>
    );
  }

  const openPreview = (att: Attachment) => {
    if (att.legacy) {
      setPreviewTarget(att);
    }
    // TODO(後続Phase): expense_attachments 個別ダウンロード API（GET /api/expenses/:id/attachments/:attId）
    // が実装され次第、legacy 以外の attachment もプレビュー可能にする。
  };

  return (
    <div className="home" style={{ maxWidth: 960 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>申請詳細 #{expense.id}</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="secondary" onClick={() => navigate('/expenses')}>一覧に戻る</Button>
          {expense.status === 'draft' && (
            <Button variant="primary" onClick={() => navigate(`/expenses/${expense.id}/edit`)}>編集</Button>
          )}
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <ExpenseSummaryCard expense={expense} categoryName={categoryName(expense.category_id)} />
      </div>

      <Tabs defaultValue="attachments">
        <TabsList>
          <TabsTrigger value="attachments">添付</TabsTrigger>
          <TabsTrigger value="audit">監査履歴</TabsTrigger>
        </TabsList>

        <TabsContent value="attachments">
          <Card padding="md" bordered>
            <CardBody>
              {attachments.length === 0 ? (
                <p style={{ margin: 0 }}>添付はありません。</p>
              ) : (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 8 }}>
                  {attachments.map((a, idx) => (
                    <li
                      key={a.id ?? `legacy-${idx}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        borderRadius: 6,
                        background: '#f8fafc',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span>{a.filename}</span>
                        {a.legacy && <Badge>legacy</Badge>}
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {a.legacy ? (
                          <Button size="sm" variant="secondary" onClick={() => openPreview(a)}>
                            プレビュー
                          </Button>
                        ) : (
                          <span style={{ fontSize: 12, color: '#64748b' }}>
                            プレビュー未対応（後続Phase）
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </TabsContent>

        <TabsContent value="audit">
          <Card padding="md" bordered>
            <CardBody>
              {auditLogs.length === 0 ? (
                <p style={{ margin: 0 }}>監査履歴はありません。</p>
              ) : (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 8 }}>
                  {auditLogs.map((log) => (
                    <li
                      key={log.id}
                      style={{
                        padding: '8px 12px',
                        borderRadius: 6,
                        background: '#f8fafc',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                        <strong>{AUDIT_ACTION_LABEL[log.action] ?? log.action}</strong>
                        <span style={{ color: '#64748b', fontSize: 12 }}>{log.createdAt}</span>
                      </div>
                      <div style={{ fontSize: 13, color: '#334155' }}>
                        {log.actorName ?? `#${log.actorId ?? '-'}`}
                        {log.from || log.to ? ` / ${log.from ?? '-'} → ${log.to ?? '-'}` : ''}
                      </div>
                      {log.comment && (
                        <div style={{ fontSize: 13, marginTop: 4, whiteSpace: 'pre-wrap' }}>{log.comment}</div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </TabsContent>
      </Tabs>

      <ReceiptPreviewDialog
        open={previewTarget !== null}
        onOpenChange={(open) => { if (!open) setPreviewTarget(null); }}
        expenseId={expense.id}
        attachment={previewTarget}
      />
    </div>
  );
}
