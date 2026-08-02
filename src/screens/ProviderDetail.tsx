import { useState } from 'react';
import { useParams, Link } from 'react-router';
import { toast } from 'sonner';
import { BadgeCheck } from 'lucide-react';
import { adminApi, formatINR } from '../lib/api';
import { useApi } from '../lib/useApi';
import { BackLink, Field } from '../components/detail';
import { UserCell, Stars, fmtDate } from '../components/common';
import { StatusBadge } from '../components/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Switch } from '../components/ui/switch';
import { Label } from '../components/ui/label';
import { Skeleton } from '../components/ui/skeleton';
import { FilterSelect } from '../components/FilterSelect';
import { KycPanel } from '../components/KycPanel';

const NONE = '__none__';
const BADGES = [NONE, 'Top Rated', 'Verified Pro', 'Most Booked', 'Premium'];

export function ProviderDetail() {
  const { id } = useParams<{ id: string }>();
  const { data, loading, refetch } = useApi(() => adminApi.providers.get(id!), [id]);
  const p = data?.provider;
  const [saving, setSaving] = useState(false);

  const setVerified = async (v: boolean) => {
    setSaving(true);
    await adminApi.providers.setVerified(id!, v);
    toast.success(v ? 'Provider verified' : 'Verification revoked');
    await refetch();
    setSaving(false);
  };
  const setAvailable = async (v: boolean) => {
    setSaving(true);
    await adminApi.providers.setAvailable(id!, v);
    toast.success('Availability updated');
    await refetch();
    setSaving(false);
  };
  const setBadge = async (badge: string) => {
    const value = badge === NONE ? null : badge;
    await adminApi.providers.setBadge(id!, value);
    toast.success(value ? `Badge set: ${value}` : 'Badge removed');
    refetch();
  };

  if (loading || !p) {
    return (
      <div>
        <BackLink to="/providers" label="Back to Providers" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div>
      <BackLink to="/providers" label="Back to Providers" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <UserCell
          name={p.user?.name}
          sub={
            <span className="flex items-center gap-2">
              {p.businessName}
              {p.isVerified && <span className="inline-flex items-center gap-0.5 text-primary"><BadgeCheck className="size-3.5" /> Verified</span>}
            </span>
          }
          avatar={p.user?.avatar}
        />
        <Stars rating={p.rating} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Profile</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
            <div>
              <Field label="Phone" value={p.user?.phone} />
              <Field label="Business type" value={p.businessType} />
              <Field label="Experience" value={`${p.experience} years`} />
              <Field label="Completed jobs" value={p.completedJobs} />
              <Field label="Total earned" value={p.totalEarnedPaise != null ? formatINR(p.totalEarnedPaise) : '—'} />
            </div>
            <div>
              <Field label="Starts at" value={`${formatINR(p.priceFrom)} ${p.pricePer}`} />
              <Field label="Reviews" value={p.reviewCount} />
              <Field label="City / Area" value={p.area ? `${p.area}, ${p.city}` : p.city} />
              <Field label="Active bookings" value={p.activeBookings ?? '—'} />
              <Field label="Joined" value={fmtDate(p.createdAt)} />
            </div>
            <div className="sm:col-span-2 pt-4">
              <p className="text-sm text-muted-foreground mb-1">Bio</p>
              <p className="text-sm">{p.bio ?? '—'}</p>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {p.categories?.map((c) => <Badge key={c.id} variant="secondary" className="font-normal">{c.name}</Badge>)}
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {p.specialties.map((s) => <Badge key={s} variant="outline" className="font-normal text-muted-foreground">{s}</Badge>)}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Admin Controls</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <Label>Verified</Label>
                <p className="text-xs text-muted-foreground">Trust badge shown to customers</p>
              </div>
              <Switch checked={p.isVerified} disabled={saving} onCheckedChange={setVerified} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Available</Label>
                <p className="text-xs text-muted-foreground">Accepting new bookings</p>
              </div>
              <Switch checked={p.isAvailable} disabled={saving} onCheckedChange={setAvailable} />
            </div>
            <div>
              <Label className="mb-2 block">Feature badge</Label>
              <FilterSelect
                value={p.badge ?? NONE}
                onChange={setBadge}
                options={BADGES.map((b) => ({ value: b, label: b === NONE ? 'No badge' : b }))}
                className="w-full bg-background"
              />
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-3">
          <KycPanel
            provider={p}
            busy={saving}
            onApprove={() => setVerified(true)}
            onReject={() => setVerified(false)}
          />
        </div>

        {/* Recent activity drill-down */}
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Recent Bookings</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {(p.bookings?.length ?? 0) === 0 && <p className="text-sm text-muted-foreground py-2">No bookings yet.</p>}
            {p.bookings?.map((b) => (
              <Link key={b.id} to={`/bookings/${b.id}`} className="flex items-center justify-between gap-2 rounded-lg border p-2.5 hover:bg-accent transition-colors">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{b.service?.title ?? 'Custom job'}</div>
                  <div className="text-xs text-muted-foreground truncate">{b.customer?.name} · {fmtDate(b.createdAt)}</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm font-medium">{formatINR(b.amount)}</span>
                  <StatusBadge status={b.status} />
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Recent Reviews</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {(p.reviews?.length ?? 0) === 0 && <p className="text-sm text-muted-foreground py-2">No reviews yet.</p>}
            {p.reviews?.map((r) => (
              <div key={r.id} className="border-b last:border-0 pb-2 last:pb-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{r.author?.name ?? 'Anonymous'}</span>
                  <span className="text-amber-500 text-xs">{'★'.repeat(r.rating)}<span className="text-muted-foreground/30">{'★'.repeat(5 - r.rating)}</span></span>
                </div>
                {r.comment && <p className="text-sm text-muted-foreground mt-0.5">{r.comment}</p>}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
