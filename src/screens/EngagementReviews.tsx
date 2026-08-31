// Ratings contractors and workers leave on each other.
//
// The column that hides one has existed since the feature shipped and both apps
// honour it, but nothing could ever set it — so a review naming someone's caste,
// or written in anger over a wage dispute, stayed on a worker's profile with no
// way to take it down short of a SQL console. This screen is that way.
//
// Deliberately hide-only. These ratings are two people's account of working
// together; editing one would put words in their mouth, and deleting one erases
// the evidence if the person it names complains later.

import { useState } from 'react';
import { toast } from 'sonner';
import { EyeOff, Eye } from 'lucide-react';
import { adminApi } from '../lib/api';
import { useApi } from '../lib/useApi';
import { PageHeader } from '../components/PageHeader';
import { FilterSelect } from '../components/FilterSelect';
import { fmtDate } from '../components/common';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import type { AdminEngagementReview } from '../lib/types';

const DIRECTIONS = [
  { value: 'all', label: 'Both directions' },
  { value: 'CONTRACTOR_TO_WORKER', label: 'Contractor → worker' },
  { value: 'WORKER_TO_CONTRACTOR', label: 'Worker → contractor' },
];

const VISIBILITY = [
  { value: 'all', label: 'All reviews' },
  { value: 'false', label: 'Visible only' },
  { value: 'true', label: 'Hidden only' },
];

// The three questions each side is asked. Which three depends on who is
// answering — a worker is not asked to rate their own work quality.
const CRITERIA: Record<string, { key: keyof AdminEngagementReview; label: string }[]> = {
  CONTRACTOR_TO_WORKER: [
    { key: 'workQuality', label: 'Work quality' },
    { key: 'behaviour', label: 'Behaviour' },
    { key: 'reliability', label: 'Reliability' },
  ],
  WORKER_TO_CONTRACTOR: [
    { key: 'paymentTimeliness', label: 'Paid on time' },
    { key: 'behaviour', label: 'Behaviour' },
    { key: 'reliability', label: 'Reliability' },
  ],
};

export function EngagementReviews() {
  const [direction, setDirection] = useState('all');
  const [hidden, setHidden] = useState('all');
  const [busy, setBusy] = useState<string | null>(null);

  const { data, loading, refetch } = useApi(
    () =>
      adminApi.engagementReviews.list({
        direction: direction === 'all' ? undefined : direction,
        hidden: hidden === 'all' ? undefined : hidden,
        limit: 50,
      }),
    [direction, hidden],
  );

  const toggle = async (r: AdminEngagementReview) => {
    setBusy(r.id);
    try {
      await adminApi.engagementReviews.setHidden(r.id, !r.hidden);
      toast.success(r.hidden ? 'Review is visible again' : 'Review hidden from both profiles');
      refetch();
    } finally {
      setBusy(null);
    }
  };

  const rows = data?.reviews ?? [];

  return (
    <div>
      <PageHeader
        title="Contractor & worker ratings"
        description="Ratings left after site work. Hiding one takes it off both profiles."
      />

      <div className="flex flex-wrap gap-2 mb-4">
        <FilterSelect value={direction} onChange={setDirection} options={DIRECTIONS} className="w-[200px] bg-background" />
        <FilterSelect value={hidden} onChange={setHidden} options={VISIBILITY} className="w-[160px] bg-background" />
      </div>

      {loading && rows.length === 0 && <Skeleton className="h-40 rounded-xl" />}

      {!loading && rows.length === 0 && (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          No ratings match this filter.
        </CardContent></Card>
      )}

      <div className="space-y-3">
        {rows.map((r) => {
          const worker = r.projectWorker.provider.user?.name ?? 'Worker';
          const contractor =
            r.projectWorker.project.contractor.firmName ??
            r.projectWorker.project.contractor.user?.name ??
            'Contractor';
          const byWorker = r.direction === 'WORKER_TO_CONTRACTOR';

          return (
            <Card key={r.id} className={r.hidden ? 'opacity-60' : ''}>
              <CardContent className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    {/* Written as a sentence: which of the two is being rated is
                        the thing a moderator needs first, and a direction enum
                        makes them work it out every time. */}
                    <p className="text-sm">
                      <span className="font-medium">{byWorker ? worker : contractor}</span>
                      {' rated '}
                      <span className="font-medium">{byWorker ? contractor : worker}</span>
                      <span className="text-amber-500 ml-2">{'★'.repeat(r.rating)}</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {r.projectWorker.project.name} · {fmtDate(r.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {r.hidden && <Badge variant="outline" className="text-xs">Hidden</Badge>}
                    <Button variant="outline" size="sm" disabled={busy === r.id} onClick={() => toggle(r)}>
                      {r.hidden
                        ? <><Eye className="size-4 mr-1.5" /> Restore</>
                        : <><EyeOff className="size-4 mr-1.5" /> Hide</>}
                    </Button>
                  </div>
                </div>

                {r.comment && <p className="text-sm mt-3">{r.comment}</p>}

                <div className="flex flex-wrap gap-x-5 gap-y-1 mt-3 text-xs text-muted-foreground">
                  {(CRITERIA[r.direction] ?? []).map(({ key, label }) => {
                    const score = r[key];
                    return typeof score === 'number' ? (
                      <span key={label}>{label}: <span className="text-foreground">{score}/5</span></span>
                    ) : null;
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
