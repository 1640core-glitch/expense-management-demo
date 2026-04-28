import { useMemo } from 'react';
import { cn } from '../../../lib/cn';
import styles from './Pagination.module.css';

export interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  siblingCount?: number;
  className?: string;
  prevLabel?: string;
  nextLabel?: string;
}

type PageItem = number | 'ellipsis-left' | 'ellipsis-right';

function buildPages(current: number, totalPages: number, siblingCount: number): PageItem[] {
  if (totalPages <= 1) return [1];
  const totalNumbers = siblingCount * 2 + 5;
  if (totalPages <= totalNumbers) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const leftSibling = Math.max(current - siblingCount, 2);
  const rightSibling = Math.min(current + siblingCount, totalPages - 1);
  const showLeftEllipsis = leftSibling > 2;
  const showRightEllipsis = rightSibling < totalPages - 1;
  const pages: PageItem[] = [1];
  if (showLeftEllipsis) pages.push('ellipsis-left');
  for (let i = leftSibling; i <= rightSibling; i++) pages.push(i);
  if (showRightEllipsis) pages.push('ellipsis-right');
  pages.push(totalPages);
  return pages;
}

export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  siblingCount = 1,
  className,
  prevLabel = '前へ',
  nextLabel = '次へ',
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / Math.max(1, pageSize)));
  const current = Math.min(Math.max(1, page), totalPages);

  const pages = useMemo(
    () => buildPages(current, totalPages, siblingCount),
    [current, totalPages, siblingCount],
  );

  const goTo = (next: number) => {
    if (next < 1 || next > totalPages || next === current) return;
    onPageChange(next);
  };

  return (
    <nav className={cn(styles.root, className)} aria-label="Pagination">
      <button
        type="button"
        className={styles.button}
        onClick={() => goTo(current - 1)}
        disabled={current <= 1}
        aria-label={prevLabel}
      >
        {prevLabel}
      </button>
      <ul className={styles.list}>
        {pages.map((item, idx) =>
          typeof item === 'number' ? (
            <li key={item}>
              <button
                type="button"
                className={cn(styles.button, item === current && styles.active)}
                onClick={() => goTo(item)}
                aria-current={item === current ? 'page' : undefined}
              >
                {item}
              </button>
            </li>
          ) : (
            <li key={`${item}-${idx}`} className={styles.ellipsis} aria-hidden="true">
              …
            </li>
          ),
        )}
      </ul>
      <button
        type="button"
        className={styles.button}
        onClick={() => goTo(current + 1)}
        disabled={current >= totalPages}
        aria-label={nextLabel}
      >
        {nextLabel}
      </button>
    </nav>
  );
}
