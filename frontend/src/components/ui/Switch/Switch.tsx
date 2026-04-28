import { InputHTMLAttributes, forwardRef, ReactNode } from 'react';
import { cn } from '../../../lib/cn';
// @ts-expect-error CSS Modules side-loaded by Vite
import styles from './Switch.module.css';

export interface SwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: ReactNode;
}

export const Switch = forwardRef<HTMLInputElement, SwitchProps>(
  ({ label, className, checked, disabled, ...rest }, ref) => {
    return (
      <label className={cn(styles.wrapper, disabled && styles.disabled, className)}>
        <input
          ref={ref}
          type="checkbox"
          role="switch"
          className={styles.input}
          checked={checked}
          disabled={disabled}
          aria-checked={checked ? 'true' : 'false'}
          {...rest}
        />
        <span className={styles.track} aria-hidden="true">
          <span className={styles.thumb} />
        </span>
        {label !== undefined && <span className={styles.label}>{label}</span>}
      </label>
    );
  },
);

Switch.displayName = 'Switch';
