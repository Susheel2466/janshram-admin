import { useState } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { Eye, MoreHorizontal, Check } from 'lucide-react';
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
} from '../components/ui/dropdown-menu';
import type { Tender, TenderStatus } from '../lib/types';

const STATUSES: TenderStatus[] = ['OPEN', 'AWARDED', 'CLOSED', 'CANCELLED'];

export function Tenders() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);

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
    </div>
  );
}
