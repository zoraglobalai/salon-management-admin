import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../modules/auth/hooks/useAuth';

export const ProtectedRoute: React.FC = () => {
  const { token, user } = useAuth();
  const location = useLocation();

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  const requiresFirstPasswordReset =
    (user.role === 'OWNER' || user.role === 'INDEPENDENT_OWNER') &&
    user.passwordResetRequired === true;

  if (requiresFirstPasswordReset && location.pathname !== '/create-new-password') {
    return <Navigate to="/create-new-password" replace />;
  }

  if (!requiresFirstPasswordReset && location.pathname === '/create-new-password') {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};
