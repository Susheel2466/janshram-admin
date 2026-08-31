// Plans, subscribers and what came in.
//
// Pricing is editable here, which is the reason plans are rows in the database
// rather than an enum in the code — ₹99 and ₹299 are launch prices, and
// changing them should be a Monday-morning decision rather than a release.
//
// Editing a plan changes what is offered next and nothing else: every
// subscription froze the price and duration it was sold at. The screen says so,
// because "will this bill my existing customers more?" is the first question
// anyone touching a price has.

import { useState } from 'react';
import { toast } from 'sonner';
import { IndianRupee, Ban, Play, TrendingUp, AlertTriangle } from 'lucide-react';
import { adminApi } from '../lib/api';
import { useApi } from '../lib/useApi';
import { PageHeader } from '../components/PageHeader';
import { fmtDate } from '../components/common';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Skeleton } from '../components/ui/skeleton';
import { StatCard } from '../components/StatCard';
import type { SubscriptionStatus } from '../lib/types';

const SUB_STYLE: Record<SubscriptionStatus, string> = {
  TRIAL: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  ACTIVE: 'bg-green-500/10 text-green-600 border-green-500/20',
  EXPIRED: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  SUSPENDED: 'bg-red-500/10 text-red-600 border-red-500/20',
};

export function Subscriptions() {
  const plans = useApi(() => adminApi.subscriptions.plans(), []);
  const revenue = useApi(() => adminApi.subscriptions.revenue(30), []);
  const [status, setStatus] = useState<SubscriptionStatus | ''>('');
  const list = useApi(() => adminApi.subscriptions.list({ status: status || undefined, limit: 50 }), [status]);

  const [editing, setEditing] = useState<string | null>(null);
  const [price, setPrice] = useState('');
  const [busy, setBusy] = useState(false);

  const savePrice = async (id: string) => {
    const value = Number(price);
    if (busy || !value) return;
    setBusy(true);
    try {
      await adminApi.subscriptions.updatePlan(id, { priceRupees: value });
      toast.success(`Price updated to ₹${value}`, {
        description: 'Existing subscribers keep the price they were sold.',
      });
      setEditing(null);
      setPrice('');
      await plans.refetch();
    } catch (e: any) {
      toast.error(e?.message ?? 'Could not update the price');
    } finally {
      setBusy(false);
    }
  };

  const suspend = async (id: string, suspended: boolean) => {
    if (busy) return;
    setBusy(true);
    try {
      await adminApi.subscriptions.setSuspended(id, suspended);
      toast.success(suspended ? 'Account suspended' : 'Suspension lifted');
      await list.refetch();
    } catch (e: any) {
      toast.error(e?.message ?? 'Could not do that');
    } finally {
      setBusy(false);
    }
  };

  const rev = revenue.data;
  const rows = list.data?.subscriptions ?? [];

  return (
    <div>
      <PageHeader title="Subscriptions" description="Plans, subscribers and revenue" />

      {/* Failures sit beside revenue rather than out of sight: a month where
          revenue held steady while failures tripled is a payment problem, and a
          revenue-only figure would show none of it. */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {revenue.loading && !rev ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[104px] rounded-xl" />)
        ) : (
          <>
            <StatCard label="Revenue (30 days)" value={`₹${(rev?.revenueRupees ?? 0).toLocaleString('en-IN')}`}
              icon={<IndianRupee className="size-5" />} accent="green" />
            <StatCard label="Payments taken" value={rev?.paidCount ?? 0}
              icon={<TrendingUp className="size-5" />} accent="primary" />
            <StatCard label="Failed payments" value={rev?.failedCount ?? 0}
              icon={<AlertTriangle className="size-5" />} accent="red" hint="in the same window" />
            <StatCard
              label="Trial → paid"
              // Null, not zero, when nobody has been on trial yet: no signal is
              // not the same as a bad one, and a bold 0% would read as failure.
              value={rev?.trialConversion === null || rev?.trialConversion === undefined ? '—' : `${rev.trialConversion}%`}
              icon={<TrendingUp className="size-5" />}
              accent="violet"
              hint={rev?.trialConversion === null ? 'no trials yet' : undefined}
            />
          </>
        )}
      </div>

      {/* ── Plans ── */}
      <section className="mb-8">
        <h2 className="text-sm font-medium mb-3">Plans</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {plans.loading && <Skeleton className="h-28 rounded-xl" />}
          {(plans.data?.plans ?? []).map((plan) => (
            <Card key={plan.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{plan.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {plan.durationDays} days · {plans.data?.counts?.[plan.code] ?? 0} on this plan
                    </p>
                  </div>
                  {!plan.isActive && <Badge variant="outline" className="text-muted-foreground">Hidden</Badge>}
                </div>

                {editing === plan.id ? (
                  <div className="mt-3 space-y-2">
                    <Input
                      autoFocus
                      inputMode="numeric"
                      value={price}
                      onChange={(e) => setPrice(e.target.value.replace(/\D/g, ''))}
                      placeholder={String(plan.priceRupees)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Existing subscribers keep the ₹{plan.priceRupees} they were sold. This changes what
                      is offered next.
                    </p>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1"
                        onClick={() => { setEditing(null); setPrice(''); }}>Cancel</Button>
                      <Button size="sm" className="flex-1" disabled={busy || !price}
                        onClick={() => savePrice(plan.id)}>Save</Button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 flex items-baseline justify-between">
                    <p className="text-2xl font-semibold">₹{plan.priceRupees.toLocaleString('en-IN')}</p>
                    <Button variant="outline" size="sm"
                      onClick={() => { setEditing(plan.id); setPrice(String(plan.priceRupees)); }}>
                      Change price
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ── Subscribers ── */}
      <section>
        <div className="flex items-center justify-between gap-3 mb-3">
          <h2 className="text-sm font-medium">Subscribers</h2>
          <div className="flex gap-1.5">
            {(['', 'TRIAL', 'ACTIVE', 'EXPIRED', 'SUSPENDED'] as const).map((s) => (
              <Button key={s || 'all'} size="sm" variant={status === s ? 'default' : 'outline'}
                onClick={() => setStatus(s)}>
                {s === '' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
                {rev?.subscriptions?.[s as SubscriptionStatus] !== undefined && s !== '' && (
                  <span className="ml-1 opacity-70">{rev.subscriptions[s as SubscriptionStatus]}</span>
                )}
              </Button>
            ))}
          </div>
        </div>

        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b text-left text-xs text-muted-foreground">
                <tr>
                  <th className="p-3 font-medium">Contractor</th>
                  <th className="p-3 font-medium">Plan</th>
                  <th className="p-3 font-medium">State</th>
                  <th className="p-3 font-medium">Expires</th>
                  <th className="p-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {list.loading && rows.length === 0 && (
                  <tr><td colSpan={5} className="p-6"><Skeleton className="h-16" /></td></tr>
                )}
                {!list.loading && rows.length === 0 && (
                  <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">
                    Nobody here yet.
                  </td></tr>
                )}
                {rows.map((s) => (
                  <tr key={s.id} className="border-b last:border-0">
                    <td className="p-3">
                      <div>{s.user.name ?? '—'}</div>
                      <div className="text-xs text-muted-foreground">{s.user.phone}</div>
                    </td>
                    <td className="p-3">
                      {s.plan?.name ?? <span className="text-muted-foreground">Free trial</span>}
                      {s.priceRupees !== null && (
                        <div className="text-xs text-muted-foreground">₹{s.priceRupees}</div>
                      )}
                    </td>
                    <td className="p-3">
                      <Badge variant="outline" className={SUB_STYLE[s.status]}>{s.status}</Badge>
                    </td>
                    <td className="p-3">
                      <div>{fmtDate(s.expiresAt)}</div>
                      {/* The countdown, because "expires 12 Sep" needs mental
                          arithmetic and "3 days" does not. */}
                      <div className="text-xs text-muted-foreground">
                        {s.daysRemaining > 0 ? `${s.daysRemaining} days left` : 'ended'}
                      </div>
                    </td>
                    <td className="p-3 text-right">
                      {s.status === 'SUSPENDED' ? (
                        <Button size="sm" variant="outline" disabled={busy}
                          onClick={() => suspend(s.id, false)}>
                          <Play className="size-3.5" /> Lift
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" disabled={busy}
                          onClick={() => suspend(s.id, true)}>
                          <Ban className="size-3.5" /> Suspend
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
