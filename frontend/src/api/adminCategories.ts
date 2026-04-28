import client from './client';

export interface AdminCategory {
  id: number;
  name: string;
  description: string | null;
  monthlyLimit: number | null;
  isActive: boolean;
  displayOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface AdminCategoryInput {
  name: string;
  description?: string | null;
  monthlyLimit?: number | null;
  isActive?: boolean;
  displayOrder?: number | null;
}

interface AdminCategoryResponse {
  id: number;
  name: string;
  description: string | null;
  monthlyLimit: number | null;
  isActive: boolean;
  displayOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

function fromResponse(c: AdminCategoryResponse): AdminCategory {
  return {
    id: c.id,
    name: c.name,
    description: c.description,
    monthlyLimit: c.monthlyLimit,
    isActive: c.isActive,
    displayOrder: c.displayOrder,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
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
    body.monthlyLimit = input.monthlyLimit;
  }
  if (input.isActive !== undefined) {
    body.isActive = input.isActive;
  }
  if (input.displayOrder !== undefined && input.displayOrder !== null) {
    body.displayOrder = input.displayOrder;
  }
  return body;
}

function unwrapItem(data: AdminCategoryResponse | { category: AdminCategoryResponse }): AdminCategoryResponse {
  if (data && typeof data === 'object' && 'category' in data) {
    return (data as { category: AdminCategoryResponse }).category;
  }
  return data as AdminCategoryResponse;
}

export async function list(): Promise<AdminCategory[]> {
  const res = await client.get<{ categories: AdminCategoryResponse[] } | AdminCategoryResponse[]>(
    '/admin/categories',
  );
  const items = Array.isArray(res.data)
    ? res.data
    : res.data.categories;
  return items.map(fromResponse);
}

export async function create(input: AdminCategoryInput): Promise<AdminCategory> {
  const res = await client.post<AdminCategoryResponse | { category: AdminCategoryResponse }>(
    '/admin/categories',
    toRequest(input),
  );
  return fromResponse(unwrapItem(res.data));
}

export async function update(id: number, input: AdminCategoryInput): Promise<AdminCategory> {
  const res = await client.patch<AdminCategoryResponse | { category: AdminCategoryResponse }>(
    `/admin/categories/${id}`,
    toRequest(input),
  );
  return fromResponse(unwrapItem(res.data));
}

export async function reorder(id: number, displayOrder: number): Promise<AdminCategory> {
  const res = await client.patch<AdminCategoryResponse | { category: AdminCategoryResponse }>(
    `/admin/categories/${id}`,
    { displayOrder },
  );
  return fromResponse(unwrapItem(res.data));
}

export async function remove(id: number): Promise<void> {
  await client.delete(`/admin/categories/${id}`);
}
