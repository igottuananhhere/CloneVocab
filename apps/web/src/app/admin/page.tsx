import Link from 'next/link';
import {
  Users,
  BookOpen,
  Layers,
  GraduationCap,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import type { AdminOverviewStats } from '@flashcard/contracts';
import { apiServer } from '@/lib/api/server';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default async function AdminOverviewPage() {
  let stats: AdminOverviewStats | null = null;
  let errorMsg: string | null = null;

  try {
    stats = await apiServer<AdminOverviewStats>('/admin/stats');
  } catch (err) {
    errorMsg = err instanceof Error ? err.message : 'Không thể tải dữ liệu thống kê quản trị.';
  }

  if (errorMsg || !stats) {
    return (
      <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-6 text-center">
        <p className="text-sm font-medium text-destructive">{errorMsg ?? 'Lỗi không xác định.'}</p>
      </div>
    );
  }

  const kpis = [
    {
      label: 'Tổng người dùng',
      value: stats.totalUsers.toLocaleString('vi-VN'),
      subtext: 'Tài khoản hoạt động',
      icon: Users,
      color: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
    },
    {
      label: 'Tổng bộ thẻ ghi nhớ',
      value: stats.totalStudySets.toLocaleString('vi-VN'),
      subtext: 'Đã tạo trên toàn hệ thống',
      icon: BookOpen,
      color: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20',
    },
    {
      label: 'Tổng số thẻ học',
      value: stats.totalFlashcards.toLocaleString('vi-VN'),
      subtext: 'Thuật ngữ & định nghĩa',
      icon: Layers,
      color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
    },
    {
      label: 'Phiên học hoàn thành',
      value: stats.totalStudySessions.toLocaleString('vi-VN'),
      subtext: 'Lượt thi Test & Ghép thẻ',
      icon: GraduationCap,
      color: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
    },
    {
      label: 'Báo cáo vi phạm',
      value: stats.pendingReportsCount.toLocaleString('vi-VN'),
      subtext: stats.pendingReportsCount > 0 ? 'Đang chờ xem xét' : 'Không có vi phạm mới',
      icon: AlertTriangle,
      color:
        stats.pendingReportsCount > 0
          ? 'text-rose-500 bg-rose-500/10 border-rose-500/20'
          : 'text-muted-foreground bg-muted border-border',
      alert: stats.pendingReportsCount > 0,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Top Welcome & KPI Header */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              Tổng quan hệ thống
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Theo dõi nhịp đập, tốc độ tăng trưởng người dùng và sức khỏe nội dung của CloneVocab.
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="relative flex size-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full size-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
              Hệ thống ổn định
            </span>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card
              key={kpi.label}
              className={`rounded-2xl border transition-all duration-200 hover:shadow-md ${
                kpi.alert ? 'border-rose-500/40 bg-rose-500/5' : 'border-border/80'
              }`}
            >
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground truncate">
                    {kpi.label}
                  </span>
                  <div
                    className={`flex size-8 shrink-0 items-center justify-center rounded-xl border ${kpi.color}`}
                  >
                    <Icon className="size-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <div
                    className={`text-2xl font-bold tracking-tight ${
                      kpi.alert ? 'text-rose-600 dark:text-rose-400' : 'text-foreground'
                    }`}
                  >
                    {kpi.value}
                  </div>
                  <p className="mt-0.5 text-[11px] text-muted-foreground truncate">{kpi.subtext}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Pending Reports Banner if any */}
      {stats.pendingReportsCount > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 sm:p-5 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-rose-500 text-white shadow-xs">
              <AlertTriangle className="size-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-rose-700 dark:text-rose-300">
                Có {stats.pendingReportsCount} nội dung bị cộng đồng báo cáo vi phạm
              </h3>
              <p className="text-xs text-rose-600/90 dark:text-rose-400/90 mt-0.5">
                Vui lòng xem xét các phản ánh để bảo vệ môi trường học tập lành mạnh cho CloneVocab.
              </p>
            </div>
          </div>
          <Link
            href="/admin/reports"
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-rose-700 transition-colors shrink-0"
          >
            <span>Kiểm duyệt ngay</span>
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
      )}

      {/* Two-Column Recent Activity Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Users Card */}
        <Card className="rounded-2xl border-border/80 shadow-xs">
          <CardHeader className="p-5 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold">Người dùng mới gia nhập</CardTitle>
                <CardDescription className="text-xs">
                  5 thành viên đăng ký gần đây nhất trên CloneVocab.
                </CardDescription>
              </div>
              <Users className="size-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            {stats.recentUsers.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">Chưa có người dùng nào.</p>
            ) : (
              <div className="divide-y divide-border/60">
                {stats.recentUsers.map((user) => (
                  <div key={user.id} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs">
                        {(user.displayName || user.username)[0]?.toUpperCase() ?? 'U'}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-foreground truncate">
                            {user.displayName || user.username}
                          </span>
                          {user.role === 'ADMIN' && (
                            <span className="rounded-full bg-primary/15 px-1.5 py-0.2 text-[10px] font-bold text-primary">
                              Admin
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate font-mono">
                          @{user.username}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] text-muted-foreground">
                        {new Date(user.createdAt).toLocaleDateString('vi-VN')}
                      </span>
                      <Link
                        href={`/u/${user.username}`}
                        className="rounded-lg p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        title="Xem trang cá nhân"
                      >
                        <ExternalLink className="size-3.5" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Study Sets Card */}
        <Card className="rounded-2xl border-border/80 shadow-xs">
          <CardHeader className="p-5 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold">Bộ thẻ học mới tạo</CardTitle>
                <CardDescription className="text-xs">
                  5 bộ thẻ được tạo gần đây nhất bởi người dùng.
                </CardDescription>
              </div>
              <BookOpen className="size-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            {stats.recentSets.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">Chưa có bộ thẻ nào.</p>
            ) : (
              <div className="divide-y divide-border/60">
                {stats.recentSets.map((set) => (
                  <div key={set.id} className="flex items-center justify-between py-3">
                    <div className="min-w-0 pr-2">
                      <Link
                        href={`/sets/${set.id}`}
                        className="text-xs font-bold text-foreground hover:text-primary transition-colors truncate block"
                      >
                        {set.title}
                      </Link>
                      <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                        Tạo bởi <strong className="text-foreground/80">@{set.ownerUsername}</strong> •{' '}
                        {set.cardCount} thẻ
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          set.visibility === 'PUBLIC'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {set.visibility === 'PUBLIC' ? 'Công khai' : 'Riêng tư'}
                      </span>
                      <Link
                        href={`/sets/${set.id}`}
                        className="rounded-lg p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        title="Mở bộ thẻ"
                      >
                        <ExternalLink className="size-3.5" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
