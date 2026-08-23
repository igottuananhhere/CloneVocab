import Link from 'next/link';
import { Folder, FolderPlus, Layers } from 'lucide-react';
import { getPrimaryNavItems, PLACEHOLDER_FOLDERS } from './nav-data';
import { NavLink } from './nav-link';

/**
 * Noi dung tinh cua sidebar. La Server Component thuan - khong co state, khong can
 * 'use client'. SidebarShell (client) chi lo hien/an no tren mobile.
 */
export function SidebarContent({ isLoggedIn }: { isLoggedIn: boolean }) {
  const navItems = getPrimaryNavItems(isLoggedIn);

  return (
    <div className="flex h-full flex-col gap-1 p-3">
      <Link
        href="/"
        className="flex items-center gap-2 rounded-md px-3 py-2 text-lg font-semibold tracking-tight"
        aria-label="Về trang chủ Vocab Quiz"
      >
        <Layers className="text-primary" aria-hidden="true" />
        <span>Vocab Quiz</span>
      </Link>

      <nav aria-label="Điều hướng chính" className="mt-2 flex flex-col gap-1">
        {navItems.map((item) => (
          <NavLink
            key={item.href}
            href={item.href}
            label={item.label}
            icon={<item.icon className="size-5 shrink-0" aria-hidden="true" />}
          />
        ))}
      </nav>

      {isLoggedIn && (
        <div className="mt-6 flex flex-1 flex-col">
          <div className="flex items-center justify-between px-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Thư mục của bạn
            </span>
            <button
              type="button"
              disabled
              title="Sẽ hoạt động khi backend Giai đoạn 2 hoàn thành"
              className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground opacity-50"
            >
              <FolderPlus className="size-4" aria-hidden="true" />
              <span className="sr-only">Tạo thư mục</span>
            </button>
          </div>

          <ul className="mt-1 flex flex-col gap-0.5">
            {PLACEHOLDER_FOLDERS.map((name) => (
              <li
                key={name}
                title="Dữ liệu minh họa - sẽ thay bằng thư mục thật ở Giai đoạn 2"
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground/70"
              >
                <Folder className="size-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{name}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
