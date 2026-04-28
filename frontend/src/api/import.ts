import client from './client';

export interface ImportError {
  row: number;
  message: string;
}

export interface ImportResult {
  inserted: number;
  errors: ImportError[];
  total: number;
}

export async function uploadExpensesCsv(file: File): Promise<ImportResult> {
  const fd = new FormData();
  fd.append('file', file);
  const res = await client.post<ImportResult>('/admin/import/expenses', fd);
  return res.data;
}
