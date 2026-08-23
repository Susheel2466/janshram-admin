import { useState } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { UserCheck, UserX, Eye, Plus, Trash2, Check } from 'lucide-react';
import { adminApi, formatINR } from '../lib/api';
import { useApi } from '../lib/useApi';
import { PageHeader } from '../components/PageHeader';
import { ExportButton } from '../components/ExportButton';
import { DataTable, type Column } from '../components/DataTable';
import { SearchInput, UserCell, PhoneLink, fmtDate } from '../components/common';
import { FilterSelect } from '../components/FilterSelect';
import { StatusBadge } from '../components/StatusBadge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { ConfirmDelete } from '../components/ConfirmDelete';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '../components/ui/dialog';
import type { User } from '../lib/types';
import { Textarea } from '../components/ui/textarea';
import { cn } from '../components/ui/utils';

interface NewUser {
  phone: string;
  name: string;
  email: string;
  role: 'CUSTOMER' | 'PROVIDER' | 'ADMIN';
  city: string;
  area: string;
  password: string;
  // ── Provider registration ──
  // A provider with no trade can't be found by the customers looking for
  // exactly their work, and a profile with no details is an empty page — so
  // both are collected here rather than left for a second edit pass.
  categoryIds: string[];
  businessName: string;
  businessType: string;
  experience: string;
  priceFrom: string;
  bio: string;
}

const emptyUser: NewUser = {
  phone: '', name: '', email: '', role: 'CUSTOMER', city: '', area: '', password: '',
  categoryIds: [], businessName: '', businessType: '', experience: '', priceFrom: '', bio: '',
};

