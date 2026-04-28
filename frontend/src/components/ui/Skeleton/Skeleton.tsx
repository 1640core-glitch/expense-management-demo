import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '../../../lib/cn';
// @ts-expect-error CSS Modules side-loaded by Vite
import styles from './Skeleton.module.css';

export type SkeletonShape = 'rect' | 'circle' | 'text';

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  shape?: SkeletonShape;
  width?: number | string;
  height?: number | string;
}

export const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(
  ({ shape = 'rect', width, height, className, style, ...rest }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(styles.skeleton, styles[shape], className)}
        style={{ width, height, ...style }}
        aria-hidden="true"
        {...rest}
      />
    );
  },
);

Skeleton.displayName = 'Skeleton';
