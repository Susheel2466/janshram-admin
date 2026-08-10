import { useState } from 'react';
import { Send, AlertTriangle, MinusCircle } from 'lucide-react';
import { adminApi } from '../lib/api';
import { useApi } from '../lib/useApi';
import { PageHeader } from '../components/PageHeader';
import { StatCard } from '../components/StatCard';
import { DataTable, type Column } from '../components/DataTable';
import { SearchInput, UserCell, fmtDateTime } from '../components/common';
import { FilterSelect } from '../components/FilterSelect';
import { Badge } from '../components/ui/badge';
import type { MessageLog } from '../lib/types';

const STATUS_STYLE: Record<MessageLog['status'], string> = {
  SENT: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  FAILED: 'bg-destructive/10 text-destructive border-destructive/20',
  SKIPPED: 'bg-muted text-muted-foreground',
};

export function Messages() {
  const [q, setQ] = useState('');
  const [channel, setChannel] = useState('all');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);

  const { data, loading } = useApi(
    () =>
      adminApi.messages.list({
        q,
        channel: channel === 'all' ? undefined : channel,
        status: status === 'all' ? undefined : status,
        page,
      }),
    [q, channel, status, page],
  );
  const summary = data?.summary;
  const retentionDays = data?.retentionDays;

  const columns: Column<MessageLog>[] = [
    {
      key: 'recipient',
      header: 'Recipient',
      cell: (m) => (m.user ? <UserCell name={m.user.name} sub={m.to} /> : <span className="text-sm">{m.to}</span>),
    },
    {
      key: 'channel',
      header: 'Channel',
      cell: (m) => (
        <Badge variant="outline" className="font-normal">
          {m.channel === 'WHATSAPP' ? 'WhatsApp' : 'SMS'}
        </Badge>
      ),
    },
    {
      key: 'event',
      header: 'Alert',
      cell: (m) => <span className="text-sm font-mono text-muted-foreground">{m.event}</span>,
    },
    {
      key: 'body',
      header: 'Message',
      className: 'max-w-sm',
      cell: (m) => <p className="text-sm truncate" title={m.body}>{m.body}</p>,
    },
    {
      key: 'status',
      header: 'Status',
      cell: (m) => (
        <div className="flex flex-col gap-0.5">
          <Badge variant="outline" className={`font-normal w-fit ${STATUS_STYLE[m.status]}`}>
            {m.status.toLowerCase()}
          </Badge>
          {/* A skip or failure is only useful with its reason attached. */}
          {m.error && <span className="text-xs text-muted-foreground max-w-[16rem] truncate" title={m.error}>{m.error}</span>}
        </div>
      ),
    },
    {
      key: 'createdAt',
      header: 'When',
      cell: (m) => <span className="text-sm text-muted-foreground whitespace-nowrap">{fmtDateTime(m.createdAt)}</span>,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Message Log"
        description={`Every outbound SMS & WhatsApp alert — including the ones that were skipped and why.${
          retentionDays ? ` History is kept for ${retentionDays} days.` : ''
        }`}
      />

      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        <StatCard label="Sent (24h)" value={summary?.sent ?? 0} icon={<Send className="size-4" />} accent="green" />
        <StatCard label="Failed (24h)" value={summary?.failed ?? 0} icon={<AlertTriangle className="size-4" />} accent="red" />
        <StatCard label="Skipped (24h)" value={summary?.skipped ?? 0} icon={<MinusCircle className="size-4" />} accent="amber" />
      </div>

      <DataTable
        columns={columns}
        rows={data?.data ?? []}
        loading={loading}
        rowKey={(m) => m.id}
        pagination={data?.pagination}
        onPageChange={setPage}
        emptyLabel="No messages sent yet"
        toolbar={
          <div className="flex flex-col sm:flex-row gap-2">
            <SearchInput
              value={q}
              onChange={(v) => { setQ(v); setPage(1); }}
              placeholder="Search number, alert or text…"
              className="sm:max-w-xs w-full"
            />
            <FilterSelect
              value={channel}
              onChange={(v) => { setChannel(v); setPage(1); }}
              options={[
                { value: 'all', label: 'All channels' },
                { value: 'SMS', label: 'SMS' },
                { value: 'WHATSAPP', label: 'WhatsApp' },
              ]}
            />
            <FilterSelect
              value={status}
              onChange={(v) => { setStatus(v); setPage(1); }}
              options={[
                { value: 'all', label: 'Any status' },
                { value: 'SENT', label: 'Sent' },
                { value: 'FAILED', label: 'Failed' },
                { value: 'SKIPPED', label: 'Skipped' },
              ]}
            />
          </div>
        }
      />
    </div>
  );
}
