import type { AxiosError } from 'axios';

export class ApiError extends Error {
  name = 'ApiError' as const;
  status: number;
  code?: string;
  details?: unknown;
  silent: boolean;
  raw: AxiosError;

  constructor(params: {
    status: number;
    message: string;
    code?: string;
    details?: unknown;
    silent?: boolean;
    raw: AxiosError;
  }) {
    super(params.message);
    this.status = params.status;
    this.code = params.code;
    this.details = params.details;
    this.silent = params.silent ?? false;
    this.raw = params.raw;
  }
}

const DEFAULT_MESSAGES: Record<number, string> = {
  0: 'ネットワークエラーが発生しました',
  400: '入力内容に誤りがあります',
  401: '認証が必要です',
  403: '権限がありません',
  404: '対象が見つかりません',
  409: '競合が発生しました',
  413: 'ファイルサイズが上限を超えています',
  500: 'サーバーエラーが発生しました',
};

function defaultMessage(status: number, code?: string): string {
  if (status === 409 && code === 'MONTH_CLOSED') {
    return '対象月は締め済みです';
  }
  if (DEFAULT_MESSAGES[status]) {
    return DEFAULT_MESSAGES[status];
  }
  return `エラーが発生しました (status: ${status})`;
}

export function normalizeError(error: AxiosError): ApiError {
  if (error.response) {
    const status = error.response.status;
    const data = error.response.data as
      | { error?: string; code?: string; details?: unknown }
      | undefined;
    const code = data?.code;
    const message = data?.error ?? defaultMessage(status, code);
    return new ApiError({
      status,
      message,
      code,
      details: data?.details,
      raw: error,
    });
  }
  if (error.code === 'ERR_CANCELED') {
    return new ApiError({
      status: 0,
      message: defaultMessage(0),
      silent: true,
      raw: error,
    });
  }
  return new ApiError({
    status: 0,
    message: defaultMessage(0),
    raw: error,
  });
}
