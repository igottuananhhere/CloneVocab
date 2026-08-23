import type { Metadata } from 'next';
import Link from 'next/link';
import type { MeProfile } from '@flashcard/contracts';
import { Alert } from '@/components/ui/alert';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { apiServer } from '@/lib/api/server';

export const metadata: Metadata = {
  title: 'Bảng điều khiển',
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
          <h1 className="text-3xl font-bold tracking-tight">Chào {displayName}</h1>
          <p className="mt-1 text-muted-foreground">
            Hồ sơ công khai:{' '}
            <Link href={`/u/${me.username}`} className="text-primary hover:underline">
              /u/{me.username}
            </Link>
          </p>
        </div>
        <Link href="/settings" className={buttonVariants({ variant: 'outline' })}>
          Chỉnh sửa hồ sơ
        </Link>
      </header>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Bộ thẻ của bạn</CardTitle>
            <CardDescription>Các bộ thẻ bạn đã tạo</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tabular-nums">0</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Thẻ đã thuộc</CardTitle>
            <CardDescription>Trên tổng số thẻ đang học</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tabular-nums">0</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cần ôn hôm nay</CardTitle>
            <CardDescription>Thẻ đến hạn nhắc lại</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tabular-nums">0</p>
          </CardContent>
        </Card>
      </div>

      <Alert className="mt-8">
        Các chỉ số trên sẽ được nối với dữ liệu thật ở giai đoạn 2 và 3, khi API bộ thẻ và
        tiến độ học tập sẵn sàng.
      </Alert>
    </div>
  );
}
