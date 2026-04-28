import client from './client';

export async function downloadMonthlyPdf(
  year: number,
  month: number,
  userId?: number,
): Promise<Blob> {
  const params: Record<string, number> = { year, month };
  if (userId !== undefined) {
    params.userId = userId;
  }
  const res = await client.get<Blob>('/exports/monthly.pdf', {
    params,
    responseType: 'blob',
  });
  return res.data;
}
