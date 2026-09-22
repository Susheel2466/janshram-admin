// Contractor sites, and one site opened up.
//
// Support's first question in a wage dispute is "which site, and what does the
// record say". Until this existed the console could name a contractor and
// nothing about the work they were running, so every such question became a
// phone call to one of the two people arguing.
//
// The arithmetic here is computed by the same function both apps use. A support
// answer that does not match either side's screen settles nothing.

import { useState } from 'react';
import { ArrowLeft, IndianRupee, CalendarDays } from 'lucide-react';
import { adminApi } from '../lib/api';
import { useApi } from '../lib/useApi';
import { PageHeader } from '../components/PageHeader';
import { fmtDate } from '../components/common';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import type { AdminProjectWorker } from '../lib/types';
import { siteOwner } from '../lib/siteOwner';

const SETTLE: Record<string, string> = {
  PAID: 'bg-green-500/10 text-green-600 border-green-500/20',
  PARTIAL: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  PENDING: 'bg-red-500/10 text-red-600 border-red-500/20',
};

const DAY_LABEL: Record<string, string> = {
  DOUBLE_DAY: 'Double day (2 days)',
  PRESENT: 'Full day',
  HALF_DAY: 'Half day',
  ABSENT: 'Absent',
  LEAVE: 'Leave',
};

export function Sites() {
  const [openId, setOpenId] = useState<string | null>(null);
  const list = useApi(() => adminApi.sites.list({ limit: 50 }), []);
  const detail = useApi(
    () => (openId ? adminApi.sites.get(openId) : Promise.resolve(null)),
    [openId],
  );

  if (openId) {
    const d = detail.data;
    return (
      <div className="space-y-6">
        <button onClick={() => setOpenId(null)} className="text-sm text-muted-foreground inline-flex items-center gap-1.5">
          <ArrowLeft className="size-4" /> Sites
        </button>

        {detail.loading && !d ? <Skeleton className="h-32 rounded-xl" /> : d?.project && (
          <>
            <div>
              <h1 className="text-xl font-semibold">{d.project.name}</h1>
              <p className="text-sm text-muted-foreground">
                {[siteOwner(d.project).name, siteOwner(d.project).kind, siteOwner(d.project).phone]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            </div>

            {/* Owed leads: it is the number a dispute is about. */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Money label="Still owed" value={d.totals.dueRupees} accent="text-red-600" />
              <Money label="Paid" value={d.totals.paidRupees} accent="text-green-600" />
              <Money label="Wages earned" value={d.totals.wagesRupees} accent="" />
              <Money label="Materials" value={d.totals.expensesRupees} accent="" />
            </div>

            <div className="space-y-4">
              {d.workers.map((w) => <WorkerCard key={w.id} worker={w} />)}
              {d.workers.length === 0 && (
                <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">
                  Nobody has been added to this site.
                </CardContent></Card>
              )}
            </div>
          </>
        )}
      </div>
    );
  }

  const rows = list.data?.projects ?? [];
  return (
    <div>
      <PageHeader title="Sites" description="Crews, attendance and wage records — contractor-run and provider-run" />
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b text-left text-xs text-muted-foreground">
              <tr>
                <th className="p-3 font-medium">Site</th>
                <th className="p-3 font-medium">Run by</th>
                <th className="p-3 font-medium">Crew</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 font-medium">Started</th>
              </tr>
            </thead>
            <tbody>
              {list.loading && rows.length === 0 && (
                <tr><td colSpan={5} className="p-6"><Skeleton className="h-16" /></td></tr>
              )}
              {!list.loading && rows.length === 0 && (
                <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">
                  No sites have been created yet.
                </td></tr>
              )}
              {rows.map((p) => (
                <tr key={p.id} className="border-b last:border-0 cursor-pointer hover:bg-muted/40"
                    onClick={() => setOpenId(p.id)}>
                  <td className="p-3">
                    <div className="font-medium">{p.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {[p.area, p.city].filter(Boolean).join(', ') || '—'}
                    </div>
                  </td>
                  <td className="p-3">
                    <div>{siteOwner(p).name}</div>
                    <div className="text-xs text-muted-foreground">
                      {[siteOwner(p).kind, siteOwner(p).phone].filter(Boolean).join(' · ')}
                    </div>
                  </td>
                  <td className="p-3">{p.workerCount ?? 0}</td>
                  <td className="p-3">
                    <Badge variant="outline" className="text-xs">{p.status}</Badge>
                    <span className="ml-2 text-xs text-muted-foreground">{p.progress}%</span>
                  </td>
                  <td className="p-3 text-xs text-muted-foreground">{fmtDate(p.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function Money({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <Card><CardContent className="p-4">
      <p className={`text-lg font-semibold ${accent}`}>₹{value.toLocaleString('en-IN')}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
    </CardContent></Card>
  );
}

function WorkerCard({ worker: w }: { worker: AdminProjectWorker }) {
  const [open, setOpen] = useState(false);
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-medium">{w.name || 'Worker'}</p>
            <p className="text-xs text-muted-foreground">
              {[w.phone, w.isManual ? 'no JanShram account' : null].filter(Boolean).join(' · ') || '—'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">{w.status}</Badge>
            <Badge variant="outline" className={SETTLE[w.settlement]}>{w.settlement}</Badge>
          </div>
        </div>

        {/* The sum written out, because it is the line both sides are arguing
            about and a total nobody can take apart settles nothing. */}
        <p className="text-sm mt-3">
          {w.daysWorked} days × ₹{w.wageRupees}/{w.wageUnit.toLowerCase()} = ₹
          {w.earnedRupees.toLocaleString('en-IN')}
          <span className="text-muted-foreground">
            {' '}· paid ₹{w.paidRupees.toLocaleString('en-IN')} · due ₹{w.dueRupees.toLocaleString('en-IN')}
          </span>
        </p>

        <Button variant="outline" size="sm" className="mt-3" onClick={() => setOpen((v) => !v)}>
          {open ? 'Hide the record' : 'Days and payments'}
        </Button>

        {open && (
          <div className="grid gap-4 md:grid-cols-2 mt-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                <CalendarDays className="size-3.5" /> Days marked
              </p>
              {w.attendance.length === 0 && <p className="text-sm text-muted-foreground">None.</p>}
              <ul className="space-y-1 text-sm">
                {w.attendance.map((a) => (
                  <li key={a.date} className="flex justify-between">
                    <span>{a.date}</span>
                    <span className="text-muted-foreground">{DAY_LABEL[a.status] ?? a.status}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                <IndianRupee className="size-3.5" /> Payments recorded
              </p>
              {w.payments.length === 0 && <p className="text-sm text-muted-foreground">None.</p>}
              <ul className="space-y-1 text-sm">
                {w.payments.map((p) => (
                  <li key={p.id} className="flex justify-between">
                    <span>{p.paidOn}<span className="text-muted-foreground"> · {p.method.toLowerCase()}</span></span>
                    <span>₹{p.amountRupees.toLocaleString('en-IN')}</span>
                  </li>
                ))}
              </ul>
              {/* Said plainly, because a payments list in a console invites the
                  assumption that the platform moved the money. */}
              <p className="text-xs text-muted-foreground mt-2">
                Recorded by the contractor. No money moves through JanShram.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
