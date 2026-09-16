'use client';

import Link from 'next/link';
import {
  Layers,
  Repeat,
  GraduationCap,
  Timer,
  ArrowRight,
  Sparkles,
  Trophy,
  Zap,
  Volume2,
  CheckCircle2,
  BrainCircuit,
} from 'lucide-react';
import type { StudyStats } from '@flashcard/contracts';
import { cn } from '@/lib/utils';

interface StudyModesBentoProps {
  setId: string;
  cardCount: number;
  stats?: StudyStats | null;
}

export function StudyModesBento({ setId, cardCount, stats }: StudyModesBentoProps) {
  const matchBestFormatted =
    stats?.matchBestMs && stats.matchBestMs > 0
      ? `${(stats.matchBestMs / 1000).toFixed(1)}s`
      : null;

  const modes = [
    {
      href: `/sets/${setId}/cards`,
      label: 'Thẻ ghi nhớ',
      badge: 'Phổ biến nhất',
      tagline: 'Lật thẻ 3D & Ôn tập phản xạ',
      description: 'Lật thẻ 2 mặt ghi nhớ từ vựng, tích hợp phát âm chuẩn TTS và đánh dấu từ khó.',
      achievement: `${cardCount} thuật ngữ có sẵn`,
      achievementIcon: Volume2,
      cta: 'Luyện thẻ ngay',
      color: 'blue',
      icon: Layers,
      cardStyles: {
        container:
          'from-blue-500/10 via-card to-card border-blue-500/25 hover:border-blue-500/60 hover:shadow-blue-500/15',
        iconBg: 'bg-blue-500/15 text-blue-500 group-hover:bg-blue-500 group-hover:text-white',
        badge: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/25',
        glow: 'bg-blue-500/20',
        cta: 'text-blue-600 dark:text-blue-400 group-hover:bg-blue-500/10',
        pill: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20',
      },
    },
    {
      href: `/sets/${setId}/learn`,
      label: 'Học thích ứng',
      badge: 'Ghi nhớ sâu',
      tagline: 'Thuật toán Spaced Repetition',
      description: 'Luyện tập lặp lại ngắt quãng theo Leitner, tự động phân loại từ đã thuộc và từ cần ôn thêm.',
      achievement: 'Phản xạ trắc nghiệm 10s',
      achievementIcon: BrainCircuit,
      cta: 'Bắt đầu học',
      color: 'purple',
      icon: Repeat,
      cardStyles: {
        container:
          'from-purple-500/10 via-card to-card border-purple-500/25 hover:border-purple-500/60 hover:shadow-purple-500/15',
        iconBg: 'bg-purple-500/15 text-purple-500 group-hover:bg-purple-500 group-hover:text-white',
        badge: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/25',
        glow: 'bg-purple-500/20',
        cta: 'text-purple-600 dark:text-purple-400 group-hover:bg-purple-500/10',
        pill: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20',
      },
    },
    {
      href: `/sets/${setId}/test`,
      label: 'Kiểm tra thử',
      badge: 'Đo lường năng lực',
      tagline: 'Chấm điểm chuẩn 100%',
      description: 'Đề thi trắc nghiệm kết hợp tự luận và đúng/sai, mô phỏng bài thi thực tế.',
      achievement:
        stats && stats.testCount > 0
          ? `Đã hoàn thành ${stats.testCount} bài thi`
          : 'Đánh giá điểm số ngay',
      achievementIcon: stats && stats.testCount > 0 ? CheckCircle2 : Sparkles,
      cta: 'Vào làm bài thi',
      color: 'emerald',
      icon: GraduationCap,
      cardStyles: {
        container:
          'from-emerald-500/10 via-card to-card border-emerald-500/25 hover:border-emerald-500/60 hover:shadow-emerald-500/15',
        iconBg: 'bg-emerald-500/15 text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white',
        badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25',
        glow: 'bg-emerald-500/20',
        cta: 'text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-500/10',
        pill: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
      },
    },
    {
      href: `/sets/${setId}/match`,
      label: 'Ghép cặp siêu tốc',
      badge: 'Mới: 10 từ/đợt',
      tagline: 'Đua tốc độ phản xạ',
      description: 'Nhanh tay ghép cặp từ vựng, tự động chuyển sang 10 từ tiếp theo mà không cần kéo trang tìm kiếm.',
      achievement: matchBestFormatted
        ? `Kỷ lục cá nhân: ${matchBestFormatted}`
        : 'Chinh phục kỷ lục mới',
      achievementIcon: matchBestFormatted ? Trophy : Zap,
      cta: 'Chơi ghép cặp ngay',
      color: 'amber',
      icon: Timer,
      cardStyles: {
        container:
          'from-amber-500/10 via-card to-card border-amber-500/25 hover:border-amber-500/60 hover:shadow-amber-500/15',
        iconBg: 'bg-amber-500/15 text-amber-500 group-hover:bg-amber-500 group-hover:text-white',
        badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25',
        glow: 'bg-amber-500/20',
        cta: 'text-amber-600 dark:text-amber-400 group-hover:bg-amber-500/10',
        pill: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
      },
    },
  ];

  return (
    <section aria-label="Chế độ học tập và trò chơi" className="mt-8">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground">
              Bộ thẻ trò chơi & Chế độ học tập
            </h2>
            <span className="rounded-full bg-primary/10 border border-primary/20 px-2 py-0.5 text-[11px] font-semibold text-primary">
              4 chế độ
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Luyện tập toàn diện từ cơ bản đến phản xạ nhanh, giúp nhớ từ vựng lâu hơn 300%.
          </p>
        </div>
      </div>

      {/* Modern 4-Card Bento Grid */}
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        {modes.map((mode) => {
          const Icon = mode.icon;
          const AchievIcon = mode.achievementIcon;

          return (
            <Link
              key={mode.href}
              href={mode.href}
              className={cn(
                'group relative flex flex-col justify-between overflow-hidden rounded-3xl border bg-gradient-to-br p-5 shadow-xs transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl cursor-pointer',
                mode.cardStyles.container
              )}
            >
              {/* Radial glow background effect on hover */}
              <div
                className={cn(
                  'pointer-events-none absolute -right-8 -top-8 size-28 rounded-full blur-2xl transition-opacity duration-300 opacity-0 group-hover:opacity-100',
                  mode.cardStyles.glow
                )}
              />

              {/* Card Top: Icon & Badge */}
              <div className="relative z-10 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div
                    className={cn(
                      'flex size-11 items-center justify-center rounded-2xl shadow-xs transition-all duration-300 group-hover:scale-110 group-hover:shadow-md',
                      mode.cardStyles.iconBg
                    )}
                  >
                    <Icon className="size-5.5 transition-transform duration-300 group-hover:rotate-6" />
                  </div>
                  <span
                    className={cn(
                      'rounded-full px-2.5 py-1 text-[11px] font-bold border backdrop-blur-xs',
                      mode.cardStyles.badge
                    )}
                  >
                    {mode.badge}
                  </span>
                </div>

                {/* Card Headings */}
                <div>
                  <h3 className="text-base font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">
                    {mode.label}
                  </h3>
                  <p className="text-[11px] font-semibold text-muted-foreground mt-0.5">
                    {mode.tagline}
                  </p>
                  <p className="text-xs text-muted-foreground/90 mt-2 line-clamp-2 leading-relaxed">
                    {mode.description}
                  </p>
                </div>
              </div>

              {/* Card Bottom: Achievement Pill & Call To Action */}
              <div className="relative z-10 mt-5 pt-3 border-t border-border/50 space-y-2.5">
                {/* Personal stat / achievement */}
                <div
                  className={cn(
                    'flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-[11px] font-medium border truncate',
                    mode.cardStyles.pill
                  )}
                >
                  <AchievIcon className="size-3.5 shrink-0" />
                  <span className="truncate">{mode.achievement}</span>
                </div>

                {/* Action Link */}
                <div
                  className={cn(
                    'flex items-center justify-between rounded-xl px-2.5 py-1.5 text-xs font-bold transition-colors',
                    mode.cardStyles.cta
                  )}
                >
                  <span>{mode.cta}</span>
                  <ArrowRight className="size-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

