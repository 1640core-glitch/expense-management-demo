import client from './client';
import { Expense } from './expenses';

export interface AdminExpenseQuery {
  status?: string;
  category_id?: number;
  user_id?: number;
  from?: string;
  to?: string;
}

export interface MonthlyCategory {
  category_id: number;
  category_name: string;
  total: number;
  count: number;
}

export interface MonthlyReport {
  year: number;
  month: number;
  total: number;
  categories: MonthlyCategory[];
}

export async function listAllExpenses(q: AdminExpenseQuery = {}): Promise<Expense[]> {
  const params: Record<string, string> = {};
  if (q.status) params.status = q.status;
  if (q.category_id) params.category_id = String(q.category_id);
  if (q.user_id) params.user_id = String(q.user_id);
  if (q.from) params.from = q.from;
  if (q.to) params.to = q.to;
  const res = await client.get<Expense[]>('/expenses', { params });
  return res.data;
}

export interface SummaryCategory {
  categoryId: number;
  categoryName: string;
  total: number;
}

export interface Summary {
  total: number;
  byCategory: SummaryCategory[];
}

export async function getSummary(yearMonth: string): Promise<Summary> {
  const res = await client.get<{ total: number; byCategory: SummaryCategory[] }>(
    '/reports/summary',
    { params: { yearMonth } },
  );
  return { total: res.data.total, byCategory: res.data.byCategory };
}

export async function getMonthlyReport(year: number, month: number): Promise<MonthlyReport> {
  const res = await client.get<MonthlyReport>('/reports/monthly', { params: { year, month } });
  return res.data;
}

export async function downloadMonthlyCsv(year: number, month: number): Promise<Blob> {
  const res = await client.get<Blob>('/reports/csv', {
    params: { year, month },
    responseType: 'blob',
  });
  return res.data;
}
