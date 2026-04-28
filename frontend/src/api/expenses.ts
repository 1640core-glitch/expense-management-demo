import client from './client';

export type ExpenseStatus = 'draft' | 'pending' | 'approved' | 'rejected';

export interface Expense {
  id: number;
  user_id: number;
  category_id: number;
  title: string | null;
  amount: number;
  expense_date: string;
  description: string | null;
  receipt_path: string | null;
  status: ExpenseStatus;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: number;
  name: string;
  description: string | null;
  is_active: number;
}

export interface ExpenseInput {
  category_id: number;
  title?: string;
  amount: number;
  expense_date: string;
  description?: string;
  receipt?: File | null;
}

function toFormData(input: ExpenseInput): FormData {
  const fd = new FormData();
  fd.append('category_id', String(input.category_id));
  fd.append('amount', String(input.amount));
  fd.append('expense_date', input.expense_date);
  if (input.title !== undefined) fd.append('title', input.title);
  if (input.description !== undefined) fd.append('description', input.description);
  if (input.receipt) fd.append('receipt', input.receipt);
  return fd;
}

export async function listMyExpenses(status?: ExpenseStatus): Promise<Expense[]> {
  const res = await client.get<Expense[]>('/expenses', { params: status ? { status } : undefined });
  return res.data;
}

export async function getExpense(id: number): Promise<Expense> {
  const res = await client.get<Expense>(`/expenses/${id}`);
  return res.data;
}

export async function createExpense(input: ExpenseInput): Promise<Expense> {
  const res = await client.post<Expense>('/expenses', toFormData(input));
  return res.data;
}

export async function updateExpense(id: number, input: ExpenseInput): Promise<Expense> {
  const res = await client.patch<Expense>(`/expenses/${id}`, toFormData(input));
  return res.data;
}

export async function deleteExpense(id: number): Promise<void> {
  await client.delete(`/expenses/${id}`);
}

export async function submitExpense(id: number): Promise<Expense> {
  const res = await client.post<Expense>(`/expenses/${id}/submit`);
  return res.data;
}

export async function listCategories(): Promise<Category[]> {
  const res = await client.get<Category[]>('/categories');
  return res.data;
}

export function receiptUrl(id: number): string {
  return `/api/expenses/${id}/receipt`;
}

export function statusLabel(status: ExpenseStatus): string {
  switch (status) {
    case 'draft': return '下書き';
    case 'pending': return '申請中';
    case 'approved': return '承認済み';
    case 'rejected': return '却下';
    default: return status;
  }
}
