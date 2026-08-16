import { useEffect, useRef, useState } from 'react';
import { SafeImage } from '../components/SafeImage';
import { toast } from 'sonner';
import { Link } from 'react-router';
import {
  LifeBuoy, Send, Inbox, Clock, AlertTriangle, CheckCircle2, Loader2, Trash2,
  ChevronLeft, ChevronRight, Link as LinkIcon, Plus, Paperclip, X,
} from 'lucide-react';
import { adminApi, formatINR } from '../lib/api';
import { uploadFile } from '../lib/upload';
import { useApi } from '../lib/useApi';
import { ConfirmDelete } from '../components/ConfirmDelete';
import { PickerField } from '../components/PickerField';
import { PageHeader } from '../components/PageHeader';
import { StatCard } from '../components/StatCard';
import { SearchInput, UserCell, PhoneLink, fmtDateTime } from '../components/common';
import { FilterSelect } from '../components/FilterSelect';
import { StatusBadge } from '../components/StatusBadge';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '../components/ui/dialog';
import { Badge } from '../components/ui/badge';
import { ScrollArea } from '../components/ui/scroll-area';
import { Skeleton } from '../components/ui/skeleton';
import { cn } from '../components/ui/utils';
import type { SupportTicket, TicketStatus, TicketPriority, TicketCategory, TicketAssignee } from '../lib/types';

const PAGE_SIZE = 25;
// Matches the backend's cap on attachments per message.
const MAX_ATTACHMENTS = 5;

/**
 * Image picker for a ticket message. Uploads on pick so the caller only ever
 * holds URLs, and the send/create request is a plain JSON post.
 */
