import { useState } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { ShieldCheck, ShieldX, FileText, Clock } from 'lucide-react';
import { adminApi, formatINR } from '../lib/api';
import { useApi } from '../lib/useApi';
import { PageHeader } from '../components/PageHeader';
import { UserCell, Stars, fmtDate } from '../components/common';
import { KycPanel } from '../components/KycPanel';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';

// Provider onboarding approval queue — unverified providers awaiting KYC review.
export function Verifications() {
  const navigate = useNavigate();
  const { data, loading, refetch } = useApi(() => adminApi.providers.pendingKyc(), []);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const rows = data?.providers ?? [];
  const selected = rows.find((p) => p.id === selectedId) ?? rows[0] ?? null;

  const decide = async (verify: boolean) => {
    if (!selected) return;
    setBusy(true);
    await adminApi.providers.setVerified(selected.id, verify);
    toast.success(verify ? `${selected.user?.name} approved` : `${selected.user?.name} rejected`);
    setSelectedId(null);
    await refetch();
    setBusy(false);
  };

  return (
    <div>
      <PageHeader
        title="Verifications"
        description="Provider onboarding queue — review KYC and approve new providers"
      />

      {loading ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <ShieldCheck className="size-10 mb-3 text-emerald-500/60" />
            <p className="font-medium text-foreground">All caught up</p>
            <p className="text-sm">No providers are awaiting verification.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Queue list */}
          <div className="lg:col-span-2 space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Clock className="size-4" /> {rows.length} pending
            </div>
            {rows.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedId(p.id)}
                className={`w-full text-left rounded-xl border p-3 transition-colors ${
                  selected?.id === p.id ? 'border-primary bg-primary/5' : 'bg-card hover:bg-accent'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <UserCell name={p.user?.name} sub={p.businessName} avatar={p.user?.avatar} />
                  <Badge variant="outline" className="font-normal shrink-0">
                    <FileText className="size-3 mr-1" /> {p.documents?.length ?? 0}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                  <Stars rating={p.rating} />
                  <span>{p.experience} yrs</span>
                  <span>{formatINR(p.priceFrom)} {p.pricePer}</span>
                  <span className="ml-auto">Applied {fmtDate(p.createdAt)}</span>
                </div>
              </button>
            ))}
          </div>

          {/* Review pane */}
          <div className="lg:col-span-3 space-y-4">
            {selected && (
              <>
                <Card>
                  <CardContent className="flex items-center justify-between gap-4 pt-6">
                    <UserCell
                      name={selected.user?.name}
                      sub={`${selected.businessName ?? ''} · ${selected.area ?? ''}`}
                      avatar={selected.user?.avatar}
                    />
                    <div className="flex gap-2 shrink-0">
                      <Button size="sm" disabled={busy} onClick={() => decide(true)}>
                        <ShieldCheck className="size-4" /> Approve
                      </Button>
                      <Button size="sm" variant="outline" disabled={busy} onClick={() => decide(false)}>
                        <ShieldX className="size-4" /> Reject
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => navigate(`/providers/${selected.id}`)}>
                        Full profile
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <KycPanel
                  provider={selected}
                  busy={busy}
                  onApprove={() => decide(true)}
                  onReject={() => decide(false)}
                />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
