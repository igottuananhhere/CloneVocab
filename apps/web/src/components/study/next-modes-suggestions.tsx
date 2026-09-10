'use client';

import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { BookOpen, ChevronRight, Layers, Sparkles, Timer } from 'lucide-react';
import { cn } from '@/lib/utils';

export type StudyModeKey = 'cards' | 'learn' | 'match' | 'test';

export interface StudyModeConfig {
  key: StudyModeKey;
  title: string;
  subtitle: string;
  description: string;
  tag: string;
  path: (setId: string) => string;
  icon: LucideIcon;
  themeColors: {
    badge: string;
    iconBg: string;
    border: string;
    hoverBorder: string;
    bgGradient: string;
    textAccent: string;
    // For dark theme (like in flip-client modal)
    darkBadge: string;
    darkIconBg: string;
    darkBorder: string;
    darkHoverBorder: string;
    darkBgGradient: string;
    darkTextAccent: string;
  };
}

export const STUDY_MODES_CONFIG: Record<StudyModeKey, StudyModeConfig> = {
  match: {
    key: 'match',
    title: 'Ghép cặp tính giờ',
    subtitle: 'Đua phản xạ nhanh',
    description: 'Nhanh tay ghép đúng các cặp từ vựng để phá vỡ kỷ lục tốc độ.',
    tag: 'Game đua tốc độ',
    path: (id) => `/sets/${id}/match`,
    icon: Timer,
    themeColors: {
      badge: 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400',
      iconBg: 'bg-amber-500/15 text-amber-500 group-hover:bg-amber-500 group-hover:text-white',
      border: 'border-amber-500/25',
      hoverBorder: 'hover:border-amber-500/60 hover:shadow-amber-500/10',
      bgGradient: 'from-amber-500/10 via-card to-card',
      textAccent: 'text-amber-600 dark:text-amber-400',
      darkBadge: 'border-amber-400/30 bg-amber-500/15 text-amber-300',
      darkIconBg: 'bg-amber-500/20 text-amber-400 group-hover:bg-amber-500 group-hover:text-white',
      darkBorder: 'border-amber-500/30',
      darkHoverBorder: 'hover:border-amber-400/70 hover:shadow-[0_0_15px_rgba(245,158,11,0.2)]',
      darkBgGradient: 'from-amber-500/15 via-[#1a2139] to-[#1a2139]',
      darkTextAccent: 'text-amber-300',
    },
  },
  learn: {
    key: 'learn',
    title: 'Học trắc nghiệm',
    subtitle: 'Phản xạ 10 giây',
    description: 'Luyện phản xạ nhanh với đếm ngược 10s và Spaced Repetition.',
    tag: 'Trắc nghiệm 10s',
    path: (id) => `/sets/${id}/learn`,
    icon: Sparkles,
    themeColors: {
      badge: 'border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-400',
      iconBg: 'bg-purple-500/15 text-purple-500 group-hover:bg-purple-500 group-hover:text-white',
      border: 'border-purple-500/25',
      hoverBorder: 'hover:border-purple-500/60 hover:shadow-purple-500/10',
      bgGradient: 'from-purple-500/10 via-card to-card',
      textAccent: 'text-purple-600 dark:text-purple-400',
      darkBadge: 'border-purple-400/30 bg-purple-500/15 text-purple-300',
      darkIconBg: 'bg-purple-500/20 text-purple-400 group-hover:bg-purple-500 group-hover:text-white',
      darkBorder: 'border-purple-500/30',
      darkHoverBorder: 'hover:border-purple-400/70 hover:shadow-[0_0_15px_rgba(168,85,247,0.2)]',
      darkBgGradient: 'from-purple-500/15 via-[#1a2139] to-[#1a2139]',
      darkTextAccent: 'text-purple-300',
    },
  },
  cards: {
    key: 'cards',
    title: 'Thẻ ghi nhớ',
    subtitle: 'Quẹt & Lật thẻ 3D',
    description: 'Quẹt trái/phải phân loại và click lật thẻ 3D xem nghĩa từ vựng.',
    tag: 'Quẹt thẻ 3D',
    path: (id) => `/sets/${id}/cards`,
    icon: Layers,
    themeColors: {
      badge: 'border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400',
      iconBg: 'bg-blue-500/15 text-blue-500 group-hover:bg-blue-500 group-hover:text-white',
      border: 'border-blue-500/25',
      hoverBorder: 'hover:border-blue-500/60 hover:shadow-blue-500/10',
      bgGradient: 'from-blue-500/10 via-card to-card',
      textAccent: 'text-blue-600 dark:text-blue-400',
      darkBadge: 'border-blue-400/30 bg-blue-500/15 text-blue-300',
      darkIconBg: 'bg-blue-500/20 text-blue-400 group-hover:bg-blue-500 group-hover:text-white',
      darkBorder: 'border-blue-500/30',
      darkHoverBorder: 'hover:border-blue-400/70 hover:shadow-[0_0_15px_rgba(59,130,246,0.2)]',
      darkBgGradient: 'from-blue-500/15 via-[#1a2139] to-[#1a2139]',
      darkTextAccent: 'text-blue-300',
    },
  },
  test: {
    key: 'test',
    title: 'Kiểm tra',
    subtitle: 'Thi thử chấm điểm',
    description: 'Đề thi tổng hợp trắc nghiệm, tự luận, đúng/sai đo lường thực tế.',
    tag: 'Đo lường',
    path: (id) => `/sets/${id}/test`,
    icon: BookOpen,
    themeColors: {
      badge: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
      iconBg: 'bg-emerald-500/15 text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white',
      border: 'border-emerald-500/25',
      hoverBorder: 'hover:border-emerald-500/60 hover:shadow-emerald-500/10',
      bgGradient: 'from-emerald-500/10 via-card to-card',
      textAccent: 'text-emerald-600 dark:text-emerald-400',
      darkBadge: 'border-emerald-400/30 bg-emerald-500/15 text-emerald-300',
      darkIconBg: 'bg-emerald-500/20 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white',
      darkBorder: 'border-emerald-500/30',
      darkHoverBorder: 'hover:border-emerald-400/70 hover:shadow-[0_0_15px_rgba(16,185,129,0.2)]',
      darkBgGradient: 'from-emerald-500/15 via-[#1a2139] to-[#1a2139]',
      darkTextAccent: 'text-emerald-300',
    },
  },
};

