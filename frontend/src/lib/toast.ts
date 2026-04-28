import { toast } from '../components/ui/Toast/Toast';
import { ApiError } from '../api/errors';

export function notifySuccess(message: string): void {
  toast.success(message);
}

export function notifyInfo(message: string): void {
  toast.info(message);
}

export function notifyWarning(message: string): void {
  toast.warning(message);
}

export function notifyError(err: unknown, fallback?: string): void {
  let message = fallback ?? 'エラーが発生しました';
  if (err instanceof ApiError) {
    message = err.message;
  } else if (err instanceof Error && err.message) {
    message = err.message;
  } else if (typeof err === 'string' && err) {
    message = err;
  }
  toast.error(message);
}

export function notifyApiError(
  err: unknown,
  opts?: { silent401?: boolean }
): void {
  const silent401 = opts?.silent401 ?? true;
  if (err instanceof ApiError) {
    if (err.status === 401 && silent401) {
      return;
    }
    if (err.status === 409) {
      toast.warning(err.message);
      return;
    }
    toast.error(err.message);
    return;
  }
  notifyError(err);
}
