import React from 'react';

interface BadgeProps {
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'gray';
  children: React.ReactNode;
  className?: string;
}

const Badge: React.FC<BadgeProps> = ({ variant = 'gray', children, className = '' }) => {
  return (
    <span className={`badge badge-${variant} ${className}`}>
      {children}
    </span>
  );
};

export const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const map: Record<string, { variant: BadgeProps['variant']; label: string }> = {
    ACTIVE: { variant: 'success', label: 'Active' },
    TRIAL: { variant: 'info', label: 'Trial' },
    EXPIRED: { variant: 'danger', label: 'Expired' },
    OPEN: { variant: 'danger', label: 'Open' },
    IN_PROGRESS: { variant: 'warning', label: 'In Progress' },
    RESOLVED: { variant: 'success', label: 'Resolved' },
    CLOSED: { variant: 'gray', label: 'Closed' },
    PAID: { variant: 'success', label: 'Paid' },
    PENDING: { variant: 'warning', label: 'Pending' },
    FAILED: { variant: 'danger', label: 'Failed' },
    REFUNDED: { variant: 'gray', label: 'Refunded' },
    CONVERTED: { variant: 'success', label: 'Converted' },
    MULTI_BRANCH: { variant: 'info', label: 'Multi-Branch' },
    INDEPENDENT: { variant: 'gray', label: 'Independent' },
    BASIC: { variant: 'gray', label: 'Basic' },
    PRO: { variant: 'info', label: 'Pro' },
  };

  const config = map[status] || { variant: 'gray' as const, label: status };
  return <Badge variant={config.variant}>{config.label}</Badge>;
};

export default Badge;
