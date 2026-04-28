import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogFooter,
  Input,
  Textarea,
} from '../../../components/ui';
import { createResolver, requiredString } from '../../../lib/forms';
import { notifyApiError } from '../../../lib/toast';
import { AdminCategory, AdminCategoryInput } from '../../../api/adminCategories';

const schema = z.object({
  name: requiredString('カテゴリ名', { max: 100 }),
  description: z.string().max(500, '説明は500文字以内で入力してください').optional(),
  monthlyLimit: z.string().optional(),
  isActive: z.boolean(),
});

type FormValues = {
  name: string;
  description?: string;
  monthlyLimit?: string;
  isActive: boolean;
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: AdminCategory | null;
  onSubmit: (input: AdminCategoryInput) => Promise<void>;
}

export function CategoryFormDialog({ open, onOpenChange, initial, onSubmit }: Props) {
  const isEdit = Boolean(initial);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: createResolver(schema),
    defaultValues: {
      name: '',
      description: '',
      monthlyLimit: '',
      isActive: true,
    },
  });

  useEffect(() => {
    if (open) {
      reset(
        initial
          ? {
              name: initial.name,
              description: initial.description ?? '',
              monthlyLimit: initial.monthlyLimit != null ? String(initial.monthlyLimit) : '',
              isActive: initial.isActive,
            }
          : {
              name: '',
              description: '',
              monthlyLimit: '',
              isActive: true,
            },
      );
    }
  }, [open, initial, reset]);

  const submit = handleSubmit(async (values) => {
    const monthlyLimitNum =
      values.monthlyLimit && values.monthlyLimit.trim() !== ''
        ? Number(values.monthlyLimit)
        : null;
    if (
      monthlyLimitNum != null &&
      (!Number.isFinite(monthlyLimitNum) || monthlyLimitNum < 0)
    ) {
      return;
    }
    const input: AdminCategoryInput = {
      name: values.name.trim(),
      description: values.description?.trim() ? values.description.trim() : null,
      monthlyLimit: monthlyLimitNum,
      isActive: values.isActive,
    };
    try {
      await onSubmit(input);
      onOpenChange(false);
    } catch (err) {
      console.error('カテゴリの保存に失敗しました', err);
      notifyApiError(err);
    }
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (isSubmitting) return;
        onOpenChange(next);
      }}
    >
      <DialogContent title={isEdit ? 'カテゴリ編集' : 'カテゴリ新規作成'}>
        <form
          onSubmit={(e) => {
            void submit(e);
          }}
        >
          <Input
            label="カテゴリ名 *"
            maxLength={100}
            errorText={errors.name?.message}
            disabled={isSubmitting}
            {...register('name')}
          />
          <Textarea
            label="説明"
            maxLength={500}
            errorText={errors.description?.message}
            disabled={isSubmitting}
            {...register('description')}
          />
          <Input
            label="月次上限額（任意）"
            type="number"
            min={0}
            step={1}
            errorText={errors.monthlyLimit?.message}
            disabled={isSubmitting}
            {...register('monthlyLimit')}
          />
          <Checkbox
            label="有効"
            disabled={isSubmitting}
            {...register('isActive')}
          />
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              キャンセル
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? '保存中...' : isEdit ? '更新' : '作成'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
