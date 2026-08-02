import { Link } from 'react-router';
import {
  Users as UsersIcon, Wrench, CalendarCheck, IndianRupee, Star, Gavel,
  WalletMinimal, ShieldAlert, TrendingUp, LifeBuoy,
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, PieChart, Pie, Cell,
} from 'recharts';
import { adminApi, formatINR, formatINRCompact } from '../lib/api';
import { useApi } from '../lib/useApi';
import { PageHeader } from '../components/PageHeader';
import { StatCard } from '../components/StatCard';
import { StatusBadge } from '../components/StatusBadge';
import { UserCell, fmtDateTime } from '../components/common';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Skeleton } from '../components/ui/skeleton';

const PIE_COLORS = ['#0A84FF', '#34C759', '#FF9500', '#AF52DE', '#FF375F', '#5AC8FA', '#FFCC00'];

export function Dashboard() {
  const stats = useApi(() => adminApi.dashboard.stats(), []);
  const series = useApi(() => adminApi.dashboard.timeseries(), []);
  const breakdown = useApi(() => adminApi.dashboard.categoryBreakdown(), []);
  const recent = useApi(() => adminApi.dashboard.recentBookings(), []);
  const audit = useApi(() => adminApi.dashboard.auditLog(), []);

  const s = stats.data?.stats;

  return (
    <div>
      <PageHeader title="Dashboard" description="Marketplace health at a glance" />

      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {stats.loading || !s ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[104px] rounded-xl" />)
        ) : (
          <>
            <StatCard
              label="Total Users"
              value={s.users.total.toLocaleString('en-IN')}
              icon={<UsersIcon className="size-5" />}
              trend={{ value: `${s.users.newThisWeek} new`, positive: true }}
              hint="this week"
            />
            <StatCard
              label="Providers"
              value={s.providers.total.toLocaleString('en-IN')}
              icon={<Wrench className="size-5" />}
              accent="violet"
              hint={`${s.providers.pendingVerification} pending verification`}
            />
            <StatCard
              label="Gross Revenue"
              value={formatINRCompact(s.revenue.grossPaise)}
              icon={<IndianRupee className="size-5" />}
              accent="green"
              trend={{ value: formatINRCompact(s.revenue.thisMonthPaise), positive: true }}
              hint="this month"
            />
            <StatCard
              label="Total Bookings"
              value={s.bookings.total.toLocaleString('en-IN')}
              icon={<CalendarCheck className="size-5" />}
              accent="amber"
              hint={`${s.bookings.pending} pending · ${s.bookings.inProgress} active`}
            />
          </>
        )}
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {stats.loading || !s ? (
          Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-[104px] rounded-xl" />)
        ) : (
          <>
            <StatCard label="Open Tenders" value={s.tenders.open} icon={<Gavel className="size-5" />} accent="primary" hint={`${s.tenders.awarded} awarded`} />
            <StatCard label="Avg Rating" value={s.reviews.avgRating.toFixed(2)} icon={<Star className="size-5" />} accent="amber" hint={`${s.reviews.total} reviews`} />
            <StatCard label="Wallet Float" value={formatINRCompact(s.revenue.walletFloatPaise)} icon={<WalletMinimal className="size-5" />} accent="green" hint="held balance" />
            <StatCard label="Flagged Reviews" value={s.reviews.flagged} icon={<ShieldAlert className="size-5" />} accent="red" hint="needs moderation" />
            <Link to="/tickets">
              <StatCard label="Open Tickets" value={s.support?.openTickets ?? 0} icon={<LifeBuoy className="size-5" />} accent="violet" hint="support queue" />
            </Link>
          </>
        )}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">Revenue & Bookings (14 days)</CardTitle>
            <TrendingUp className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {series.loading || !series.data ? (
              <Skeleton className="h-[280px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={series.data.points} margin={{ left: -10, right: 8, top: 8 }}>
                  <defs>
                    <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0A84FF" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#0A84FF" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} tickFormatter={(v) => formatINRCompact(v)} />
                  <Tooltip
                    contentStyle={{ background: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 12 }}
                    formatter={(v: number, name) => (name === 'revenuePaise' ? [formatINR(v), 'Revenue'] : [v, 'Bookings'])}
                  />
                  <Area type="monotone" dataKey="revenuePaise" stroke="#0A84FF" strokeWidth={2} fill="url(#rev)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Bookings by Category</CardTitle>
          </CardHeader>
          <CardContent>
            {breakdown.loading || !breakdown.data ? (
              <Skeleton className="h-[280px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={breakdown.data.breakdown}
                    dataKey="bookings"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={2}
                  >
                    {breakdown.data.breakdown.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 12 }}
                    formatter={(v: number, n) => [`${v} bookings`, n]}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
            {breakdown.data && (
              <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-2">
                {breakdown.data.breakdown.map((b, i) => (
                  <div key={b.category} className="flex items-center gap-1.5 text-xs">
                    <span className="size-2.5 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="text-muted-foreground">{b.category}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Signups bar + recent bookings + audit */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Daily Signups</CardTitle>
          </CardHeader>
          <CardContent>
            {series.loading || !series.data ? (
              <Skeleton className="h-[220px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={series.data.points} margin={{ left: -20, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} interval={2} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 12 }} />
                  <Bar dataKey="signups" fill="#34C759" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">Recent Bookings</CardTitle>
            <Link to="/bookings" className="text-xs text-primary hover:underline">View all</Link>
          </CardHeader>
          <CardContent className="space-y-1">
            {recent.loading || !recent.data
              ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)
              : recent.data.bookings.map((b) => (
                  <Link
                    key={b.id}
                    to={`/bookings/${b.id}`}
                    className="flex items-center justify-between gap-2 rounded-lg px-2 py-2 hover:bg-accent transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{b.service?.title ?? 'Service'}</div>
                      <div className="text-xs text-muted-foreground truncate">{b.customer?.name}</div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="text-sm font-medium">{formatINR(b.amount)}</span>
                      <StatusBadge status={b.status} />
                    </div>
                  </Link>
                ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Admin Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {audit.loading || !audit.data
              ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)
              : audit.data.entries.map((e) => (
                  <div key={e.id} className="flex items-start gap-3 text-sm">
                    <span className="mt-1.5 size-2 rounded-full bg-primary shrink-0" />
                    <div className="min-w-0">
                      <p>
                        <span className="text-muted-foreground">{e.action}</span>{' '}
                        <span className="font-medium">{e.target}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">{fmtDateTime(e.createdAt)}</p>
                    </div>
                  </div>
                ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
