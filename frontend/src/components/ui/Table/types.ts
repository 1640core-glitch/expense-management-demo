import { ReactNode } from 'react';

export type TableAlign = 'left' | 'center' | 'right';

export interface TableColumn<T> {
  key: string;
  header: ReactNode;
  accessor?: (row: T, index: number) => ReactNode;
  width?: string | number;
  align?: TableAlign;
  className?: string;
  headerClassName?: string;
}
