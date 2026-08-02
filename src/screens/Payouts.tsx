import { useState } from 'react';
import { toast } from 'sonner';
import { Banknote, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { adminApi, formatINR, formatINRCompact } from '../lib/api';
import { useApi } from '../lib/useApi';
import { PageHeader } from '../components/PageHeader';
import { ExportButton } from '../components/ExportButton';
import { StatCard } from '../components/StatCard';
import { DataTable, type Column } from '../components/DataTable';
import { SearchInput, UserCell, fmtDateTime } from '../components/common';
import { FilterSelect } from '../components/FilterSelect';
import { StatusBadge } from '../components/StatusBadge';
import { Button } from '../components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../components/ui/alert-dialog';
import type { Payout } from '../lib/types';

export function Payouts() {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [confirm, setConfirm] = useState<{ payout: Payout; action: 'PAID' | 'REJECTED' } | null>(null);

  const { data, loading, refetch } = useApi(
    () => adminApi.payouts.list({ q, status: status === 'all' ? undefined : status, page }),
    [q, status, page],
  );
  const pending = data?.pending;

  const act = async () => {
    if (!confirm) return;
    await adminApi.payouts.update(confirm.payout.id, confirm.action);
    toast.success(confirm.action === 'PAID' ? 'Marked as paid' : 'Payout rejected — funds returned');
    setConfirm(null);
    refetch();
  };

  const columns: Column<Payout>[] = [
    { key: 'provider', header: 'Provider', cell: (p) => <UserCell name={p.provider?.name} sub={p.provider?.phone} avatar={p.provider?.avatar} /> },
    { key: 'amount', header: 'Amount', cell: (p) => <span className="text-sm font-semibold">{formatINR(p.amount)}</span> },
    { key: 'upi', header: 'UPI', cell: (p) => <span className="text-sm font-mono">{p.upiId ?? '—'}</span> },
    { key: 'status', header: 'Status', cell: (p) => <StatusBadge status={p.status === 'REQUESTED' ? 'PENDING' : p.status === 'PAID' ? 'PAID' : 'FAILED'} /> },
    { key: 'requested', header: 'Requested', cell: (p) => <span className="text-sm text-muted-foreground">{fmtDateTime(p.createdAt)}</span> },
    {
      key: 'actions',
      header: '',
      headerClassName: 'w-40',
      cell: (p) =>
        p.status === 'REQUESTED' ? (
          <div className="flex gap-1.5">
            <Button size="sm" onClick={() => setConfirm({ payout: p, action: 'PAID' })}>
              <CheckCircle2 className="size-3.5" /> Mark paid
            </Button>
            <Button size="sm" variant="outline" className="text-destructive" onClick={() => setConfirm({ payout: p, action: 'REJECTED' })}>
              <XCircle className="size-3.5" /> Reject
            </Button>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">{p.processedAt ? fmtDateTime(p.processedAt) : ''}</span>
        ),
    },
  ];

  return (
    <div>
      <PageHeader title="Payouts" description="Provider withdrawal requests" actions={<ExportButton entity="payouts" />} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <StatCard label="Pending requests" value={pending?.count ?? 0} icon={<Clock className="size-5" />} accent="amber" hint="awaiting action" />
        <StatCard label="Pending amount" value={formatINRCompact(pending?.amountPaise ?? 0)} icon={<Banknote className="size-5" />} accent="primary" hint="to be transferred" />
      </div>

      <DataTable
        columns={columns}
        rows={data?.data ?? []}
        loading={loading}
        rowKey={(p) => p.id}
        pagination={data?.pagination}
        onPageChange={setPage}
        emptyLabel="No payout requests"
        toolbar={
          <div className="flex flex-col sm:flex-row gap-2">
            <SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search provider…" className="sm:max-w-xs w-full" />
            <FilterSelect
              value={status}
              onChange={(v) => { setStatus(v); setPage(1); }}
              options={[
                { value: 'all', label: 'All' },
                { value: 'REQUESTED', label: 'Requested' },
                { value: 'PAID', label: 'Paid' },
                { value: 'REJECTED', label: 'Rejected' },
              ]}
            />
          </div>
        }
      />

      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm?.action === 'PAID' ? 'Mark payout as paid?' : 'Reject this payout?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.action === 'PAID'
                ? `Confirm you've transferred ${confirm && formatINR(confirm.payout.amount)} to ${confirm?.payout.upiId ?? 'the provider'}.`
                : `The held ${confirm && formatINR(confirm.payout.amount)} will be returned to the provider's wallet.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={act} className={confirm?.action === 'REJECTED' ? 'bg-destructive text-white hover:bg-destructive/90' : ''}>
              {confirm?.action === 'PAID' ? 'Mark paid' : 'Reject'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
