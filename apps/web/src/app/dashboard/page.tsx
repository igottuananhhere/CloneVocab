import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Flame,
  Folder,
  Layers,
  Plus,
  TrendingUp,
} from 'lucide-react';
import type { FolderSummary, MeProfile, StudySetSummary, StudyStats } from '@flashcard/contracts';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DashboardSetsExplorer } from '@/components/dashboard/dashboard-sets-explorer';
import { StreakCalendarCard } from '@/components/dashboard/streak-calendar-card';
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
    currentStreak: 0,
    longestStreak: 0,
    activeDates: [],
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
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-8">
      {/* Header chào người dùng */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-3xl font-bold tracking-tight">Chào {displayName} 👋</h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <Flame className="size-3.5 fill-amber-500" />
              <span>Chăm chỉ</span>
            </span>
          </div>
          <p className="mt-1 text-muted-foreground text-sm">
            Hồ sơ công khai:{' '}
            <Link href={`/u/${me.username}`} className="text-primary font-medium hover:underline">
              /u/{me.username}
            </Link>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/sets/create" className={cn(buttonVariants({ size: 'sm' }), 'rounded-xl shadow-xs')}>
            <Plus className="size-4 mr-1.5" />
            Tạo bộ thẻ
          </Link>
          <Link href="/settings" className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'rounded-xl')}>
            Chỉnh sửa hồ sơ
          </Link>
        </div>
      </header>

      {/* BỐ CỤC 2 CỘT CHUẨN QUIZLET (CỘT CHÍNH + CỘT LỊCH STREAK) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* CỘT CHÍNH BÊN TRÁI (8 CỘT) */}
        <div className="lg:col-span-8 space-y-8 min-w-0">
          {/* 1. KHỐI 3 THỐNG KÊ TIẾN ĐỘ TRỌNG TÂM */}
          <section aria-label="Thống kê học tập">
        <div className="grid gap-4 sm:grid-cols-3">
          {/* A. Từ vựng hôm nay */}
          <Card className="relative overflow-hidden border-border/70 bg-gradient-to-br from-card via-card to-amber-500/5 shadow-xs transition-all hover:shadow-md hover:border-amber-500/30 rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Từ vựng hôm nay
              </CardTitle>
              <div className="flex size-9 items-center justify-center rounded-xl bg-amber-500/15 text-amber-500 shadow-xs">
                <Flame className="size-4.5 fill-amber-500/30" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-extrabold tracking-tight">
                {stats.wordsStudiedToday ?? 0}
                <span className="text-sm font-normal text-muted-foreground ml-1.5 font-sans">từ</span>
              </div>
              <div className="mt-3">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
                  <span>Mục tiêu ngày (20 từ)</span>
                  <span className="font-semibold text-foreground">
                    {Math.min(Math.round(((stats.wordsStudiedToday ?? 0) / 20) * 100), 100)}%
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-500"
                    style={{
                      width: `${Math.min(Math.round(((stats.wordsStudiedToday ?? 0) / 20) * 100), 100)}%`,
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* B. Từ vựng trong tuần */}
          <Card className="relative overflow-hidden border-border/70 bg-gradient-to-br from-card via-card to-emerald-500/5 shadow-xs transition-all hover:shadow-md hover:border-emerald-500/30 rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Từ vựng tuần này
              </CardTitle>
              <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-500 shadow-xs">
                <TrendingUp className="size-4.5" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-extrabold tracking-tight">
                {stats.wordsStudiedThisWeek ?? 0}
                <span className="text-sm font-normal text-muted-foreground ml-1.5 font-sans">từ</span>
              </div>
              <p className="mt-3 text-xs text-muted-foreground leading-relaxed flex items-center gap-1.5">
                <span className="inline-block size-2 rounded-full bg-emerald-500" />
                Tổng số từ bạn đã ôn tập trong 7 ngày qua
              </p>
            </CardContent>
          </Card>

          {/* C. Học phần đã thêm */}
          <Card className="relative overflow-hidden border-border/70 bg-gradient-to-br from-card via-card to-primary/5 shadow-xs transition-all hover:shadow-md hover:border-primary/30 rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Học phần đã thêm
              </CardTitle>
              <div className="flex size-9 items-center justify-center rounded-xl bg-primary/15 text-primary shadow-xs">
                <Layers className="size-4.5" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-extrabold tracking-tight">
                {stats.totalSetsAdded || (sets.length + savedSets.length)}
                <span className="text-sm font-normal text-muted-foreground ml-1.5 font-sans">học phần</span>
              </div>
              <p className="mt-3 text-xs text-muted-foreground leading-relaxed flex items-center gap-1.5">
                <span className="inline-block size-2 rounded-full bg-primary" />
                Gồm <strong>{sets.length}</strong> bộ của bạn · <strong>{savedSets.length}</strong> bộ đã lưu
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

        {/* 4. KHỐI QUẢN LÝ THƯ VIỆN BỘ THẺ (INTERACTIVE TABS & TÌM KIẾM NHANH) */}
        <DashboardSetsExplorer mySets={sets} savedSets={savedSets} initialTab={activeTab} />
      </div>

      {/* CỘT PHỤ BÊN PHẢI (4 CỘT) - LỊCH STREAK & THÓI QUEN HỌC TẬP */}
      <aside className="lg:col-span-4 space-y-6 lg:sticky lg:top-20">
        <StreakCalendarCard stats={stats} />
      </aside>
    </div>
  </div>
);
}
