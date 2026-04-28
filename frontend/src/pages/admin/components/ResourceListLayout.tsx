import { ReactNode } from 'react';
import { Button } from '../../../components/ui';

export interface ResourceListLayoutProps {
  title: ReactNode;
  createLabel?: string;
  onCreate?: () => void;
  createDisabled?: boolean;
  actions?: ReactNode;
  children?: ReactNode;
}

export function ResourceListLayout({
  title,
  createLabel = '新規作成',
  onCreate,
  createDisabled = false,
  actions,
  children,
}: ResourceListLayoutProps) {
  return (
    <div
      style={{
        background: '#fff',
        padding: 16,
        borderRadius: 8,
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <h1 style={{ margin: 0, fontSize: 20 }}>{title}</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {actions}
          {onCreate && (
            <Button onClick={onCreate} disabled={createDisabled}>
              {createLabel}
            </Button>
          )}
        </div>
      </div>
      <div>{children}</div>
    </div>
  );
}
