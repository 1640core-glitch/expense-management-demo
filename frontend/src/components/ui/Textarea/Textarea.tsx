import { TextareaHTMLAttributes, forwardRef, useId } from 'react';
import { cn } from '../../../lib/cn';
import styles from './Textarea.module.css';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  helpText?: string;
  errorText?: string;
  invalid?: boolean;
  wrapperClassName?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, helpText, errorText, invalid, wrapperClassName, className, id, 'aria-describedby': ariaDescribedBy, ...rest }, ref) => {
    const generatedId = useId();
    const textareaId = id ?? generatedId;
    const isInvalid = invalid || Boolean(errorText);
    const errorId = `${textareaId}-error`;
    const helpId = `${textareaId}-help`;
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
          <label htmlFor={textareaId} className={styles.label}>
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          aria-invalid={isInvalid || undefined}
          aria-describedby={describedBy}
          aria-errormessage={errorText ? errorId : undefined}
          className={cn(styles.textarea, isInvalid && styles.invalid, className)}
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

Textarea.displayName = 'Textarea';
