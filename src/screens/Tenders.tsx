import { useState } from 'react';
import { useNavigate } from 'react-router';
import { adminApi, formatINR } from '../lib/api';
import { useApi } from '../lib/useApi';
import { PageHeader } from '../components/PageHeader';
import { DataTable, type Column } from '../components/DataTable';
import { SearchInput, fmtDate } from '../components/common';
import { FilterSelect } from '../components/FilterSelect';
import { StatusBadge } from '../components/StatusBadge';
import { Badge } from '../components/ui/badge';
import type { Tender } from '../lib/types';

export function Tenders() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);

  const { data, loading } = useApi(
    () => adminApi.tenders.list({ q, status: status === 'all' ? undefined : status, page }),
    [q, status, page],
  );

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
