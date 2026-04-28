import { SelectHTMLAttributes, forwardRef, useId } from 'react';
import { cn } from '../../../lib/cn';
import styles from './Select.module.css';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  helpText?: string;
  errorText?: string;
  invalid?: boolean;
  options?: SelectOption[];
  placeholder?: string;
  wrapperClassName?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      helpText,
      errorText,
      invalid,
      options,
      placeholder,
      wrapperClassName,
      className,
      id,
      children,
      ...rest
    },
    ref,
  ) => {
    const generatedId = useId();
    const selectId = id ?? generatedId;
    const isInvalid = invalid || Boolean(errorText);

    return (
      <div className={cn(styles.field, wrapperClassName)}>
        {label && (
          <label htmlFor={selectId} className={styles.label}>
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          aria-invalid={isInvalid || undefined}
          className={cn(styles.select, isInvalid && styles.invalid, className)}
          {...rest}
        >
          {placeholder !== undefined && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options
            ? options.map((opt) => (
                <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                  {opt.label}
                </option>
              ))
            : children}
        </select>
        {errorText ? (
          <span className={styles.error}>{errorText}</span>
        ) : helpText ? (
          <span className={styles.help}>{helpText}</span>
        ) : null}
      </div>
    );
  },
);

Select.displayName = 'Select';
