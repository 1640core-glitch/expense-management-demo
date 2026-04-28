import { useEffect, useRef } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, DialogContent, DialogFooter } from '../../components/ui/Dialog';
import { Button } from '../../components/ui/Button';
import { Textarea } from '../../components/ui/Textarea';
import { Category, Expense, statusLabel } from '../../api/expenses';
import { jaErrorMap } from '../../lib/forms/errorMessages';
import { approveSchema, rejectSchema } from './approvalSchema';

interface FormValues {
  comment: string;
}

interface Props {
  expense: Expense | null;
  categories: Category[];
  busy: boolean;
  onClose: () => void;
  onApprove: (id: number, comment: string | undefined) => Promise<void>;
  onReject: (id: number, comment: string) => Promise<void>;
}

export default function ApprovalDetailDialog({
  expense,
  categories,
  busy,
  onClose,
  onApprove,
  onReject,
}: Props) {
  const modeRef = useRef<'approve' | 'reject'>('approve');

  const resolver: Resolver<FormValues> = async (values, ctx, opts) => {
    const schema = modeRef.current === 'approve' ? approveSchema : rejectSchema;
    return zodResolver(schema, { errorMap: jaErrorMap })(values, ctx, opts);
  };

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver,
    defaultValues: { comment: '' },
  });

  useEffect(() => {
    if (expense) {
      reset({ comment: '' });
    }
  }, [expense, reset]);

  const categoryName = (id: number): string =>
    categories.find((c) => c.id === id)?.name ?? `#${id}`;

  const submitApprove = handleSubmit(async (values) => {
    if (!expense) return;
    const trimmed = values.comment?.trim() ?? '';
    await onApprove(expense.id, trimmed.length > 0 ? trimmed : undefined);
  });

  const submitReject = handleSubmit(async (values) => {
    if (!expense) return;
    await onReject(expense.id, values.comment.trim());
  });

  const handleApproveClick = () => {
    modeRef.current = 'approve';
    void submitApprove();
  };

  const handleRejectClick = () => {
    modeRef.current = 'reject';
    void submitReject();
  };

  return (
    <Dialog
      open={expense !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent title="申請詳細">
        {expense && (
          <>
            <dl style={{ lineHeight: 1.8, margin: '8px 0 16px' }}>
              <div>
                <strong>申請日:</strong> {expense.expense_date}
              </div>
              <div>
                <strong>カテゴリ:</strong> {categoryName(expense.category_id)}
              </div>
              <div>
                <strong>用途:</strong> {expense.title || '-'}
              </div>
              <div>
                <strong>金額:</strong> ¥{expense.amount.toLocaleString()}
              </div>
              <div>
                <strong>備考:</strong> {expense.description || '-'}
              </div>
              <div>
                <strong>ステータス:</strong> {statusLabel(expense.status)}
              </div>
            </dl>
            <Textarea
              label="コメント"
              rows={3}
              maxLength={500}
              helpText="承認は任意・却下は必須（500文字以内）"
              errorText={errors.comment?.message}
              disabled={busy}
              {...register('comment')}
            />
            <DialogFooter>
              <Button variant="secondary" onClick={onClose} disabled={busy}>
                閉じる
              </Button>
              <Button variant="danger" onClick={handleRejectClick} disabled={busy}>
                却下
              </Button>
              <Button variant="primary" onClick={handleApproveClick} disabled={busy}>
                承認
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
