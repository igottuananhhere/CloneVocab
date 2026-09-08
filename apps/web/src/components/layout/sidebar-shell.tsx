'use client';

import { Layers, Menu } from 'lucide-react';
import Link from 'next/link';
import { useEffect, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function SidebarShell({
  mobileOpen,
  desktopOpen,
  onCloseMobile,
  onToggleDesktop,
  children,
}: {
  mobileOpen: boolean;
  desktopOpen: boolean;
  onCloseMobile: () => void;
  onToggleDesktop: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!mobileOpen) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onCloseMobile();
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mobileOpen, onCloseMobile]);

  const handleToggle = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      onCloseMobile();
    } else {
      onToggleDesktop();
    }
  };

  const handleContainerClick = (e: React.MouseEvent) => {
    if (typeof window !== 'undefined' && window.innerWidth < 768 && (e.target as HTMLElement).closest('a')) {
      onCloseMobile();
    }
  };

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          onClick={onCloseMobile}
          aria-label="Đóng menu điều hướng"
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col border-r border-border bg-card transition-all duration-200 ease-in-out',
          'w-72 md:static md:z-0',
          mobileOpen ? 'translate-x-0 shadow-xl' : '-translate-x-full md:shadow-none',
          'md:translate-x-0',
          desktopOpen
            ? 'md:w-64 md:opacity-100 md:visible'
            : 'md:w-0 md:opacity-0 md:invisible md:border-r-0 md:overflow-hidden',
        )}
      >
        <div className="flex h-16 items-center justify-between px-4 border-b border-border/50 min-w-64 shrink-0">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-md py-1.5 text-lg font-semibold tracking-tight hover:opacity-85 transition-opacity"
            aria-label="Về trang chủ Vocab Quiz"
          >
            <Layers className="size-6 text-primary shrink-0" aria-hidden="true" />
            <span className="truncate">Vocab Quiz</span>
          </Link>
          <button
            type="button"
            onClick={handleToggle}
            className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label="Bật tắt thanh bên"
            title="Thu gọn thanh bên"
          >
            <Menu className="size-5" aria-hidden="true" />
          </button>
        </div>

        <div
          onClick={handleContainerClick}
          className="flex-1 overflow-y-auto min-w-64"
        >
          {children}
        </div>
      </aside>
    </>
  );
}
