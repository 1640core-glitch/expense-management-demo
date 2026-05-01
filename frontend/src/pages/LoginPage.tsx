import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const DEMO_ACCOUNTS = [
  { label: '管理者', email: 'admin@example.com',     password: 'admin1234' },
  { label: '承認者', email: 'approver@example.com',  password: 'approver1234' },
  { label: '申請者', email: 'applicant@example.com', password: 'applicant1234' },
];

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const performLogin = async (loginEmail: string, loginPassword: string) => {
    setError(null);
    setSubmitting(true);
    try {
      await login(loginEmail, loginPassword);
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

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void performLogin(email, password);
  };

  const onDemoLogin = (acc: (typeof DEMO_ACCOUNTS)[number]) => {
    setEmail(acc.email);
    setPassword(acc.password);
    void performLogin(acc.email, acc.password);
  };

  return (
    <div className="container">
      <h1>ログイン</h1>
      {error && <div className="error">{error}</div>}

      <div style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 14, marginBottom: 8 }}>ロールを選んでログイン:</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {DEMO_ACCOUNTS.map((acc) => (
            <button
              key={acc.email}
              type="button"
              onClick={() => onDemoLogin(acc)}
              disabled={submitting}
              style={{ flex: '1 1 calc(50% - 4px)', minWidth: 120 }}
            >
              {acc.label}
            </button>
          ))}
        </div>
      </div>

      <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '16px 0' }} />

      <form onSubmit={onSubmit}>
        <label>メールアドレス</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <label>パスワード</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <button type="submit" disabled={submitting}>
          {submitting ? '送信中...' : 'ログイン'}
        </button>
      </form>
      <p style={{ marginTop: 16, fontSize: 14 }}>
        アカウントをお持ちでない方は <Link className="link" to="/register">新規登録</Link>
      </p>
    </div>
  );
}
