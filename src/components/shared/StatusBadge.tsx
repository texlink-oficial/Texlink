import React, { type ReactNode } from 'react';

export type BadgeVariant =
  | 'default'
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'purple'
  | 'brand'
  | 'outline'
  | 'outline-success'
  | 'outline-warning'
  | 'outline-error';

export type BadgeSize = 'xs' | 'sm' | 'md' | 'lg';

export interface StatusBadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  icon?: ReactNode;
  removable?: boolean;
  onRemove?: () => void;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default:
    'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600',
  success:
    'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800',
  warning:
    'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
  error:
    'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800',
  info: 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800',
  purple:
    'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800',
  brand:
    'bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400 border-brand-200 dark:border-brand-800',
  outline:
    'bg-transparent text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-600',
  'outline-success':
    'bg-transparent text-green-600 dark:text-green-400 border-green-500 dark:border-green-500',
  'outline-warning':
    'bg-transparent text-yellow-600 dark:text-yellow-400 border-yellow-500 dark:border-yellow-500',
  'outline-error':
    'bg-transparent text-red-600 dark:text-red-400 border-red-500 dark:border-red-500',
};

const dotStyles: Record<BadgeVariant, string> = {
  default: 'bg-gray-500',
  success: 'bg-green-500',
  warning: 'bg-yellow-500',
  error: 'bg-red-500',
  info: 'bg-blue-500',
  purple: 'bg-purple-500',
  brand: 'bg-brand-500',
  outline: 'bg-gray-500',
  'outline-success': 'bg-green-500',
  'outline-warning': 'bg-yellow-500',
  'outline-error': 'bg-red-500',
};

const sizeStyles: Record<BadgeSize, string> = {
  xs: 'px-1.5 py-0.5 text-[10px]',
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-xs',
  lg: 'px-3 py-1.5 text-sm',
};

const dotSizeStyles: Record<BadgeSize, string> = {
  xs: 'w-1 h-1',
  sm: 'w-1.5 h-1.5',
  md: 'w-1.5 h-1.5',
  lg: 'w-2 h-2',
};

const iconSizeStyles: Record<BadgeSize, string> = {
  xs: 'h-2.5 w-2.5',
  sm: 'h-3 w-3',
  md: 'h-3.5 w-3.5',
  lg: 'h-4 w-4',
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  label,
  variant = 'default',
  size = 'md',
  dot = false,
  icon,
  removable = false,
  onRemove,
  className = '',
}) => {
  return (
    <span
      className={`
        inline-flex items-center gap-1.5 font-medium rounded-full border
        transition-colors duration-200
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${className}
      `}
    >
      {dot && (
        <span
          className={`rounded-full animate-pulse ${dotStyles[variant]} ${dotSizeStyles[size]}`}
          aria-hidden="true"
        />
      )}
      {icon && (
        <span className={iconSizeStyles[size]} aria-hidden="true">
          {icon}
        </span>
      )}
      <span>{label}</span>
      {removable && onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className={`
            -mr-0.5 ml-0.5 inline-flex items-center justify-center
            rounded-full hover:bg-black/10 dark:hover:bg-white/10
            focus:outline-none focus-visible:ring-2 focus-visible:ring-current
            transition-colors duration-150
            ${iconSizeStyles[size]}
          `}
          aria-label={`Remover ${label}`}
        >
          <svg
            className="h-full w-full"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
    </span>
  );
};

// Animated Badge with pulse effect for active states
export interface AnimatedBadgeProps extends StatusBadgeProps {
  pulse?: boolean;
}

export const AnimatedBadge: React.FC<AnimatedBadgeProps> = ({
  pulse = true,
  ...props
}) => {
  return (
    <span className="relative inline-flex">
      <StatusBadge {...props} />
      {pulse && (
        <span
          className={`
            absolute top-0 right-0 -mt-1 -mr-1
            flex h-3 w-3
          `}
        >
          <span
            className={`
              animate-ping absolute inline-flex h-full w-full rounded-full opacity-75
              ${dotStyles[props.variant || 'default']}
            `}
          />
          <span
            className={`
              relative inline-flex rounded-full h-3 w-3
              ${dotStyles[props.variant || 'default']}
            `}
          />
        </span>
      )}
    </span>
  );
};

export default StatusBadge;
