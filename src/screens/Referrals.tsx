import { useState } from 'react';
import { Gift, Users2, IndianRupee, ChevronDown, ChevronRight } from 'lucide-react';
import { adminApi, formatINR, formatINRCompact } from '../lib/api';
import { useApi } from '../lib/useApi';
import { PageHeader } from '../components/PageHeader';
import { StatCard } from '../components/StatCard';
import { DataTable, type Column } from '../components/DataTable';
import { SearchInput, UserCell, PhoneLink, fmtDate } from '../components/common';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import type { ReferralRow } from '../lib/types';

export function Referrals() {
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data, loading } = useApi(() => adminApi.referrals.list({ q, page }), [q, page]);

  const rows = data?.data ?? [];
  // Global totals from the API (across all referrers), not just this page.
  const totals = data?.totals;
  const activeReferrers = totals?.activeReferrers ?? rows.filter((r) => r.referredCount > 0).length;
  const totalReferred = totals?.totalReferred ?? rows.reduce((s, r) => s + r.referredCount, 0);
  const totalPayout = totals?.totalPayoutPaise ?? rows.reduce((s, r) => s + r.earningsPaise, 0);

  const columns: Column<ReferralRow>[] = [
    {
      key: 'referrer',
      header: 'Referrer',
      cell: (r) => <UserCell name={r.name} sub={<PhoneLink phone={r.phone} />} avatar={r.avatar} />,
    },
    { key: 'code', header: 'Code', cell: (r) => <span className="font-mono text-sm">{r.referralCode ?? '—'}</span> },
    { key: 'count', header: 'Referred', cell: (r) => <Badge variant="secondary" className="font-normal">{r.referredCount}</Badge> },
    { key: 'earned', header: 'Payout', cell: (r) => <span className="text-sm font-medium">{formatINR(r.earningsPaise)}</span> },
    {
      key: 'cap',
      header: 'Monthly cap',
      cell: (r) => (
        <span className={`text-xs ${r.referredCount > 10 ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
          {r.referredCount > 10 ? 'Over 10/mo — review' : `${r.referredCount}/10`}
        </span>
      ),
    },
    {
      key: 'expand',
      header: '',
      headerClassName: 'w-10',
      cell: (r) =>
        r.referredCount > 0 ? (
          <Button variant="ghost" size="icon" className="size-8" onClick={() => setExpanded(expanded === r.id ? null : r.id)}>
            {expanded === r.id ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
          </Button>
        ) : null,
    },
  ];

  return (
    <div>
      <PageHeader title="Referrals" description="Referral program — invitees, payouts and abuse monitoring" />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard label="Active referrers" value={activeReferrers} icon={<Gift className="size-5" />} accent="violet" />
        <StatCard label="Total referred" value={totalReferred} icon={<Users2 className="size-5" />} accent="primary" hint="successful signups" />
        <StatCard label="Total payout" value={formatINRCompact(totalPayout)} icon={<IndianRupee className="size-5" />} accent="green" hint="₹100 per referral" />
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        rowKey={(r) => r.id}
        pagination={data?.pagination}
        onPageChange={setPage}
        emptyLabel="No referrers found"
        toolbar={<SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search name or code…" className="sm:max-w-xs w-full" />}
      />

      {/* Expanded invitee detail for the selected referrer. */}
      {expanded && (() => {
        const r = rows.find((x) => x.id === expanded);
        if (!r || !r.referredUsers?.length) return null;
        return (
          <div className="mt-4 rounded-xl border bg-card p-4">
            <p className="text-sm font-medium mb-3">Invited by {r.name}</p>
            <div className="space-y-2">
              {r.referredUsers.map((u) => (
                <div key={u.id} className="flex items-center justify-between text-sm border-b last:border-0 pb-2 last:pb-0">
                  <span>{u.name}</span>
                  <span className="text-muted-foreground"><PhoneLink phone={u.phone} /> · joined {fmtDate(u.createdAt)}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
