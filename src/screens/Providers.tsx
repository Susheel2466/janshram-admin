import { useState } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { MoreHorizontal, BadgeCheck, Eye, CircleSlash, Power, Award, Check, CheckCircle2, Pencil, Trash2 } from 'lucide-react';
import { adminApi, formatINR } from '../lib/api';
import { useApi } from '../lib/useApi';
import { PageHeader } from '../components/PageHeader';
import { DataTable, type Column } from '../components/DataTable';
import { SearchInput, UserCell, Stars } from '../components/common';
import { FilterSelect } from '../components/FilterSelect';
import { StatusBadge } from '../components/StatusBadge';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
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
import type { ProviderProfile } from '../lib/types';

const NONE = '__none__';
const BADGES = [NONE, 'Top Rated', 'Verified Pro', 'Most Booked', 'Premium'];

export function Providers() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<ProviderProfile | null>(null);
  const [form, setForm] = useState({ businessName: '', bio: '', experience: '', priceFrom: '', pricePer: '', city: '', area: '', specialties: '' });
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<ProviderProfile | null>(null);
  const [verified, setVerified] = useState('all');
  const [category, setCategory] = useState('all');
  const [page, setPage] = useState(1);

  const cats = useApi(() => adminApi.categories.list(), []);
  const { data, loading, refetch } = useApi(
    () =>
      adminApi.providers.list({
        q,
        verified: verified === 'all' ? undefined : verified,
        category: category === 'all' ? undefined : category,
        page,
      }),
    [q, verified, category, page],
  );

  const toggleVerify = async (p: ProviderProfile) => {
    await adminApi.providers.setVerified(p.id, !p.isVerified);
    toast.success(p.isVerified ? 'Verification revoked' : `${p.user?.name} verified`);
    refetch();
  };
  const toggleAvail = async (p: ProviderProfile) => {
    await adminApi.providers.setAvailable(p.id, !p.isAvailable);
    toast.success('Availability updated');
    refetch();
  };
  const setBadge = async (p: ProviderProfile, badge: string) => {
    const value = badge === NONE ? null : badge;
    await adminApi.providers.setBadge(p.id, value);
    toast.success(value ? `Badge set: ${value}` : 'Badge removed');
    refetch();
  };
  const toggleActive = async (p: ProviderProfile) => {
    if (!p.user?.id) return;
    await adminApi.users.setActive(p.user.id, !p.user.isActive);
    toast.success(p.user.isActive ? 'Account deactivated' : 'Account activated');
    refetch();
  };

  const openEdit = (p: ProviderProfile) => {
    setEditing(p);
    setForm({
      businessName: p.businessName ?? '',
      bio: p.bio ?? '',
      experience: String(p.experience ?? 0),
      priceFrom: String((p.priceFrom ?? 0) / 100),
      pricePer: p.pricePer ?? '',
      city: p.city ?? '',
      area: p.area ?? '',
      specialties: (p.specialties ?? []).join(', '),
    });
  };

  const saveEdit = async () => {
    if (!editing) return;
    const experience = Number(form.experience);
    const priceFrom = Number(form.priceFrom);
    if (Number.isNaN(experience) || experience < 0) return toast.error('Experience must be a number of years');
    if (Number.isNaN(priceFrom) || priceFrom < 0) return toast.error('Starting price must be a number');
    setSaving(true);
    try {
      await adminApi.providers.update(editing.id, {
        businessName: form.businessName.trim() || null,
        bio: form.bio.trim() || null,
        experience,
        priceFromRupees: priceFrom,
        ...(form.pricePer.trim() ? { pricePer: form.pricePer.trim() } : {}),
        city: form.city.trim() || null,
        area: form.area.trim() || null,
        specialties: form.specialties.split(',').map((x) => x.trim()).filter(Boolean),
      });
      toast.success('Provider updated');
      setEditing(null);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update provider');
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<ProviderProfile>[] = [
    { key: 'p', header: 'Provider', cell: (p) => <UserCell name={p.user?.name} sub={p.businessName} avatar={p.user?.avatar} /> },
    {
      key: 'cats',
      header: 'Categories',
      cell: (p) => (
        <div className="flex flex-wrap gap-1">
          {p.categories?.slice(0, 2).map((c) => <Badge key={c.id} variant="secondary" className="font-normal">{c.name}</Badge>)}
          {(p.categories?.length ?? 0) > 2 && <Badge variant="secondary" className="font-normal">+{p.categories!.length - 2}</Badge>}
        </div>
      ),
    },
    { key: 'rating', header: 'Rating', cell: (p) => <span className="flex items-center gap-1.5"><Stars rating={p.rating} /><span className="text-xs text-muted-foreground">({p.reviewCount})</span></span> },
    { key: 'jobs', header: 'Jobs', cell: (p) => <span className="text-sm">{p.completedJobs}</span> },
    { key: 'earned', header: 'Earned', cell: (p) => <span className="text-sm font-medium">{p.totalEarnedPaise != null ? formatINR(p.totalEarnedPaise) : '—'}</span> },
    { key: 'area', header: 'Area', cell: (p) => <span className="text-sm text-muted-foreground">{p.area ?? '—'}</span> },
    {
      key: 'flags',
      header: 'Status',
      cell: (p) => (
        <div className="flex flex-wrap gap-1">
          <StatusBadge status={p.isVerified ? 'ACTIVE' : 'PENDING'} className={p.isVerified ? '' : ''} />
          {p.isAvailable ? <Badge variant="secondary" className="font-normal">Available</Badge> : <Badge variant="outline" className="font-normal text-muted-foreground">Offline</Badge>}
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      headerClassName: 'w-[230px]',
      cell: (p) => (
        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          {/* View details */}
          <Button variant="outline" size="sm" className="h-8" onClick={() => navigate(`/providers/${p.id}`)}>
            <Eye className="size-4" /> View
          </Button>

          {/* Verify / Revoke */}
          <Button
            variant={p.isVerified ? 'outline' : 'default'}
            size="sm"
            className="h-8"
            onClick={() => toggleVerify(p)}
            title={p.isVerified ? 'Revoke verification' : 'Verify provider'}
          >
            {p.isVerified ? <CircleSlash className="size-4" /> : <BadgeCheck className="size-4" />}
            {p.isVerified ? 'Unverify' : 'Verify'}
          </Button>

          {/* Availability toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={() => toggleAvail(p)}
            title={p.isAvailable ? 'Set offline' : 'Set available'}
          >
            <Power className={`size-4 ${p.isAvailable ? 'text-green-600' : 'text-muted-foreground'}`} />
          </Button>

          {/* More: badge + account status */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8" title="More actions">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel className="flex items-center gap-1.5"><Award className="size-3.5" /> Feature badge</DropdownMenuLabel>
              {BADGES.map((b) => (
                <DropdownMenuItem key={b} onClick={() => setBadge(p, b)}>
                  {b === NONE ? 'No badge' : b}
                  {(p.badge ?? NONE) === b && <Check className="size-4 ml-auto text-primary" />}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => openEdit(p)}>
                <Pencil className="size-4" /> Edit profile
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => toggleActive(p)}
                className={p.user?.isActive ? 'text-destructive focus:text-destructive' : ''}
              >
                {p.user?.isActive
                  ? <><CircleSlash className="size-4" /> Deactivate account</>
                  : <><CheckCircle2 className="size-4" /> Activate account</>}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setToDelete(p)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="size-4" /> Delete provider profile
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Providers" description="Verify, badge and manage service professionals" />
      <DataTable
        columns={columns}
        rows={data?.data ?? []}
        loading={loading}
        rowKey={(p) => p.id}
        onRowClick={(p) => navigate(`/providers/${p.id}`)}
        pagination={data?.pagination}
        onPageChange={setPage}
        toolbar={
          <div className="flex flex-col sm:flex-row gap-2">
            <SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search provider, business…" className="sm:max-w-xs w-full" />
            <FilterSelect
              value={verified}
              onChange={(v) => { setVerified(v); setPage(1); }}
              options={[
                { value: 'all', label: 'All' },
                { value: 'yes', label: 'Verified' },
                { value: 'no', label: 'Unverified' },
              ]}
            />
            <FilterSelect
              value={category}
              onChange={(v) => { setCategory(v); setPage(1); }}
              options={[{ value: 'all', label: 'All categories' }, ...(cats.data?.categories.map((c) => ({ value: c.name, label: c.name })) ?? [])]}
              className="w-[170px] bg-background"
            />
          </div>
        }
      />

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit provider profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="pv-business">Business name</Label>
              <Input id="pv-business" value={form.businessName} onChange={(e) => setForm((f) => ({ ...f, businessName: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pv-bio">Bio</Label>
              <Textarea id="pv-bio" rows={3} value={form.bio} onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="pv-exp">Experience (yrs)</Label>
                <Input id="pv-exp" value={form.experience} onChange={(e) => setForm((f) => ({ ...f, experience: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pv-price">From (₹)</Label>
                <Input id="pv-price" value={form.priceFrom} onChange={(e) => setForm((f) => ({ ...f, priceFrom: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pv-per">Per</Label>
                <Input id="pv-per" value={form.pricePer} onChange={(e) => setForm((f) => ({ ...f, pricePer: e.target.value }))} placeholder="/hour" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="pv-city">City</Label>
                <Input id="pv-city" value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pv-area">Area</Label>
                <Input id="pv-area" value={form.area} onChange={(e) => setForm((f) => ({ ...f, area: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pv-spec">Specialties</Label>
              <Input id="pv-spec" value={form.specialties} onChange={(e) => setForm((f) => ({ ...f, specialties: e.target.value }))} placeholder="Comma separated" />
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
        onConfirm={(p) => adminApi.providers.remove(p.id).then(refetch)}
        title={(p) => `Delete ${p.user?.name ?? 'this provider'}'s profile?`}
        description={() =>
          'Only the provider profile is removed — the user account stays, keeping their customer history. Providers with bookings or reviews cannot be deleted.'
        }
        successMessage={() => 'Provider profile deleted'}
      />
    </div>
  );
}
