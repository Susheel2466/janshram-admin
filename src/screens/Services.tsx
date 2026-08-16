import { useState } from 'react';
import { SafeImage } from '../components/SafeImage';
import { toast } from 'sonner';
import { Trash2, ImageOff, Plus, Pencil } from 'lucide-react';
import { adminApi, formatINR, paiseToRupees } from '../lib/api';
import { useApi } from '../lib/useApi';
import { PageHeader } from '../components/PageHeader';
import { DataTable, type Column } from '../components/DataTable';
import { SearchInput, Stars } from '../components/common';
import { FilterSelect } from '../components/FilterSelect';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '../components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../components/ui/alert-dialog';
import type { Service } from '../lib/types';

const PRICE_UNITS = ['/hour', '/visit', '/day'];

export function Services() {
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('all');
  const [page, setPage] = useState(1);
  const [toDelete, setToDelete] = useState<Service | null>(null);
  const [editing, setEditing] = useState<Service | null>(null);
  const [creating, setCreating] = useState(false);

  const cats = useApi(() => adminApi.categories.list(), []);
  const provs = useApi(() => adminApi.providers.list({ limit: 100 }), []);
  const { data, loading, refetch } = useApi(
    () => adminApi.services.list({ q, category: category === 'all' ? undefined : category, page }),
    [q, category, page],
  );

  const remove = async () => {
    if (!toDelete) return;
    await adminApi.services.remove(toDelete.id);
    toast.success('Service removed');
    setToDelete(null);
    refetch();
  };

  const categoryOptions = cats.data?.categories.map((c) => ({ value: c.id, label: c.name })) ?? [];
  const providerOptions = provs.data?.data.map((p) => ({ value: p.id, label: p.user?.name ?? p.businessName ?? p.id })) ?? [];

  const columns: Column<Service>[] = [
    {
      key: 'svc',
      header: 'Service',
      cell: (s) => (
        <div className="flex items-center gap-3 min-w-0">
          <div className="size-11 rounded-lg bg-muted overflow-hidden shrink-0 flex items-center justify-center">
            <SafeImage src={s.image} alt={s.title} className="size-full object-cover" />
          </div>
          <div className="min-w-0">
            <div className="font-medium text-sm truncate">{s.title}</div>
            <div className="text-xs text-muted-foreground truncate">{s.provider?.user?.name}</div>
          </div>
        </div>
      ),
    },
    { key: 'cat', header: 'Category', cell: (s) => <Badge variant="secondary" className="font-normal">{s.category?.name}</Badge> },
    { key: 'price', header: 'Price', cell: (s) => <span className="text-sm font-medium">{formatINR(s.price)}<span className="text-muted-foreground font-normal">{s.priceUnit}</span></span> },
    { key: 'rating', header: 'Rating', cell: (s) => <span className="flex items-center gap-1.5"><Stars rating={s.rating} /><span className="text-xs text-muted-foreground">({s.reviewCount})</span></span> },
    {
      key: 'actions',
      header: '',
      headerClassName: 'w-20',
      cell: (s) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="size-8" onClick={() => setEditing(s)}>
            <Pencil className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" className="size-8 text-destructive hover:text-destructive" onClick={() => setToDelete(s)}>
            <Trash2 className="size-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Services"
        description="All service listings across providers"
        actions={<Button onClick={() => setCreating(true)}><Plus className="size-4" /> New service</Button>}
      />
      <DataTable
        columns={columns}
        rows={data?.data ?? []}
        loading={loading}
        rowKey={(s) => s.id}
        pagination={data?.pagination}
        onPageChange={setPage}
        toolbar={
          <div className="flex flex-col sm:flex-row gap-2">
            <SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search service or provider…" className="sm:max-w-xs w-full" />
            <FilterSelect
              value={category}
              onChange={(v) => { setCategory(v); setPage(1); }}
              options={[{ value: 'all', label: 'All categories' }, ...(cats.data?.categories.map((c) => ({ value: c.name, label: c.name })) ?? [])]}
              className="w-[170px] bg-background"
            />
          </div>
        }
      />

      {(creating || editing) && (
        <ServiceFormDialog
          service={editing}
          categoryOptions={categoryOptions}
          providerOptions={providerOptions}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSaved={() => { setCreating(false); setEditing(null); refetch(); }}
        />
      )}

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this service?</AlertDialogTitle>
            <AlertDialogDescription>“{toDelete?.title}” will be delisted from the marketplace.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={remove} className="bg-destructive text-white hover:bg-destructive/90">Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ServiceFormDialog({
  service, categoryOptions, providerOptions, onClose, onSaved,
}: {
  service: Service | null;
  categoryOptions: { value: string; label: string }[];
  providerOptions: { value: string; label: string }[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(service?.title ?? '');
  const [providerId, setProviderId] = useState(service?.providerId ?? '');
  const [categoryId, setCategoryId] = useState(service?.categoryId ?? '');
  const [price, setPrice] = useState(service ? String(paiseToRupees(service.price)) : '');
  const [priceUnit, setPriceUnit] = useState(service?.priceUnit ?? '/hour');
  const [image, setImage] = useState(service?.image ?? '');
  const [description, setDescription] = useState(service?.description ?? '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (title.trim().length < 2) return toast.error('Enter a title');
    if (!service && !providerId) return toast.error('Pick a provider');
    if (!categoryId) return toast.error('Pick a category');
    const priceRupees = Number(price);
    if (!priceRupees || priceRupees < 0) return toast.error('Enter a valid price');
    setSaving(true);
    try {
      if (service) {
        await adminApi.services.update(service.id, { title: title.trim(), description: description || null, priceRupees, priceUnit, image: image || null, categoryId });
        toast.success('Service updated');
      } else {
        await adminApi.services.create({ title: title.trim(), description: description || null, priceRupees, priceUnit, image: image || null, categoryId, providerId });
        toast.success('Service created');
      }
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{service ? 'Edit service' : 'New service'}</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2"><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Deep Home Cleaning" /></div>
          {!service && (
            <div className="space-y-2">
              <Label>Provider</Label>
              <FilterSelect value={providerId} onChange={setProviderId} options={providerOptions} placeholder="Select provider" className="w-full bg-background" />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Category</Label>
              <FilterSelect value={categoryId} onChange={setCategoryId} options={categoryOptions} placeholder="Category" className="w-full bg-background" />
            </div>
            <div className="space-y-2">
              <Label>Unit</Label>
              <FilterSelect value={priceUnit} onChange={setPriceUnit} options={PRICE_UNITS.map((u) => ({ value: u, label: u }))} className="w-full bg-background" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>Price (₹)</Label><Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} /></div>
            <div className="space-y-2"><Label>Image URL</Label><Input value={image} onChange={(e) => setImage(e.target.value)} placeholder="https://…" /></div>
          </div>
          <div className="space-y-2"><Label>Description</Label><Textarea value={description ?? ''} onChange={(e) => setDescription(e.target.value)} rows={3} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{service ? 'Save changes' : 'Create'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
