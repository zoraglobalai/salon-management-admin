import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../modules/auth/hooks/useAuth';

export const ProtectedRoute: React.FC = () => {
  const { token, user } = useAuth();

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};
