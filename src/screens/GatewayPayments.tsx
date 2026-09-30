// What Razorpay actually did, as we recorded it.
//
// The Payments screen reads bookings: it says a job was PAID. This reads the
// gateway ledger: which payment paid it, by what method, and what has been sent
// back. Those are different questions, and the second one could not be asked at
// all until the platform started keeping Razorpay's identifiers — before that a
// payment settled a booking and then vanished.
//
// Support is handed one of four references and rarely knows which kind it is —
// an order id, a payment id, a refund id, or the id of the booking. One box
// searches all four.

import { useState } from 'react';
import { IndianRupee, RotateCcw, XCircle, CheckCircle2 } from 'lucide-react';
import { adminApi, formatINR } from '../lib/api';
import { useApi } from '../lib/useApi';
import { PageHeader } from '../components/PageHeader';
import { StatCard } from '../components/StatCard';
import { DataTable, type Column } from '../components/DataTable';
import { SearchInput, fmtDateTime } from '../components/common';
import { FilterSelect } from '../components/FilterSelect';
import { Badge } from '../components/ui/badge';
import type { GatewayPayment } from '../lib/types';

const STATUS_TONE: Record<GatewayPayment['status'], string> = {
  CAPTURED: 'bg-green-500/10 text-green-600 border-green-500/20',
  // Neither good nor bad: an order nobody has paid yet, which is most of what
  // "I tried to pay and nothing happened" turns out to be.
  CREATED: 'bg-muted text-muted-foreground border-border',
  FAILED: 'bg-red-500/10 text-red-600 border-red-500/20',
  PARTIALLY_REFUNDED: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  REFUNDED: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
};

const STATUS_LABEL: Record<GatewayPayment['status'], string> = {
  CREATED: 'Not paid',
  CAPTURED: 'Paid',
  FAILED: 'Failed',
  PARTIALLY_REFUNDED: 'Part refunded',
  REFUNDED: 'Refunded',
};

const REFUND_TONE: Record<string, string> = {
  PROCESSED: 'text-green-600',
  PENDING: 'text-amber-600',
  FAILED: 'text-red-600',
};

export function GatewayPayments() {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);

  const { data, loading } = useApi(
    () => adminApi.gatewayPayments.list({ q: q || undefined, status: status === 'all' ? undefined : status, page }),
    [q, status, page],
  );
  const { data: stats } = useApi(() => adminApi.gatewayPayments.stats(), []);

  const columns: Column<GatewayPayment>[] = [
    {
      key: 'payment',
      header: 'Payment',
      cell: (p: GatewayPayment) => (
        <div className="min-w-0">
          {/* The id support was given, in full and selectable — it is going to
              be pasted into the Razorpay dashboard next. */}
          <div className="font-mono text-xs select-all">{p.paymentId ?? '—'}</div>
          <div className="font-mono text-[11px] text-muted-foreground select-all">{p.orderId}</div>
        </div>
      ),
    },
    {
      key: 'for',
      header: 'For',
      cell: (p: GatewayPayment) => (
        <div className="min-w-0">
          <div className="text-sm">
            {p.booking ? `Booking #${p.booking.ref ?? ''}` : p.purposeKind.replace('_', ' ')}
          </div>
          <div className="text-xs text-muted-foreground truncate">
            {p.booking?.customer?.name ?? p.booking?.customer?.phone ?? '—'}
          </div>
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      cell: (p: GatewayPayment) => (
        <div>
          <div className="font-medium">{formatINR(p.amountPaise)}</div>
          {p.refundedPaise > 0 && (
            <div className="text-xs text-blue-600">− {formatINR(p.refundedPaise)} back</div>
          )}
        </div>
      ),
    },
    { key: 'method', header: 'Method', cell: (p: GatewayPayment) => <span className="text-sm">{p.method ?? '—'}</span> },
    {
      key: 'status',
      header: 'Status',
      cell: (p: GatewayPayment) => (
        <div className="space-y-1">
          <Badge variant="outline" className={`text-xs ${STATUS_TONE[p.status]}`}>
            {STATUS_LABEL[p.status]}
          </Badge>
          {/* Razorpay's own wording. It is the answer to "why did my payment
              not go through", and paraphrasing it helps nobody. */}
          {p.failureReason && (
            <div className="text-xs text-muted-foreground max-w-[220px]">{p.failureReason}</div>
          )}
        </div>
      ),
    },
    {
      key: 'refunds',
      header: 'Refunds',
      cell: (p: GatewayPayment) =>
        p.refunds.length === 0 ? (
          <span className="text-xs text-muted-foreground">—</span>
        ) : (
          <div className="space-y-1">
            {p.refunds.map((r) => (
              <div key={r.id} className="text-xs">
                <span className={REFUND_TONE[r.status] ?? ''}>{formatINR(r.amountPaise)}</span>{' '}
                <span className="text-muted-foreground">{r.status.toLowerCase()}</span>
                <div className="font-mono text-[10px] text-muted-foreground select-all">{r.refundId}</div>
              </div>
            ))}
          </div>
        ),
    },
    {
      key: 'when',
      header: 'When',
      cell: (p: GatewayPayment) => (
        <span className="text-xs text-muted-foreground">{fmtDateTime(p.capturedAt ?? p.createdAt)}</span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gateway payments"
        description="What Razorpay did — searchable by order, payment, refund or booking id"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Taken" value={formatINR(stats?.capturedPaise ?? 0)} icon={<IndianRupee className="size-5" />} accent="green" />
        <StatCard label="Sent back" value={formatINR(stats?.refundedPaise ?? 0)} icon={<RotateCcw className="size-5" />} accent="primary" hint="refunded to source" />
        <StatCard label="Payments" value={stats?.capturedCount ?? 0} icon={<CheckCircle2 className="size-5" />} accent="primary" />
        <StatCard label="Failed" value={stats?.failedCount ?? 0} icon={<XCircle className="size-5" />} accent="red" hint="attempts that never paid" />
      </div>

      <div className="flex flex-wrap gap-3">
        <SearchInput
          value={q}
          onChange={(v) => { setQ(v); setPage(1); }}
          placeholder="Paste an order, payment, refund or booking id"
          className="flex-1 min-w-[260px]"
        />
        <FilterSelect
          value={status}
          onChange={(v) => { setStatus(v); setPage(1); }}
          options={[
            { value: 'all', label: 'All statuses' },
            { value: 'CAPTURED', label: 'Paid' },
            { value: 'CREATED', label: 'Not paid' },
            { value: 'FAILED', label: 'Failed' },
            { value: 'PARTIALLY_REFUNDED', label: 'Part refunded' },
            { value: 'REFUNDED', label: 'Refunded' },
          ]}
        />
      </div>

      <DataTable
        columns={columns}
        rows={data?.data ?? []}
        loading={loading}
        emptyLabel="No payments match that."
        pagination={data?.pagination}
        onPageChange={setPage}
        rowKey={(p) => p.id}
      />
    </div>
  );
}
