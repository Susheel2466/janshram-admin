import { useState } from 'react';
import { toast } from 'sonner';
import { LifeBuoy, Send, Inbox, Clock, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { adminApi } from '../lib/api';
import { useApi } from '../lib/useApi';
import { PageHeader } from '../components/PageHeader';
import { StatCard } from '../components/StatCard';
import { SearchInput, UserCell, fmtDateTime } from '../components/common';
import { FilterSelect } from '../components/FilterSelect';
import { StatusBadge } from '../components/StatusBadge';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { ScrollArea } from '../components/ui/scroll-area';
import { Skeleton } from '../components/ui/skeleton';
import { cn } from '../components/ui/utils';
import type { SupportTicket, TicketStatus, TicketPriority } from '../lib/types';

const STATUS_OPTS = [
  { value: 'all', label: 'All status' },
  { value: 'OPEN', label: 'Open' },
  { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'WAITING', label: 'Waiting' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'CLOSED', label: 'Closed' },
];
const PRIORITY_OPTS = [
  { value: 'all', label: 'Any priority' },
  { value: 'URGENT', label: 'Urgent' },
  { value: 'HIGH', label: 'High' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'LOW', label: 'Low' },
];
const STATUS_SET: TicketStatus[] = ['OPEN', 'IN_PROGRESS', 'WAITING', 'RESOLVED', 'CLOSED'];
const PRIORITY_SET: TicketPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

export function Tickets() {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const [priority, setPriority] = useState('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const stats = useApi(() => adminApi.tickets.stats(), []);
  const list = useApi(
    () => adminApi.tickets.list({ q, status: status === 'all' ? undefined : status, priority: priority === 'all' ? undefined : priority, limit: 50 }),
    [q, status, priority],
  );

  const rows = list.data?.data ?? [];
  const s = stats.data?.stats;

  return (
    <div>
      <PageHeader title="Support Tickets" description="Triage and resolve customer & provider issues" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.loading || !s ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[104px] rounded-xl" />)
        ) : (
          <>
            <StatCard label="Open" value={s.open} icon={<Inbox className="size-5" />} accent="primary" hint="unassigned / new" />
            <StatCard label="In progress" value={s.inProgress} icon={<Loader2 className="size-5" />} accent="violet" />
            <StatCard label="Waiting" value={s.waiting} icon={<Clock className="size-5" />} accent="amber" hint="on customer" />
            <StatCard label="Urgent" value={s.urgent} icon={<AlertTriangle className="size-5" />} accent="red" hint="need attention" />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 h-[calc(100vh-320px)] min-h-[460px]">
        {/* Queue */}
        <Card className="lg:col-span-2 flex flex-col overflow-hidden p-0">
          <div className="p-3 border-b space-y-2">
            <SearchInput value={q} onChange={setQ} placeholder="Search subject or requester…" />
            <div className="flex gap-2">
              <FilterSelect value={status} onChange={setStatus} options={STATUS_OPTS} className="flex-1 bg-background" />
              <FilterSelect value={priority} onChange={setPriority} options={PRIORITY_OPTS} className="flex-1 bg-background" />
            </div>
          </div>
          <ScrollArea className="flex-1">
            {list.loading ? (
              <div className="p-3 space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
            ) : rows.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <CheckCircle2 className="size-8 mb-2 opacity-40" />
                <p className="text-sm">No tickets match</p>
              </div>
            ) : (
              rows.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedId(t.id)}
                  className={cn('w-full text-left px-3 py-3 border-b hover:bg-accent transition-colors', selectedId === t.id && 'bg-accent')}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-medium text-sm line-clamp-1">{t.subject}</span>
                    <StatusBadge status={t.priority} className="shrink-0" />
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <StatusBadge status={t.status} />
                    <Badge variant="outline" className="font-normal text-xs">{t.category}</Badge>
                  </div>
                  <div className="flex items-center justify-between mt-1.5 text-xs text-muted-foreground">
                    <span>{t.requester?.name}</span>
                    <span>{fmtDateTime(t.lastReplyAt)}</span>
                  </div>
                </button>
              ))
            )}
          </ScrollArea>
        </Card>

        {/* Detail */}
        <div className="lg:col-span-3 min-h-0">
          {selectedId ? (
            <TicketThread
              key={selectedId}
              ticketId={selectedId}
              onChanged={() => { list.refetch(); stats.refetch(); }}
            />
          ) : (
            <Card className="h-full flex flex-col items-center justify-center text-muted-foreground">
              <LifeBuoy className="size-10 mb-2 opacity-40" />
              <p className="text-sm">Select a ticket to review and respond</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function TicketThread({ ticketId, onChanged }: { ticketId: string; onChanged: () => void }) {
  const { data, loading, refetch } = useApi(() => adminApi.tickets.get(ticketId), [ticketId]);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const t = data?.ticket as SupportTicket | undefined;

  const setStatus = async (status: string) => {
    await adminApi.tickets.update(ticketId, { status: status as TicketStatus });
    toast.success(`Status → ${status.replace('_', ' ').toLowerCase()}`);
    await refetch();
    onChanged();
  };
  const setPriority = async (priority: string) => {
    await adminApi.tickets.update(ticketId, { priority: priority as TicketPriority });
    toast.success(`Priority → ${priority.toLowerCase()}`);
    await refetch();
    onChanged();
  };
  const send = async () => {
    if (!reply.trim()) return;
    setSending(true);
    await adminApi.tickets.reply(ticketId, reply.trim());
    setReply('');
    await refetch();
    onChanged();
    setSending(false);
  };

  if (loading || !t) {
    return <Card className="h-full"><CardContent className="pt-6 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-2/3" />)}</CardContent></Card>;
  }

  return (
    <Card className="h-full flex flex-col overflow-hidden p-0">
      {/* Header + triage controls */}
      <div className="p-4 border-b space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-medium">{t.subject}</h2>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="font-normal text-xs">{t.category}</Badge>
              <span className="text-xs text-muted-foreground">#{t.id.slice(-6)} · opened {fmtDateTime(t.createdAt)}</span>
            </div>
          </div>
          <UserCell name={t.requester?.name} sub={t.requester?.phone} avatar={t.requester?.avatar} />
        </div>
        <div className="flex flex-wrap gap-2">
          <FilterSelect
            value={t.status}
            onChange={setStatus}
            options={STATUS_SET.map((v) => ({ value: v, label: v.replace('_', ' ') }))}
            className="w-[150px] bg-background"
          />
          <FilterSelect
            value={t.priority}
            onChange={setPriority}
            options={PRIORITY_SET.map((v) => ({ value: v, label: v }))}
            className="w-[130px] bg-background"
          />
          {t.status !== 'RESOLVED' && t.status !== 'CLOSED' && (
            <Button variant="outline" size="sm" onClick={() => setStatus('RESOLVED')}>
              <CheckCircle2 className="size-4" /> Mark resolved
            </Button>
          )}
        </div>
      </div>

      {/* Thread */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-3">
          {t.messages?.map((m) => (
            <div key={m.id} className={cn('flex', m.fromAdmin ? 'justify-end' : 'justify-start')}>
              <div className={cn('max-w-[80%] rounded-2xl px-3.5 py-2', m.fromAdmin ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
                <p className="text-[11px] font-medium mb-0.5 opacity-70">{m.fromAdmin ? 'Support' : m.sender?.name ?? 'Customer'}</p>
                <p className="text-sm whitespace-pre-wrap">{m.body}</p>
                <p className={cn('text-[10px] mt-1', m.fromAdmin ? 'text-primary-foreground/70' : 'text-muted-foreground')}>{fmtDateTime(m.createdAt)}</p>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Reply box */}
      <div className="p-3 border-t">
        <Textarea
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          placeholder="Type a reply to the customer…"
          rows={2}
          className="resize-none mb-2"
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) send(); }}
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">⌘/Ctrl + Enter to send</span>
          <Button size="sm" onClick={send} disabled={sending || !reply.trim()}>
            {sending ? <Loader2 className="size-4 animate-spin" /> : <><Send className="size-4" /> Send reply</>}
          </Button>
        </div>
      </div>
    </Card>
  );
}