function AttachmentPicker({
  urls,
  onChange,
  disabled,
}: {
  urls: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const full = urls.length >= MAX_ATTACHMENTS;

  const pick = async (files: FileList | null) => {
    if (!files?.length) return;
    const room = MAX_ATTACHMENTS - urls.length;
    if (room <= 0) return;

    setUploading(true);
    try {
      const uploaded = await Promise.all(Array.from(files).slice(0, room).map((f) => uploadFile(f, 'support')));
      onChange([...urls, ...uploaded]);
    } catch {
      toast.error('Could not upload attachment');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <>
      {urls.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {urls.map((url) => (
            <div key={url} className="relative">
              <SafeImage src={url} alt="Attachment" className="size-14 rounded-lg object-cover border" />
              <button
                type="button"
                onClick={() => onChange(urls.filter((u) => u !== url))}
                className="absolute -top-1.5 -right-1.5 size-5 rounded-full bg-foreground text-background flex items-center justify-center"
                aria-label="Remove attachment"
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
        </div>
      )}
      <Button
        variant="ghost"
        size="sm"
        className="h-8 px-2 text-muted-foreground"
        disabled={disabled || uploading || full}
        onClick={() => fileRef.current?.click()}
        title={full ? `Up to ${MAX_ATTACHMENTS} attachments` : 'Attach images'}
      >
        {uploading ? <Loader2 className="size-4 animate-spin" /> : <Paperclip className="size-4" />}
      </Button>
      <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => pick(e.target.files)} />
    </>
  );
}

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
const CATEGORY_OPTS = [
  { value: 'all', label: 'All categories' },
  ...(['BOOKING', 'PAYMENT', 'REFUND', 'PROVIDER', 'ACCOUNT', 'TECHNICAL', 'OTHER'] as const).map((c) => ({
    value: c,
    label: c.charAt(0) + c.slice(1).toLowerCase(),
  })),
];
const STATUS_SET: TicketStatus[] = ['OPEN', 'IN_PROGRESS', 'WAITING', 'RESOLVED', 'CLOSED'];
const PRIORITY_SET: TicketPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

export function Tickets() {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const [priority, setPriority] = useState('all');
  const [category, setCategory] = useState('all');
  const [assignee, setAssignee] = useState('all');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  // Any filter change invalidates the current page number.
  const withReset = <T,>(set: (v: T) => void) => (v: T) => { set(v); setPage(1); };

  const stats = useApi(() => adminApi.tickets.stats(), []);
  // Staff list drives both the queue filter and the per-ticket assign control.
  const assignees = useApi(() => adminApi.tickets.assignees(), []);
  const list = useApi(
    () =>
      adminApi.tickets.list({
        q,
        status: status === 'all' ? undefined : status,
        priority: priority === 'all' ? undefined : priority,
        category: category === 'all' ? undefined : category,
        assigneeId: assignee === 'all' ? undefined : assignee,
        page,
        limit: PAGE_SIZE,
      }),
    [q, status, priority, category, assignee, page],
  );

  const rows = list.data?.data ?? [];
  const s = stats.data?.stats;
  const staff = assignees.data?.assignees ?? [];
  const pg = list.data?.pagination;
  const totalPages = pg ? Math.max(1, Math.ceil(pg.total / pg.limit)) : 1;

  // Deleting the last row on a page (or a filter narrowing the set) can leave
  // the pager past the end, showing an empty queue with no way back but Prev.
  useEffect(() => {
    if (pg && page > totalPages) setPage(totalPages);
  }, [pg, page, totalPages]);

  const assigneeOpts = [
    { value: 'all', label: 'Anyone' },
    { value: 'unassigned', label: 'Unassigned' },
    ...staff.map((a) => ({ value: a.id, label: a.name ?? a.email ?? 'Admin' })),
  ];

  // Removing the selected ticket has to clear the detail pane too.
  const handleDeleted = (id: string) => {
    if (selectedId === id) setSelectedId(null);
    list.refetch();
    stats.refetch();
  };

  return (
    // Fills the scroll area: the header and stats keep their size, the
    // workspace below takes whatever is left, and the reply box inside it stays
    // on screen instead of falling below the fold.
    <div className="flex h-full flex-col">
      <PageHeader
        title="Support Tickets"
        description="Triage and resolve customer & provider issues"
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" /> New ticket
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6 shrink-0">
        {stats.loading || !s ? (
          Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-[104px] rounded-xl" />)
        ) : (
          <>
            <StatCard label="Open" value={s.open} icon={<Inbox className="size-5" />} accent="primary" hint="unassigned / new" />
            <StatCard label="In progress" value={s.inProgress} icon={<Loader2 className="size-5" />} accent="violet" />
            <StatCard label="Waiting" value={s.waiting} icon={<Clock className="size-5" />} accent="amber" hint="on customer" />
            <StatCard label="Urgent" value={s.urgent} icon={<AlertTriangle className="size-5" />} accent="red" hint="need attention" />
            <StatCard label="Resolved" value={s.resolved} icon={<CheckCircle2 className="size-5" />} accent="green" hint="resolved / closed" />
          </>
        )}
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-5 min-h-[340px] [&>*]:max-lg:min-h-[420px]">
        {/* Queue */}
        <Card className="lg:col-span-2 flex flex-col overflow-hidden p-0">
          <div className="p-3 border-b space-y-2">
            <SearchInput value={q} onChange={withReset(setQ)} placeholder="Search subject or requester…" />
            <div className="flex gap-2">
              <FilterSelect value={status} onChange={withReset(setStatus)} options={STATUS_OPTS} className="flex-1 bg-background" />
              <FilterSelect value={priority} onChange={withReset(setPriority)} options={PRIORITY_OPTS} className="flex-1 bg-background" />
            </div>
            <div className="flex gap-2">
              <FilterSelect value={category} onChange={withReset(setCategory)} options={CATEGORY_OPTS} className="flex-1 bg-background" />
              <FilterSelect value={assignee} onChange={withReset(setAssignee)} options={assigneeOpts} className="flex-1 bg-background" />
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
                    <span className="truncate">
                      {t.requester?.name}
                      {t.assignee?.name ? ` · ${t.assignee.name}` : ' · unassigned'}
                    </span>
                    <span className="shrink-0">{fmtDateTime(t.lastReplyAt)}</span>
                  </div>
                </button>
              ))
            )}
          </ScrollArea>

          {/* Queues get long — page through them rather than capping the list. */}
          {pg && pg.total > 0 && (
            <div className="flex items-center justify-between gap-2 px-3 py-2 border-t text-xs text-muted-foreground">
              <span>
                {(pg.page - 1) * pg.limit + 1}–{Math.min(pg.page * pg.limit, pg.total)} of {pg.total}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2"
                  disabled={pg.page <= 1 || list.loading}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <span className="tabular-nums px-1">{pg.page} / {totalPages}</span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2"
                  disabled={pg.page >= totalPages || list.loading}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Detail */}
        <div className="lg:col-span-3 min-h-0">
          {selectedId ? (
            <TicketThread
              key={selectedId}
              ticketId={selectedId}
              staff={staff}
              onChanged={() => { list.refetch(); stats.refetch(); }}
              onDeleted={() => handleDeleted(selectedId)}
            />
          ) : (
            <Card className="h-full flex flex-col items-center justify-center text-muted-foreground">
              <LifeBuoy className="size-10 mb-2 opacity-40" />
              <p className="text-sm">Select a ticket to review and respond</p>
            </Card>
          )}
        </div>
      </div>

      <NewTicketDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(id) => {
          setCreateOpen(false);
          setPage(1);
          list.refetch();
          stats.refetch();
          setSelectedId(id);
        }}
      />
    </div>
  );
}

