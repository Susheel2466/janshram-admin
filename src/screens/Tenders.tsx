import { useState } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { Eye, MoreHorizontal, Check, Pencil, Trash2 } from 'lucide-react';
import { adminApi, formatINR } from '../lib/api';
import { useApi } from '../lib/useApi';
import { PageHeader } from '../components/PageHeader';
import { DataTable, type Column } from '../components/DataTable';
import { SearchInput, fmtDate } from '../components/common';
import { FilterSelect } from '../components/FilterSelect';
import { StatusBadge } from '../components/StatusBadge';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel,
  DropdownMenuSeparator,
} from '../components/ui/dropdown-menu';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { ConfirmDelete } from '../components/ConfirmDelete';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '../components/ui/dialog';
import type { Tender, TenderStatus } from '../lib/types';

const STATUSES: TenderStatus[] = ['OPEN', 'AWARDED', 'CLOSED', 'CANCELLED'];

export function Tenders() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Tender | null>(null);
  const [form, setForm] = useState({ title: '', description: '', timeline: '', budgetMin: '', budgetMax: '', city: '', area: '' });
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<Tender | null>(null);

  const { data, loading, refetch } = useApi(
    () => adminApi.tenders.list({ q, status: status === 'all' ? undefined : status, page }),
    [q, status, page],
  );

  const setTenderStatus = async (t: Tender, next: TenderStatus) => {
    if (next === t.status) return;
    await adminApi.tenders.setStatus(t.id, next);
    toast.success(`Tender marked ${next.toLowerCase()}`);
    refetch();
  };

  const openEdit = (t: Tender) => {
    setEditing(t);
    setForm({
      title: t.title,
      description: t.description,
      timeline: t.timeline ?? '',
      budgetMin: String(t.budgetMin / 100),
      budgetMax: String(t.budgetMax / 100),
      city: t.city ?? '',
      area: t.area ?? '',
    });
  };

  const saveEdit = async () => {
    if (!editing) return;
    if (!form.title.trim()) return toast.error('Title is required');
    const min = Number(form.budgetMin);
    const max = Number(form.budgetMax);
    if (Number.isNaN(min) || Number.isNaN(max)) return toast.error('Budget must be a number');
    if (min > max) return toast.error('Minimum budget cannot exceed the maximum');
    setSaving(true);
    try {
      await adminApi.tenders.update(editing.id, {
        title: form.title.trim(),
        description: form.description.trim(),
        timeline: form.timeline.trim() || null,
        city: form.city.trim() || null,
        area: form.area.trim() || null,
        budgetMinRupees: min,
        budgetMaxRupees: max,
      });
      toast.success('Tender updated');
      setEditing(null);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update tender');
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<Tender>[] = [
    {
      key: 'title',
      header: 'Tender',
      cell: (t) => (
        <div className="min-w-0">
          <div className="font-medium text-sm truncate">{t.title}</div>
          <div className="text-xs text-muted-foreground truncate">{t.area}, {t.city}</div>
        </div>
      ),
    },
    { key: 'cat', header: 'Category', cell: (t) => <Badge variant="secondary" className="font-normal">{t.category}</Badge> },
    { key: 'cust', header: 'Posted by', cell: (t) => <span className="text-sm">{t.customer?.name}</span> },
    { key: 'budget', header: 'Budget', cell: (t) => <span className="text-sm font-medium whitespace-nowrap">{formatINR(t.budgetMin)}–{formatINR(t.budgetMax)}</span> },
    { key: 'bids', header: 'Bids', cell: (t) => <Badge variant="outline" className="font-normal">{t._count?.bids ?? 0}</Badge> },
    { key: 'status', header: 'Status', cell: (t) => <StatusBadge status={t.status} /> },
    { key: 'created', header: 'Posted', cell: (t) => <span className="text-sm text-muted-foreground">{fmtDate(t.createdAt)}</span> },
    {
      key: 'actions',
      header: 'Actions',
      headerClassName: 'w-[150px]',
      cell: (t) => (
        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <Button variant="outline" size="sm" className="h-8" onClick={() => navigate(`/tenders/${t.id}`)}>
            <Eye className="size-4" /> View
          </Button>
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
                  onClick={() => setTenderStatus(t, s)}
                  className={s === 'CANCELLED' ? 'text-destructive focus:text-destructive' : ''}
                >
                  {s.charAt(0) + s.slice(1).toLowerCase()}
                  {t.status === s && <Check className="size-4 ml-auto text-primary" />}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => openEdit(t)}>
                <Pencil className="size-4" /> Edit details
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setToDelete(t)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="size-4" /> Delete tender
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Tenders & Bids" description="Project tenders posted by customers and provider bids" />
      <DataTable
        columns={columns}
        rows={data?.data ?? []}
        loading={loading}
        rowKey={(t) => t.id}
        onRowClick={(t) => navigate(`/tenders/${t.id}`)}
        pagination={data?.pagination}
        onPageChange={setPage}
        toolbar={
          <div className="flex flex-col sm:flex-row gap-2">
            <SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search tender or customer…" className="sm:max-w-xs w-full" />
            <FilterSelect
              value={status}
              onChange={(v) => { setStatus(v); setPage(1); }}
              options={[
                { value: 'all', label: 'All status' },
                { value: 'OPEN', label: 'Open' },
                { value: 'AWARDED', label: 'Awarded' },
                { value: 'CLOSED', label: 'Closed' },
                { value: 'CANCELLED', label: 'Cancelled' },
              ]}
            />
          </div>
        }
      />

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit tender</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="td-title">Title</Label>
              <Input id="td-title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="td-desc">Description</Label>
              <Textarea id="td-desc" rows={4} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="td-min">Budget min (₹)</Label>
                <Input id="td-min" value={form.budgetMin} onChange={(e) => setForm((f) => ({ ...f, budgetMin: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="td-max">Budget max (₹)</Label>
                <Input id="td-max" value={form.budgetMax} onChange={(e) => setForm((f) => ({ ...f, budgetMax: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="td-city">City</Label>
                <Input id="td-city" value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="td-area">Area</Label>
                <Input id="td-area" value={form.area} onChange={(e) => setForm((f) => ({ ...f, area: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="td-timeline">Timeline</Label>
              <Input id="td-timeline" value={form.timeline} onChange={(e) => setForm((f) => ({ ...f, timeline: e.target.value }))} placeholder="e.g. Within 2 weeks" />
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
        onConfirm={(t) => adminApi.tenders.remove(t.id).then(refetch)}
        title={(t) => `Delete “${t.title}”?`}
        description={() =>
          'The tender and every bid on it are removed. A tender that already produced a booking cannot be deleted — cancel it instead.'
        }
        successMessage={() => 'Tender deleted'}
      />
    </div>
  );
}
