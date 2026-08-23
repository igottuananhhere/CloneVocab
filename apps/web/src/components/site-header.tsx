import Link from 'next/link';
import { Layers } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Button, buttonVariants } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';

/**
 * Server Component: trang thai dang nhap duoc quyet dinh o server nen thanh dieu huong
 * hien dung ngay o lan ve dau tien, khong nhap nhay giua "Dang nhap" va ten nguoi dung.
 */
export async function SiteHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
        <Link
          href="/"
          className="flex items-center gap-2 text-lg font-semibold tracking-tight"
          aria-label="Ve trang chu Thebai"
        >
          <Layers className="text-primary" aria-hidden="true" />
          <span>Thebai</span>
        </Link>

        <nav className="ml-4 hidden items-center gap-1 sm:flex" aria-label="Dieu huong chinh">
          <Link
            href="/explore"
            className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            Kham pha
          </Link>
          {user && (
            <Link
              href="/dashboard"
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              Bang dieu khien
            </Link>
          )}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />

          {user ? (
            <>
              <Link
                href="/settings"
                className={buttonVariants({ variant: 'ghost', size: 'sm', className: 'hidden sm:inline-flex' })}
              >
                Cai dat
              </Link>
              <form action="/auth/signout" method="post">
                <Button type="submit" variant="outline" size="sm">
                  Dang xuat
                </Button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
                Dang nhap
              </Link>
              <Link href="/register" className={buttonVariants({ size: 'sm' })}>
                Dang ky
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
