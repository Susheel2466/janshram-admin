import { useState } from 'react';
import { ScrollText } from 'lucide-react';
import { adminApi } from '../lib/api';
import { useApi } from '../lib/useApi';
import { PageHeader } from '../components/PageHeader';
import { DataTable, type Column } from '../components/DataTable';
import { SearchInput, fmtDateTime } from '../components/common';
import { Badge } from '../components/ui/badge';
import type { AuditLogEntry } from '../lib/types';

// Persistent trail of admin actions (verify, refund, deactivate, broadcast…).
export function AuditLog() {
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const { data, loading } = useApi(() => adminApi.audit.list({ q, page }), [q, page]);

  const columns: Column<AuditLogEntry>[] = [
    { key: 'action', header: 'Action', cell: (e) => <span className="text-sm font-medium">{e.action}</span> },
    { key: 'target', header: 'Target', cell: (e) => <span className="text-sm">{e.target}</span> },
    { key: 'actor', header: 'By', cell: (e) => <Badge variant="secondary" className="font-normal">{e.actor}</Badge> },
    { key: 'when', header: 'When', cell: (e) => <span className="text-sm text-muted-foreground">{fmtDateTime(e.createdAt)}</span> },
  ];

  return (
    <div>
      <PageHeader title="Audit Log" description="Every administrative action, most recent first" />
      <DataTable
        columns={columns}
        rows={data?.data ?? []}
        loading={loading}
        rowKey={(e) => e.id}
        pagination={data?.pagination}
        onPageChange={setPage}
        emptyLabel="No admin activity recorded yet"
        toolbar={<SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search action, target or admin…" className="sm:max-w-xs w-full" />}
      />
      {!loading && (data?.pagination.total ?? 0) === 0 && (
        <p className="flex items-center gap-2 text-xs text-muted-foreground mt-3">
          <ScrollText className="size-3.5" /> Actions are recorded as admins verify providers, refund bookings, adjust wallets, and more.
        </p>
      )}
    </div>
  );
}
