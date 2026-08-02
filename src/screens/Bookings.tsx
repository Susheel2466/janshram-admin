import { useState } from 'react';
import { useNavigate } from 'react-router';
import { adminApi, formatINR } from '../lib/api';
import { useApi } from '../lib/useApi';
import { PageHeader } from '../components/PageHeader';
import { ExportButton } from '../components/ExportButton';
import { DataTable, type Column } from '../components/DataTable';
import { SearchInput, fmtDateTime } from '../components/common';
import { FilterSelect } from '../components/FilterSelect';
import { StatusBadge } from '../components/StatusBadge';
import type { Booking } from '../lib/types';

export function Bookings() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);

  const { data, loading } = useApi(
    () => adminApi.bookings.list({ q, status: status === 'all' ? undefined : status, page }),
    [q, status, page],
  );

  const columns: Column<Booking>[] = [
    { key: 'id', header: 'ID', cell: (b) => <span className="text-xs font-mono text-muted-foreground">#{b.id}</span> },
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
  ];

  return (
    <div>
      <PageHeader title="Bookings" description="Every booking across the marketplace" actions={<ExportButton entity="bookings" />} />
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
            <SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search customer, provider, ID…" className="sm:max-w-xs w-full" />
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
    </div>
  );
}
