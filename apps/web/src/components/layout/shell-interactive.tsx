'use client';

import { Menu } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { SidebarShell } from './sidebar-shell';

/**
 * Chu cua trang thai "sidebar dang mo tren mobile" - noi duy nhat giu state nay, vi
 * nut mo (topbar) va khung sidebar (aside) nam o hai vi tri DOM khac nhau nhung phai
 * dung chung mot trang thai. sidebar/searchBar/actions duoc render san o Server
 * Component cha (AppShell) va truyen vao day nhu noi dung tinh.
 */
export function ShellInteractive({
  sidebar,
  searchBar,
  actions,
  children,
}: {
  sidebar: ReactNode;
  searchBar: ReactNode;
  actions: ReactNode;
  children: ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-dvh">
      <SidebarShell open={mobileOpen} onClose={() => setMobileOpen(false)}>
        {sidebar}
      </SidebarShell>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="inline-flex size-11 items-center justify-center rounded-md hover:bg-muted md:hidden"
            aria-label="Mở menu điều hướng"
            aria-expanded={mobileOpen}
          >
            <Menu aria-hidden="true" />
          </button>

          {searchBar}
          {actions}
        </header>

        <main id="main" className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
