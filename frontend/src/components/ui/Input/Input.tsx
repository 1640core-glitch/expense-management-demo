import { InputHTMLAttributes, forwardRef, useId } from 'react';
import { cn } from '../../../lib/cn';
import styles from './Input.module.css';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helpText?: string;
  errorText?: string;
  invalid?: boolean;
  wrapperClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, helpText, errorText, invalid, wrapperClassName, className, id, ...rest }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const isInvalid = invalid || Boolean(errorText);

    return (
      <div className={cn(styles.field, wrapperClassName)}>
        {label && (
          <label htmlFor={inputId} className={styles.label}>
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={isInvalid || undefined}
          className={cn(styles.input, isInvalid && styles.invalid, className)}
          {...rest}
        />
        {errorText ? (
          <span className={styles.error}>{errorText}</span>
        ) : helpText ? (
          <span className={styles.help}>{helpText}</span>
        ) : null}
      </div>
    );
  },
);

Input.displayName = 'Input';
