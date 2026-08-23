import { Search } from 'lucide-react';

/**
 * Form GET thuan, khong can JavaScript: submit dieu huong toi /explore?q=..., trang
 * Explore (Giai doan 2) doc query param nay de tim full-text. Hoat dong ngay ca khi
 * JS chua tai xong hoac bi tat.
 */
export function TopbarSearch() {
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
          id="site-search"
          name="q"
          type="search"
          placeholder="Tìm kiếm bộ thẻ..."
          className="h-11 w-full rounded-md border border-input bg-background pl-10 pr-3 text-sm placeholder:text-muted-foreground"
        />
      </div>
    </form>
  );
}
