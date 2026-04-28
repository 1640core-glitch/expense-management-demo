import client from './client';

export interface Template {
  id: number;
  user_id: number;
  name: string;
  category_id: number;
  title: string | null;
  amount: number | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface TemplateInput {
  name: string;
  categoryId: number;
  title?: string;
  amount?: number | null;
  description?: string;
}

export async function listTemplates(): Promise<Template[]> {
  const res = await client.get<Template[]>('/templates');
  return res.data;
}

export async function createTemplate(input: TemplateInput): Promise<Template> {
  const res = await client.post<Template>('/templates', input);
  return res.data;
}

export async function updateTemplate(id: number, input: TemplateInput): Promise<Template> {
  const res = await client.put<Template>(`/templates/${id}`, input);
  return res.data;
}

export async function deleteTemplate(id: number): Promise<void> {
  await client.delete(`/templates/${id}`);
}
