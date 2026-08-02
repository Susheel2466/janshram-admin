import { useState } from 'react';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { adminApi, formatINR, rupeesToPaise, paiseToRupees } from '../lib/api';
import { useApi } from '../lib/useApi';
import { PageHeader } from '../components/PageHeader';
import { DataTable, type Column } from '../components/DataTable';
import { fmtDate } from '../components/common';
import { StatusBadge } from '../components/StatusBadge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { FilterSelect } from '../components/FilterSelect';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '../components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../components/ui/alert-dialog';
import type { Coupon } from '../lib/types';

interface FormState {
  code: string;
  description: string;
  discountType: 'FLAT' | 'PERCENT';
  discountValue: string; // rupees if FLAT, percent if PERCENT
  maxDiscount: string; // rupees
  minOrder: string; // rupees
  active: boolean;
  expiresAt: string; // yyyy-mm-dd
}

const empty: FormState = {
  code: '', description: '', discountType: 'FLAT', discountValue: '', maxDiscount: '', minOrder: '', active: true, expiresAt: '',
};

export function Coupons() {
  const { data, loading, refetch } = useApi(() => adminApi.coupons.list(), []);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [form, setForm] = useState<FormState>(empty);
  const [toDelete, setToDelete] = useState<Coupon | null>(null);

  const set = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }));

  const openCreate = () => { setEditing(null); setForm(empty); setOpen(true); };
  const openEdit = (c: Coupon) => {
    setEditing(c);
    setForm({
      code: c.code,
      description: c.description ?? '',
      discountType: c.discountType,
      discountValue: c.discountType === 'FLAT' ? String(paiseToRupees(c.discountValue)) : String(c.discountValue),
      maxDiscount: c.maxDiscount ? String(paiseToRupees(c.maxDiscount)) : '',
      minOrder: String(paiseToRupees(c.minOrder)),
      active: c.active,
      expiresAt: c.expiresAt ? c.expiresAt.slice(0, 10) : '',
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.code.trim()) return toast.error('Code is required');
    const payload = {
      code: form.code.toUpperCase().trim(),
      description: form.description || null,
      discountType: form.discountType,
      discountValue: form.discountType === 'FLAT' ? rupeesToPaise(Number(form.discountValue)) : Number(form.discountValue),
      maxDiscount: form.maxDiscount ? rupeesToPaise(Number(form.maxDiscount)) : null,
      minOrder: rupeesToPaise(Number(form.minOrder) || 0),
      active: form.active,
      expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
    };
    if (editing) {
      await adminApi.coupons.update(editing.id, payload);
      toast.success('Coupon updated');
    } else {
      await adminApi.coupons.create(payload);
      toast.success('Coupon created');
    }
    setOpen(false);
    refetch();
  };

  const remove = async () => {
    if (!toDelete) return;
    await adminApi.coupons.remove(toDelete.id);
    toast.success('Coupon deleted');
    setToDelete(null);
    refetch();
  };

  const columns: Column<Coupon>[] = [
    { key: 'code', header: 'Code', cell: (c) => <span className="font-mono font-medium text-sm">{c.code}</span> },
    { key: 'desc', header: 'Description', cell: (c) => <span className="text-sm text-muted-foreground">{c.description ?? '—'}</span> },
    {
      key: 'discount',
      header: 'Discount',
      cell: (c) => <span className="text-sm font-medium">{c.discountType === 'FLAT' ? formatINR(c.discountValue) : `${c.discountValue}%`}{c.maxDiscount ? <span className="text-muted-foreground font-normal"> (max {formatINR(c.maxDiscount)})</span> : null}</span>,
    },
    { key: 'min', header: 'Min order', cell: (c) => <span className="text-sm">{formatINR(c.minOrder)}</span> },
    { key: 'redeem', header: 'Redeemed', cell: (c) => <span className="text-sm">{c.redemptions ?? 0}</span> },
    { key: 'expires', header: 'Expires', cell: (c) => <span className="text-sm text-muted-foreground">{c.expiresAt ? fmtDate(c.expiresAt) : 'Never'}</span> },
    { key: 'status', header: 'Status', cell: (c) => <StatusBadge status={c.active ? 'ACTIVE' : 'INACTIVE'} /> },
    {
      key: 'actions',
      header: '',
      headerClassName: 'w-20',
      cell: (c) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="size-8" onClick={() => openEdit(c)}><Pencil className="size-4" /></Button>
          <Button variant="ghost" size="icon" className="size-8 text-destructive hover:text-destructive" onClick={() => setToDelete(c)}><Trash2 className="size-4" /></Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Coupons"
        description="Promo codes applied at checkout"
        actions={<Button onClick={openCreate}><Plus className="size-4" /> New coupon</Button>}
      />
      <DataTable columns={columns} rows={data?.coupons ?? []} loading={loading} rowKey={(c) => c.id} />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Edit coupon' : 'New coupon'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Code</Label>
                <Input value={form.code} onChange={(e) => set({ code: e.target.value })} placeholder="MONSOON20" className="font-mono uppercase" />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <FilterSelect
                  value={form.discountType}
                  onChange={(v) => set({ discountType: v as 'FLAT' | 'PERCENT' })}
                  options={[{ value: 'FLAT', label: 'Flat ₹' }, { value: 'PERCENT', label: 'Percent %' }]}
                  className="w-full bg-background"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={form.description} onChange={(e) => set({ description: e.target.value })} placeholder="20% off, up to ₹300" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{form.discountType === 'FLAT' ? 'Discount (₹)' : 'Discount (%)'}</Label>
                <Input type="number" value={form.discountValue} onChange={(e) => set({ discountValue: e.target.value })} />
              </div>
              {form.discountType === 'PERCENT' && (
                <div className="space-y-2">
                  <Label>Max discount (₹)</Label>
                  <Input type="number" value={form.maxDiscount} onChange={(e) => set({ maxDiscount: e.target.value })} />
                </div>
              )}
              <div className="space-y-2">
                <Label>Min order (₹)</Label>
                <Input type="number" value={form.minOrder} onChange={(e) => set({ minOrder: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Expires</Label>
                <Input type="date" value={form.expiresAt} onChange={(e) => set({ expiresAt: e.target.value })} />
              </div>
            </div>
            <div className="flex items-center justify-between pt-1">
              <Label>Active</Label>
              <Switch checked={form.active} onCheckedChange={(v) => set({ active: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save}>{editing ? 'Save changes' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{toDelete?.code}”?</AlertDialogTitle>
            <AlertDialogDescription>Customers will no longer be able to redeem this code.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={remove} className="bg-destructive text-white hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
