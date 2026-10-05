// Deciding what the public site is allowed to quote.
//
// Two different permissions are at work here and the screen has to keep them
// apart. Approval is ours: a moderator decides whether something is fit to
// show. Consent is theirs: the author ticked a box saying they were happy to be
// quoted publicly, and nobody here can tick it for them. An approved
// testimonial from somebody who never consented stays off the site — the public
// query checks both — so this screen says so on the card rather than letting a
// moderator approve it and assume it went live.
//
// What a moderator can change is status, featuring and an internal note. The
// rating and the words are the author's and are read-only here; editing them
// would be putting words in somebody's mouth.

import { useState } from 'react';
import { toast } from 'sonner';
import { MessageSquareQuote, Check, X, EyeOff, Star, Lock, Undo2 } from 'lucide-react';
import { adminApi } from '../lib/api';
import { useApi } from '../lib/useApi';
import { PageHeader } from '../components/PageHeader';
import { FilterSelect } from '../components/FilterSelect';
import { UserCell, fmtDateTime } from '../components/common';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Switch } from '../components/ui/switch';
import { Skeleton } from '../components/ui/skeleton';
import type { AdminTestimonial, TestimonialStatus } from '../lib/types';

const STATUS_TONE: Record<TestimonialStatus, string> = {
  PENDING: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  APPROVED: 'bg-green-500/10 text-green-600 border-green-500/20',
  REJECTED: 'bg-red-500/10 text-red-600 border-red-500/20',
  HIDDEN: 'bg-muted text-muted-foreground border-border',
};

const STATUS_LABEL: Record<TestimonialStatus, string> = {
  PENDING: 'Waiting',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  HIDDEN: 'Hidden',
};

const ROLE_LABEL: Record<string, string> = {
  CUSTOMER: 'Customer',
  PROVIDER: 'Worker',
  CONTRACTOR: 'Contractor',
};

function RatingStars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${rating} out of 5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={i < rating ? 'size-4 fill-amber-400 text-amber-400' : 'size-4 text-muted-foreground/30'}
        />
      ))}
    </span>
  );
}

