import client from './client';

export interface Notification {
  id: number;
  user_id: number;
  type: string;
  payload_json: string | null;
  read_at: string | null;
  created_at: string;
}

export async function listNotifications(signal?: AbortSignal): Promise<Notification[]> {
  const res = await client.get<Notification[]>('/notifications', { signal });
  return res.data;
}

export async function markRead(id: number): Promise<Notification> {
  const res = await client.patch<Notification>(`/notifications/${id}/read`);
  return res.data;
}

export async function markAllRead(): Promise<{ updated: number }> {
  const res = await client.post<{ updated: number }>('/notifications/read-all');
  return res.data;
}
