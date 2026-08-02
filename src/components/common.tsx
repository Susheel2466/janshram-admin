import { ReactNode } from 'react';
import { Search } from 'lucide-react';
import { Input } from './ui/input';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { cn } from './ui/utils';

export function SearchInput({
  value,
  onChange,
  placeholder = 'Search…',
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={cn('relative', className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pl-9 bg-background"
      />
    </div>
  );
}

function initials(name: string | null | undefined) {
  return (name ?? '?')
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function UserCell({
  name,
  sub,
  avatar,
}: {
  name: string | null | undefined;
  sub?: ReactNode;
  avatar?: string | null;
}) {
  return (
    <div className="flex items-center gap-3 min-w-0">
      <Avatar className="size-9 shrink-0">
        {avatar && <AvatarImage src={avatar} alt={name ?? ''} />}
        <AvatarFallback className="bg-muted text-xs font-medium">{initials(name)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <div className="font-medium text-sm truncate">{name ?? 'Unknown'}</div>
        {sub && <div className="text-xs text-muted-foreground truncate">{sub}</div>}
      </div>
    </div>
  );
}

export function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-1 text-sm">
      <span className="text-amber-500">★</span>
      <span className="font-medium">{rating.toFixed(1)}</span>
    </span>
  );
}

export function fmtDate(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function fmtDateTime(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}
