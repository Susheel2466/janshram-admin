import { useState } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { MoreHorizontal, BadgeCheck, Eye, CircleSlash, Power, Award, Check, CheckCircle2 } from 'lucide-react';
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
import type { ProviderProfile } from '../lib/types';

const NONE = '__none__';
const BADGES = [NONE, 'Top Rated', 'Verified Pro', 'Most Booked', 'Premium'];

export function Providers() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
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
              <DropdownMenuItem
                onClick={() => toggleActive(p)}
                className={p.user?.isActive ? 'text-destructive focus:text-destructive' : ''}
              >
                {p.user?.isActive
                  ? <><CircleSlash className="size-4" /> Deactivate account</>
                  : <><CheckCircle2 className="size-4" /> Activate account</>}
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
    </div>
  );
}
