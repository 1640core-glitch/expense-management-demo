import type { z } from 'zod';
import type { UseFormSetError, FieldValues, Path } from 'react-hook-form';

type LabelTemplate =
  | 'required'
  | 'maxLength'
  | 'minLength'
  | 'positive'
  | 'integer'
  | 'invalidDate';

export function formatLabel(
  label: string,
  template: LabelTemplate,
  params?: Record<string, unknown>
): string {
  switch (template) {
    case 'required':
      return `${label}は必須です`;
    case 'maxLength':
      return `${label}は${params?.max ?? ''}文字以内で入力してください`;
    case 'minLength':
      return `${label}は${params?.min ?? ''}文字以上で入力してください`;
    case 'positive':
      return `${label}は0より大きい値を入力してください`;
    case 'integer':
      return `${label}は整数で入力してください`;
    case 'invalidDate':
      return `${label}は有効な日付（YYYY-MM-DD）で入力してください`;
    default:
      return label;
  }
}

export const jaErrorMap: z.ZodErrorMap = (issue, ctx) => {
  switch (issue.code) {
    case 'invalid_type':
      if (issue.received === 'undefined' || issue.received === 'null') {
        return { message: '入力してください' };
      }
      return { message: '入力値の形式が正しくありません' };
    case 'too_small':
      if (issue.type === 'string') {
        if (issue.minimum === 1) return { message: '入力してください' };
        return { message: `${issue.minimum}文字以上で入力してください` };
      }
      if (issue.type === 'number') {
        return { message: `${issue.minimum}以上の値を入力してください` };
      }
      return { message: ctx.defaultError };
    case 'too_big':
      if (issue.type === 'string') {
        return { message: `${issue.maximum}文字以内で入力してください` };
      }
      if (issue.type === 'number') {
        return { message: `${issue.maximum}以下の値を入力してください` };
      }
      return { message: ctx.defaultError };
    case 'invalid_string':
      return { message: '入力値の形式が正しくありません' };
    case 'invalid_date':
      return { message: '有効な日付を入力してください' };
    case 'custom':
      return { message: issue.message ?? ctx.defaultError };
    default:
      return { message: ctx.defaultError };
  }
};

interface ServerFieldError {
  field: string;
  message: string;
}

interface AxiosLikeError {
  response?: {
    data?: {
      error?: string;
      errors?: ServerFieldError[];
    };
  };
  message?: string;
}

export function applyServerErrors<TFieldValues extends FieldValues>(
  setError: UseFormSetError<TFieldValues>,
  err: unknown,
  fieldMap?: Record<string, string>
): string | null {
  const axiosErr = err as AxiosLikeError;
  const data = axiosErr?.response?.data;
  const fieldErrors = data?.errors;

  if (Array.isArray(fieldErrors) && fieldErrors.length > 0) {
    for (const fe of fieldErrors) {
      const path = (fieldMap?.[fe.field] ?? fe.field) as Path<TFieldValues>;
      setError(path, { type: 'server', message: fe.message });
    }
    return null;
  }

  if (typeof data?.error === 'string' && data.error.length > 0) {
    return data.error;
  }

  if (typeof axiosErr?.message === 'string' && axiosErr.message.length > 0) {
    return axiosErr.message;
  }

  return 'エラーが発生しました';
}
