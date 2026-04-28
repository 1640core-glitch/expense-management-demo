import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, token, loading } = useAuth();
  if (loading) return <div className="container">読み込み中...</div>;
  if (!token || !user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
