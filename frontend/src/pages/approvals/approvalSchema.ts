import { z } from 'zod';

export const approveSchema = z.object({
  comment: z.string().max(500, 'コメントは500文字以内で入力してください').optional(),
});

export const rejectSchema = z.object({
  comment: z
    .string()
    .min(1, 'コメントは必須です')
    .max(500, 'コメントは500文字以内で入力してください'),
});

export type ApproveFormValues = z.infer<typeof approveSchema>;
export type RejectFormValues = z.infer<typeof rejectSchema>;
