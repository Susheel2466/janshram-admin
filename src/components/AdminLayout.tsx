import { useState } from 'react';
import { Outlet } from 'react-router';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { cn } from './ui/utils';

export function AdminLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="h-screen flex bg-muted/30 overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <div className={cn('absolute left-0 top-0 h-full')}>
            <Sidebar onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <Topbar onMenu={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto">
          {/* min-h-full, not h-full.
              A workspace page (tickets, chats) wants to fill the scroll area and
              scroll its own panes, so this has to be at least as tall as `main`
              — hence the min. But it must never be CAPPED at that: on a short
              window the ticket workspace has a floor of its own, and pinning
              this box to the viewport made the part below the fold unreachable,
              because a fixed-height box's overflow is not what `main` scrolls to.
              As a flex column, the page inside can flex-1 to fill when there is
              room and push this box taller when there isn't. */}
          <div className="max-w-[1400px] mx-auto p-4 md:p-6 lg:p-8 min-h-full flex flex-col">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
