import Link from 'next/link';
import { Plus } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { cn } from '@/lib/utils';

/**
 * Phan ben phai cua topbar. Server Component - noi dung chi phu thuoc user co dang
 * nhap hay khong, khong can tuong tac client nao rieng (ThemeToggle tu quan ly phan
 * client cua no).
 */
export function TopbarActions({ isLoggedIn }: { isLoggedIn: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <ThemeToggle />

      {isLoggedIn ? (
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
            className="inline-flex size-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground"
            aria-label="Cài đặt tài khoản"
          >
            <AvatarInitial />
          </Link>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'hidden sm:inline-flex')}
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

/**
 * Placeholder don gian cho avatar - chi mot chu cai. Anh dai dien that
 * (Profile.avatarUrl) se thay vao day khi trang settings cho upload anh dai dien.
 */
function AvatarInitial() {
  return <span aria-hidden="true">T</span>;
}
