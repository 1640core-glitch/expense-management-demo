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
  ({ label, helpText, errorText, invalid, wrapperClassName, className, id, 'aria-describedby': ariaDescribedBy, ...rest }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const isInvalid = invalid || Boolean(errorText);
    const errorId = `${inputId}-error`;
    const helpId = `${inputId}-help`;
    const describedBy = [
      ariaDescribedBy,
      errorText ? errorId : null,
      !errorText && helpText ? helpId : null,
    ]
      .filter(Boolean)
      .join(' ') || undefined;

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
          aria-describedby={describedBy}
          aria-errormessage={errorText ? errorId : undefined}
          className={cn(styles.input, isInvalid && styles.invalid, className)}
          {...rest}
        />
        {errorText ? (
          <span id={errorId} role="alert" className={styles.error}>{errorText}</span>
        ) : helpText ? (
          <span id={helpId} className={styles.help}>{helpText}</span>
        ) : null}
      </div>
    );
  },
);

Input.displayName = 'Input';
