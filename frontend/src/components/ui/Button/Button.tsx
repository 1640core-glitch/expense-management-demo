import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '../../../lib/cn';
import styles from './Button.module.css';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', block = false, className, type = 'button', ...rest }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          styles.button,
          styles[variant],
          styles[size],
          block && styles.block,
          className,
        )}
        {...rest}
      />
    );
  },
);

Button.displayName = 'Button';
