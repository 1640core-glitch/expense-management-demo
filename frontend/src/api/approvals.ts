import client from './client';
import { Expense } from './expenses';

export async function listPendingApprovals(): Promise<Expense[]> {
  const res = await client.get<Expense[]>('/expenses', { params: { status: 'pending' } });
  return res.data;
}

export async function approveExpense(id: number, comment?: string): Promise<Expense> {
  const res = await client.post<Expense>(`/expenses/${id}/approve`, { comment: comment || null });
  return res.data;
}

export async function rejectExpense(id: number, comment?: string): Promise<Expense> {
  const res = await client.post<Expense>(`/expenses/${id}/reject`, { comment: comment || null });
  return res.data;
}
