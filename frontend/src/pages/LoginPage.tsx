import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const DEMO_ACCOUNTS = [
  { label: '管理者', email: 'admin@example.com',     password: 'admin1234' },
  { label: '承認者', email: 'approver@example.com',  password: 'approver1234' },
  { label: '申請者', email: 'applicant@example.com', password: 'applicant1234' },
];

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onDemoLogin = async (acc: (typeof DEMO_ACCOUNTS)[number]) => {
    setError(null);
    setSubmitting(true);
    try {
      await login(acc.email, acc.password);
      navigate('/', { replace: true });
    } catch (err: unknown) {
      console.error('ログインに失敗しました', err);
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'ログインに失敗しました';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h1
        style={{
          textAlign: 'center',
          fontSize: 28,
          fontWeight: 700,
          color: '#1a1f2c',
          margin: '48px 16px 8px',
          letterSpacing: '0.02em',
        }}
      >
        経費精算管理システム
      </h1>
      <p
        style={{
          textAlign: 'center',
          fontSize: 13,
          color: '#6b7280',
          margin: '0 16px 24px',
        }}
      >
        Expense Management System
      </p>

      <div className="container" style={{ marginTop: 0 }}>
        <h2 style={{ fontSize: 18, marginTop: 0, marginBottom: 12 }}>ログイン</h2>

        <p style={{ fontSize: 13, color: '#6b7280', marginTop: 0, marginBottom: 16, lineHeight: 1.6 }}>
          ※ デモサイトのため、ログイン画面は省略しております。<br />
          下記からロールを選択するとそのままログインできます。
        </p>

        {error && <div className="error">{error}</div>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {DEMO_ACCOUNTS.map((acc) => (
            <button
              key={acc.email}
              type="button"
              onClick={() => void onDemoLogin(acc)}
              disabled={submitting}
              style={{ width: '100%' }}
            >
              {submitting ? '送信中...' : `${acc.label} としてログイン`}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
