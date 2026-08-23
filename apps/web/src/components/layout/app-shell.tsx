import type { ReactNode } from 'react';
import { createClient } from '@/lib/supabase/server';
import { ShellInteractive } from './shell-interactive';
import { SidebarContent } from './sidebar-content';
import { TopbarActions } from './topbar-actions';
import { TopbarSearch } from './topbar-search';

/**
 * Diem vao duy nhat cho khung trang. Day la noi DUY NHAT trong toan bo shell goi
 * Supabase de biet trang thai dang nhap - moi phan con lai (sidebar, topbar) chi nhan
 * ket qua qua prop isLoggedIn, khong tu goi lai.
 */
export async function AppShell({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isLoggedIn = user !== null;

  return (
    <ShellInteractive
      sidebar={<SidebarContent isLoggedIn={isLoggedIn} />}
      searchBar={<TopbarSearch />}
      actions={<TopbarActions isLoggedIn={isLoggedIn} />}
    >
      {children}
    </ShellInteractive>
  );
}
