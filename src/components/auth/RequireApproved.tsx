import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/useAuth';
import { RequireAuth } from '@/components/auth/RequireAuth';

interface RequireApprovedProps {
  children: ReactNode;
}

export const RequireApproved = ({ children }: RequireApprovedProps) => {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (user && !profile?.isApproved) {
    return <Navigate to="/get-approved" replace />;
  }

  return <RequireAuth>{children}</RequireAuth>;
};
