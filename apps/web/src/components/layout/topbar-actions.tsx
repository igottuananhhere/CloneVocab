'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

/**
 * Phần bên phải của topbar. Tự động đồng bộ trạng thái đăng nhập
 * cả từ Server Component (qua prop isLoggedIn) lẫn Client (qua Supabase onAuthStateChange).
 */
export function TopbarActions({ isLoggedIn: initialLoggedIn }: { isLoggedIn: boolean }) {
  const [loggedIn, setLoggedIn] = useState(initialLoggedIn);
  const [userInitial, setUserInitial] = useState<string>('U');

  useEffect(() => {
    setLoggedIn(initialLoggedIn);
  }, [initialLoggedIn]);

  useEffect(() => {
    const supabase = createClient();

    // Kiểm tra session hiện tại
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setLoggedIn(true);
        const email = session.user.email ?? '';
        const name =
          (session.user.user_metadata?.display_name ||
            session.user.user_metadata?.username ||
            email) as string;
        if (name && name.length > 0) {
          setUserInitial(name[0]!.toUpperCase());
        }
      }
    });

    // Lắng nghe thay đổi trạng thái đăng nhập tức thì
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setLoggedIn(Boolean(session?.user));
      if (session?.user) {
        const email = session.user.email ?? '';
        const name =
          (session.user.user_metadata?.display_name ||
            session.user.user_metadata?.username ||
            email) as string;
        if (name && name.length > 0) {
          setUserInitial(name[0]!.toUpperCase());
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <div className="flex items-center gap-2">
      <ThemeToggle />

      {loggedIn ? (
        <>
          <Link
            href="/sets/create"
            className={cn(buttonVariants({ size: 'sm' }), 'hidden sm:inline-flex')}
          >
            <Plus className="size-4" aria-hidden="true" />
            Tạo bộ thẻ
          </Link>
          <Link
            href="/settings"
            className="inline-flex size-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
            aria-label="Cài đặt tài khoản"
            title="Cài đặt tài khoản"
          >
            <span aria-hidden="true">{userInitial}</span>
          </Link>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className={cn(
                buttonVariants({ variant: 'outline', size: 'sm' }),
                'hidden sm:inline-flex',
              )}
            >
              Đăng xuất
            </button>
          </form>
        </>
      ) : (
        <>
          <Link href="/login" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
            Đăng nhập
          </Link>
          <Link href="/register" className={buttonVariants({ size: 'sm' })}>
            Đăng ký
          </Link>
        </>
      )}
    </div>
  );
}
