import { useState } from 'react';
import { FileText, ShieldCheck, ShieldX, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Field } from './detail';
import { StatusBadge } from './StatusBadge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from './ui/dialog';
import type { ProviderProfile } from '../lib/types';

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
  const docs = provider.documents ?? [];

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
                  <img src={url} alt={`Document ${i + 1}`} className="size-full object-cover" />
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
          {preview && <img src={preview} alt="Document" className="w-full rounded-lg" />}
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
