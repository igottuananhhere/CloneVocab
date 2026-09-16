'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { RotateCcw, Sparkles, Timer, Trophy, CheckCircle2, ArrowRight } from 'lucide-react';
import type { Flashcard } from '@flashcard/contracts';
import { Button, buttonVariants } from '@/components/ui/button';
import { apiBrowser } from '@/lib/api/browser';
import { flashcardImageUrl } from '@/lib/flashcard-image';
import { NextModesSuggestions } from '@/components/study/next-modes-suggestions';
import { cn } from '@/lib/utils';

type Tile = {
  id: string;
  cardId: string;
  kind: 'term' | 'def';
  text: string;
  imagePath?: string | null;
};

const BATCH_SIZE = 10;

function shuffle<T>(input: T[]): T[] {
  const arr = [...input];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const a = arr[i]!;
    const b = arr[j]!;
    arr[i] = b;
    arr[j] = a;
  }
  return arr;
}

function formatElapsed(ms: number): string {
  const totalSeconds = ms / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = (totalSeconds % 60).toFixed(1);
  if (minutes > 0) {
    return `${minutes}m ${Number(seconds) < 10 ? '0' : ''}${seconds}s`;
  }
  return `${seconds}s`;
}

export function MatchClient({
  setId,
  cards,
  setTitle,
}: {
  setId: string;
  cards: Flashcard[];
  setTitle?: string;
}) {
  // Xáo trộn toàn bộ bộ thẻ một lần khi khởi động hoặc chơi lại
  const [shuffledCards, setShuffledCards] = useState<Flashcard[]>(() => shuffle(cards));
  const [currentRound, setCurrentRound] = useState(0);

  const totalCards = shuffledCards.length;
  const totalRounds = Math.max(1, Math.ceil(totalCards / BATCH_SIZE));

  // 10 từ vựng cho đợt hiện tại
  const roundCards = useMemo(() => {
    const start = currentRound * BATCH_SIZE;
    return shuffledCards.slice(start, start + BATCH_SIZE);
  }, [shuffledCards, currentRound]);

  // Sinh 20 ô (10 thuật ngữ + 10 định nghĩa) cho đợt hiện tại và đảo vị trí
  const tiles = useMemo<Tile[]>(() => {
    const built: Tile[] = [];
    for (const card of roundCards) {
      built.push({
        id: `${card.id}:t`,
        cardId: card.id,
        kind: 'term',
        text: card.term,
        imagePath: card.imagePath,
      });
      built.push({
        id: `${card.id}:d`,
        cardId: card.id,
        kind: 'def',
        text: card.definition,
      });
    }
    return shuffle(built);
  }, [roundCards]);

  const [matchedIds, setMatchedIds] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [wrong, setWrong] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [done, setDone] = useState(false);
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const [elapsedMs, setElapsedMs] = useState(0);
  const [bestMs, setBestMs] = useState<number | null>(null);

  // Live Timer
  useEffect(() => {
    if (done) return;
    const timer = setInterval(() => {
      setElapsedMs(Date.now() - startedAt);
    }, 100);
    return () => clearInterval(timer);
  }, [done, startedAt]);

  // Tổng số từ đã ghép được trên toàn bộ các đợt
  const matchedInCurrentRound = matchedIds.size / 2;
  const cumulativeMatched = currentRound * BATCH_SIZE + matchedInCurrentRound;
  const overallProgress = totalCards > 0 ? Math.round((cumulativeMatched / totalCards) * 100) : 0;
  const remainingInRound = roundCards.length - matchedInCurrentRound;

  function handleClick(tile: Tile) {
    if (matchedIds.has(tile.id) || wrong || isTransitioning || done) return;

    if (selectedId === null) {
      setSelectedId(tile.id);
      return;
    }
    if (selectedId === tile.id) {
      setSelectedId(null);
      return;
    }

    const first = tiles.find((t) => t.id === selectedId);
    if (first && first.cardId === tile.cardId && first.kind !== tile.kind) {
      // Ghép ĐÚNG
      const next = new Set(matchedIds);
      next.add(first.id);
      next.add(tile.id);
      setMatchedIds(next);
      setSelectedId(null);
      setWrong(false);

      // Nếu đã ghép hết các từ trong đợt này (10 từ)
      if (next.size === tiles.length) {
        if (currentRound < totalRounds - 1) {
          // Còn đợt tiếp theo -> Hiển thị chuyển cảnh và tự động chuyển sang 10 từ tiếp theo
          setIsTransitioning(true);
          setTimeout(() => {
            setCurrentRound((prev) => prev + 1);
            setMatchedIds(new Set());
            setSelectedId(null);
            setWrong(false);
            setIsTransitioning(false);
          }, 800);
        } else {
          // Đã hoàn thành tất cả các đợt!
          finish(Date.now() - startedAt);
        }
      }
    } else {
      // Ghép SAI -> Rung và báo đỏ
      setWrong(true);
      setTimeout(() => {
        setSelectedId(null);
        setWrong(false);
      }, 500);
    }
  }

  async function finish(durationMs: number) {
    try {
      const res = await apiBrowser<{ durationMs: number }>(`/study-sets/${setId}/match`, {
        method: 'POST',
        body: { durationMs, pairCount: totalCards },
      });
      setBestMs(res.durationMs);
    } catch {
      // Khong chan chan truong hop luu that bai: van hien man hinh chuc mung.
    } finally {
      setDone(true);
    }
  }

  function restart() {
    setShuffledCards(shuffle(cards));
    setCurrentRound(0);
    setMatchedIds(new Set());
    setSelectedId(null);
    setWrong(false);
    setIsTransitioning(false);
    setDone(false);
    setStartedAt(Date.now());
    setElapsedMs(0);
  }

  if (totalCards === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-border p-12 text-center">
        <p className="text-sm text-muted-foreground">
          Bộ thẻ này chưa có thẻ từ vựng nào để chơi ghép cặp.
        </p>
        <Link
          href={`/sets/${setId}`}
          className={cn(buttonVariants({ variant: 'outline' }), 'mt-4 rounded-xl')}
        >
          Quay lại bộ thẻ
        </Link>
      </div>
    );
  }

  // Màn hình Chiến thắng khi hoàn thành toàn bộ thẻ
  if (done) {
    const finalSeconds = ((bestMs ?? elapsedMs) / 1000).toFixed(1);
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs animate-in fade-in">
        <div className="w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-2xl text-center space-y-6 animate-in zoom-in-95">
          <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-500 shadow-inner">
            <Trophy className="size-9 text-amber-500 animate-bounce" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
              <Sparkles className="size-3.5" />
              <span>Hoàn thành xuất sắc!</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
              Bạn đã ghép xong tất cả {totalCards} từ vựng! 🎉
            </h2>
            <p className="text-xs text-muted-foreground">
              {setTitle ? `Bộ thẻ: ${setTitle}` : 'Tất cả các đợt đều đã được chinh phục!'}
            </p>

            <div className="flex items-center justify-center gap-3 pt-2">
              <div className="flex items-center gap-2 rounded-2xl border border-border bg-muted/50 px-4 py-2 font-mono">
                <Timer className="size-4 text-amber-500" />
                <span className="text-xs font-medium text-muted-foreground">Thời gian:</span>
                <span className="text-lg font-bold text-foreground">{finalSeconds}s</span>
              </div>
              <div className="flex items-center gap-2 rounded-2xl border border-border bg-muted/50 px-4 py-2 font-mono">
                <CheckCircle2 className="size-4 text-emerald-500" />
                <span className="text-xs font-medium text-muted-foreground">Số cặp:</span>
                <span className="text-lg font-bold text-foreground">{totalCards}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button
              onClick={restart}
              className="gap-2 h-11 px-6 rounded-xl font-semibold shadow-md cursor-pointer"
            >
              <RotateCcw className="size-4" />
              <span>Chơi lại ván mới</span>
            </Button>
            <Link
              href={`/sets/${setId}`}
              className={cn(
                buttonVariants({ variant: 'outline' }),
                'h-11 px-5 rounded-xl font-semibold'
              )}
            >
              Về trang bộ thẻ
            </Link>
          </div>

          {/* Gợi ý các trò chơi khác */}
          <div className="pt-4 border-t border-border/60">
            <NextModesSuggestions
              setId={setId}
              currentMode="match"
              layout="grid"
              title="Đổi gió với các trò chơi khác"
              subtitle="Khám phá các chế độ luyện tập khác để củng cố trí nhớ bền vững hơn:"
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 select-none">
      {/* Thanh điều khiển trên cùng: Tiến trình & Thời gian */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card/80 p-3 sm:p-4 shadow-xs backdrop-blur-xs">
        {/* Vòng chơi / Đợt */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-xl bg-primary/10 border border-primary/20 px-3 py-1.5 text-xs font-bold text-primary">
            <span>Đợt {currentRound + 1} / {totalRounds}</span>
            <span className="text-[10px] opacity-75 font-normal">
              ({roundCards.length} từ)
            </span>
          </div>
          <span className="text-xs font-medium text-muted-foreground hidden sm:inline">
            Còn <strong className="text-foreground">{remainingInRound}</strong> cặp đợt này
          </span>
        </div>

        {/* Tiến độ tổng thể */}
        <div className="flex-1 max-w-xs sm:max-w-md mx-2">
          <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground mb-1">
            <span>Tiến độ toàn bộ thẻ</span>
            <span className="font-bold text-foreground">
              {cumulativeMatched} / {totalCards} từ ({overallProgress}%)
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all duration-300 rounded-full"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        </div>

        {/* Bộ đếm giờ & Nút bắt đầu lại */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-xl border border-border bg-muted/60 px-3 py-1.5 font-mono text-xs font-bold text-foreground">
            <Timer className="size-3.5 text-amber-500 animate-pulse" />
            <span>{formatElapsed(elapsedMs)}</span>
          </div>
          <button
            type="button"
            onClick={restart}
            className="flex size-8 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            title="Chơi lại từ đầu"
            aria-label="Chơi lại từ đầu"
          >
            <RotateCcw className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Thông báo chuyển tiếp đợt mượt mà */}
      {isTransitioning && (
        <div className="rounded-2xl border border-primary/30 bg-primary/10 p-4 text-center animate-in fade-in zoom-in-95 shadow-sm">
          <div className="flex items-center justify-center gap-2 text-sm font-bold text-primary">
            <Sparkles className="size-4 animate-spin" />
            <span>Xuất sắc! Đã hoàn thành {roundCards.length} từ của Đợt {currentRound + 1}!</span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 flex items-center justify-center gap-1">
            <span>Tự động chuyển sang Đợt {currentRound + 2} / {totalRounds}</span>
            <ArrowRight className="size-3" />
          </p>
        </div>
      )}

      {/* Lưới 20 ô (10 từ) - Vừa vặn trong khung hình, không cần cuộn chuột */}
      <div
        className={cn(
          'grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2.5 sm:gap-3 transition-opacity duration-200',
          isTransitioning ? 'opacity-40 pointer-events-none' : 'opacity-100'
        )}
      >
        {tiles.map((tile) => {
          const isMatched = matchedIds.has(tile.id);
          const isSelected = selectedId === tile.id;
          const isWrong = wrong && isSelected;

          return (
            <button
              key={tile.id}
              type="button"
              onClick={() => handleClick(tile)}
              disabled={isMatched || isTransitioning}
              className={cn(
                'group relative flex min-h-[4.75rem] max-h-[6.5rem] sm:min-h-[5.25rem] flex-col items-center justify-center gap-1 rounded-2xl border p-2.5 sm:p-3 text-center transition-all duration-200 cursor-pointer shadow-2xs',
                // Khi đã ghép đúng -> Ẩn nhưng giữ nguyên vị trí lưới để các ô khác không bị nhảy loạn
                isMatched && 'invisible opacity-0 pointer-events-none scale-95',
                // Trạng thái đang chọn
                isSelected &&
                  !isWrong &&
                  'border-primary bg-primary/15 ring-2 ring-primary/30 text-primary font-semibold shadow-md scale-[1.03]',
                // Trạng thái ghép sai
                isWrong &&
                  'border-destructive bg-destructive/15 ring-2 ring-destructive/30 text-destructive font-semibold animate-shake',
                // Trạng thái mặc định
                !isMatched &&
                  !isSelected &&
                  'border-border/80 bg-card hover:border-primary/50 hover:bg-muted/30 hover:shadow-sm text-foreground active:scale-[0.98]'
              )}
            >
              {tile.imagePath && (
                <div className="h-7 w-10 shrink-0 overflow-hidden rounded-lg border border-border bg-muted mb-0.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={flashcardImageUrl(tile.imagePath) || ''}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </div>
              )}
              <span className="line-clamp-3 text-xs sm:text-[13px] font-medium leading-snug break-words">
                {tile.text}
              </span>

              {/* Nhãn nhỏ phân biệt loại (ẩn trên mobile, hiển thị tinh tế trên hover) */}
              <span className="absolute bottom-1 right-2 text-[9px] uppercase tracking-wider text-muted-foreground/50 font-mono hidden sm:inline opacity-0 group-hover:opacity-100 transition-opacity">
                {tile.kind === 'term' ? 'Thuật ngữ' : 'Định nghĩa'}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
