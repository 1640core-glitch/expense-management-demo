import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '../../../lib/cn';
import styles from './Card.module.css';

export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: CardPadding;
  bordered?: boolean;
  elevated?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ padding = 'md', bordered = true, elevated = false, className, ...rest }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          styles.card,
          styles[`p-${padding}`],
          bordered && styles.bordered,
          elevated && styles.elevated,
          className,
        )}
        {...rest}
      />
    );
  },
);

Card.displayName = 'Card';

export const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...rest }, ref) => (
    <div ref={ref} className={cn(styles.header, className)} {...rest} />
  ),
);
CardHeader.displayName = 'CardHeader';

export const CardBody = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...rest }, ref) => (
    <div ref={ref} className={cn(styles.body, className)} {...rest} />
  ),
);
CardBody.displayName = 'CardBody';

export const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...rest }, ref) => (
    <div ref={ref} className={cn(styles.footer, className)} {...rest} />
  ),
);
CardFooter.displayName = 'CardFooter';
