// The contractor register, and the queue of people waiting to be verified.
//
// One screen for both because they are the same list read two ways, and an
// approval queue kept somewhere else is an approval queue nobody opens. The
// queue leads: it is the only part with someone waiting at the other end.

import { useState } from 'react';
import { toast } from 'sonner';
import { HardHat, ShieldCheck, ShieldX, Clock, Search } from 'lucide-react';
import { adminApi } from '../lib/api';
import { useApi } from '../lib/useApi';
import { PageHeader } from '../components/PageHeader';
import { fmtDate } from '../components/common';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Skeleton } from '../components/ui/skeleton';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '../components/ui/dialog';
import type { AdminContractor, SubscriptionStatus } from '../lib/types';

const SUB_STYLE: Record<SubscriptionStatus, string> = {
  TRIAL: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  ACTIVE: 'bg-green-500/10 text-green-600 border-green-500/20',
  EXPIRED: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  SUSPENDED: 'bg-red-500/10 text-red-600 border-red-500/20',
};

export function Contractors() {
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const queue = useApi(() => adminApi.contractors.pendingVerification(), []);
  const list = useApi(() => adminApi.contractors.list({ q: search || undefined, limit: 50 }), [search]);

  const [decide, setDecide] = useState<{ contractor: AdminContractor; approve: boolean } | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!decide || busy) return;
    setBusy(true);
    try {
      await adminApi.contractors.setVerified(
        decide.contractor.id,
        decide.approve,
        decide.approve ? undefined : reason.trim() || undefined,
      );
      toast.success(decide.approve ? 'Contractor verified' : 'Contractor rejected', {
        description: 'They have been notified in the app.',
      });
      setDecide(null);
      setReason('');
      await Promise.all([queue.refetch(), list.refetch()]);
    } catch (e: any) {
      toast.error(e?.message ?? 'Could not save the decision');
    } finally {
      setBusy(false);
    }
  };

  const waiting = queue.data?.contractors ?? [];
  const rows = list.data?.contractors ?? [];

  return (
    <div>
      <PageHeader title="Contractors" description="Firms hiring workers on JanShram" />

      {/* Waiting first. A queue worked oldest-first is what the API returns, and
          the order matters: the people who have waited longest are the ones
          already deciding whether this platform is worth their time. */}
      <section className="mb-8">
        <h2 className="text-sm font-medium mb-3 flex items-center gap-2">
          <Clock className="size-4 text-amber-500" />
          Waiting for verification
          {waiting.length > 0 && <Badge variant="secondary">{waiting.length}</Badge>}
        </h2>

        {queue.loading && waiting.length === 0 && <Skeleton className="h-24 rounded-xl" />}

        {!queue.loading && waiting.length === 0 && (
          <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">
            Nobody is waiting. New contractors appear here once they submit their documents.
          </CardContent></Card>
        )}

        <div className="grid gap-3 md:grid-cols-2">
          {waiting.map((c) => (
            <Card key={c.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{c.firmName ?? c.user.name ?? 'Unnamed firm'}</p>
                    <p className="text-xs text-muted-foreground">{c.user.name} · {c.user.phone}</p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">{fmtDate(c.createdAt)}</span>
                </div>

                {/* What there is to check. Aadhaar arrives masked from storage —
                    the console never sees the full number and does not need to. */}
                <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
                  <Field label="PAN" value={c.pan} />
                  <Field label="Aadhaar" value={c.aadhaar} />
                  <Field label="GSTIN" value={c.gstin} />
                </dl>
                {c.kycStatus && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Automated check: <span className="font-medium">{c.kycStatus}</span>
                  </p>
                )}

                <div className="flex gap-2 mt-4">
                  <Button size="sm" variant="outline" className="flex-1"
                    onClick={() => setDecide({ contractor: c, approve: false })}>
                    <ShieldX className="size-4" /> Reject
                  </Button>
                  <Button size="sm" className="flex-1"
                    onClick={() => setDecide({ contractor: c, approve: true })}>
                    <ShieldCheck className="size-4" /> Verify
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* The register. */}
      <section>
        <div className="flex items-center justify-between gap-3 mb-3">
          <h2 className="text-sm font-medium flex items-center gap-2">
            <HardHat className="size-4 text-muted-foreground" /> All contractors
          </h2>
          <div className="relative w-64 max-w-full">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && setSearch(q)}
              onBlur={() => setSearch(q)}
              placeholder="Firm, name or phone…"
              className="pl-9"
            />
          </div>
        </div>

        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b text-left text-xs text-muted-foreground">
                <tr>
                  <th className="p-3 font-medium">Firm</th>
                  <th className="p-3 font-medium">Contact</th>
                  <th className="p-3 font-medium">Subscription</th>
                  <th className="p-3 font-medium">Projects</th>
                  <th className="p-3 font-medium">Verified</th>
                </tr>
              </thead>
              <tbody>
                {list.loading && rows.length === 0 && (
                  <tr><td colSpan={5} className="p-6"><Skeleton className="h-16" /></td></tr>
                )}
                {!list.loading && rows.length === 0 && (
                  <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">
                    {search ? `Nobody matches “${search}”.` : 'No contractors have registered yet.'}
                  </td></tr>
                )}
                {rows.map((c) => {
                  const sub = c.user.subscription;
                  return (
                    <tr key={c.id} className="border-b last:border-0">
                      <td className="p-3">
                        <div className="font-medium">{c.firmName ?? '—'}</div>
                        <div className="text-xs text-muted-foreground">
                          {[c.area, c.city].filter(Boolean).join(', ') || '—'}
                        </div>
                      </td>
                      <td className="p-3">
                        <div>{c.user.name ?? '—'}</div>
                        <div className="text-xs text-muted-foreground">{c.user.phone}</div>
                      </td>
                      <td className="p-3">
                        {sub ? (
                          <Badge variant="outline" className={SUB_STYLE[sub.status]}>
                            {sub.plan?.name ?? (sub.status === 'TRIAL' ? 'Free trial' : sub.status)}
                          </Badge>
                        ) : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="p-3">{c.projectCount ?? 0}</td>
                      <td className="p-3">
                        {c.isVerified
                          ? <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">Verified</Badge>
                          : <Badge variant="outline" className="text-muted-foreground">Pending</Badge>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </section>

      {/* Rejecting without saying why leaves them unable to fix anything, so the
          reason is collected here and sent with the decision. */}
      <Dialog open={!!decide} onOpenChange={(open) => !open && (setDecide(null), setReason(''))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {decide?.approve ? 'Verify this contractor?' : 'Why are you rejecting them?'}
            </DialogTitle>
          </DialogHeader>
          {decide?.approve ? (
            <p className="text-sm text-muted-foreground">
              {decide.contractor.firmName ?? decide.contractor.user.name} will be marked verified and told
              in the app.
            </p>
          ) : (
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. The PAN does not match the firm name on the documents."
              rows={3}
              maxLength={500}
            />
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDecide(null); setReason(''); }}>Cancel</Button>
            <Button onClick={submit} disabled={busy || (decide?.approve === false && !reason.trim())}>
              {decide?.approve ? 'Verify' : 'Reject and notify'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={value ? 'font-mono' : 'text-muted-foreground'}>{value ?? 'not given'}</dd>
    </div>
  );
}
