import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await register(email, password, name);
      navigate('/', { replace: true });
    } catch (err: unknown) {
      console.error('登録に失敗しました', err);
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        '登録に失敗しました';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container">
      <h1>新規登録</h1>
      {error && <div className="error">{error}</div>}
      <form onSubmit={onSubmit}>
        <label>氏名</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
        <label>メールアドレス</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <label>パスワード</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <button type="submit" disabled={submitting}>
          {submitting ? '送信中...' : '登録'}
        </button>
      </form>
      <p style={{ marginTop: 16, fontSize: 14 }}>
        既にアカウントをお持ちの方は <Link className="link" to="/login">ログイン</Link>
      </p>
    </div>
  );
}
