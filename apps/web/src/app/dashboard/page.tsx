import type { Metadata } from 'next';
import Link from 'next/link';
import { Bookmark, FolderOpen, Plus, Compass } from 'lucide-react';
import type { MeProfile, StudySetSummary, StudyStats } from '@flashcard/contracts';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StudySetCard } from '@/components/sets/study-set-card';
import { apiServer } from '@/lib/api/server';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Bảng điều khiển',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

type PageProps = {
  searchParams: Promise<{ tab?: string }>;
};

export default async function DashboardPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const activeTab = params.tab === 'saved' ? 'saved' : 'mine';

  const [me, sets, savedSets, stats] = await Promise.all([
    apiServer<MeProfile>('/profiles/me'),
    apiServer<StudySetSummary[]>('/study-sets/mine'),
    apiServer<StudySetSummary[]>('/study-sets/saved'),
    apiServer<StudyStats>('/study/stats'),
  ]);

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

      {/* Thống kê tiến độ học */}
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

      {/* Tabs chuyển đổi giữa "Bộ thẻ của bạn" và "Đã lưu" */}
      <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard?tab=mine"
            className={cn(
              'inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors',
              activeTab === 'mine'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            <FolderOpen className="size-4" aria-hidden="true" />
            <span>Bộ thẻ của bạn</span>
            <span
              className={cn(
                'ml-1 rounded-full px-2 py-0.5 text-xs',
                activeTab === 'mine'
                  ? 'bg-primary-foreground/20 text-primary-foreground'
                  : 'bg-muted text-muted-foreground',
              )}
            >
              {sets.length}
            </span>
          </Link>

          <Link
            href="/dashboard?tab=saved"
            className={cn(
              'inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors',
              activeTab === 'saved'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            <Bookmark className="size-4" aria-hidden="true" />
            <span>Đã lưu</span>
            <span
              className={cn(
                'ml-1 rounded-full px-2 py-0.5 text-xs',
                activeTab === 'saved'
                  ? 'bg-primary-foreground/20 text-primary-foreground'
                  : 'bg-muted text-muted-foreground',
              )}
            >
              {savedSets.length}
            </span>
          </Link>
        </div>

        {activeTab === 'mine' ? (
          <Link href="/sets/create" className={cn(buttonVariants({ size: 'sm' }), 'gap-1.5')}>
            <Plus className="size-4" aria-hidden="true" />
            <span>Tạo bộ thẻ</span>
          </Link>
        ) : (
          <Link
            href="/explore"
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1.5')}
          >
            <Compass className="size-4" aria-hidden="true" />
            <span>Khám phá thêm</span>
          </Link>
        )}
      </div>

      {/* Nội dung Tab */}
      {activeTab === 'mine' ? (
        // Tab Bộ thẻ của bạn
        sets.length === 0 ? (
          <Card className="mt-6 border-dashed">
            <CardContent className="py-14 text-center">
              <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted">
                <FolderOpen className="size-6 text-muted-foreground" aria-hidden="true" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">Chưa có bộ thẻ nào</h3>
              <p className="mt-1 text-sm text-muted-foreground max-w-sm mx-auto">
                Tạo bộ thẻ đầu tiên của bạn để bắt đầu học tập và ghi nhớ hiệu quả hơn.
              </p>
              <Link
                href="/sets/create"
                className={cn(buttonVariants({ size: 'sm' }), 'mt-6 gap-1.5')}
              >
                <Plus className="size-4" aria-hidden="true" />
                <span>Tạo bộ thẻ</span>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sets.map((set) => (
              <li key={set.id}>
                <StudySetCard set={set} />
              </li>
            ))}
          </ul>
        )
      ) : (
        // Tab Bộ thẻ đã lưu
        savedSets.length === 0 ? (
          <Card className="mt-6 border-dashed">
            <CardContent className="py-14 text-center">
              <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted">
                <Bookmark className="size-6 text-muted-foreground" aria-hidden="true" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">Chưa lưu bộ thẻ nào</h3>
              <p className="mt-1 text-sm text-muted-foreground max-w-sm mx-auto">
                Khi tìm thấy các bộ thẻ hữu ích của người khác, bạn có thể bấm &quot;Lưu bộ thẻ&quot; để dễ
                dàng ôn tập lại tại đây.
              </p>
              <Link
                href="/explore"
                className={cn(buttonVariants({ size: 'sm' }), 'mt-6 gap-1.5')}
              >
                <Compass className="size-4" aria-hidden="true" />
                <span>Khám phá bộ thẻ</span>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {savedSets.map((set) => (
              <li key={set.id}>
                <StudySetCard set={set} />
              </li>
            ))}
          </ul>
        )
      )}
    </div>
  );
}
