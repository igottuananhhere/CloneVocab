import type { Metadata } from 'next';
import Link from 'next/link';
import type { MeProfile, StudySetSummary, StudyStats } from '@flashcard/contracts';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StudySetCard } from '@/components/sets/study-set-card';
import { apiServer } from '@/lib/api/server';

export const metadata: Metadata = {
  title: 'Bảng điều khiển',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const me = await apiServer<MeProfile>('/profiles/me');
  const sets = await apiServer<StudySetSummary[]>('/study-sets/mine');
  const stats = await apiServer<StudyStats>('/study/stats');
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

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Thẻ đã học</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tabular-nums">{stats.studiedCards}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Đã thuộc</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tabular-nums">{stats.masteredCards}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cần ôn hôm nay</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tabular-nums">{stats.dueToday}</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold tracking-tight">
          Bộ thẻ của bạn
          <span className="ml-2 text-base font-normal text-muted-foreground">{sets.length}</span>
        </h2>
        <Link href="/sets/create" className={buttonVariants({ size: 'sm' })}>
          + Tạo bộ thẻ
        </Link>
      </div>

      {sets.length === 0 ? (
        <Card className="mt-4">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              Bạn chưa có bộ thẻ nào. Tạo bộ thẻ đầu tiên để bắt đầu học.
            </p>
            <Link
              href="/sets/create"
              className={buttonVariants({ size: 'sm', className: 'mt-4' })}
            >
              + Tạo bộ thẻ
            </Link>
          </CardContent>
        </Card>
      ) : (
        <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sets.map((set) => (
            <li key={set.id}>
              <StudySetCard set={set} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
