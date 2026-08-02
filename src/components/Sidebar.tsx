import { NavLink } from 'react-router';
import {
  LayoutDashboard, Users, Wrench, LayoutGrid, Briefcase, CalendarCheck,
  Gavel, Star, WalletMinimal, TicketPercent, Bell, MessagesSquare, Settings,
  ShieldCheck, BadgeCheck, CreditCard, Gift, LifeBuoy, ScrollText, Banknote, KeyRound,
} from 'lucide-react';
import { cn } from './ui/utils';

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const sections: { title: string; items: NavItem[] }[] = [
  {
    title: 'Overview',
    items: [{ to: '/', label: 'Dashboard', icon: LayoutDashboard }],
  },
  {
    title: 'People',
    items: [
      { to: '/users', label: 'Users', icon: Users },
      { to: '/providers', label: 'Providers', icon: Wrench },
      { to: '/verifications', label: 'Verifications', icon: BadgeCheck },
    ],
  },
  {
    title: 'Catalog',
    items: [
      { to: '/categories', label: 'Categories', icon: LayoutGrid },
      { to: '/services', label: 'Services', icon: Briefcase },
    ],
  },
  {
    title: 'Operations',
    items: [
      { to: '/bookings', label: 'Bookings', icon: CalendarCheck },
      { to: '/tenders', label: 'Tenders & Bids', icon: Gavel },
      { to: '/reviews', label: 'Reviews', icon: Star },
      { to: '/tickets', label: 'Support Tickets', icon: LifeBuoy },
      { to: '/conversations', label: 'Support Chats', icon: MessagesSquare },
    ],
  },
  {
    title: 'Finance & Growth',
    items: [
      { to: '/payments', label: 'Payments', icon: CreditCard },
      { to: '/payouts', label: 'Payouts', icon: Banknote },
      { to: '/wallets', label: 'Wallets', icon: WalletMinimal },
      { to: '/coupons', label: 'Coupons', icon: TicketPercent },
      { to: '/referrals', label: 'Referrals', icon: Gift },
      { to: '/notifications', label: 'Notifications', icon: Bell },
    ],
  },
  {
    title: 'System',
    items: [
      { to: '/audit', label: 'Audit Log', icon: ScrollText },
      { to: '/login-audit', label: 'Login Audit', icon: KeyRound },
      { to: '/settings', label: 'Settings', icon: Settings },
    ],
  },
];

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <aside className="w-64 shrink-0 h-full border-r bg-sidebar flex flex-col">
      <div className="h-16 flex items-center gap-2.5 px-5 border-b">
        <div className="size-9 rounded-xl bg-primary flex items-center justify-center">
          <ShieldCheck className="size-5 text-primary-foreground" />
        </div>
        <div className="leading-tight">
          <div className="font-medium text-sm">JanShram</div>
          <div className="text-xs text-muted-foreground">Admin Console</div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3 scrollbar-hide">
        {sections.map((section) => (
          <div key={section.title} className="mb-5">
            <div className="px-2 mb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
              {section.title}
            </div>
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                      isActive
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'text-foreground/70 hover:bg-accent hover:text-foreground',
                    )
                  }
                >
                  <item.icon className="size-4 shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-3 border-t">
        <div className="rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">
          <div className="font-medium text-foreground mb-0.5">Demo mode</div>
          Data is in-memory and resets on reload.
        </div>
      </div>
    </aside>
  );
}
