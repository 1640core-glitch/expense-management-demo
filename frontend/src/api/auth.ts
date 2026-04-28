import client from './client';

export interface User {
  id: number;
  email: string;
  name: string;
  role: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export async function register(email: string, password: string, name: string): Promise<AuthResponse> {
  const res = await client.post<AuthResponse>('/auth/register', { email, password, name });
  return res.data;
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const res = await client.post<AuthResponse>('/auth/login', { email, password });
  return res.data;
}

export async function logout(): Promise<void> {
  await client.post('/auth/logout');
}

export async function me(): Promise<User> {
  const res = await client.get<User>('/auth/me');
  return res.data;
}
