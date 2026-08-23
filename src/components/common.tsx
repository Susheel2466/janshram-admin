import { ReactNode } from 'react';
import { Search } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from './ui/input';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { cn } from './ui/utils';
import { ratingColor, ratingLabel } from '../lib/ratingColor';

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

// Indian mobiles are stored as bare 10 digits; a `tel:` link needs the country
// code to reach the OS dialler (or Skype/FaceTime/a softphone on desktop).
export function toDialable(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const trimmed = phone.trim();
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length < 10) return null;
  if (trimmed.startsWith('+')) return `+${digits}`;
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 11 && digits.startsWith('0')) return `+91${digits.slice(1)}`;
  return `+${digits}`;
}

/**
 * A phone number rendered as a click-to-call link. Falls back to plain text
 * when the number is missing or too short to dial.
 *
 * The console is used on desktop, where `tel:` only works if something is
 * registered for it — so the click also copies the number, leaving the admin
 * able to dial by hand instead of wondering why nothing happened.
 */
export function PhoneLink({ phone, className }: { phone: string | null | undefined; className?: string }) {
  const dialable = toDialable(phone);
  if (!phone) return <span className={className}>—</span>;
  if (!dialable) return <span className={className}>{phone}</span>;
  return (
    <a
      href={`tel:${dialable}`}
      onClick={(e) => {
        e.stopPropagation(); // don't trigger the surrounding row link
        navigator.clipboard?.writeText(dialable).catch(() => {});
        toast.info(`${dialable} copied — opening your calling app`);
      }}
      className={cn('hover:text-foreground hover:underline underline-offset-2', className)}
      title={`Call ${dialable}`}
    >
      {phone}
    </a>
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
  // A rating with no reviews behind it is a new provider, not a bad one —
  // colouring 0.0 red would accuse them of something they haven't done.
  if (!rating || rating <= 0) {
    return <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">★ —</span>;
  }
  // Red at 1, green at 5: a 2.1 and a 4.8 should not look alike in a table
  // that is scanned rather than read.
  const color = ratingColor(rating);
  return (
    <span className="inline-flex items-center gap-1 text-sm" title={`${rating.toFixed(1)} — ${ratingLabel(rating)}`}>
      <span style={{ color }}>★</span>
      <span className="font-medium" style={{ color }}>{rating.toFixed(1)}</span>
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
