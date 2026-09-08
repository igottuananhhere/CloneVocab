import type { FolderSummary } from '@flashcard/contracts';
import { getPrimaryNavItems } from './nav-data';
import { NavLink } from './nav-link';
import { SidebarFolders } from './sidebar-folders';
import { apiServer } from '@/lib/api/server';

/**
 * Noi dung tinh cua sidebar. La Server Component thuan - khong co state, khong can
 * 'use client'. SidebarShell (client) chi lo hien/an no tren mobile.
 */
export async function SidebarContent({ isLoggedIn }: { isLoggedIn: boolean }) {
  const navItems = getPrimaryNavItems(isLoggedIn);
  let folders: FolderSummary[] = [];

  if (isLoggedIn) {
    try {
      folders = await apiServer<FolderSummary[]>('/folders/mine');
    } catch {
      folders = [];
    }
  }

  return (
    <div className="flex h-full flex-col gap-1 p-3">
      <nav aria-label="Điều hướng chính" className="flex flex-col gap-1">
        {navItems.map((item) => (
          <NavLink
            key={item.href}
            href={item.href}
            label={item.label}
            icon={<item.icon className="size-5 shrink-0" aria-hidden="true" />}
          />
        ))}
      </nav>

      {isLoggedIn && <SidebarFolders initialFolders={folders} />}
    </div>
  );
}
