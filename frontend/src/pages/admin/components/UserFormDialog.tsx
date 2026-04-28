import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  Input,
  Select,
} from '../../../components/ui';
import {
  createResolver,
  requiredString,
  requiredSelect,
} from '../../../lib/forms';
import { notifyApiError } from '../../../lib/toast';
import { AdminUser, AdminUserInput, UserRole } from '../../../api/adminUsers';

const ROLES: { value: UserRole; label: string }[] = [
  { value: 'employee', label: '一般社員' },
  { value: 'approver', label: '承認者' },
  { value: 'accounting', label: '経理' },
  { value: 'admin', label: '管理者' },
];

function buildSchema(isEdit: boolean) {
  return z.object({
    email: requiredString('メールアドレス', { max: 255 }).email('メールアドレスの形式が正しくありません'),
    password: isEdit
      ? z.string().optional()
      : requiredString('パスワード', { min: 8, max: 128 }),
    name: requiredString('氏名', { max: 100 }),
    role: requiredSelect<UserRole>('ロール'),
    managerId: z.string().optional(),
  });
}

type FormValues = {
  email: string;
  password?: string;
  name: string;
  role: UserRole;
  managerId?: string;
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: AdminUser | null;
  onSubmit: (input: AdminUserInput) => Promise<void>;
}

export function UserFormDialog({ open, onOpenChange, initial, onSubmit }: Props) {
  const isEdit = Boolean(initial);
  const schema = buildSchema(isEdit);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: createResolver(schema),
    defaultValues: {
      email: '',
      password: '',
      name: '',
      role: 'employee',
      managerId: '',
    },
  });

  useEffect(() => {
    if (open) {
      reset(
        initial
          ? {
              email: initial.email,
              password: '',
              name: initial.name,
              role: initial.role,
              managerId: initial.managerId != null ? String(initial.managerId) : '',
            }
          : {
              email: '',
              password: '',
              name: '',
              role: 'employee',
              managerId: '',
            },
      );
    }
  }, [open, initial, reset]);

  const submit = handleSubmit(async (values) => {
    const managerIdNum =
      values.managerId && values.managerId.trim() !== ''
        ? Number(values.managerId)
        : null;
    if (managerIdNum != null && (!Number.isInteger(managerIdNum) || managerIdNum <= 0)) {
      return;
    }
    const input: AdminUserInput = {
      email: values.email.trim(),
      name: values.name.trim(),
      role: values.role,
      managerId: managerIdNum,
    };
    if (values.password && values.password !== '') {
      input.password = values.password;
    }
    try {
      await onSubmit(input);
      onOpenChange(false);
    } catch (err) {
      console.error('ユーザーの保存に失敗しました', err);
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
      <DialogContent title={isEdit ? 'ユーザー編集' : 'ユーザー新規作成'}>
        <form
          onSubmit={(e) => {
            void submit(e);
          }}
        >
          <Input
            label="メールアドレス *"
            type="email"
            maxLength={255}
            errorText={errors.email?.message}
            disabled={isSubmitting}
            {...register('email')}
          />
          <Input
            label={isEdit ? 'パスワード（変更する場合のみ入力）' : 'パスワード *'}
            type="password"
            maxLength={128}
            errorText={errors.password?.message}
            disabled={isSubmitting}
            {...register('password')}
          />
          <Input
            label="氏名 *"
            maxLength={100}
            errorText={errors.name?.message}
            disabled={isSubmitting}
            {...register('name')}
          />
          <Select
            label="ロール *"
            errorText={errors.role?.message as string | undefined}
            disabled={isSubmitting}
            {...register('role')}
          >
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </Select>
          <Input
            label="マネージャーID（任意）"
            type="number"
            min={1}
            step={1}
            errorText={errors.managerId?.message}
            disabled={isSubmitting}
            {...register('managerId')}
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
