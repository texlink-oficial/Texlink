import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  iconColor?: 'brand' | 'green' | 'yellow' | 'red' | 'blue' | 'purple';
  trend?: {
    value: number;
    label?: string;
    isPositive?: boolean;
  };
  onClick?: () => void;
  className?: string;
  loading?: boolean;
}

const iconColorMap = {
  brand: 'bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400',
  green: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
  yellow: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400',
  red: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
  blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
  purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
};

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = 'brand',
  trend,
  onClick,
  className = '',
  loading = false,
}) => {
  const Component = onClick ? 'button' : 'div';

  if (loading) {
    return (
      <div
        className={`
          bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700
          shadow-card p-5 ${className}
        `}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="skeleton h-4 w-24 rounded mb-2" />
            <div className="skeleton h-8 w-16 rounded mb-2" />
            <div className="skeleton h-3 w-20 rounded" />
          </div>
          <div className="skeleton h-12 w-12 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <Component
      onClick={onClick}
      className={`
        bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700
        shadow-card p-5
        transition-all duration-300 ease-spring
        ${onClick ? `
          cursor-pointer
          hover:shadow-card-hover hover:border-brand-200 dark:hover:border-brand-700
          hover:-translate-y-0.5
          active:scale-[0.99] active:shadow-card
          focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2
        ` : ''}
        ${className}
      `}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
          {subtitle && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>
          )}
          {trend && (
            <div className="flex items-center gap-1.5 mt-2">
              <span
                className={`
                  inline-flex items-center gap-1 text-sm font-medium
                  ${trend.isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}
                `}
              >
                {trend.isPositive ? (
                  <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                {trend.isPositive ? '+' : ''}
                {trend.value}%
              </span>
              {trend.label && (
                <span className="text-xs text-gray-500 dark:text-gray-400">{trend.label}</span>
              )}
            </div>
          )}
        </div>
        {Icon && (
          <div
            className={`
              p-3 rounded-xl transition-transform duration-300
              ${iconColorMap[iconColor]}
              ${onClick ? 'group-hover:scale-110' : ''}
            `}
          >
            <Icon className="h-6 w-6" aria-hidden="true" />
          </div>
        )}
      </div>
    </Component>
  );
};

export default MetricCard;