// Logs a ticket for someone who reported an issue off-platform (phone, email).
// The opening message is attributed to the admin, not the customer.
function NewTicketDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (id: string) => void;
}) {
  const blank = { requesterId: '', subject: '', category: 'OTHER', priority: 'MEDIUM', message: '', assignToMe: true };
  const [form, setForm] = useState(blank);
  const [attachments, setAttachments] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const reset = () => { setForm(blank); setAttachments([]); };
  const set = <K extends keyof typeof blank>(k: K, v: (typeof blank)[K]) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.requesterId) return toast.error('Pick who reported the issue');
    if (form.subject.trim().length < 3) return toast.error('Enter a subject');
    if (!form.message.trim()) return toast.error('Describe the issue');

    setSaving(true);
    try {
      const { ticket } = await adminApi.tickets.create({
        requesterId: form.requesterId,
        subject: form.subject.trim(),
        message: form.message.trim(),
        category: form.category as TicketCategory,
        priority: form.priority as TicketPriority,
        attachments: attachments.length ? attachments : undefined,
        assignToMe: form.assignToMe,
      });
      toast.success('Ticket created');
      reset();
      onCreated(ticket.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not create ticket');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New ticket</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <PickerField
            label="Reported by"
            value={form.requesterId}
            onChange={(v) => set('requesterId', v)}
            load={(q) =>
              adminApi.users.list({ q, limit: 20 }).then((r) =>
                r.data.map((u) => ({ value: u.id, label: `${u.name ?? 'Unnamed'} · ${u.phone} · ${u.role.toLowerCase()}` })),
              )
            }
            placeholder="Search by name or phone…"
          />
          <div className="space-y-2">
            <Label htmlFor="nt-subject">Subject</Label>
            <Input
              id="nt-subject"
              value={form.subject}
              onChange={(e) => set('subject', e.target.value)}
              maxLength={160}
              placeholder="Short summary of the issue"
            />
          </div>
          <div className="flex gap-2">
            <div className="space-y-2 flex-1">
              <Label>Category</Label>
              <FilterSelect
                value={form.category}
                onChange={(v) => set('category', v)}
                options={CATEGORY_OPTS.filter((o) => o.value !== 'all')}
                className="w-full bg-background"
              />
            </div>
            <div className="space-y-2 flex-1">
              <Label>Priority</Label>
              <FilterSelect
                value={form.priority}
                onChange={(v) => set('priority', v)}
                options={PRIORITY_SET.map((p) => ({ value: p, label: p }))}
                className="w-full bg-background"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="nt-message">What they reported</Label>
            <Textarea
              id="nt-message"
              rows={4}
              maxLength={2000}
              value={form.message}
              onChange={(e) => set('message', e.target.value)}
              placeholder="Logged from the call — what the customer described"
            />
          </div>
          <div className="space-y-2">
            <Label>Attachments</Label>
            <div className="flex items-center gap-2 flex-wrap">
              <AttachmentPicker urls={attachments} onChange={setAttachments} disabled={saving} />
              <span className="text-xs text-muted-foreground">
                Screenshots the customer sent in — optional
              </span>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.assignToMe}
              onChange={(e) => set('assignToMe', e.target.checked)}
              className="size-4 accent-primary"
            />
            Assign to me and mark in progress
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>{saving ? 'Creating…' : 'Create ticket'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TicketThread({
  ticketId,
  staff,
  onChanged,
  onDeleted,
}: {
  ticketId: string;
  staff: TicketAssignee[];
  onChanged: () => void;
  onDeleted: () => void;
}) {
  const { data, loading, refetch, setData } = useApi(() => adminApi.tickets.get(ticketId), [ticketId]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [reply, setReply] = useState('');
  const [attachments, setAttachments] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const t = data?.ticket as SupportTicket | undefined;

  // Poll for customer replies while the thread is open. This writes straight to
  // `data` rather than calling refetch(), which would flip `loading` and flash
  // the skeleton over a thread the admin is reading. Skipped while the tab is
  // hidden so a backgrounded console isn't polling all day.
  useEffect(() => {
    const t = setInterval(async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        setData(await adminApi.tickets.get(ticketId));
      } catch {
        // A failed poll is not worth interrupting the admin over — the next
        // tick, or any manual action, will resync.
      }
    }, 15_000);
    return () => clearInterval(t);
  }, [ticketId, setData]);

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
  // 'unassigned' is the sentinel the picker uses for "nobody"; the API takes null.
  const setAssignee = async (assigneeId: string) => {
    const next = assigneeId === 'unassigned' ? null : assigneeId;
    await adminApi.tickets.update(ticketId, { assigneeId: next });
    toast.success(next ? `Assigned to ${staff.find((a) => a.id === next)?.name ?? 'admin'}` : 'Unassigned');
    await refetch();
    onChanged();
  };
  const send = async () => {
    if (!reply.trim() && attachments.length === 0) return;
    // The API requires message text, so an image-only reply gets a stand-in.
    const body = reply.trim() || 'Shared an attachment';
    setSending(true);
    try {
      await adminApi.tickets.reply(ticketId, body, attachments.length ? attachments : undefined);
      setReply('');
      setAttachments([]);
      await refetch();
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not send reply');
    } finally {
      setSending(false);
    }
  };

  if (loading || !t) {
    return <Card className="h-full"><CardContent className="pt-6 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-2/3" />)}</CardContent></Card>;
  }

  return (
    <Card className="h-full flex flex-col overflow-hidden p-0">
      {/* Header + triage controls */}
      <div className="p-4 border-b space-y-3 shrink-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-medium">{t.subject}</h2>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge variant="outline" className="font-normal text-xs">{t.category}</Badge>
              <span className="text-xs text-muted-foreground">#{t.id.slice(-6)} · opened {fmtDateTime(t.createdAt)}</span>
              {/* Refund/booking tickets carry the booking they were raised from. */}
              {t.booking && (
                <Link
                  to={`/bookings/${t.booking.id}`}
                  className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                >
                  <LinkIcon className="size-3" />
                  Booking {formatINR(t.booking.amount)} · {t.booking.status.toLowerCase()}
                </Link>
              )}
            </div>
          </div>
          <UserCell name={t.requester?.name} sub={<PhoneLink phone={t.requester?.phone} />} avatar={t.requester?.avatar} />
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
          <FilterSelect
            value={t.assigneeId ?? 'unassigned'}
            onChange={setAssignee}
            options={[
              { value: 'unassigned', label: 'Unassigned' },
              ...staff.map((a) => ({ value: a.id, label: a.name ?? a.email ?? 'Admin' })),
            ]}
            className="w-[170px] bg-background"
          />
          {t.status !== 'RESOLVED' && t.status !== 'CLOSED' && (
            <Button variant="outline" size="sm" onClick={() => setStatus('RESOLVED')}>
              <CheckCircle2 className="size-4" /> Mark resolved
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => setConfirmDelete(true)}
            title="Delete this ticket and its thread"
          >
            <Trash2 className="size-4" /> Delete
          </Button>
        </div>
      </div>

      {/* Thread — the only flexible part; everything else keeps its height. */}
      <ScrollArea className="flex-1 min-h-0 p-4">
        <div className="space-y-3">
          {t.messages?.map((m) => (
            <div key={m.id} className={cn('flex', m.fromAdmin ? 'justify-end' : 'justify-start')}>
              <div className={cn('max-w-[80%] rounded-2xl px-3.5 py-2', m.fromAdmin ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
                <p className="text-[11px] font-medium mb-0.5 opacity-70">{m.fromAdmin ? 'Support' : m.sender?.name ?? 'Customer'}</p>
                <p className="text-sm whitespace-pre-wrap">{m.body}</p>
                {m.attachments && m.attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {m.attachments.map((url) => (
                      <a key={url} href={url} target="_blank" rel="noreferrer" title="Open attachment">
                        <SafeImage
                          src={url}
                          alt="Attachment"
                          className="size-20 rounded-lg object-cover border border-black/10 hover:opacity-90"
                        />
                      </a>
                    ))}
                  </div>
                )}
                <p className={cn('text-[10px] mt-1', m.fromAdmin ? 'text-primary-foreground/70' : 'text-muted-foreground')}>{fmtDateTime(m.createdAt)}</p>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Reply box — pinned to the bottom of the card. */}
      <div className="p-3 border-t bg-card shrink-0">
        <Textarea
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          placeholder="Type a reply to the customer…"
          rows={2}
          className="resize-none mb-2"
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) send(); }}
        />
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <AttachmentPicker urls={attachments} onChange={setAttachments} disabled={sending} />
            {/* Hidden on narrow panes so it can never push the button away. */}
            <span className="hidden truncate text-xs text-muted-foreground sm:inline">⌘/Ctrl + Enter to send</span>
          </div>
          <Button size="sm" className="shrink-0" onClick={send} disabled={sending || (!reply.trim() && attachments.length === 0)}>
            {sending ? <Loader2 className="size-4 animate-spin" /> : <><Send className="size-4" /> Send reply</>}
          </Button>
        </div>
      </div>

      <ConfirmDelete
        target={confirmDelete ? t : null}
        onOpenChange={(o) => !o && setConfirmDelete(false)}
        onConfirm={async () => {
          await adminApi.tickets.remove(ticketId);
          onDeleted();
        }}
        title={(x) => `Delete “${x.subject}”?`}
        description={() =>
          'The ticket and its whole message thread are removed permanently. Resolving or closing keeps the record instead.'
        }
        successMessage={() => 'Ticket deleted'}
      />
    </Card>
  );
}
