import client from './client';

export type UserRole = 'employee' | 'approver' | 'accounting' | 'admin';

export interface AdminUser {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  managerId: number | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface AdminUserInput {
  email: string;
  password?: string;
  name: string;
  role: UserRole;
  managerId?: number | null;
}

interface AdminUserResponse {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  manager_id: number | null;
  created_at?: string;
  updated_at?: string;
}

function fromResponse(u: AdminUserResponse): AdminUser {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    managerId: u.manager_id,
    createdAt: u.created_at,
    updatedAt: u.updated_at,
  };
}

function toRequest(input: AdminUserInput): Record<string, unknown> {
  const body: Record<string, unknown> = {
    email: input.email,
    name: input.name,
    role: input.role,
    manager_id: input.managerId ?? null,
  };
  if (input.password !== undefined && input.password !== '') {
    body.password = input.password;
  }
  return body;
}

export async function list(): Promise<AdminUser[]> {
  const res = await client.get<AdminUserResponse[]>('/admin/users');
  return res.data.map(fromResponse);
}

export async function create(input: AdminUserInput): Promise<AdminUser> {
  const res = await client.post<AdminUserResponse>('/admin/users', toRequest(input));
  return fromResponse(res.data);
}

export async function update(id: number, input: AdminUserInput): Promise<AdminUser> {
  const res = await client.patch<AdminUserResponse>(`/admin/users/${id}`, toRequest(input));
  return fromResponse(res.data);
}

export async function remove(id: number): Promise<void> {
  await client.delete(`/admin/users/${id}`);
}
