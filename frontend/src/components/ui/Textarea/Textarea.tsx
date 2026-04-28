import { TextareaHTMLAttributes, forwardRef, useId } from 'react';
import { cn } from '../../../lib/cn';
// @ts-expect-error CSS Modules side-loaded by Vite
import styles from './Textarea.module.css';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  helpText?: string;
  errorText?: string;
  invalid?: boolean;
  wrapperClassName?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, helpText, errorText, invalid, wrapperClassName, className, id, ...rest }, ref) => {
    const generatedId = useId();
    const textareaId = id ?? generatedId;
    const isInvalid = invalid || Boolean(errorText);

    return (
      <div className={cn(styles.field, wrapperClassName)}>
        {label && (
          <label htmlFor={textareaId} className={styles.label}>
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          aria-invalid={isInvalid || undefined}
          className={cn(styles.textarea, isInvalid && styles.invalid, className)}
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

Textarea.displayName = 'Textarea';
