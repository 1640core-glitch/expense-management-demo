import { InputHTMLAttributes, forwardRef, ReactNode } from 'react';
import { cn } from '../../../lib/cn';
import styles from './Checkbox.module.css';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: ReactNode;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, className, checked, disabled, ...rest }, ref) => {
    return (
      <label className={cn(styles.wrapper, disabled && styles.disabled, className)}>
        <input
          ref={ref}
          type="checkbox"
          className={styles.input}
          checked={checked}
          disabled={disabled}
          aria-checked={checked ? 'true' : 'false'}
          {...rest}
        />
        <span className={styles.box} aria-hidden="true" />
        {label !== undefined && <span className={styles.label}>{label}</span>}
      </label>
    );
  },
);

Checkbox.displayName = 'Checkbox';
