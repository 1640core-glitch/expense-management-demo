import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function HomePage() {
  const { user, logout } = useAuth();
  return (
    <>
      <nav>
        <strong>経費精算システム</strong>
        <div className="spacer" />
        <span style={{ fontSize: 14 }}>{user?.name}（{user?.role}）</span>
        <button onClick={() => { void logout(); }}>ログアウト</button>
      </nav>
      <div className="home">
        <h1>ホーム</h1>
        <p>ようこそ、{user?.name} さん。</p>
        <ul style={{ lineHeight: 1.9 }}>
          <li><Link className="link" to="/expenses/new">経費を申請する</Link></li>
          <li><Link className="link" to="/expenses">自分の申請一覧</Link></li>
        </ul>
        <p style={{ fontSize: 13, color: '#64748b' }}>承認・ダッシュボードは後続フェーズで提供されます。</p>
      </div>
    </>
  );
}
