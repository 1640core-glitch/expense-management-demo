import { useEffect, useMemo, useState } from 'react';
import { Badge, Button, EmptyState, Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui';
import { Table } from '../components/ui/Table';
import type { TableColumn } from '../components/ui/Table/types';
import { Notification, listNotifications, markAllRead, markRead } from '../api/notifications';
import { notifyApiError, notifySuccess } from '../lib/toast';

type FilterTab = 'unread' | 'read' | 'all';

function summarizePayload(payload: string | null): string {
  if (!payload) return '-';
  try {
    const obj = JSON.parse(payload);
    if (obj && typeof obj === 'object') {
      if (typeof obj.message === 'string') return obj.message;
      if (typeof obj.title === 'string') return obj.title;
      return JSON.stringify(obj);
    }
    return String(obj);
  } catch {
    return payload;
  }
}

export default function NotificationsPage() {
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<FilterTab>('unread');
  const [busy, setBusy] = useState(false);

  const reload = async () => {
    try {
      const list = await listNotifications();
      setItems(list);
    } catch (err) {
      console.error('通知の読み込みに失敗しました', err);
      notifyApiError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
  }, []);

  const filtered = useMemo(() => {
    if (tab === 'unread') return items.filter((n) => n.read_at === null);
    if (tab === 'read') return items.filter((n) => n.read_at !== null);
    return items;
  }, [items, tab]);

  const unreadCount = useMemo(() => items.filter((n) => n.read_at === null).length, [items]);

  const handleMarkRead = async (id: number) => {
    setBusy(true);
    try {
      const updated = await markRead(id);
      setItems((prev) => prev.map((n) => (n.id === id ? updated : n)));
    } catch (err) {
      console.error('既読更新に失敗しました', err);
      notifyApiError(err);
    } finally {
      setBusy(false);
    }
  };

  const handleMarkAllRead = async () => {
    setBusy(true);
    try {
      await markAllRead();
      notifySuccess('すべて既読にしました');
      await reload();
    } catch (err) {
      console.error('一括既読に失敗しました', err);
      notifyApiError(err);
    } finally {
      setBusy(false);
    }
  };

  const columns: TableColumn<Notification>[] = [
    { key: 'type', header: '種別', accessor: (row) => row.type },
    { key: 'payload', header: '内容', accessor: (row) => summarizePayload(row.payload_json) },
    { key: 'created_at', header: '受信日時', accessor: (row) => row.created_at },
    {
      key: 'status',
      header: '状態',
      accessor: (row) =>
        row.read_at === null ? (
          <Badge variant="danger" size="sm">未読</Badge>
        ) : (
          <Badge size="sm">既読</Badge>
        ),
    },
    {
      key: 'action',
      header: '',
      align: 'right',
      accessor: (row) =>
        row.read_at === null ? (
          <Button
            variant="ghost"
            size="sm"
            disabled={busy}
            onClick={() => void handleMarkRead(row.id)}
          >
            既読にする
          </Button>
        ) : null,
    },
  ];

  return (
    <div style={{ maxWidth: 1080 }}>
      <div className="flex items-center justify-between mb-4">
        <h1>通知</h1>
        <Button
          variant="primary"
          size="sm"
          disabled={busy || unreadCount === 0}
          onClick={() => void handleMarkAllRead()}
        >
          すべて既読にする
        </Button>
      </div>
      <Tabs value={tab} onValueChange={(v) => setTab(v as FilterTab)}>
        <TabsList>
          <TabsTrigger value="unread">未読 ({unreadCount})</TabsTrigger>
          <TabsTrigger value="read">既読</TabsTrigger>
          <TabsTrigger value="all">すべて</TabsTrigger>
        </TabsList>
        <TabsContent value={tab}>
          {loading ? (
            <p>読み込み中...</p>
          ) : filtered.length === 0 ? (
            <EmptyState title="通知はありません" />
          ) : (
            <Table columns={columns} data={filtered} rowKey={(row) => row.id} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
