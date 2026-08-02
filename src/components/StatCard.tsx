import { ReactNode } from 'react';
import { cn } from './ui/utils';
import { Card } from './ui/card';

export function StatCard({
  label,
  value,
  icon,
  hint,
  trend,
  accent = 'primary',
}: {
  label: string;
  value: ReactNode;
  icon: ReactNode;
  hint?: string;
  trend?: { value: string; positive: boolean };
  accent?: 'primary' | 'green' | 'amber' | 'red' | 'violet';
}) {
  const accentMap: Record<string, string> = {
    primary: 'bg-primary/10 text-primary',
    green: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    red: 'bg-destructive/10 text-destructive',
    violet: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  };

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold mt-1.5 tracking-tight truncate">{value}</p>
          {(hint || trend) && (
            <div className="flex items-center gap-2 mt-1.5 text-xs">
              {trend && (
                <span className={cn('font-medium', trend.positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive')}>
                  {trend.positive ? '▲' : '▼'} {trend.value}
                </span>
              )}
              {hint && <span className="text-muted-foreground">{hint}</span>}
            </div>
          )}
        </div>
        <div className={cn('size-10 rounded-xl flex items-center justify-center shrink-0', accentMap[accent])}>
          {icon}
        </div>
      </div>
    </Card>
  );
}
