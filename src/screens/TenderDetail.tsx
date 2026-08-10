import { useParams } from 'react-router';
import { toast } from 'sonner';
import { adminApi, formatINR } from '../lib/api';
import { useApi } from '../lib/useApi';
import { BackLink, Field } from '../components/detail';
import { UserCell, Stars, PhoneLink, fmtDateTime } from '../components/common';
import { StatusBadge } from '../components/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Skeleton } from '../components/ui/skeleton';
import { FilterSelect } from '../components/FilterSelect';
import type { TenderStatus } from '../lib/types';

const STATUSES: TenderStatus[] = ['OPEN', 'AWARDED', 'CLOSED', 'CANCELLED'];

export function TenderDetail() {
  const { id } = useParams<{ id: string }>();
  const { data, loading, refetch } = useApi(() => adminApi.tenders.get(id!), [id]);
  const t = data?.tender;

  const changeStatus = async (status: string) => {
    await adminApi.tenders.setStatus(id!, status as TenderStatus);
    toast.success(`Tender ${status.toLowerCase()}`);
    refetch();
  };

  if (loading || !t) {
    return (
      <div>
        <BackLink to="/tenders" label="Back to Tenders" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div>
      <BackLink to="/tenders" label="Back to Tenders" />

      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
        <div className="min-w-0">
          <h1 className="text-xl font-medium">{t.title}</h1>
          <p className="text-sm text-muted-foreground">{t.category} · {t.area}, {t.city}</p>
        </div>
        <FilterSelect
          value={t.status}
          onChange={changeStatus}
          options={STATUSES.map((s) => ({ value: s, label: s }))}
          className="w-[150px] bg-background"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Details</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm mb-4">{t.description}</p>
            <Field label="Budget" value={`${formatINR(t.budgetMin)} – ${formatINR(t.budgetMax)}`} />
            <Field label="Timeline" value={t.timeline} />
            <Field label="Urgency" value={t.urgency ? t.urgency.charAt(0) + t.urgency.slice(1).toLowerCase() : '—'} />
            <Field label="Status" value={<StatusBadge status={t.status} />} />
            <Field label="Posted" value={fmtDateTime(t.createdAt)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Posted by</CardTitle></CardHeader>
          <CardContent>
            <UserCell name={t.customer?.name} sub={<PhoneLink phone={t.customer?.phone} />} avatar={t.customer?.avatar} />
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader><CardTitle className="text-base">Bids ({t.bids?.length ?? 0})</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {(t.bids?.length ?? 0) === 0 && <p className="text-sm text-muted-foreground py-4 text-center">No bids yet.</p>}
          {t.bids?.map((bid) => (
            <div key={bid.id} className="flex items-center justify-between gap-4 rounded-lg border p-3">
              <UserCell
                name={bid.provider?.user?.name}
                sub={<span className="flex items-center gap-2">{bid.provider && <Stars rating={bid.provider.rating} />}{bid.timeline}</span>}
                avatar={bid.provider?.user?.avatar}
              />
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-sm font-semibold">{formatINR(bid.amount)}</span>
                <StatusBadge status={bid.status} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
