import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '../../../lib/cn';
// @ts-expect-error CSS Modules side-loaded by Vite
import styles from './Badge.module.css';

export type BadgeVariant = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
export type BadgeSize = 'sm' | 'md';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ variant = 'neutral', size = 'md', className, ...rest }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(styles.badge, styles[variant], styles[size], className)}
        {...rest}
      />
    );
  },
);

Badge.displayName = 'Badge';
