import { useState } from 'react';
import { KeyRound } from 'lucide-react';
import { adminApi } from '../lib/api';
import { useApi } from '../lib/useApi';
import { PageHeader } from '../components/PageHeader';
import { DataTable, type Column } from '../components/DataTable';
import { SearchInput, PhoneLink, fmtDateTime } from '../components/common';
import { FilterSelect } from '../components/FilterSelect';
import { StatusBadge } from '../components/StatusBadge';
import { Badge } from '../components/ui/badge';
import type { OtpLogEntry } from '../lib/types';

// OTP / login attempt audit — for investigating suspicious logins and OTP abuse.
// The one-time code itself is never stored in plaintext or shown here.
export function LoginAudit() {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);

  const { data, loading } = useApi(
    () => adminApi.otpLogs.list({ q, status: status === 'all' ? undefined : status, page }),
    [q, status, page],
  );

  const columns: Column<OtpLogEntry>[] = [
    { key: 'phone', header: 'Phone', cell: (o) => <PhoneLink phone={o.phone} className="text-sm font-mono" /> },
    { key: 'user', header: 'Account', cell: (o) => (o.userName ? <span className="text-sm">{o.userName} {o.userRole && <Badge variant="secondary" className="font-normal ml-1">{o.userRole}</Badge>}</span> : <span className="text-sm text-muted-foreground">New / unknown</span>) },
    {
      key: 'status',
      header: 'Result',
      cell: (o) => <StatusBadge status={o.consumed ? 'PAID' : o.expired ? 'FAILED' : 'PENDING'} className="capitalize" />,
    },
    { key: 'issued', header: 'Issued', cell: (o) => <span className="text-sm text-muted-foreground">{fmtDateTime(o.createdAt)}</span> },
    { key: 'expires', header: 'Expires', cell: (o) => <span className="text-sm text-muted-foreground">{fmtDateTime(o.expiresAt)}</span> },
  ];

  return (
    <div>
      <PageHeader title="Login Audit" description="OTP issuance & verification history — investigate suspicious logins" />
      <DataTable
        columns={columns}
        rows={data?.data ?? []}
        loading={loading}
        rowKey={(o) => o.id}
        pagination={data?.pagination}
        onPageChange={setPage}
        emptyLabel="No OTP activity"
        toolbar={
          <div className="flex flex-col sm:flex-row gap-2">
            <SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search phone…" className="sm:max-w-xs w-full" />
            <FilterSelect
              value={status}
              onChange={(v) => { setStatus(v); setPage(1); }}
              options={[
                { value: 'all', label: 'All' },
                { value: 'consumed', label: 'Verified' },
                { value: 'unused', label: 'Unused (active)' },
                { value: 'expired', label: 'Expired' },
              ]}
            />
          </div>
        }
      />
      <p className="flex items-center gap-2 text-xs text-muted-foreground mt-3">
        <KeyRound className="size-3.5" /> Verified = OTP was used to log in. Expired/unused codes indicate abandoned or failed attempts; many for one number may signal abuse.
      </p>
    </div>
  );
}
