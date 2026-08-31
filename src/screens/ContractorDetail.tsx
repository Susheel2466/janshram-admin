// One contractor, everything on them.
//
// The list answers "who is here"; this answers "should I approve them, and what
// have they been doing". So the verification decision sits at the top with the
// documents beside it, and the projects below are the evidence — a firm running
// four sites with a crew is a different proposition from an empty account.

import { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { toast } from 'sonner';
import { ArrowLeft, ShieldCheck, ShieldX, ScanLine, Loader2 } from 'lucide-react';
import { adminApi } from '../lib/api';
import { useApi } from '../lib/useApi';
import { fmtDate } from '../components/common';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Textarea } from '../components/ui/textarea';
import { Skeleton } from '../components/ui/skeleton';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '../components/ui/dialog';

export function ContractorDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { data, loading, refetch } = useApi(() => adminApi.contractors.get(id), [id]);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const c = data?.contractor;

  const decide = async (isVerified: boolean, note?: string) => {
    if (busy) return;
    setBusy('decide');
    try {
      await adminApi.contractors.setVerified(id, isVerified, note);
      toast.success(isVerified ? 'Verified' : 'Rejected', {
        description: 'They have been notified in the app.',
      });
      setRejecting(false);
      setReason('');
      await refetch();
    } catch (e: any) {
      toast.error(e?.message ?? 'Could not save the decision');
    } finally {
      setBusy(null);
    }
  };

  const runCheck = async (document: 'PAN' | 'AADHAAR' | 'GSTIN') => {
    if (busy) return;
    setBusy(document);
    try {
      const { result } = await adminApi.contractors.runKycCheck(id, document);
      // UNAVAILABLE means no verifier is wired up, which is an operational fact
      // rather than a verdict on the contractor — worth saying plainly so
      // nobody reads it as a failed check.
      toast[result.status === 'VERIFIED' ? 'success' : 'message'](
        `${document}: ${result.status}`,
        { description: result.status === 'UNAVAILABLE' ? 'No verifier is configured.' : `Checked by ${result.verifier}.` },
      );
      await refetch();
    } catch (e: any) {
      toast.error(e?.message ?? 'The check could not run');
    } finally {
      setBusy(null);
    }
  };

  if (loading && !c) return <div className="space-y-4"><Skeleton className="h-32 rounded-xl" /><Skeleton className="h-48 rounded-xl" /></div>;
  if (!c) return <p className="text-muted-foreground">Contractor not found.</p>;

  const sub = c.user.subscription;

  return (
    <div className="space-y-6">
      <button onClick={() => navigate('/contractors')} className="text-sm text-muted-foreground inline-flex items-center gap-1.5">
        <ArrowLeft className="size-4" /> Contractors
      </button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">{c.firmName ?? c.user.name ?? 'Unnamed firm'}</h1>
          <p className="text-sm text-muted-foreground">
            {c.user.name} · {c.user.phone}{c.user.email ? ` · ${c.user.email}` : ''}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {[c.firmType, c.experience ? `${c.experience} yrs` : null, [c.area, c.city].filter(Boolean).join(', ') || null]
              .filter(Boolean).join(' · ') || 'No business details yet'}
          </p>
        </div>

        <div className="flex gap-2">
          {c.isVerified ? (
            <Button variant="outline" disabled={busy === 'decide'} onClick={() => decide(false)}>
              <ShieldX className="size-4" /> Revoke verification
            </Button>
          ) : (
            <>
              <Button variant="outline" disabled={busy === 'decide'} onClick={() => setRejecting(true)}>
                <ShieldX className="size-4" /> Reject
              </Button>
              <Button disabled={busy === 'decide'} onClick={() => decide(true)}>
                <ShieldCheck className="size-4" /> Verify
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Where they stand, said once and plainly. */}
      <Card>
        <CardContent className="p-4 flex flex-wrap items-center gap-3">
          {c.isVerified
            ? <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">Verified {c.verifiedAt ? fmtDate(c.verifiedAt) : ''}</Badge>
            : <Badge variant="outline" className="text-muted-foreground">Not verified</Badge>}
          {sub && (
            <Badge variant="outline">
              {sub.plan?.name ?? 'Free trial'} · expires {fmtDate(sub.expiresAt)}
            </Badge>
          )}
          <span className="text-xs text-muted-foreground">Joined {fmtDate(c.createdAt)}</span>
          {c.verificationNote && !c.isVerified && (
            <p className="basis-full text-xs text-red-600">Last rejected: {c.verificationNote}</p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Documents, with the check that can be run on each. */}
        <Card>
          <CardContent className="p-4">
            <h2 className="text-sm font-medium mb-3">Documents</h2>
            <div className="space-y-2.5">
              {(['PAN', 'AADHAAR', 'GSTIN'] as const).map((doc) => {
                const value = doc === 'PAN' ? c.pan : doc === 'AADHAAR' ? c.aadhaar : c.gstin;
                return (
                  <div key={doc} className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">{doc}</p>
                      <p className={value ? 'font-mono text-sm' : 'text-sm text-muted-foreground'}>
                        {value ?? 'not given'}
                      </p>
                    </div>
                    {value && (
                      <Button size="sm" variant="outline" disabled={!!busy} onClick={() => runCheck(doc)}>
                        {busy === doc ? <Loader2 className="size-3.5 animate-spin" /> : <ScanLine className="size-3.5" />}
                        Check
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
            {/* Aadhaar arrives masked from storage — the console never sees the
                full number and does not need to. */}
            <p className="text-xs text-muted-foreground mt-3">
              Aadhaar is stored masked. Only the last four digits are kept.
            </p>
          </CardContent>
        </Card>

        {/* What the automated checks have said. */}
        <Card>
          <CardContent className="p-4">
            <h2 className="text-sm font-medium mb-3">Automated checks</h2>
            {(c.kycChecks ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing has been checked yet.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {(c.kycChecks ?? []).map((k) => (
                  <li key={k.id} className="flex items-center justify-between gap-3">
                    <span>
                      {k.document}
                      <span className="text-xs text-muted-foreground ml-2">{k.verifier}</span>
                    </span>
                    <span className="flex items-center gap-2">
                      <Badge variant="outline" className={k.status === 'VERIFIED' ? 'bg-green-500/10 text-green-600 border-green-500/20' : 'text-muted-foreground'}>
                        {k.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{fmtDate(k.createdAt)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* The evidence: a firm running sites is a different proposition from an
          empty account, and that is what the decision above rests on. */}
      <Card>
        <CardContent className="p-4">
          <h2 className="text-sm font-medium mb-3">
            Projects {(c.projects ?? []).length > 0 && <span className="text-muted-foreground">({c.projects!.length})</span>}
          </h2>
          {(c.projects ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No sites yet.</p>
          ) : (
            <ul className="divide-y">
              {c.projects!.map((p) => (
                <li key={p.id} className="py-2 flex items-center justify-between text-sm">
                  <span>{p.name}</span>
                  <span className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{p.status}</Badge>
                    <span className="text-xs text-muted-foreground">{fmtDate(p.createdAt)}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog open={rejecting} onOpenChange={(open) => !open && (setRejecting(false), setReason(''))}>
        <DialogContent>
          <DialogHeader><DialogTitle>Why are you rejecting them?</DialogTitle></DialogHeader>
          {/* Without a reason they cannot fix anything, which turns a decision
              into a dead end. */}
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. The PAN does not match the firm name on the documents."
            rows={3}
            maxLength={500}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRejecting(false); setReason(''); }}>Cancel</Button>
            <Button disabled={!reason.trim() || !!busy} onClick={() => decide(false, reason.trim())}>
              Reject and notify
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
