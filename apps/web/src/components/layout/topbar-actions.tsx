'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import {
  Plus,
  LayoutDashboard,
  Folder,
  Settings,
  LogOut,
  ChevronDown,
} from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

interface UserInfo {
  name: string;
  email: string;
  initial: string;
}

/**
 * Phần bên phải của topbar. Tự động đồng bộ trạng thái đăng nhập
 * cả từ Server Component (qua prop isLoggedIn) lẫn Client (qua Supabase onAuthStateChange).
 */
export function TopbarActions({ isLoggedIn: initialLoggedIn }: { isLoggedIn: boolean }) {
  const [loggedIn, setLoggedIn] = useState(initialLoggedIn);
  const [userInfo, setUserInfo] = useState<UserInfo>({
    name: 'Người dùng',
    email: '',
    initial: 'U',
  });
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoggedIn(initialLoggedIn);
  }, [initialLoggedIn]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  useEffect(() => {
    const supabase = createClient();

    function updateUserData(user: { email?: string; user_metadata?: Record<string, unknown> } | null) {
      if (!user) return;
      const email = user.email ?? '';
      const name = (user.user_metadata?.display_name ||
        user.user_metadata?.username ||
        email.split('@')[0] ||
        'Người dùng') as string;
      const initial = name.length > 0 ? name[0]!.toUpperCase() : 'U';
      setUserInfo({ name, email, initial });
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setLoggedIn(true);
        updateUserData(session.user);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setLoggedIn(Boolean(session?.user));
      if (session?.user) {
        updateUserData(session.user);
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
            className={cn(
              buttonVariants({ size: 'sm' }),
              'hidden sm:inline-flex rounded-xl font-medium shadow-xs gap-1.5'
            )}
          >
            <Plus className="size-4" aria-hidden="true" />
            <span>Tạo bộ thẻ</span>
          </Link>

          {/* User Avatar & Dropdown Menu */}
          <div ref={menuRef} className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              className="flex items-center gap-1.5 rounded-full p-0.5 border border-border/70 hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
              aria-label="Menu tài khoản"
              aria-expanded={menuOpen}
            >
              <div className="flex size-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground shadow-xs">
                {userInfo.initial}
              </div>
              <ChevronDown className="size-3 text-muted-foreground mr-1 hidden sm:block" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full mt-2 z-50 w-56 rounded-2xl border border-border bg-card p-1.5 shadow-xl animate-in fade-in zoom-in-95">
                {/* Header người dùng */}
                <div className="px-3 py-2 border-b border-border/50">
                  <p className="text-xs font-bold text-foreground truncate">
                    {userInfo.name}
                  </p>
                  {userInfo.email && (
                    <p className="text-[11px] text-muted-foreground truncate font-mono mt-0.5">
                      {userInfo.email}
                    </p>
                  )}
                </div>

                {/* Các liên kết điều hướng */}
                <div className="py-1 space-y-0.5">
                  <Link
                    href="/dashboard"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-foreground hover:bg-accent/60 transition-colors"
                  >
                    <LayoutDashboard className="size-4 text-primary" />
                    <span>Bảng điều khiển</span>
                  </Link>
                  <Link
                    href="/sets/create"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-foreground hover:bg-accent/60 transition-colors"
                  >
                    <Plus className="size-4 text-primary" />
                    <span>Tạo bộ thẻ mới</span>
                  </Link>
                  <Link
                    href="/folders"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-foreground hover:bg-accent/60 transition-colors"
                  >
                    <Folder className="size-4 text-primary" />
                    <span>Thư mục của tôi</span>
                  </Link>
                  <Link
                    href="/settings"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-foreground hover:bg-accent/60 transition-colors"
                  >
                    <Settings className="size-4 text-primary" />
                    <span>Cài đặt tài khoản</span>
                  </Link>
                </div>

                {/* Nút đăng xuất */}
                <div className="pt-1 border-t border-border/50">
                  <form action="/auth/signout" method="post">
                    <button
                      type="submit"
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                    >
                      <LogOut className="size-4" />
                      <span>Đăng xuất</span>
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          <Link
            href="/login"
            className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'rounded-xl')}
          >
            Đăng nhập
          </Link>
          <Link
            href="/register"
            className={cn(buttonVariants({ size: 'sm' }), 'rounded-xl font-medium shadow-xs')}
          >
            Đăng ký
          </Link>
        </>
      )}
    </div>
  );
}
