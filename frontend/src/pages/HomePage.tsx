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
        <p>申請フォーム・一覧・承認・ダッシュボードは後続フェーズで提供されます。</p>
      </div>
    </>
  );
}
