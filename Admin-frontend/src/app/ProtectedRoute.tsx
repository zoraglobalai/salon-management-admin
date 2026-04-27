import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../modules/auth/authStore';

const ProtectedRoute: React.FC = () => {
  const { isAuthenticated, user } = useAuthStore();
  
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  
  // Strict check for SUPER_ADMIN role
  if (user?.role !== 'SUPER_ADMIN') {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
