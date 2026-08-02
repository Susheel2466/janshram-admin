import { cn } from './ui/utils';

// Central mapping of every domain status string → a tonal pill style.
const STYLES: Record<string, string> = {
  // Booking
  PENDING: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
  CONFIRMED: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
  IN_PROGRESS: 'bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/20',
  COMPLETED: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  CANCELLED: 'bg-destructive/10 text-destructive border-destructive/20',
  // Payment
  PAID: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  FAILED: 'bg-destructive/10 text-destructive border-destructive/20',
  REFUNDED: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20',
  // Tender
  OPEN: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  AWARDED: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
  CLOSED: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20',
  // Bid
  ACCEPTED: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  REJECTED: 'bg-destructive/10 text-destructive border-destructive/20',
  WITHDRAWN: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20',
  // Wallet
  CREDIT: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  DEBIT: 'bg-destructive/10 text-destructive border-destructive/20',
  // Roles
  ADMIN: 'bg-primary/10 text-primary border-primary/20',
  PROVIDER: 'bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/20',
  CUSTOMER: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20',
  // Generic
  ACTIVE: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  INACTIVE: 'bg-destructive/10 text-destructive border-destructive/20',
  // Ticket status
  WAITING: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
  RESOLVED: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  // Ticket priority
  LOW: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20',
  MEDIUM: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
  HIGH: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20',
  URGENT: 'bg-destructive/10 text-destructive border-destructive/20',
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const style = STYLES[status] ?? 'bg-muted text-muted-foreground border-border';
  const label = status.replace(/_/g, ' ');
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize whitespace-nowrap',
        style,
        className,
      )}
    >
      {label.toLowerCase()}
    </span>
  );
}
