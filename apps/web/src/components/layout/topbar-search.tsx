'use client';

import { useEffect, useRef } from 'react';
import { Search } from 'lucide-react';

/**
 * Thanh tìm kiếm đầu trang hỗ trợ phím tắt Ctrl + K / Cmd + K,
 * submit form điều hướng tới /explore?q=...
 */
export function TopbarSearch() {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <form action="/explore" method="get" role="search" className="min-w-0 flex-1">
      <label htmlFor="site-search" className="sr-only">
        Tìm kiếm bộ thẻ
      </label>
      <div className="relative max-w-md">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <input
          ref={inputRef}
          id="site-search"
          name="q"
          type="search"
          placeholder="Tìm kiếm bộ thẻ, từ vựng..."
          className="h-10 w-full rounded-xl border border-border/80 bg-background/80 pl-9 pr-14 text-sm placeholder:text-muted-foreground/70 shadow-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
        />
        <kbd
          aria-hidden="true"
          className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center gap-0.5 rounded-md border border-border/70 bg-muted/60 px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground select-none"
        >
          Ctrl K
        </kbd>
      </div>
    </form>
  );
}

