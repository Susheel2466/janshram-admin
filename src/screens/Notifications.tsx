import { useState } from 'react';
import { toast } from 'sonner';
import { Send, Megaphone, Trash2 } from 'lucide-react';
import { adminApi } from '../lib/api';
import { ConfirmDelete } from '../components/ConfirmDelete';
import { useApi } from '../lib/useApi';
import { PageHeader } from '../components/PageHeader';
import { fmtDateTime } from '../components/common';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { FilterSelect } from '../components/FilterSelect';
import type { Notification } from '../lib/types';
import { Skeleton } from '../components/ui/skeleton';

const AUDIENCES = [
  { value: 'all', label: 'All users' },
  { value: 'customers', label: 'Customers only' },
  { value: 'providers', label: 'Providers only' },
  { value: 'inactive', label: 'Inactive users' },
];

export function Notifications() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState('all');
  const [sending, setSending] = useState(false);

  const { data, loading, refetch } = useApi(() => adminApi.notifications.history(), []);
  const [toDelete, setToDelete] = useState<Notification | null>(null);

  const send = async () => {
    if (!title.trim()) return toast.error('Title is required');
    setSending(true);
    const { sentTo } = await adminApi.notifications.broadcast({ title, body, audience });
    toast.success(`Broadcast sent to ${AUDIENCES.find((a) => a.value === sentTo)?.label ?? 'users'}`);
    setTitle(''); setBody('');
    setSending(false);
    refetch();
  };

  return (
    <div>
      <PageHeader title="Notifications" description="Broadcast announcements to the app" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Megaphone className="size-4" /> New broadcast</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Audience</Label>
              <FilterSelect value={audience} onChange={setAudience} options={AUDIENCES} className="w-full bg-background" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="n-title">Title</Label>
              <Input id="n-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Monsoon Sale Live!" maxLength={80} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="n-body">Message</Label>
              <Textarea id="n-body" value={body} onChange={(e) => setBody(e.target.value)} placeholder="Flat 20% off on all cleaning services this week." rows={4} maxLength={240} />
            </div>
            <Button onClick={send} disabled={sending} className="w-full">
              <Send className="size-4" /> {sending ? 'Sending…' : 'Send broadcast'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Sent history</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {loading
              ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
              : data?.notifications.map((n) => (
                  <div key={n.id} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-sm">{n.title}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-xs text-muted-foreground">{fmtDateTime(n.createdAt)}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 text-destructive hover:text-destructive"
                          onClick={() => setToDelete(n)}
                          title="Delete notification"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                    {n.body && <p className="text-sm text-muted-foreground mt-1">{n.body}</p>}
                  </div>
                ))}
          </CardContent>
        </Card>
      </div>

      <ConfirmDelete
        target={toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        onConfirm={(n) => adminApi.notifications.remove(n.id).then(refetch)}
        title={(n) => `Delete “${n.title}”?`}
        description={() => 'This removes the notification from the recipient’s inbox as well.'}
        successMessage={() => 'Notification deleted'}
      />
    </div>
  );
}
