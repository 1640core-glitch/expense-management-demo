import client from './client';

export interface AdminCategory {
  id: number;
  name: string;
  description: string | null;
  monthlyLimit: number | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AdminCategoryInput {
  name: string;
  description?: string | null;
  monthlyLimit?: number | null;
  isActive?: boolean;
}

interface AdminCategoryResponse {
  id: number;
  name: string;
  description: string | null;
  monthly_limit: number | null;
  is_active: number | boolean;
  created_at?: string;
  updated_at?: string;
}

function fromResponse(c: AdminCategoryResponse): AdminCategory {
  return {
    id: c.id,
    name: c.name,
    description: c.description,
    monthlyLimit: c.monthly_limit,
    isActive: !!c.is_active,
    createdAt: c.created_at,
    updatedAt: c.updated_at,
  };
}

function toRequest(input: AdminCategoryInput): Record<string, unknown> {
  const body: Record<string, unknown> = {
    name: input.name,
  };
  if (input.description !== undefined) {
    body.description = input.description;
  }
  if (input.monthlyLimit !== undefined) {
    body.monthly_limit = input.monthlyLimit;
  }
  if (input.isActive !== undefined) {
    body.is_active = input.isActive;
  }
  return body;
}

function unwrap(data: AdminCategoryResponse | { category: AdminCategoryResponse }): AdminCategoryResponse {
  if (data && typeof data === 'object' && 'category' in data) {
    return (data as { category: AdminCategoryResponse }).category;
  }
  return data as AdminCategoryResponse;
}

export async function list(): Promise<AdminCategory[]> {
  const res = await client.get<AdminCategoryResponse[]>('/admin/categories');
  return res.data.map(fromResponse);
}

export async function create(input: AdminCategoryInput): Promise<AdminCategory> {
  const res = await client.post<AdminCategoryResponse | { category: AdminCategoryResponse }>(
    '/admin/categories',
    toRequest(input),
  );
  return fromResponse(unwrap(res.data));
}

export async function update(id: number, input: AdminCategoryInput): Promise<AdminCategory> {
  const res = await client.patch<AdminCategoryResponse | { category: AdminCategoryResponse }>(
    `/admin/categories/${id}`,
    toRequest(input),
  );
  return fromResponse(unwrap(res.data));
}

export async function remove(id: number): Promise<void> {
  await client.delete(`/admin/categories/${id}`);
}
