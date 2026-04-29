import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../modules/auth/hooks/useAuth';
import { canAccessPOS } from '../utils/posAccess';

type POSRouteGuardProps = {
  children: React.ReactNode;
};

/**
 * Route guard for POS/Sales pages
 * Prevents owners with assigned managers from accessing POS
 * Redirects them to the dashboard instead
 */
export function POSRouteGuard({ children }: POSRouteGuardProps): React.ReactNode {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!canAccessPOS(user)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