export interface NextModesSuggestionsProps {
  setId: string;
  currentMode: StudyModeKey;
  theme?: 'default' | 'dark';
  layout?: 'grid' | 'compact-list' | 'compact-grid';
  title?: string;
  subtitle?: string;
  className?: string;
}

export function NextModesSuggestions({
  setId,
  currentMode,
  theme = 'default',
  layout = 'grid',
  title = 'Khám phá các trò chơi khác sẵn có',
  subtitle = 'Đổi gió chế độ học giúp não bộ kích hoạt liên kết trí nhớ bền vững hơn.',
  className,
}: NextModesSuggestionsProps) {
  const isDark = theme === 'dark';

  // Loc bo che do hien tai de goi y 3 che do con lai
  const otherModes = Object.values(STUDY_MODES_CONFIG).filter(
    (mode) => mode.key !== currentMode
  );

  if (layout === 'compact-list') {
    return (
      <div className={cn('space-y-3 text-left w-full', className)}>
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <Sparkles className={cn('size-4', isDark ? 'text-amber-400' : 'text-amber-500')} />
            <h4
              className={cn(
                'text-sm font-bold tracking-tight',
                isDark ? 'text-white' : 'text-foreground'
              )}
            >
              {title}
            </h4>
          </div>
          {subtitle && (
            <p
              className={cn(
                'text-[11px] leading-snug',
                isDark ? 'text-white/60' : 'text-muted-foreground'
              )}
            >
              {subtitle}
            </p>
          )}
        </div>

        <div className="space-y-2">
          {otherModes.map((mode) => {
            const Icon = mode.icon;
            const c = mode.themeColors;

            return (
              <Link
                key={mode.key}
                href={mode.path(setId)}
                className={cn(
                  'group flex items-center justify-between gap-3 rounded-xl border p-2.5 transition-all duration-150 cursor-pointer',
                  isDark
                    ? `bg-gradient-to-r ${c.darkBgGradient} ${c.darkBorder} ${c.darkHoverBorder} hover:translate-x-1`
                    : `bg-gradient-to-r ${c.bgGradient} ${c.border} ${c.hoverBorder} hover:translate-x-1`
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={cn(
                      'flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors',
                      isDark ? c.darkIconBg : c.iconBg
                    )}
                  >
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={cn(
                          'text-xs font-bold truncate',
                          isDark ? 'text-white' : 'text-foreground'
                        )}
                      >
                        {mode.title}
                      </span>
                      <span
                        className={cn(
                          'rounded-md px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider border',
                          isDark ? c.darkBadge : c.badge
                        )}
                      >
                        {mode.tag}
                      </span>
                    </div>
                    <p
                      className={cn(
                        'text-[11px] truncate',
                        isDark ? 'text-white/60' : 'text-muted-foreground'
                      )}
                    >
                      {mode.subtitle}
                    </p>
                  </div>
                </div>

                <div
                  className={cn(
                    'flex items-center gap-1 text-[11px] font-semibold shrink-0 transition-transform group-hover:translate-x-0.5',
                    isDark ? c.darkTextAccent : c.textAccent
                  )}
                >
                  <span className="hidden sm:inline">Chơi ngay</span>
                  <ChevronRight className="size-3.5" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    );
  }

  // Layout dang Grid (3 cot hoac 1 cot tuy man hinh)
  return (
    <div className={cn('space-y-4 pt-6 text-left w-full', className)}>
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Sparkles className={cn('size-4', isDark ? 'text-amber-400' : 'text-amber-500')} />
          <h3
            className={cn(
              'text-base font-bold tracking-tight',
              isDark ? 'text-white' : 'text-foreground'
            )}
          >
            {title}
          </h3>
        </div>
        {subtitle && (
          <p
            className={cn(
              'text-xs leading-relaxed',
              isDark ? 'text-white/70' : 'text-muted-foreground'
            )}
          >
            {subtitle}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {otherModes.map((mode) => {
          const Icon = mode.icon;
          const c = mode.themeColors;

          return (
            <Link
              key={mode.key}
              href={mode.path(setId)}
              className={cn(
                'group flex flex-col justify-between rounded-2xl border p-4 transition-all duration-200 hover:-translate-y-1 hover:shadow-md cursor-pointer text-left',
                isDark
                  ? `bg-gradient-to-br ${c.darkBgGradient} ${c.darkBorder} ${c.darkHoverBorder}`
                  : `bg-gradient-to-br ${c.bgGradient} ${c.border} ${c.hoverBorder}`
              )}
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <div
                    className={cn(
                      'flex size-9 items-center justify-center rounded-xl transition-colors',
                      isDark ? c.darkIconBg : c.iconBg
                    )}
                  >
                    <Icon className="size-4" />
                  </div>
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-[10px] font-semibold border',
                      isDark ? c.darkBadge : c.badge
                    )}
                  >
                    {mode.tag}
                  </span>
                </div>

                <h4
                  className={cn(
                    'mt-3 font-bold text-sm tracking-tight',
                    isDark ? 'text-white' : 'text-foreground'
                  )}
                >
                  {mode.title}
                </h4>
                <p
                  className={cn(
                    'mt-1 text-xs leading-relaxed line-clamp-2',
                    isDark ? 'text-white/60' : 'text-muted-foreground'
                  )}
                >
                  {mode.description}
                </p>
              </div>

              <div
                className={cn(
                  'mt-4 flex items-center justify-between pt-2.5 border-t text-xs font-semibold',
                  isDark
                    ? `border-white/10 ${c.darkTextAccent}`
                    : `border-border/50 ${c.textAccent}`
                )}
              >
                <span>Chơi thử ngay</span>
                <ChevronRight className="size-3.5 transition-transform group-hover:translate-x-1" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
