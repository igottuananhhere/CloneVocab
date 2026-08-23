import type { Metadata } from 'next';
import Link from 'next/link';
import type { MeProfile } from '@flashcard/contracts';
import { Alert } from '@/components/ui/alert';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { apiServer } from '@/lib/api/server';

export const metadata: Metadata = {
  title: 'Bang dieu khien',
  robots: { index: false, follow: false },
};

// Trang phu thuoc vao session nen khong duoc phep prerender tinh.
export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const me = await apiServer<MeProfile>('/profiles/me');
  const displayName = me.displayName ?? me.username;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Chao {displayName}</h1>
          <p className="mt-1 text-muted-foreground">
            Ho so cong khai:{' '}
            <Link href={`/u/${me.username}`} className="text-primary hover:underline">
              /u/{me.username}
            </Link>
          </p>
        </div>
        <Link href="/settings" className={buttonVariants({ variant: 'outline' })}>
          Chinh sua ho so
        </Link>
      </header>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Bo the cua ban</CardTitle>
            <CardDescription>Cac bo the ban da tao</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tabular-nums">0</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">The da thuoc</CardTitle>
            <CardDescription>Tren tong so the dang hoc</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tabular-nums">0</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Can on hom nay</CardTitle>
            <CardDescription>The den han nhac lai</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tabular-nums">0</p>
          </CardContent>
        </Card>
      </div>

      <Alert className="mt-8">
        Cac chi so tren se duoc noi voi du lieu that o giai doan 2 va 3, khi API bo the va
        tien do hoc tap san sang.
      </Alert>
    </div>
  );
}
