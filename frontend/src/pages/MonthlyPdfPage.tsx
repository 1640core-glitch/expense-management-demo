import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button, Input, Select } from '../components/ui';
import {
  createResolver,
  requiredNumberFromInput,
} from '../lib/forms';
import { notifyApiError, notifyInfo, notifySuccess } from '../lib/toast';
import { useAuth } from '../context/AuthContext';
import { downloadMonthlyPdf } from '../api/exports';
import { AdminUser, list as listAdminUsers } from '../api/adminUsers';

const schema = z.object({
  year: requiredNumberFromInput('年', { integer: true, min: 2000, max: 2999 }),
  month: requiredNumberFromInput('月', { integer: true, min: 1, max: 12 }),
  userId: z.string().optional(),
});

type FormValues = {
  year: number;
  month: number;
  userId?: string;
};

export default function MonthlyPdfPage() {
  const { user } = useAuth();
  const canSelectUser = user?.role === 'admin' || user?.role === 'accounting';

  const now = new Date();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: createResolver(schema),
    defaultValues: {
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      userId: '',
    },
  });

  useEffect(() => {
    if (!canSelectUser) return;
    let cancelled = false;
    listAdminUsers()
      .then((list) => {
        if (!cancelled) setUsers(list);
      })
      .catch((err) => {
        console.error('ユーザー一覧の取得に失敗しました', err);
        notifyApiError(err);
      });
    return () => {
      cancelled = true;
    };
  }, [canSelectUser]);

  const submit = handleSubmit(async (values) => {
    const userIdNum =
      values.userId && values.userId.trim() !== ''
        ? Number(values.userId)
        : undefined;
    setSubmitting(true);
    notifyInfo('PDFをダウンロードしています...');
    try {
      const blob = await downloadMonthlyPdf(values.year, values.month, userIdNum);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `expense-report-${values.year}-${String(values.month).padStart(2, '0')}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      notifySuccess('PDFのダウンロードが完了しました');
    } catch (err) {
      console.error('PDFダウンロードに失敗しました', err);
      notifyApiError(err);
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <div className="home" style={{ maxWidth: 720 }}>
      <h1>月次PDFダウンロード</h1>
      <form
        onSubmit={(e) => {
          void submit(e);
        }}
        style={{
          background: '#fff',
          padding: 16,
          borderRadius: 8,
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <Input
          label="年 *"
          type="number"
          min={2000}
          max={2999}
          step={1}
          errorText={errors.year?.message as string | undefined}
          disabled={submitting}
          {...register('year')}
        />
        <Input
          label="月 *"
          type="number"
          min={1}
          max={12}
          step={1}
          errorText={errors.month?.message as string | undefined}
          disabled={submitting}
          {...register('month')}
        />
        {canSelectUser && (
          <Select
            label="対象ユーザー（任意）"
            errorText={errors.userId?.message}
            disabled={submitting}
            {...register('userId')}
          >
            <option value="">全ユーザー</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}（{u.email}）
              </option>
            ))}
          </Select>
        )}
        <div>
          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting ? 'ダウンロード中...' : 'PDFダウンロード'}
          </Button>
        </div>
      </form>
    </div>
  );
}
