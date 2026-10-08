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

import { useEffect, useState } from 'react';
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
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '../components/ui/dialog';
import type { SubscriptionStatus, TrialLengthResult } from '../lib/types';

const SUB_STYLE: Record<SubscriptionStatus, string> = {
  TRIAL: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  ACTIVE: 'bg-green-500/10 text-green-600 border-green-500/20',
  EXPIRED: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  SUSPENDED: 'bg-red-500/10 text-red-600 border-red-500/20',
};

/**
 * Re-dates existing contractors' trials to whatever the trial length is set to.
 *
 * Changing the setting only reaches new registrations, so raising the trial
 * without this leaves everyone already signed up expiring on the old one. It is
 * shown as a preview first because it writes to every contractor at once, and
 * the numbers are the only way to tell beforehand whether that is what you
 * meant — particularly "still expired", which is contractors who joined longer
 * ago than the whole trial and are not helped by this at all.
 */
function TrialLengthDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [preview, setPreview] = useState<TrialLengthResult | null>(null);
  const [done, setDone] = useState<TrialLengthResult | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) { setPreview(null); setDone(null); return; }
    let live = true;
    adminApi.subscriptions
      .applyTrialLength(true)
      .then((r) => { if (live) setPreview(r); })
      .catch((e) => toast.error(e instanceof Error ? e.message : 'Could not read the current trials'));
    return () => { live = false; };
  }, [open]);

  const apply = async () => {
    setBusy(true);
    try {
      const r = await adminApi.subscriptions.applyTrialLength(false);
      setDone(r);
      toast.success(r.updated === 0 ? 'Nothing needed changing' : `${r.updated} trials re-dated`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not apply the trial length');
    } finally {
      setBusy(false);
    }
  };

  const shown = done ?? preview;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Apply trial length to existing contractors</DialogTitle>
          <DialogDescription>
            Sets every unpaid contractor's trial to the current length, counted from the day they
            signed up. Contractors who have bought a plan are not touched.
          </DialogDescription>
        </DialogHeader>

        {!shown ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Reading the current trials…</p>
        ) : (
          <div className="space-y-3 py-2">
            <p className="text-sm">
              Trial length is currently{' '}
              <span className="font-semibold">{shown.trialDays} days</span>. Change it in Settings
              first if that is not what you want.
            </p>
            <dl className="rounded-lg border divide-y text-sm">
              <Row label={done ? 'Re-dated' : 'Will be re-dated'} value={done ? done.updated : shown.wouldUpdate} strong />
              <Row label="Already running at least that long" value={shown.alreadyLonger} />
              <Row label="Paying contractors, untouched" value={shown.paidUntouched} />
              <Row
                label="Still expired — signed up longer ago than the trial"
                value={shown.stillExpired}
                hint={shown.stillExpired > 0 ? 'A longer trial would not reach these; they need a plan or a manual extension.' : undefined}
              />
            </dl>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{done ? 'Close' : 'Cancel'}</Button>
          {!done && (
            <Button onClick={apply} disabled={busy || !preview || preview.wouldUpdate === 0}>
              {busy ? 'Applying…' : preview && preview.wouldUpdate === 0 ? 'Nothing to do' : 'Apply'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value, strong, hint }: { label: string; value: number; strong?: boolean; hint?: string }) {
  return (
    <div className="flex items-start justify-between gap-4 px-3 py-2">
      <div>
        <dt className={strong ? 'font-medium' : ''}>{label}</dt>
        {hint && <dd className="mt-0.5 text-xs text-muted-foreground">{hint}</dd>}
      </div>
      <dd className={`shrink-0 tabular-nums ${strong ? 'text-lg font-bold' : 'font-medium'}`}>{value}</dd>
    </div>
  );
}

export function Subscriptions() {
  const [trialToolOpen, setTrialToolOpen] = useState(false);
  const openTrialTool = () => setTrialToolOpen(true);
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
      <PageHeader
        title="Subscriptions"
        description="Plans, subscribers and revenue"
        actions={<Button variant="outline" onClick={openTrialTool}>Apply trial length</Button>}
      />

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
      <TrialLengthDialog open={trialToolOpen} onClose={() => setTrialToolOpen(false)} />
    </div>
  );
}
