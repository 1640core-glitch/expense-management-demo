import { ReactNode, useState } from 'react';
import type { AxiosError } from 'axios';
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  toast,
} from '../../../components/ui';
import { ApiError, normalizeError } from '../../../api/errors';

export interface ConfirmDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void> | void;
  itemLabel: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  successMessage?: string;
}

export function ConfirmDeleteDialog({
  open,
  onOpenChange,
  onConfirm,
  itemLabel,
  title = '削除の確認',
  description,
  confirmLabel = '削除',
  cancelLabel = 'キャンセル',
  successMessage,
}: ConfirmDeleteDialogProps) {
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      await onConfirm();
      if (successMessage) {
        toast.success(successMessage);
      }
      onOpenChange(false);
    } catch (err: unknown) {
      console.error('削除に失敗しました', err);
      const apiErr =
        err instanceof ApiError ? err : normalizeError(err as AxiosError);
      if (!apiErr.silent) {
        toast.error(apiErr.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (submitting) return;
        onOpenChange(next);
      }}
    >
      <DialogContent title={title} description={description}>
        <p style={{ margin: '8px 0 16px' }}>
          「{itemLabel}」を削除します。この操作は取り消せません。
        </p>
        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            {cancelLabel}
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              void handleConfirm();
            }}
            disabled={submitting}
          >
            {submitting ? '実行中...' : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
