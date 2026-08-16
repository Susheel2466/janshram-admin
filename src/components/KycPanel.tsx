import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { adminApi } from '../lib/api';
import { SafeImage } from './SafeImage';
import { FileText, ShieldCheck, ShieldX, ExternalLink, RefreshCw, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Field } from './detail';
import { StatusBadge } from './StatusBadge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from './ui/dialog';
import type { ProviderProfile, KycCheck, KycStatus, KycVerifierInfo } from '../lib/types';

// What each automated verdict means, in the reviewer's words.
const VERDICT: Record<KycStatus, { label: string; hint: string; className: string }> = {
  VERIFIED: {
    label: 'PAN verified',
    hint: 'The department confirmed this PAN and the name matches the account.',
    className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  },
  MISMATCH: {
    label: 'Name mismatch',
    hint: 'The PAN is real but registered to a different name — check before approving.',
    className: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  },
  INVALID: {
    label: 'PAN not recognised',
    hint: 'The department has no record of this PAN.',
    className: 'bg-destructive/10 text-destructive border-destructive/20',
  },
  UNAVAILABLE: {
    label: 'Not checked',
    hint: 'No verification provider is configured, so only format checks ran.',
    className: 'bg-muted text-muted-foreground',
  },
  FAILED: {
    label: 'Check failed',
    hint: 'The verifier could not be reached. This says nothing about the document.',
    className: 'bg-muted text-muted-foreground',
  },
};

// KYC review panel — shows Aadhaar/PAN/GSTIN + uploaded documents so an admin
// can make a verification decision, then approve or reject.
export function KycPanel({
  provider,
  busy,
  onApprove,
  onReject,
}: {
  provider: ProviderProfile;
  busy?: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const [checks, setChecks] = useState<KycCheck[]>([]);
  // Null until we know; the action stays hidden in the meantime rather than
  // flashing a button that may turn out to be unusable.
  const [verifier, setVerifier] = useState<KycVerifierInfo | null>(null);
  const [running, setRunning] = useState(false);
  const docs = provider.documents ?? [];

  // Verification history for this provider — what was checked, when and how.
  useEffect(() => {
    let alive = true;
    adminApi.providers
      .kycChecks(provider.id)
      .then((r) => {
        if (!alive) return;
        setChecks(r.checks);
        setVerifier(r.verifier);
      })
      .catch(() => { /* the panel still works without the history */ });
    return () => { alive = false; };
  }, [provider.id]);

  const runCheck = async () => {
    setRunning(true);
    try {
      const { result } = await adminApi.providers.runKycCheck(provider.id, 'PAN');
      const verdict = VERDICT[result.status];
      toast[result.status === 'VERIFIED' ? 'success' : 'message'](verdict.label, {
        description: result.autoApproved
          ? 'Auto-approval is on, so this provider is now verified.'
          : result.detail ?? verdict.hint,
      });
      const r = await adminApi.providers.kycChecks(provider.id);
      setChecks(r.checks);
      setVerifier(r.verifier);
    } catch (e: any) {
      toast.error(e?.message ?? 'Could not run the check');
    } finally {
      setRunning(false);
    }
  };

  const latest = checks[0];
  const verdict = provider.kycStatus ? VERDICT[provider.kycStatus] : null;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="size-4" /> KYC &amp; Verification
        </CardTitle>
        <StatusBadge status={provider.isVerified ? 'ACTIVE' : 'PENDING'} />
      </CardHeader>
      <CardContent>
        <Field label="Aadhaar" value={provider.aadhaar ? <span className="font-mono">{provider.aadhaar}</span> : <span className="text-muted-foreground">Not provided</span>} />
        <Field label="PAN" value={provider.pan ? <span className="font-mono">{provider.pan}</span> : <span className="text-muted-foreground">Not provided</span>} />
        <Field label="GSTIN" value={provider.gstin ? <span className="font-mono">{provider.gstin}</span> : <span className="text-muted-foreground">—</span>} />
        <Field label="Business type" value={provider.businessType} />

        {/* Automated verification — the evidence behind the approve/reject call. */}
        <div className="pt-4 border-t mt-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium">Automated check</p>
            {verifier?.live && (
              <Button variant="outline" size="sm" onClick={runCheck} disabled={running || !provider.pan}>
                {running ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                {running ? 'Checking…' : 'Run PAN check'}
              </Button>
            )}
          </div>

          {/* No verifier configured: say so once, plainly, instead of offering
              an action whose only possible answer is "unavailable". */}
          {verifier && !verifier.live && (
            <p className="text-sm text-muted-foreground">
              Automated checks are off — no verification provider is configured. Review the
              documents above and approve or reject manually.
            </p>
          )}

          {verifier?.live && !verifier.real && (
            <p className="text-xs text-amber-600 mb-1">
              Test verifier ({verifier.name}) — results are simulated, not from the department.
            </p>
          )}

          {verifier?.live && !verdict && !latest && (
            <p className="text-sm text-muted-foreground">
              {provider.pan ? 'Not checked yet.' : 'No PAN on file to check.'}
            </p>
          )}

          {verdict && (
            <div className="space-y-1">
              <Badge variant="outline" className={`font-normal ${verdict.className}`}>{verdict.label}</Badge>
              <p className="text-xs text-muted-foreground">{verdict.hint}</p>
              {latest?.registeredName && (
                <p className="text-xs text-muted-foreground">
                  Registered as <span className="font-medium text-foreground">{latest.registeredName}</span>
                  {latest.nameMatch !== null && ` — ${latest.nameMatch}% match`}
                </p>
              )}
              {latest && (
                <p className="text-xs text-muted-foreground">
                  via {latest.verifier} · {new Date(latest.createdAt).toLocaleString('en-IN')}
                </p>
              )}
            </div>
          )}

          {checks.length > 1 && (
            <details className="mt-2">
              <summary className="text-xs text-muted-foreground cursor-pointer">
                Earlier checks ({checks.length - 1})
              </summary>
              <ul className="mt-1 space-y-1">
                {checks.slice(1).map((c) => (
                  <li key={c.id} className="text-xs text-muted-foreground">
                    {c.document} · {c.status.toLowerCase()} · {c.verifier} ·{' '}
                    {new Date(c.createdAt).toLocaleDateString('en-IN')}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>

        <div className="pt-4">
          <p className="text-sm text-muted-foreground mb-2">Uploaded documents ({docs.length})</p>
          {docs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No documents uploaded.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {docs.map((url, i) => (
                <button
                  key={i}
                  onClick={() => setPreview(url)}
                  className="group relative aspect-[4/3] rounded-lg border overflow-hidden bg-muted"
                >
                  <SafeImage src={url} alt={`Document ${i + 1}`} className="size-full object-cover" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                    <ExternalLink className="size-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-5">
          {provider.isVerified ? (
            <Button variant="destructive" disabled={busy} onClick={onReject} className="flex-1">
              <ShieldX className="size-4" /> Revoke verification
            </Button>
          ) : (
            <>
              <Button disabled={busy} onClick={onApprove} className="flex-1">
                <ShieldCheck className="size-4" /> Approve &amp; verify
              </Button>
              <Button variant="outline" disabled={busy} onClick={onReject} className="flex-1">
                <ShieldX className="size-4" /> Reject
              </Button>
            </>
          )}
        </div>
      </CardContent>

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Document preview</DialogTitle>
          </DialogHeader>
          {preview && <SafeImage src={preview} alt="Document" className="w-full rounded-lg" />}
          {preview && (
            <a href={preview} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline inline-flex items-center gap-1">
              Open original <ExternalLink className="size-3.5" />
            </a>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
