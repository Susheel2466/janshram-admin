import { useState } from 'react';
import { toast } from 'sonner';
import { Plus, Minus, IndianRupee } from 'lucide-react';
import { adminApi, formatINR, rupeesToPaise } from '../lib/api';
import { useApi } from '../lib/useApi';
import { PageHeader } from '../components/PageHeader';
import { DataTable, type Column } from '../components/DataTable';
import { SearchInput, UserCell, fmtDateTime } from '../components/common';
import { FilterSelect } from '../components/FilterSelect';
import { StatusBadge } from '../components/StatusBadge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '../components/ui/dialog';
import type { Wallet, WalletTransaction } from '../lib/types';

export function Wallets() {
  return (
    <div>
      <PageHeader title="Wallets" description="Balances, transactions and manual adjustments" />
      <Tabs defaultValue="balances">
        <TabsList className="mb-4">
          <TabsTrigger value="balances">Balances</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
        </TabsList>
        <TabsContent value="balances"><Balances /></TabsContent>
        <TabsContent value="transactions"><Transactions /></TabsContent>
      </Tabs>
    </div>
  );
}

function Balances() {
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [adjust, setAdjust] = useState<Wallet | null>(null);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [dir, setDir] = useState<'credit' | 'debit'>('credit');

  const { data, loading, refetch } = useApi(() => adminApi.wallets.list({ q, page }), [q, page]);

  const submit = async () => {
    if (!adjust) return;
    const rupees = Number(amount);
    if (!rupees || rupees <= 0) return toast.error('Enter a valid amount');
    const delta = rupeesToPaise(dir === 'credit' ? rupees : -rupees);
    await adminApi.wallets.adjust(adjust.userId, delta, reason || 'Manual adjustment');
    toast.success(`${dir === 'credit' ? 'Credited' : 'Debited'} ${formatINR(rupeesToPaise(rupees))}`);
    setAdjust(null); setAmount(''); setReason('');
    refetch();
  };

  const columns: Column<Wallet>[] = [
    { key: 'user', header: 'User', cell: (w) => <UserCell name={w.user?.name} sub={w.user?.phone} avatar={w.user?.avatar} /> },
    { key: 'balance', header: 'Balance', cell: (w) => <span className="text-base font-semibold">{formatINR(w.balance)}</span> },
    { key: 'txns', header: 'Transactions', cell: (w) => <span className="text-sm text-muted-foreground">{w.transactions?.length ?? 0}</span> },
    {
      key: 'actions',
      header: '',
      headerClassName: 'w-28',
      cell: (w) => (
        <Button variant="outline" size="sm" onClick={() => { setAdjust(w); setDir('credit'); }}>
          <IndianRupee className="size-3.5" /> Adjust
        </Button>
      ),
    },
  ];

  return (
    <>
      <DataTable
        columns={columns}
        rows={data?.data ?? []}
        loading={loading}
        rowKey={(w) => w.id}
        pagination={data?.pagination}
        onPageChange={setPage}
        toolbar={<SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search user…" className="sm:max-w-xs w-full" />}
      />

      <Dialog open={!!adjust} onOpenChange={(o) => !o && setAdjust(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust wallet — {adjust?.user?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="text-sm text-muted-foreground">
              Current balance: <span className="font-medium text-foreground">{adjust && formatINR(adjust.balance)}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button variant={dir === 'credit' ? 'default' : 'outline'} onClick={() => setDir('credit')}>
                <Plus className="size-4" /> Credit
              </Button>
              <Button variant={dir === 'debit' ? 'default' : 'outline'} onClick={() => setDir('debit')}>
                <Minus className="size-4" /> Debit
              </Button>
            </div>
            <div className="space-y-2">
              <Label htmlFor="amt">Amount (₹)</Label>
              <Input id="amt" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="500" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason">Reason</Label>
              <Input id="reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Goodwill credit, refund correction…" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjust(null)}>Cancel</Button>
            <Button onClick={submit}>Apply adjustment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Transactions() {
  const [q, setQ] = useState('');
  const [type, setType] = useState('all');
  const [page, setPage] = useState(1);

  const { data, loading } = useApi(
    () => adminApi.wallets.transactions({ q, type: type === 'all' ? undefined : type, page }),
    [q, type, page],
  );

  const columns: Column<WalletTransaction>[] = [
    { key: 'user', header: 'User', cell: (t) => <span className="text-sm font-medium">{t.user?.name}</span> },
    { key: 'type', header: 'Type', cell: (t) => <StatusBadge status={t.type} /> },
    {
      key: 'amount',
      header: 'Amount',
      cell: (t) => (
        <span className={`text-sm font-medium ${t.type === 'CREDIT' ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}`}>
          {t.type === 'CREDIT' ? '+' : '−'} {formatINR(t.amount)}
        </span>
      ),
    },
    { key: 'balance', header: 'Balance after', cell: (t) => <span className="text-sm text-muted-foreground">{formatINR(t.balanceAfter)}</span> },
    { key: 'desc', header: 'Description', cell: (t) => <span className="text-sm">{t.description ?? '—'}</span> },
    { key: 'date', header: 'Date', cell: (t) => <span className="text-sm text-muted-foreground">{fmtDateTime(t.createdAt)}</span> },
  ];

  return (
    <DataTable
      columns={columns}
      rows={data?.data ?? []}
      loading={loading}
      rowKey={(t) => t.id}
      pagination={data?.pagination}
      onPageChange={setPage}
      toolbar={
        <div className="flex flex-col sm:flex-row gap-2">
          <SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search user or note…" className="sm:max-w-xs w-full" />
          <FilterSelect
            value={type}
            onChange={(v) => { setType(v); setPage(1); }}
            options={[{ value: 'all', label: 'All types' }, { value: 'CREDIT', label: 'Credit' }, { value: 'DEBIT', label: 'Debit' }]}
          />
        </div>
      }
    />
  );
}
