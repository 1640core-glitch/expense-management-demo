import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Textarea';
import { Button } from '../../components/ui/Button';
import { Category, listCategories } from '../../api/expenses';
import { Template, TemplateInput } from '../../api/templates';
import { createResolver, requiredString, optionalString, requiredSelect } from '../../lib/forms';
import { notifyApiError } from '../../lib/toast';

const schema = z.object({
  name: requiredString('テンプレート名', { max: 100 }),
  categoryId: requiredSelect<string>('カテゴリ'),
  title: optionalString({ max: 200 }),
  amount: z
    .union([z.string(), z.literal('')])
    .optional()
    .refine(
      (v) => {
        if (v === undefined || v === '') return true;
        const n = Number(v);
        return Number.isFinite(n) && Number.isInteger(n) && n > 0;
      },
      { message: '金額は正の整数で入力してください' },
    ),
  description: optionalString({ max: 1000 }),
});

export type TemplateFormValues = z.infer<typeof schema>;

interface Props {
  initial?: Template | null;
  submitting: boolean;
  submitLabel: string;
  onSubmit: (input: TemplateInput) => Promise<void>;
  onCancel: () => void;
}

export default function TemplateForm({ initial, submitting, submitLabel, onSubmit, onCancel }: Props) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCats, setLoadingCats] = useState(true);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TemplateFormValues>({
    resolver: createResolver(schema),
    defaultValues: {
      name: '',
      categoryId: '',
      title: '',
      amount: '',
      description: '',
    },
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const cats = await listCategories();
        if (!cancelled) setCategories(cats);
      } catch (err) {
        console.error('カテゴリの取得に失敗しました', err);
        notifyApiError(err);
      } finally {
        if (!cancelled) setLoadingCats(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (initial) {
      reset({
        name: initial.name,
        categoryId: String(initial.category_id),
        title: initial.title ?? '',
        amount: initial.amount != null ? String(initial.amount) : '',
        description: initial.description ?? '',
      });
    }
  }, [initial, reset]);

  const submit = handleSubmit(async (values) => {
    const input: TemplateInput = {
      name: values.name.trim(),
      categoryId: Number(values.categoryId),
      title: values.title ? values.title.trim() : undefined,
      amount:
        values.amount === undefined || values.amount === ''
          ? null
          : Number(values.amount),
      description: values.description ? values.description.trim() : undefined,
    };
    await onSubmit(input);
  });

  return (
    <form
      onSubmit={(e) => {
        void submit(e);
      }}
    >
      <Input
        label="テンプレート名 *"
        maxLength={100}
        errorText={errors.name?.message}
        disabled={submitting}
        {...register('name')}
      />
      <Select
        label="カテゴリ *"
        placeholder={loadingCats ? '読み込み中...' : '選択してください'}
        errorText={errors.categoryId?.message as string | undefined}
        disabled={submitting || loadingCats}
        {...register('categoryId')}
      >
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </Select>
      <Input
        label="用途・タイトル"
        maxLength={200}
        errorText={errors.title?.message}
        disabled={submitting}
        {...register('title')}
      />
      <Input
        label="金額"
        type="number"
        min={1}
        step={1}
        errorText={errors.amount?.message as string | undefined}
        disabled={submitting}
        {...register('amount')}
      />
      <Textarea
        label="詳細"
        rows={3}
        maxLength={1000}
        errorText={errors.description?.message}
        disabled={submitting}
        {...register('description')}
      />
      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <Button type="submit" variant="primary" disabled={submitting}>
          {submitting ? '保存中...' : submitLabel}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel} disabled={submitting}>
          キャンセル
        </Button>
      </div>
    </form>
  );
}
