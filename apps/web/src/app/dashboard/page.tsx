import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Bookmark,
  Compass,
  Flame,
  Folder,
  FolderOpen,
  Layers,
  Plus,
  TrendingUp,
} from 'lucide-react';
import type { FolderSummary, MeProfile, StudySetSummary, StudyStats } from '@flashcard/contracts';
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

  let me: MeProfile | null = null;
  let sets: StudySetSummary[] = [];
  let savedSets: StudySetSummary[] = [];
  let folders: FolderSummary[] = [];
  let stats: StudyStats = {
    studiedCards: 0,
    masteredCards: 0,
    dueToday: 0,
    testCount: 0,
    matchBestMs: null,
    wordsStudiedToday: 0,
    wordsStudiedThisWeek: 0,
    totalSetsAdded: 0,
  };
  let connectionError: string | null = null;

  try {
    const [fetchedMe, fetchedSets, fetchedSavedSets, fetchedStats, fetchedFolders] =
      await Promise.all([
        apiServer<MeProfile>('/profiles/me'),
        apiServer<StudySetSummary[]>('/study-sets/mine'),
        apiServer<StudySetSummary[]>('/study-sets/saved'),
        apiServer<StudyStats>('/study/stats'),
        apiServer<FolderSummary[]>('/folders/mine').catch(() => []),
      ]);
    me = fetchedMe;
    sets = fetchedSets;
    savedSets = fetchedSavedSets;
    stats = fetchedStats;
    folders = fetchedFolders;
  } catch (error) {
    connectionError =
      error instanceof Error ? error.message : 'Không kết nối được tới máy chủ Backend API.';
  }

  if (connectionError || !me) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <div className="space-y-4 rounded-xl border border-destructive/30 bg-destructive/5 p-8">
          <h2 className="text-xl font-bold text-destructive">
            Chưa kết nối được với máy chủ Backend API
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Bạn đã đăng nhập thành công vào tài khoản Supabase! Tuy nhiên, trang Bảng điều khiển
            cần lấy dữ liệu hồ sơ và bộ thẻ từ <strong>Backend API (NestJS)</strong>.
          </p>
          <div className="rounded-md bg-muted p-3 font-mono text-xs">
            Địa chỉ API đang trỏ tới:{' '}
            <span className="font-semibold text-foreground">
              {process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}
            </span>
          </div>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Hướng dẫn khắc phục:</p>
            <ul className="list-inside list-disc space-y-1">
              <li>
                <strong>Nếu đang test trên máy (Local):</strong> Mở terminal và chạy lệnh{' '}
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">pnpm dev</code>,
                sau đó truy cập{' '}
                <a href="http://localhost:3000" className="text-primary hover:underline">
                  http://localhost:3000
                </a>
                .
              </li>
              <li>
                <strong>Nếu đang dùng trên Netlify (Production):</strong> Cần deploy{' '}
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">apps/api</code>{' '}
                lên dịch vụ hosting (Render hoặc Railway) và cấu hình biến{' '}
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                  NEXT_PUBLIC_API_URL
                </code>{' '}
                trên Netlify.
              </li>
            </ul>
          </div>
          <div className="pt-2">
            <Link href="/" className={buttonVariants({ variant: 'outline' })}>
              ← Về trang chủ
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const displayName = me.displayName ?? me.username;

  // Danh sách các mục gần đây (Recents)
  const recentItems = [
    ...sets.map((s) => ({
      key: `set-${s.id}`,
      id: s.id,
      title: s.title,
      subtitle: `${s.cardCount} thẻ · by you`,
      href: `/sets/${s.id}`,
      icon: Layers,
    })),
    ...savedSets.map((s) => ({
      key: `saved-${s.id}`,
      id: s.id,
      title: s.title,
      subtitle: `${s.cardCount} thẻ · by ${s.owner.displayName ?? s.owner.username}`,
      href: `/sets/${s.id}`,
      icon: Layers,
    })),
    ...folders.map((f) => ({
      key: `folder-${f.id}`,
      id: f.id,
      title: f.name,
      subtitle: `${f.setCount} bộ thẻ · Thư mục`,
      href: `/folders/${f.id}`,
      icon: Folder,
    })),
  ];

  // Các bộ thẻ để hiển thị trong "Tiếp tục học" (Jump back in)
  const jumpBackInSets = [...sets, ...savedSets].slice(0, 2);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 space-y-10">
      {/* Header chào người dùng */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Chào {displayName} 👋</h1>
          <p className="mt-1 text-muted-foreground text-sm">
            Hồ sơ công khai:{' '}
            <Link href={`/u/${me.username}`} className="text-primary hover:underline">
              /u/{me.username}
            </Link>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/sets/create" className={buttonVariants({ size: 'sm' })}>
            <Plus className="size-4 mr-1.5" />
            Tạo bộ thẻ
          </Link>
          <Link href="/settings" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
            Chỉnh sửa hồ sơ
          </Link>
        </div>
      </header>

      {/* 1. KHỐI 3 THỐNG KÊ TIẾN ĐỘ TRỌNG TÂM */}
      <section aria-label="Thống kê học tập">
        <div className="grid gap-4 sm:grid-cols-3">
          {/* A. Từ vựng hôm nay */}
          <Card className="border-border/60 bg-gradient-to-br from-card to-card/60 shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Từ vựng hôm nay
              </CardTitle>
              <div className="flex size-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
                <Flame className="size-4.5" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tracking-tight">
                {stats.wordsStudiedToday ?? 0}
                <span className="text-sm font-normal text-muted-foreground ml-1.5">từ</span>
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                Số từ vựng bạn đã ôn tập trong ngày hôm nay
              </p>
            </CardContent>
          </Card>

          {/* B. Từ vựng trong tuần */}
          <Card className="border-border/60 bg-gradient-to-br from-card to-card/60 shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Từ vựng tuần này
              </CardTitle>
              <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
                <TrendingUp className="size-4.5" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tracking-tight">
                {stats.wordsStudiedThisWeek ?? 0}
                <span className="text-sm font-normal text-muted-foreground ml-1.5">từ</span>
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                Tổng số từ bạn đã học trong 7 ngày qua
              </p>
            </CardContent>
          </Card>

          {/* C. Học phần đã thêm */}
          <Card className="border-border/60 bg-gradient-to-br from-card to-card/60 shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Học phần đã thêm
              </CardTitle>
              <div className="flex size-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500">
                <Layers className="size-4.5" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tracking-tight">
                {stats.totalSetsAdded || (sets.length + savedSets.length)}
                <span className="text-sm font-normal text-muted-foreground ml-1.5">học phần</span>
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                Gồm {sets.length} bộ tự tạo · {savedSets.length} bộ đã lưu
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* 2. KHỐI TIẾP TỤC HỌC (JUMP BACK IN - CHUẨN QUIZLET) */}
      {jumpBackInSets.length > 0 && (
        <section aria-labelledby="jump-back-in-heading" className="space-y-4">
          <h2 id="jump-back-in-heading" className="text-xl font-bold tracking-tight">
            Tiếp tục học
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {jumpBackInSets.map((set) => (
              <div
                key={set.id}
                className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-[#384166] bg-[#252c48] p-6 text-white shadow-lg transition-all hover:border-primary/50"
              >
                <div>
                  <h3 className="text-lg font-bold tracking-wide uppercase line-clamp-1">
                    {set.title}
                  </h3>
                  <div className="mt-3 flex items-center justify-between text-xs text-white/70">
                    <span>{set.cardCount} thẻ</span>
                    <span>
                      {set.owner.id === me?.id
                        ? 'Tạo bởi bạn'
                        : `Tác giả: ${set.owner.displayName ?? set.owner.username}`}
                    </span>
                  </div>
                  {/* Thanh tiến độ học Quizlet */}
                  <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-black/30">
                    <div
                      className="h-full bg-emerald-400 rounded-full transition-all duration-300"
                      style={{
                        width: set.cardCount > 0 ? '100%' : '10%',
                      }}
                    />
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-between">
                  <Link
                    href={`/sets/${set.id}/cards`}
                    className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow transition hover:bg-primary/90"
                  >
                    Tiếp tục học
                  </Link>
                  <Link
                    href={`/sets/${set.id}`}
                    className="text-xs text-white/70 hover:text-white hover:underline"
                  >
                    Xem chi tiết →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 3. KHỐI GẦN ĐÂY (RECENTS - CHUẨN QUIZLET) */}
      {recentItems.length > 0 && (
        <section aria-labelledby="recents-heading" className="space-y-4">
          <h2 id="recents-heading" className="text-xl font-bold tracking-tight">
            Gần đây
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {recentItems.slice(0, 6).map((item) => (
              <Link
                key={item.key}
                href={item.href}
                className="flex items-center gap-3.5 rounded-xl border border-border bg-card p-3.5 transition-all hover:border-primary/40 hover:bg-muted/50"
              >
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <item.icon className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-sm text-foreground">{item.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.subtitle}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 4. KHỐI QUẢN LÝ THƯ VIỆN BỘ THẺ (TABS) */}
      <section aria-label="Quản lý bộ thẻ" className="space-y-6 pt-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-3">
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
          sets.length === 0 ? (
            <Card className="border-dashed">
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
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {sets.map((set) => (
                <li key={set.id}>
                  <StudySetCard set={set} />
                </li>
              ))}
            </ul>
          )
        ) : savedSets.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-14 text-center">
              <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted">
                <Bookmark className="size-6 text-muted-foreground" aria-hidden="true" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">Chưa lưu bộ thẻ nào</h3>
              <p className="mt-1 text-sm text-muted-foreground max-w-sm mx-auto">
                Khi tìm thấy các bộ thẻ hữu ích của người khác, bạn có thể bấm &quot;Lưu bộ thẻ&quot;
                để dễ dàng ôn tập lại tại đây.
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
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {savedSets.map((set) => (
              <li key={set.id}>
                <StudySetCard set={set} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
