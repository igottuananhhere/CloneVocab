'use client';

import { useMemo, useState } from 'react';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Flame,
  Trophy,
} from 'lucide-react';
import type { StudyStats } from '@flashcard/contracts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

const MONTH_NAMES = [
  'Tháng 1',
  'Tháng 2',
  'Tháng 3',
  'Tháng 4',
  'Tháng 5',
  'Tháng 6',
  'Tháng 7',
  'Tháng 8',
  'Tháng 9',
  'Tháng 10',
  'Tháng 11',
  'Tháng 12',
];

export function StreakCalendarCard({ stats }: { stats: StudyStats }) {
  const activeDateSet = useMemo(() => new Set(stats.activeDates || []), [stats.activeDates]);

  // Ngay gio hien tai
  const today = useMemo(() => new Date(), []);
  const todayKey = useMemo(() => {
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, [today]);

  const studiedToday = activeDateSet.has(todayKey);

  // Quan ly thang va nam dang duyet tren lich
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth()); // 0 - 11

  function handlePrevMonth() {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  }

  function handleNextMonth() {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  }

  function handleGoToday() {
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
  }

  // Tinh toan cac ngay trong thang hien tai
  const calendarDays = useMemo(() => {
    // Thu cua ngay dau thang (0: Chu Nhat, 1: Thu 2, ...)
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    // Chuyen ve T2 = 0, ..., CN = 6
    const paddingLeft = firstDay === 0 ? 6 : firstDay - 1;

    // So ngay trong thang
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    const days: Array<{
      dayNumber: number;
      dateKey: string;
      isToday: boolean;
      hasStudied: boolean;
      isFuture: boolean;
    }> = [];

    for (let d = 1; d <= daysInMonth; d++) {
      const dateKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayDate = new Date(currentYear, currentMonth, d);
      const isToday = dateKey === todayKey;
      const hasStudied = activeDateSet.has(dateKey);
      const isFuture = dayDate.getTime() > today.getTime() && !isToday;

      days.push({
        dayNumber: d,
        dateKey,
        isToday,
        hasStudied,
        isFuture,
      });
    }

    return { paddingLeft, days, daysInMonth };
  }, [currentYear, currentMonth, today, todayKey, activeDateSet]);

  // Dem so ngay da hoc trong thang dang chon
  const activeDaysThisMonth = useMemo(() => {
    return calendarDays.days.filter((d) => d.hasStudied).length;
  }, [calendarDays.days]);

  const isBrowsingCurrentMonth =
    currentMonth === today.getMonth() && currentYear === today.getFullYear();

  return (
    <Card className="rounded-2xl border-border/80 bg-card shadow-xs transition-all hover:border-primary/30 overflow-hidden">
      <CardHeader className="pb-3 border-b border-border/40 bg-gradient-to-br from-card via-card to-amber-500/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex size-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-500 shadow-xs">
              <Flame className="size-5 fill-amber-500" />
            </div>
            <div>
              <CardTitle className="text-base font-bold tracking-tight text-foreground flex items-center gap-1.5">
                <span>Chuỗi học tập</span>
              </CardTitle>
              <p className="text-xs text-muted-foreground">Theo dõi thói quen ôn từ mỗi ngày</p>
            </div>
          </div>

          {stats.longestStreak > 0 && (
            <span
              className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary"
              title={`Kỷ lục dài nhất: ${stats.longestStreak} ngày`}
            >
              <Trophy className="size-3" />
              <span>{stats.longestStreak} ngày</span>
            </span>
          )}
        </div>

        {/* So ngay Streak noi bat */}
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-3xl font-extrabold tracking-tight text-foreground">
            {stats.currentStreak}
          </span>
          <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">
            ngày liên tiếp 🔥
          </span>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-5 space-y-4">
        {/* Banner trang thai ngay hom nay */}
        {studiedToday ? (
          <div className="flex items-center gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-700 dark:text-emerald-300">
            <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
              <Check className="size-3.5 stroke-[3]" />
            </div>
            <div className="flex-1">
              <p className="font-semibold">Đã hoàn thành hôm nay!</p>
              <p className="text-[11px] text-emerald-600/90 dark:text-emerald-400/90 mt-0.5">
                Chuỗi ngày học tập được bảo toàn an toàn.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
            <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-amber-500 text-white">
              <Flame className="size-3.5 fill-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold">Hôm nay bạn chưa học!</p>
              <p className="text-[11px] text-amber-600/90 dark:text-amber-400/90 mt-0.5">
                Ôn ngay 1 bài để duy trì ngọn lửa streak nhé.
              </p>
            </div>
          </div>
        )}

        {/* Header Dieu huong thang tren lich */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-bold text-foreground">
              {MONTH_NAMES[currentMonth]}, {currentYear}
            </span>
            {!isBrowsingCurrentMonth && (
              <button
                type="button"
                onClick={handleGoToday}
                className="text-[11px] font-semibold text-primary hover:underline ml-1 cursor-pointer"
              >
                (Hôm nay)
              </button>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handlePrevMonth}
              title="Tháng trước"
              className="flex size-7 items-center justify-center rounded-lg border border-border/70 bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
            >
              <ChevronLeft className="size-4" />
              <span className="sr-only">Tháng trước</span>
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              title="Tháng sau"
              className="flex size-7 items-center justify-center rounded-lg border border-border/70 bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
            >
              <ChevronRight className="size-4" />
              <span className="sr-only">Tháng sau</span>
            </button>
          </div>
        </div>

        {/* LUOI LICH THANG */}
        <div>
          {/* Thu trong tuan */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1.5">
            {WEEKDAYS.map((w) => (
              <span
                key={w}
                className="text-[11px] font-semibold uppercase text-muted-foreground/70 py-1"
              >
                {w}
              </span>
            ))}
          </div>

          {/* O cac ngay */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {/* O dem truoc ngay mung 1 */}
            {Array.from({ length: calendarDays.paddingLeft }).map((_, idx) => (
              <div key={`empty-${idx}`} className="size-8" />
            ))}

            {/* Cac ngay trong thang */}
            {calendarDays.days.map((d) => {
              return (
                <div
                  key={d.dateKey}
                  title={
                    d.hasStudied
                      ? `Đã học ngày ${d.dayNumber}/${currentMonth + 1}/${currentYear}`
                      : d.isToday
                        ? 'Hôm nay'
                        : `Ngày ${d.dayNumber}`
                  }
                  className={cn(
                    'relative flex size-8 mx-auto items-center justify-center rounded-xl text-xs font-medium transition-all select-none',
                    // Da hoc: Tich xanh / nguyen nen noi bat
                    d.hasStudied
                      ? 'bg-emerald-500 font-bold text-white shadow-xs'
                      : d.isToday
                        ? 'border-2 border-primary font-bold text-primary bg-primary/10'
                        : d.isFuture
                          ? 'text-muted-foreground/30'
                          : 'text-foreground/70 hover:bg-muted/50',
                  )}
                >
                  <span>{d.dayNumber}</span>

                  {/* Icon dau tich xanh hoac ngọn lửa */}
                  {d.hasStudied && (
                    <span className="absolute -bottom-1 -right-1 flex size-3.5 items-center justify-center rounded-full bg-emerald-600 text-white ring-1 ring-background">
                      <Check className="size-2.5 stroke-[3]" />
                    </span>
                  )}

                  {/* Cham do/xanh cho hom nay neu chua hoc */}
                  {d.isToday && !d.hasStudied && (
                    <span className="absolute -top-0.5 -right-0.5 flex size-2 rounded-full bg-amber-500 animate-pulse" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Tong ket & Chu thich */}
        <div className="pt-3 border-t border-border/50 flex flex-col gap-2 text-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span>Tiến độ tháng:</span>
            <span className="font-semibold text-foreground">
              {activeDaysThisMonth} / {calendarDays.daysInMonth} ngày
            </span>
          </div>

          {/* Thanh tien do thang */}
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
              style={{
                width: `${Math.min(Math.round((activeDaysThisMonth / calendarDays.daysInMonth) * 100), 100)}%`,
              }}
            />
          </div>

          {/* Chu thich (Legend) */}
          <div className="flex items-center justify-center gap-4 text-[11px] text-muted-foreground pt-1">
            <div className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-emerald-500" />
              <span>Đã học (✓)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="size-2 rounded-full border border-primary bg-primary/20" />
              <span>Hôm nay</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-muted" />
              <span>Chưa học</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
