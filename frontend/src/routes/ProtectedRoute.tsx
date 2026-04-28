import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface Props {
  children: ReactNode;
  roles?: string[];
}

export default function ProtectedRoute({ children, roles }: Props) {
  const { user, token, loading } = useAuth();
  if (loading) return <div className="container">読み込み中...</div>;
  if (!token || !user) return <Navigate to="/login" replace />;
  if (roles && roles.length > 0 && !roles.includes(user.role)) {
    return (
      <div className="container">
        <p>このページにアクセスする権限がありません。</p>
      </div>
    );
  }
  return <>{children}</>;
}
