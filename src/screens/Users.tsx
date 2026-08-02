import { useState } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { MoreHorizontal, UserCheck, UserX, Eye } from 'lucide-react';
import { adminApi, formatINR } from '../lib/api';
import { useApi } from '../lib/useApi';
import { PageHeader } from '../components/PageHeader';
import { ExportButton } from '../components/ExportButton';
import { DataTable, type Column } from '../components/DataTable';
import { SearchInput, UserCell, fmtDate } from '../components/common';
import { FilterSelect } from '../components/FilterSelect';
import { StatusBadge } from '../components/StatusBadge';
import { Button } from '../components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import type { User } from '../lib/types';

export function Users() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [role, setRole] = useState('all');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);

  const { data, loading, refetch } = useApi(
    () =>
      adminApi.users.list({
        q,
        role: role === 'all' ? undefined : role,
        status: status === 'all' ? undefined : status,
        page,
      }),
    [q, role, status, page],
  );

  const toggleActive = async (u: User) => {
    await adminApi.users.setActive(u.id, !u.isActive);
    toast.success(u.isActive ? `${u.name} deactivated` : `${u.name} reactivated`);
    refetch();
  };

  const columns: Column<User>[] = [
    {
      key: 'user',
      header: 'User',
      cell: (u) => <UserCell name={u.name} sub={u.phone} avatar={u.avatar} />,
    },
    { key: 'email', header: 'Email', cell: (u) => <span className="text-sm text-muted-foreground">{u.email ?? '—'}</span> },
    { key: 'role', header: 'Role', cell: (u) => <StatusBadge status={u.role} /> },
    { key: 'city', header: 'Location', cell: (u) => <span className="text-sm">{u.area ? `${u.area}, ${u.city}` : u.city ?? '—'}</span> },
    { key: 'bookings', header: 'Bookings', cell: (u) => <span className="text-sm">{u.bookingsCount ?? '—'}</span> },
    { key: 'spent', header: 'Spent', cell: (u) => <span className="text-sm font-medium">{u.totalSpentPaise != null ? formatINR(u.totalSpentPaise) : '—'}</span> },
    { key: 'status', header: 'Status', cell: (u) => <StatusBadge status={u.isActive ? 'ACTIVE' : 'INACTIVE'} /> },
    { key: 'joined', header: 'Joined', cell: (u) => <span className="text-sm text-muted-foreground">{fmtDate(u.createdAt)}</span> },
    {
      key: 'actions',
      header: '',
      headerClassName: 'w-10',
      cell: (u) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8" onClick={(e) => e.stopPropagation()}>
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/users/${u.id}`); }}>
              <Eye className="size-4" /> View details
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => { e.stopPropagation(); toggleActive(u); }}
              className={u.isActive ? 'text-destructive focus:text-destructive' : ''}
            >
              {u.isActive ? <><UserX className="size-4" /> Deactivate</> : <><UserCheck className="size-4" /> Reactivate</>}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Users" description="Everyone on the platform — customers and providers" actions={<ExportButton entity="users" />} />
      <DataTable
        columns={columns}
        rows={data?.data ?? []}
        loading={loading}
        rowKey={(u) => u.id}
        onRowClick={(u) => navigate(`/users/${u.id}`)}
        pagination={data?.pagination}
        onPageChange={setPage}
        toolbar={
          <div className="flex flex-col sm:flex-row gap-2">
            <SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search name, phone, email…" className="sm:max-w-xs w-full" />
            <FilterSelect
              value={role}
              onChange={(v) => { setRole(v); setPage(1); }}
              options={[
                { value: 'all', label: 'All roles' },
                { value: 'CUSTOMER', label: 'Customers' },
                { value: 'PROVIDER', label: 'Providers' },
              ]}
            />
            <FilterSelect
              value={status}
              onChange={(v) => { setStatus(v); setPage(1); }}
              options={[
                { value: 'all', label: 'All status' },
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
              ]}
            />
          </div>
        }
      />
    </div>
  );
}
