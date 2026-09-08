'use client';

import { Layers, Menu } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect, type ReactNode } from 'react';
import { SidebarShell } from './sidebar-shell';

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
  const [desktopOpen, setDesktopOpen] = useState(true);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('vocab_sidebar_open');
      if (saved !== null) {
        setDesktopOpen(saved === 'true');
      }
    } catch {}
  }, []);

  const toggleDesktop = () => {
    setDesktopOpen((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('vocab_sidebar_open', String(next));
      } catch {}
      return next;
    });
  };

  const handleHeaderToggle = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setMobileOpen((prev) => !prev);
    } else {
      toggleDesktop();
    }
  };

  return (
    <div className="flex min-h-dvh">
      <SidebarShell
        mobileOpen={mobileOpen}
        desktopOpen={desktopOpen}
        onCloseMobile={() => setMobileOpen(false)}
        onToggleDesktop={toggleDesktop}
      >
        {sidebar}
      </SidebarShell>

      <div className="flex min-w-0 flex-1 flex-col transition-all duration-200">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur">
          {/* Nut mo sidebar: tren Mobile luon hien; tren Desktop hien khi sidebar dang thu gon */}
          <button
            type="button"
            onClick={handleHeaderToggle}
            className={`inline-flex size-10 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors ${
              desktopOpen ? 'md:hidden' : 'flex'
            }`}
            aria-label="Bật tắt thanh điều hướng"
            title={desktopOpen ? 'Thu gọn thanh bên' : 'Mở thanh bên'}
          >
            <Menu className="size-5" aria-hidden="true" />
          </button>

          {/* Logo tren header khi sidebar desktop dang thu gon */}
          {!desktopOpen && (
            <Link
              href="/"
              className="hidden md:flex items-center gap-2 font-semibold tracking-tight mr-2 hover:opacity-85 transition-opacity"
              aria-label="Về trang chủ Vocab Quiz"
            >
              <Layers className="size-5 text-primary shrink-0" aria-hidden="true" />
              <span className="font-bold">Vocab Quiz</span>
            </Link>
          )}

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
