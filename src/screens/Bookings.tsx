import { useState } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { Eye, MoreHorizontal, RotateCcw, Check, Pencil, Trash2, Plus } from 'lucide-react';
import { adminApi, formatINR } from '../lib/api';
import { useApi } from '../lib/useApi';
import { PageHeader } from '../components/PageHeader';
import { ExportButton } from '../components/ExportButton';
import { DataTable, type Column } from '../components/DataTable';
import { SearchInput, fmtDateTime } from '../components/common';
import { PickerField } from '../components/PickerField';
import { FilterSelect } from '../components/FilterSelect';
import { StatusBadge } from '../components/StatusBadge';
import { Button } from '../components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuLabel, DropdownMenuSeparator,
} from '../components/ui/dropdown-menu';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { ConfirmDelete } from '../components/ConfirmDelete';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '../components/ui/dialog';
import type { Booking, BookingStatus } from '../lib/types';

// datetime-local needs local-time "YYYY-MM-DDTHH:mm", not an ISO/UTC string.
function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const STATUSES: BookingStatus[] = ['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

export function Bookings() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Booking | null>(null);
  const [form, setForm] = useState({ scheduledAt: '', address: '', notes: '', amount: '' });
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<Booking | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [nb, setNb] = useState({ customerId: '', providerId: '', serviceId: '', scheduledAt: '', address: '', notes: '', amount: '' });
  const [creating, setCreating] = useState(false);

  const { data, loading, refetch } = useApi(
    () => adminApi.bookings.list({ q, status: status === 'all' ? undefined : status, page }),
    [q, status, page],
  );

  const setBookingStatus = async (b: Booking, next: BookingStatus) => {
    if (next === b.status) return;
    await adminApi.bookings.setStatus(b.id, next);
    toast.success(`Booking marked ${next.replace('_', ' ').toLowerCase()}`);
    refetch();
  };
  const refund = async (b: Booking) => {
    await adminApi.bookings.refund(b.id);
    toast.success('Refund issued');
    refetch();
  };

  const createBooking = async () => {
    if (!nb.customerId) return toast.error('Pick a customer');
    if (!nb.providerId) return toast.error('Pick a provider');
    if (!nb.scheduledAt) return toast.error('Pick a date and time');
    if (nb.amount && Number.isNaN(Number(nb.amount))) return toast.error('Amount must be a number');
    setCreating(true);
    try {
      await adminApi.bookings.create({
        customerId: nb.customerId,
        providerId: nb.providerId,
        scheduledAt: new Date(nb.scheduledAt).toISOString(),
        ...(nb.serviceId ? { serviceId: nb.serviceId } : {}),
        ...(nb.address.trim() ? { address: nb.address.trim() } : {}),
        ...(nb.notes.trim() ? { notes: nb.notes.trim() } : {}),
        ...(nb.amount ? { amountRupees: Number(nb.amount) } : {}),
      });
      toast.success('Booking created');
      setCreateOpen(false);
      setNb({ customerId: '', providerId: '', serviceId: '', scheduledAt: '', address: '', notes: '', amount: '' });
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not create booking');
    } finally {
      setCreating(false);
    }
  };

  const openEdit = (b: Booking) => {
    setEditing(b);
    setForm({
      // datetime-local wants "YYYY-MM-DDTHH:mm" in local time.
      scheduledAt: toLocalInput(b.scheduledAt),
      address: b.address ?? '',
      notes: b.notes ?? '',
      amount: String(b.amount / 100),
    });
  };

  const saveEdit = async () => {
    if (!editing) return;
    const amount = Number(form.amount);
    if (Number.isNaN(amount) || amount < 0) return toast.error('Enter a valid amount');
    if (!form.scheduledAt) return toast.error('Pick a scheduled date and time');
    setSaving(true);
    try {
      await adminApi.bookings.update(editing.id, {
        scheduledAt: new Date(form.scheduledAt).toISOString(),
        address: form.address.trim() || null,
        notes: form.notes.trim() || null,
        amountRupees: amount,
      });
      toast.success('Booking updated');
      setEditing(null);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update booking');
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<Booking>[] = [
    // The six-digit reference, not the cuid — it's what a caller reads out.
    { key: 'id', header: 'ID', cell: (b) => <span className="text-xs font-mono text-muted-foreground">#{b.ref ?? b.id.slice(-6).toUpperCase()}</span> },
    {
      key: 'svc',
      header: 'Service',
      cell: (b) => (
        <div className="min-w-0">
          <div className="font-medium text-sm truncate">{b.service?.title ?? 'Custom'}</div>
          <div className="text-xs text-muted-foreground truncate">{b.provider?.user?.name}</div>
        </div>
      ),
    },
    { key: 'cust', header: 'Customer', cell: (b) => <span className="text-sm">{b.customer?.name}</span> },
    { key: 'when', header: 'Scheduled', cell: (b) => <span className="text-sm text-muted-foreground">{fmtDateTime(b.scheduledAt)}</span> },
    { key: 'amount', header: 'Amount', cell: (b) => <span className="text-sm font-medium">{formatINR(b.amount)}</span> },
    { key: 'pay', header: 'Payment', cell: (b) => <StatusBadge status={b.paymentStatus} /> },
    { key: 'status', header: 'Status', cell: (b) => <StatusBadge status={b.status} /> },
    {
      key: 'actions',
      header: 'Actions',
      headerClassName: 'w-[200px]',
      cell: (b) => {
        const refundable = b.paymentStatus === 'PAID';
        return (
          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
            <Button variant="outline" size="sm" className="h-8" onClick={() => navigate(`/bookings/${b.id}`)}>
              <Eye className="size-4" /> View
            </Button>
            {refundable && (
              <Button variant="outline" size="sm" className="h-8" onClick={() => refund(b)} title="Issue refund">
                <RotateCcw className="size-4" /> Refund
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="size-8" title="Change status">
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Set status</DropdownMenuLabel>
                {STATUSES.map((s) => (
                  <DropdownMenuItem
                    key={s}
                    onClick={() => setBookingStatus(b, s)}
                    className={s === 'CANCELLED' ? 'text-destructive focus:text-destructive' : ''}
                  >
                    {s.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                    {b.status === s && <Check className="size-4 ml-auto text-primary" />}
                  </DropdownMenuItem>
                ))}
                {!refundable && b.paymentStatus === 'REFUNDED' && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem disabled>Already refunded</DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => openEdit(b)}>
                  <Pencil className="size-4" /> Edit details
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setToDelete(b)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="size-4" /> Delete booking
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

  return (
    <div>
      <PageHeader
        title="Bookings"
        description="Every booking across the marketplace"
        actions={
          <>
            <ExportButton entity="bookings" />
            <Button onClick={() => setCreateOpen(true)}><Plus className="size-4" /> New booking</Button>
          </>
        }
      />
      <DataTable
        columns={columns}
        rows={data?.data ?? []}
        loading={loading}
        rowKey={(b) => b.id}
        onRowClick={(b) => navigate(`/bookings/${b.id}`)}
        pagination={data?.pagination}
        onPageChange={setPage}
        toolbar={
          <div className="flex flex-col sm:flex-row gap-2">
            <SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search customer, provider or booking #…" className="sm:max-w-xs w-full" />
            <FilterSelect
              value={status}
              onChange={(v) => { setStatus(v); setPage(1); }}
              options={[
                { value: 'all', label: 'All status' },
                { value: 'PENDING', label: 'Pending' },
                { value: 'CONFIRMED', label: 'Confirmed' },
                { value: 'IN_PROGRESS', label: 'In progress' },
                { value: 'COMPLETED', label: 'Completed' },
                { value: 'CANCELLED', label: 'Cancelled' },
              ]}
            />
          </div>
        }
      />

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit booking</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="bk-when">Scheduled for</Label>
              <Input id="bk-when" type="datetime-local" value={form.scheduledAt} onChange={(e) => setForm((f) => ({ ...f, scheduledAt: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bk-amount">Amount (₹)</Label>
              <Input id="bk-amount" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bk-address">Address</Label>
              <Input id="bk-address" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bk-notes">Notes</Label>
              <Textarea id="bk-notes" rows={3} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={saveEdit} disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDelete
        target={toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        onConfirm={(b) => adminApi.bookings.remove(b.id).then(refetch)}
        title={(b) => `Delete booking #${b.ref ?? b.id.slice(-6).toUpperCase()}?`}
        description={() =>
          'A paid booking is an accounting record and must be refunded before it can be removed. Cancelling is usually the right action.'
        }
        successMessage={() => 'Booking deleted'}
      />

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New booking</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <PickerField
              label="Customer"
              value={nb.customerId}
              onChange={(v) => setNb((f) => ({ ...f, customerId: v }))}
              load={(q) => adminApi.users.list({ q, role: 'CUSTOMER', limit: 20 }).then((r) => r.data.map((u) => ({ value: u.id, label: `${u.name ?? 'Unnamed'} · ${u.phone}` })))}
              placeholder="Search by name or phone…"
            />
            <PickerField
              label="Provider"
              value={nb.providerId}
              onChange={(v) => setNb((f) => ({ ...f, providerId: v, serviceId: '' }))}
              load={(q) => adminApi.providers.list({ q, limit: 20 }).then((r) => r.data.map((p) => ({ value: p.id, label: `${p.user?.name ?? 'Unnamed'}${p.businessName ? ` · ${p.businessName}` : ''}` })))}
              placeholder="Search providers…"
            />
            {nb.providerId && (
              <PickerField
                key={nb.providerId}
                label="Service (optional)"
                value={nb.serviceId}
                onChange={(v) => setNb((f) => ({ ...f, serviceId: v }))}
                load={(q) =>
                  adminApi.providers.get(nb.providerId).then((r) =>
                    (r.provider.services ?? [])
                      .filter((sv) => !q || sv.title.toLowerCase().includes(q.toLowerCase()))
                      .map((sv) => ({ value: sv.id, label: `${sv.title} · ₹${sv.price / 100}${sv.priceUnit}` })),
                  )
                }
                placeholder="Filter this provider's services…"
              />
            )}
            <div className="space-y-2">
              <Label htmlFor="nb-when">Scheduled for</Label>
              <Input id="nb-when" type="datetime-local" value={nb.scheduledAt} onChange={(e) => setNb((f) => ({ ...f, scheduledAt: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nb-amount">Amount (₹)</Label>
              <Input id="nb-amount" value={nb.amount} onChange={(e) => setNb((f) => ({ ...f, amount: e.target.value }))} placeholder="Leave blank to use the provider's standard price + fees" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nb-address">Address</Label>
              <Input id="nb-address" value={nb.address} onChange={(e) => setNb((f) => ({ ...f, address: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nb-notes">Notes</Label>
              <Textarea id="nb-notes" rows={2} value={nb.notes} onChange={(e) => setNb((f) => ({ ...f, notes: e.target.value }))} placeholder="What the customer asked for on the call" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={createBooking} disabled={creating}>{creating ? 'Creating…' : 'Create booking'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
