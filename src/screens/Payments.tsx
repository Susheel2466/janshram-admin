import { useState } from 'react';
import { toast } from 'sonner';
import { IndianRupee, RotateCcw, CircleAlert, Wallet } from 'lucide-react';
import { adminApi, formatINR, formatINRCompact } from '../lib/api';
import { useApi } from '../lib/useApi';
import { PageHeader } from '../components/PageHeader';
import { ExportButton } from '../components/ExportButton';
import { StatCard } from '../components/StatCard';
import { DataTable, type Column } from '../components/DataTable';
import { SearchInput, fmtDateTime } from '../components/common';
import { FilterSelect } from '../components/FilterSelect';
import { StatusBadge } from '../components/StatusBadge';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../components/ui/alert-dialog';
import type { PaymentRecord } from '../lib/types';

export function Payments() {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const [method, setMethod] = useState('all');
  const [page, setPage] = useState(1);
  const [toRefund, setToRefund] = useState<PaymentRecord | null>(null);

  const stats = useApi(() => adminApi.payments.stats(), []);
  const { data, loading, refetch } = useApi(
    () => adminApi.payments.list({ q, status: status === 'all' ? undefined : status, method: method === 'all' ? undefined : method, page }),
    [q, status, method, page],
  );

  const s = stats.data?.stats;

  const refund = async () => {
    if (!toRefund) return;
    await adminApi.payments.refund(toRefund.bookingId);
    toast.success(`Refunded ${formatINR(toRefund.amount)}`);
    setToRefund(null);
    refetch();
    stats.refetch();
  };

  const columns: Column<PaymentRecord>[] = [
    { key: 'id', header: 'Booking', cell: (p) => <span className="text-xs font-mono text-muted-foreground">#{p.bookingId.slice(-8)}</span> },
    { key: 'cust', header: 'Customer', cell: (p) => <span className="text-sm font-medium">{p.customer?.name}</span> },
    { key: 'svc', header: 'Service', cell: (p) => <span className="text-sm text-muted-foreground">{p.serviceTitle ?? '—'}</span> },
    {
      key: 'amount',
      header: 'Amount',
      cell: (p) => (
        <span className="text-sm font-medium">
          {formatINR(p.amount)}
          {p.discount > 0 && <span className="text-xs text-muted-foreground font-normal"> (−{formatINR(p.discount)})</span>}
        </span>
      ),
    },
    { key: 'method', header: 'Method', cell: (p) => (p.method ? <StatusBadge status={p.method} /> : <span className="text-muted-foreground text-sm">—</span>) },
    { key: 'status', header: 'Status', cell: (p) => <StatusBadge status={p.status} /> },
    { key: 'date', header: 'Date', cell: (p) => <span className="text-sm text-muted-foreground">{fmtDateTime(p.createdAt)}</span> },
    {
      key: 'actions',
      header: '',
      headerClassName: 'w-24',
      cell: (p) =>
        p.status === 'PAID' ? (
          <Button variant="outline" size="sm" onClick={() => setToRefund(p)}>
            <RotateCcw className="size-3.5" /> Refund
          </Button>
        ) : null,
    },
  ];

  return (
    <div>
      <PageHeader title="Payments & Refunds" description="Gateway transactions (UPI / Card / Wallet / Cash) and refunds" actions={<ExportButton entity="payments" />} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.loading || !s ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[104px] rounded-xl" />)
        ) : (
          <>
            <StatCard label="Collected" value={formatINRCompact(s.collectedPaise)} icon={<IndianRupee className="size-5" />} accent="green" hint="paid bookings" />
            <StatCard label="Refunded" value={formatINRCompact(s.refundedPaise)} icon={<RotateCcw className="size-5" />} accent="amber" hint="returned to wallets" />
            <StatCard label="Pending" value={formatINRCompact(s.pendingPaise)} icon={<Wallet className="size-5" />} accent="primary" hint="awaiting payment" />
            <StatCard label="Failed" value={s.failedCount} icon={<CircleAlert className="size-5" />} accent="red" hint="need attention" />
          </>
        )}
      </div>

      <DataTable
        columns={columns}
        rows={data?.data ?? []}
        loading={loading}
        rowKey={(p) => p.id}
        pagination={data?.pagination}
        onPageChange={setPage}
        emptyLabel="No transactions found"
        toolbar={
          <div className="flex flex-col sm:flex-row gap-2">
            <SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search customer or booking…" className="sm:max-w-xs w-full" />
            <FilterSelect
              value={status}
              onChange={(v) => { setStatus(v); setPage(1); }}
              options={[
                { value: 'all', label: 'All status' },
                { value: 'PAID', label: 'Paid' },
                { value: 'PENDING', label: 'Pending' },
                { value: 'FAILED', label: 'Failed' },
                { value: 'REFUNDED', label: 'Refunded' },
              ]}
            />
            <FilterSelect
              value={method}
              onChange={(v) => { setMethod(v); setPage(1); }}
              options={[
                { value: 'all', label: 'All methods' },
                { value: 'UPI', label: 'UPI' },
                { value: 'CARD', label: 'Card' },
                { value: 'WALLET', label: 'Wallet' },
                { value: 'CASH', label: 'Cash' },
              ]}
            />
          </div>
        }
      />

      <AlertDialog open={!!toRefund} onOpenChange={(o) => !o && setToRefund(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Refund {toRefund && formatINR(toRefund.amount)}?</AlertDialogTitle>
            <AlertDialogDescription>
              The amount is credited back to {toRefund?.customer?.name}’s wallet and the payment marked refunded.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={refund}>Confirm refund</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
