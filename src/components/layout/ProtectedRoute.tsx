import React, { useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { LoadingState } from '../common/LoadingState';

interface ProtectedRouteProps {
  children: React.ReactNode;
  onRedirectToLogin: () => void;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  onRedirectToLogin
}) => {
  const { user, loading } = useAuth();
  const shouldRedirect = !loading && !user;

  useEffect(() => {
    if (shouldRedirect) {
      onRedirectToLogin();
    }
  }, [onRedirectToLogin, shouldRedirect]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
        <LoadingState
          message="Verifying ORBIT access..."
          subtext="Preparing your secure workspace"
        />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
};
