import { ReactNode } from 'react';
import { cn } from '../../../lib/cn';
// @ts-expect-error CSS Modules side-loaded by Vite
import styles from './Table.module.css';
import { TableColumn } from './types';

export interface TableProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  rowKey: (row: T, index: number) => string | number;
  emptyText?: ReactNode;
  caption?: ReactNode;
  className?: string;
  onRowClick?: (row: T, index: number) => void;
}

export function Table<T>({
  columns,
  data,
  rowKey,
  emptyText = 'データがありません',
  caption,
  className,
  onRowClick,
}: TableProps<T>) {
  return (
    <div className={cn(styles.wrapper, className)}>
      <table className={styles.table}>
        {caption && <caption className={styles.caption}>{caption}</caption>}
        <thead className={styles.thead}>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  styles.th,
                  col.align && styles[`align-${col.align}`],
                  col.headerClassName,
                )}
                style={col.width !== undefined ? { width: col.width } : undefined}
                scope="col"
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className={styles.tbody}>
          {data.length === 0 ? (
            <tr>
              <td className={styles.empty} colSpan={columns.length}>
                {emptyText}
              </td>
            </tr>
          ) : (
            data.map((row, index) => (
              <tr
                key={rowKey(row, index)}
                className={cn(styles.tr, onRowClick && styles.clickable)}
                onClick={onRowClick ? () => onRowClick(row, index) : undefined}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      styles.td,
                      col.align && styles[`align-${col.align}`],
                      col.className,
                    )}
                  >
                    {col.accessor
                      ? col.accessor(row, index)
                      : ((row as Record<string, ReactNode>)[col.key] ?? null)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