export function Users() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [role, setRole] = useState('all');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<NewUser>(emptyUser);
  const [saving, setSaving] = useState(false);
  // The trades a provider can be registered under.
  const { data: catData, loading: categoriesLoading } = useApi(() => adminApi.categories.list(), []);
  const categories = catData?.categories ?? [];
  const [toDelete, setToDelete] = useState<User | null>(null);

  const { data, loading, refetch } = useApi(
    () =>
      adminApi.users.list({
        q,
        role: role === 'all' ? undefined : role,
        status: status === 'all' ? undefined : status,
        page,
      }),
    [q, role, status, page],
  );

  const toggleActive = async (u: User) => {
    await adminApi.users.setActive(u.id, !u.isActive);
    toast.success(u.isActive ? `${u.name} deactivated` : `${u.name} reactivated`);
    refetch();
  };

  const setField = (patch: Partial<NewUser>) => setForm((f) => ({ ...f, ...patch }));

  const createUser = async () => {
    if (!/^\d{10}$/.test(form.phone.trim())) return toast.error('Enter a 10-digit mobile number');
    if (form.role === 'ADMIN' && (!form.email.trim() || form.password.length < 8)) {
      return toast.error('Admin accounts need an email and an 8+ character password');
    }
    // Registering a provider with no trade is what made them invisible in
    // category search, so it is refused rather than silently allowed.
    if (form.role === 'PROVIDER' && form.categoryIds.length === 0) {
      return toast.error('Pick at least one service category for this provider');
    }
    setSaving(true);
    try {
      await adminApi.users.create({
        phone: form.phone.trim(),
        role: form.role,
        ...(form.name.trim() ? { name: form.name.trim() } : {}),
        ...(form.email.trim() ? { email: form.email.trim() } : {}),
        ...(form.city.trim() ? { city: form.city.trim() } : {}),
        ...(form.area.trim() ? { area: form.area.trim() } : {}),
        ...(form.password ? { password: form.password } : {}),
        // Provider details only mean anything on a provider.
        ...(form.role === 'PROVIDER'
          ? {
              ...(form.categoryIds.length ? { categoryIds: form.categoryIds } : {}),
              ...(form.businessName.trim() ? { businessName: form.businessName.trim() } : {}),
              ...(form.businessType.trim() ? { businessType: form.businessType.trim() } : {}),
              ...(form.experience.trim() ? { experience: Number(form.experience) } : {}),
              ...(form.priceFrom.trim() ? { priceFromRupees: Number(form.priceFrom) } : {}),
              ...(form.bio.trim() ? { bio: form.bio.trim() } : {}),
            }
          : {}),
      });
      toast.success('User created');
      setCreateOpen(false);
      setForm(emptyUser);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not create user');
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<User>[] = [
    {
      key: 'user',
      header: 'User',
      cell: (u) => <UserCell name={u.name} sub={<PhoneLink phone={u.phone} />} avatar={u.avatar} />,
    },
    { key: 'email', header: 'Email', cell: (u) => <span className="text-sm text-muted-foreground">{u.email ?? '—'}</span> },
    { key: 'role', header: 'Role', cell: (u) => <StatusBadge status={u.role} /> },
    { key: 'city', header: 'Location', cell: (u) => <span className="text-sm">{u.area ? `${u.area}, ${u.city}` : u.city ?? '—'}</span> },
    { key: 'bookings', header: 'Bookings', cell: (u) => <span className="text-sm">{u.bookingsCount ?? '—'}</span> },
    { key: 'spent', header: 'Spent', cell: (u) => <span className="text-sm font-medium">{u.totalSpentPaise != null ? formatINR(u.totalSpentPaise) : '—'}</span> },
    { key: 'status', header: 'Status', cell: (u) => <StatusBadge status={u.isActive ? 'ACTIVE' : 'INACTIVE'} /> },
    { key: 'joined', header: 'Joined', cell: (u) => <span className="text-sm text-muted-foreground">{fmtDate(u.createdAt)}</span> },
    {
      key: 'actions',
      header: 'Actions',
      headerClassName: 'w-[260px]',
      cell: (u) => (
        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <Button variant="outline" size="sm" className="h-8" onClick={() => navigate(`/users/${u.id}`)}>
            <Eye className="size-4" /> View
          </Button>
          <Button
            variant={u.isActive ? 'outline' : 'default'}
            size="sm"
            className={`h-8 ${u.isActive ? 'text-destructive hover:text-destructive' : ''}`}
            onClick={() => toggleActive(u)}
            title={u.isActive ? 'Deactivate account' : 'Reactivate account'}
          >
            {u.isActive ? <><UserX className="size-4" /> Deactivate</> : <><UserCheck className="size-4" /> Reactivate</>}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-destructive hover:text-destructive"
            onClick={() => setToDelete(u)}
            title="Delete account permanently"
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Users"
        description="Everyone on the platform — customers and providers"
        actions={
          <>
            <ExportButton entity="users" />
            <Button onClick={() => { setForm(emptyUser); setCreateOpen(true); }}>
              <Plus className="size-4" /> New user
            </Button>
          </>
        }
      />
      <DataTable
        columns={columns}
        rows={data?.data ?? []}
        loading={loading}
        rowKey={(u) => u.id}
        onRowClick={(u) => navigate(`/users/${u.id}`)}
        pagination={data?.pagination}
        onPageChange={setPage}
        toolbar={
          <div className="flex flex-col sm:flex-row gap-2">
            <SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search name, phone, email…" className="sm:max-w-xs w-full" />
            <FilterSelect
              value={role}
              onChange={(v) => { setRole(v); setPage(1); }}
              options={[
                { value: 'all', label: 'All roles' },
                { value: 'CUSTOMER', label: 'Customers' },
                { value: 'PROVIDER', label: 'Providers' },
              ]}
            />
            <FilterSelect
              value={status}
              onChange={(v) => { setStatus(v); setPage(1); }}
              options={[
                { value: 'all', label: 'All status' },
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
              ]}
            />
          </div>
        }
      />

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New user</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="nu-phone">Mobile number</Label>
                <Input id="nu-phone" value={form.phone} onChange={(e) => setField({ phone: e.target.value })} placeholder="10 digits" />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <FilterSelect
                  value={form.role}
                  onChange={(v) => setField({ role: v as NewUser['role'] })}
                  options={[
                    { value: 'CUSTOMER', label: 'Customer' },
                    { value: 'PROVIDER', label: 'Provider' },
                    { value: 'ADMIN', label: 'Admin' },
                  ]}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="nu-name">Name</Label>
              <Input id="nu-name" value={form.name} onChange={(e) => setField({ name: e.target.value })} placeholder="Full name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nu-email">Email {form.role === 'ADMIN' && <span className="text-destructive">*</span>}</Label>
              <Input id="nu-email" type="email" value={form.email} onChange={(e) => setField({ email: e.target.value })} placeholder="name@example.com" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="nu-city">City</Label>
                <Input id="nu-city" value={form.city} onChange={(e) => setField({ city: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nu-area">Area</Label>
                <Input id="nu-area" value={form.area} onChange={(e) => setField({ area: e.target.value })} />
              </div>
            </div>
            {form.role === 'ADMIN' && (
              <div className="space-y-2">
                <Label htmlFor="nu-pass">Password <span className="text-destructive">*</span></Label>
                <Input id="nu-pass" type="password" value={form.password} onChange={(e) => setField({ password: e.target.value })} placeholder="At least 8 characters" />
                <p className="text-xs text-muted-foreground">Admins sign in with email + password; customers and providers use OTP.</p>
              </div>
            )}

            {/* ── Provider details ──
                Collected at registration because a provider profile created
                empty is unusable: no trade means no category search, and no
                price means nothing to show on a card. */}
            {form.role === 'PROVIDER' && (
              <div className="space-y-4 rounded-xl border p-3">
                <div>
                  <Label>
                    Service categories <span className="text-destructive">*</span>
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    What this provider works in. Customers filter by these — without one they can't be found.
                  </p>
                  {categoriesLoading ? (
                    <p className="mt-2 text-xs text-muted-foreground">Loading categories…</p>
                  ) : categories.length === 0 ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      No categories exist yet — add one under Catalog → Categories first.
                    </p>
                  ) : (
                    <div className="mt-2 flex max-h-40 flex-wrap gap-2 overflow-y-auto">
                      {categories.map((c) => {
                        const picked = form.categoryIds.includes(c.id);
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() =>
                              setField({
                                categoryIds: picked
                                  ? form.categoryIds.filter((id) => id !== c.id)
                                  : [...form.categoryIds, c.id],
                              })
                            }
                            className={cn(
                              'rounded-lg border px-2.5 py-1 text-xs transition-colors',
                              picked
                                ? 'border-primary bg-primary/10 font-medium text-primary'
                                : 'border-border hover:bg-muted',
                            )}
                          >
                            {picked && <Check className="mr-1 inline size-3" />}
                            {c.name}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="nu-business">Business name</Label>
                    <Input id="nu-business" value={form.businessName} onChange={(e) => setField({ businessName: e.target.value })} placeholder="e.g. Kumar Electricals" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nu-btype">Business type</Label>
                    <Input id="nu-btype" value={form.businessType} onChange={(e) => setField({ businessType: e.target.value })} placeholder="e.g. Sole Proprietor" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="nu-exp">Experience (years)</Label>
                    <Input id="nu-exp" inputMode="numeric" value={form.experience} onChange={(e) => setField({ experience: e.target.value.replace(/\D/g, '') })} placeholder="e.g. 5" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nu-price">Starting price (₹)</Label>
                    <Input id="nu-price" inputMode="numeric" value={form.priceFrom} onChange={(e) => setField({ priceFrom: e.target.value.replace(/[^\d.]/g, '') })} placeholder="e.g. 500" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nu-bio">Bio</Label>
                  <Textarea id="nu-bio" rows={2} value={form.bio} onChange={(e) => setField({ bio: e.target.value })} placeholder="What they do, in a line or two" />
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={createUser} disabled={saving}>{saving ? 'Creating…' : 'Create user'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDelete
        target={toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        onConfirm={(u) => adminApi.users.remove(u.id).then(refetch)}
        title={(u) => `Delete ${u.name ?? u.phone}?`}
        description={() =>
          'This permanently removes the account. Accounts with bookings, reviews or message history cannot be deleted — deactivate those instead.'
        }
        successMessage={(u) => `${u.name ?? u.phone} deleted`}
      />
    </div>
  );
}
