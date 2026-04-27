import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: { value: number; label: string };
  color?: 'default' | 'success' | 'warning' | 'danger' | 'info';
}

const colorMap = {
  default: { bg: 'bg-gray-100', icon: 'text-gray-600', value: 'text-[var(--color-text-primary)]' },
  success: { bg: 'bg-green-50', icon: 'text-green-600', value: 'text-green-700' },
  warning: { bg: 'bg-amber-50', icon: 'text-amber-600', value: 'text-amber-700' },
  danger: { bg: 'bg-red-50', icon: 'text-red-600', value: 'text-red-700' },
  info: { bg: 'bg-blue-50', icon: 'text-blue-600', value: 'text-blue-700' },
};

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  trend,
  color = 'default',
}) => {
  const colors = colorMap[color];

  return (
    <div className="card p-5 hover:shadow-card-hover transition-shadow duration-200">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-1.5">
            {title}
          </p>
          <p className={`text-2xl font-bold ${colors.value}`}>{value}</p>
          {trend && (
            <div className="flex items-center gap-1 mt-1.5">
              {trend.value > 0 ? (
                <TrendingUp size={12} className="text-green-500" />
              ) : trend.value < 0 ? (
                <TrendingDown size={12} className="text-red-500" />
              ) : (
                <Minus size={12} className="text-gray-400" />
              )}
              <span className={`text-xs ${trend.value > 0 ? 'text-green-600' : trend.value < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                {trend.value > 0 ? '+' : ''}{trend.value}% {trend.label}
              </span>
            </div>
          )}
        </div>
        <div className={`w-10 h-10 rounded-xl ${colors.bg} flex items-center justify-center shrink-0`}>
          <span className={colors.icon}>{icon}</span>
        </div>
      </div>
    </div>
  );
};

export default StatCard;