export function Testimonials() {
  const [status, setStatus] = useState('PENDING');
  const [role, setRole] = useState('all');
  const [rating, setRating] = useState('all');
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState<Record<string, string>>({});

  const { data, loading, refetch } = useApi(
    () => adminApi.testimonials.list({
      status: status === 'all' ? undefined : status,
      role: role === 'all' ? undefined : role,
      rating: rating === 'all' ? undefined : Number(rating),
      page,
    }),
    [status, role, rating, page],
  );

  const rows = data?.data ?? [];
  const total = data?.pagination.total ?? 0;

  const moderate = async (
    t: AdminTestimonial,
    patch: { status?: TestimonialStatus; featured?: boolean; moderationNote?: string },
    done?: string,
  ) => {
    setBusyId(t.id);
    try {
      await adminApi.testimonials.moderate(t.id, patch);
      if (done) toast.success(done);
      refetch();
    } catch (err) {
      // The backend refuses featuring without consent. Showing its words is the
      // point — a generic failure here would look like a bug rather than a rule.
      toast.error(err instanceof Error ? err.message : 'Could not update that');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Testimonials"
        description="What customers, workers and contractors said about JanShram"
      />

      <div className="flex flex-wrap gap-3">
        <FilterSelect
          value={status}
          onChange={(v) => { setStatus(v); setPage(1); }}
          options={[
            { value: 'PENDING', label: 'Waiting on you' },
            { value: 'APPROVED', label: 'Approved' },
            { value: 'REJECTED', label: 'Rejected' },
            { value: 'HIDDEN', label: 'Hidden' },
            { value: 'all', label: 'All' },
          ]}
          className="w-48"
        />
        <FilterSelect
          value={role}
          onChange={(v) => { setRole(v); setPage(1); }}
          options={[
            { value: 'all', label: 'Everyone' },
            { value: 'CUSTOMER', label: 'Customers' },
            { value: 'PROVIDER', label: 'Workers' },
            { value: 'CONTRACTOR', label: 'Contractors' },
          ]}
          className="w-44"
        />
        <FilterSelect
          value={rating}
          onChange={(v) => { setRating(v); setPage(1); }}
          options={[
            { value: 'all', label: 'Any rating' },
            { value: '5', label: '5 stars' },
            { value: '4', label: '4 stars' },
            { value: '3', label: '3 stars' },
            { value: '2', label: '2 stars' },
            { value: '1', label: '1 star' },
          ]}
          className="w-40"
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
        </div>
      ) : rows.length === 0 ? (
        <Card className="p-12 text-center">
          <MessageSquareQuote className="size-8 mx-auto text-muted-foreground mb-3" />
          <p className="font-medium">
            {status === 'PENDING' ? 'Nothing waiting' : 'Nothing here'}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {status === 'PENDING'
              ? 'Every testimonial has been dealt with.'
              : 'Try a different filter.'}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {rows.map((t) => {
            const featurable = t.status === 'APPROVED' && t.consentPublic;
            const busy = busyId === t.id;
            return (
              <Card key={t.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <UserCell
                    name={t.user?.name}
                    avatar={t.consentPhoto ? t.user?.avatar : null}
                    sub={`${ROLE_LABEL[t.role] ?? t.role} · ${fmtDateTime(t.createdAt)}`}
                  />
                  <div className="flex items-center gap-2 flex-wrap">
                    <RatingStars rating={t.rating} />
                    <Badge variant="outline" className={`text-xs ${STATUS_TONE[t.status]}`}>
                      {STATUS_LABEL[t.status]}
                    </Badge>
                    {t.featured && <Badge className="text-xs">Featured</Badge>}
                  </div>
                </div>

                <div>
                  {t.title && <p className="font-medium text-sm">{t.title}</p>}
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap mt-0.5">{t.body}</p>
                </div>

                {/* Consent, stated plainly. Approving this one does not publish
                    it, and the moderator needs to know that before they wonder
                    why it never appeared. */}
                {!t.consentPublic && (
                  <div className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-2.5">
                    <Lock className="size-4 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-700 dark:text-amber-500">
                      They did not agree to be quoted publicly. Approving this keeps it in our
                      records — it will not appear on the site, and it cannot be featured.
                    </p>
                  </div>
                )}
                {t.consentPublic && !t.consentPhoto && (
                  <p className="text-xs text-muted-foreground">
                    Quote may be shown; their photo may not.
                  </p>
                )}

                <div className="flex items-center gap-2 flex-wrap pt-1 border-t">
                  <div className="flex items-center gap-1.5 pt-3">
                    {t.status !== 'APPROVED' && (
                      <Button
                        size="sm" disabled={busy}
                        onClick={() => moderate(t, { status: 'APPROVED' }, 'Approved')}
                      >
                        <Check className="size-4" /> Approve
                      </Button>
                    )}
                    {t.status === 'APPROVED' && (
                      <Button
                        size="sm" variant="outline" disabled={busy}
                        onClick={() => moderate(t, { status: 'HIDDEN' }, 'Taken off the site')}
                      >
                        <EyeOff className="size-4" /> Hide
                      </Button>
                    )}
                    {t.status !== 'REJECTED' && (
                      <Button
                        size="sm" variant="outline" disabled={busy}
                        className="text-destructive hover:text-destructive"
                        onClick={() => moderate(t, { status: 'REJECTED' }, 'Rejected')}
                      >
                        <X className="size-4" /> Reject
                      </Button>
                    )}
                    {(t.status === 'REJECTED' || t.status === 'HIDDEN') && (
                      <Button
                        size="sm" variant="ghost" disabled={busy}
                        onClick={() => moderate(t, { status: 'PENDING' }, 'Back in the queue')}
                      >
                        <Undo2 className="size-4" /> Undecide
                      </Button>
                    )}
                  </div>

                  <div className="ml-auto flex items-center gap-2 pt-3">
                    <span
                      className="text-xs text-muted-foreground"
                      title={
                        featurable
                          ? 'Shown in the carousel on the homepage'
                          : t.consentPublic
                            ? 'Approve it first'
                            : 'They did not agree to be quoted publicly'
                      }
                    >
                      Feature on homepage
                    </span>
                    <Switch
                      checked={t.featured}
                      disabled={busy || !featurable}
                      onCheckedChange={(v) =>
                        moderate(t, { featured: v }, v ? 'Featured' : 'No longer featured')
                      }
                      aria-label="Feature on homepage"
                    />
                  </div>
                </div>

                {/* Ours, not theirs — never shown on the site. */}
                <div className="flex items-center gap-2">
                  <Input
                    value={noteDraft[t.id] ?? t.moderationNote ?? ''}
                    onChange={(e) => setNoteDraft((d) => ({ ...d, [t.id]: e.target.value }))}
                    placeholder="Internal note — why you decided what you decided"
                    className="h-8 text-xs"
                  />
                  <Button
                    size="sm" variant="ghost" disabled={busy || noteDraft[t.id] === undefined}
                    onClick={() =>
                      moderate(t, { moderationNote: noteDraft[t.id] ?? '' }, 'Note saved').then(() =>
                        setNoteDraft((d) => {
                          const { [t.id]: _drop, ...rest } = d;
                          return rest;
                        }),
                      )
                    }
                  >
                    Save note
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {total > rows.length && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {rows.length} of {total}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <Button
              variant="outline" size="sm"
              disabled={page * (data?.pagination.limit ?? 20) >= total}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
