import { HTMLAttributes, forwardRef, useState } from 'react';
import { cn } from '../../../lib/cn';
import styles from './Avatar.module.css';

export type AvatarSize = 'sm' | 'md' | 'lg';

export interface AvatarProps extends HTMLAttributes<HTMLSpanElement> {
  src?: string;
  alt?: string;
  name?: string;
  size?: AvatarSize;
}

function getInitials(name?: string): string {
  if (!name) return '';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export const Avatar = forwardRef<HTMLSpanElement, AvatarProps>(
  ({ src, alt, name, size = 'md', className, ...rest }, ref) => {
    const [errored, setErrored] = useState(false);
    const showImage = src && !errored;
    const initials = getInitials(name);
    const ariaLabel = alt ?? name;
    return (
      <span
        ref={ref}
        className={cn(styles.avatar, styles[size], className)}
        role="img"
        aria-label={ariaLabel}
        {...rest}
      >
        {showImage ? (
          <img
            src={src}
            alt={alt ?? name ?? ''}
            className={styles.img}
            onError={() => setErrored(true)}
          />
        ) : initials ? (
          <span className={styles.initials} aria-hidden="true">{initials}</span>
        ) : (
          <span className={styles.fallback} aria-hidden="true" />
        )}
      </span>
    );
  },
);

Avatar.displayName = 'Avatar';
