import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
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
    <div className="container">
      <h1>ログイン</h1>
      {error && <div className="error">{error}</div>}
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
