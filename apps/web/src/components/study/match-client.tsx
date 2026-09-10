'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { RotateCcw, Sparkles, Timer, Trophy } from 'lucide-react';
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

export function MatchClient({ setId, cards }: { setId: string; cards: Flashcard[] }) {
  const tiles = useMemo<Tile[]>(() => {
    const built: Tile[] = [];
    for (const card of cards) {
      built.push({
        id: `${card.id}:t`,
        cardId: card.id,
        kind: 'term',
        text: card.term,
        imagePath: card.imagePath,
      });
      built.push({ id: `${card.id}:d`, cardId: card.id, kind: 'def', text: card.definition });
    }
    return shuffle(built);
  }, [cards]);

  const [matchedIds, setMatchedIds] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [wrong, setWrong] = useState(false);
  const [startedAt] = useState(() => Date.now());
  const [done, setDone] = useState(false);
  const [bestMs, setBestMs] = useState<number | null>(null);

  const remaining = tiles.length - matchedIds.size;

  function handleClick(tile: Tile) {
    if (matchedIds.has(tile.id) || wrong) return;
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
      const next = new Set(matchedIds);
      next.add(first.id);
      next.add(tile.id);
      setMatchedIds(next);
      setSelectedId(null);
      setWrong(false);
      if (next.size === tiles.length) {
        finish(Date.now() - startedAt);
      }
    } else {
      setWrong(true);
      const current = selectedId;
      setTimeout(() => {
        setSelectedId(null);
        setWrong(false);
        void current;
      }, 600);
    }
  }

  async function finish(durationMs: number) {
    try {
      const res = await apiBrowser<{ durationMs: number }>(`/study-sets/${setId}/match`, {
        method: 'POST',
        body: { durationMs, pairCount: cards.length },
      });
      setBestMs(res.durationMs);
    } catch {
      // Khong chan chan truong hop luu that bai: van hien man hinh chuc mung.
    } finally {
      setDone(true);
    }
  }

  function restart() {
    setMatchedIds(new Set());
    setSelectedId(null);
    setWrong(false);
    setDone(false);
  }

  if (done) {
    const seconds = ((bestMs ?? Date.now() - startedAt) / 1000).toFixed(1);
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
              Bạn đã ghép xong tất cả các thẻ! 🎉
            </h2>
            <div className="flex items-center justify-center gap-2 pt-2">
              <div className="flex items-center gap-2 rounded-2xl border border-border bg-muted/50 px-4 py-2 font-mono">
                <Timer className="size-4 text-amber-500" />
                <span className="text-xs font-medium text-muted-foreground">Thời gian:</span>
                <span className="text-lg font-bold text-foreground">{seconds}s</span>
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

          {/* Goi y cac tro choi khac san co de do nham chan */}
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
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Còn {remaining / 2} cặp</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {tiles.map((tile) => {
          const isMatched = matchedIds.has(tile.id);
          const isSelected = selectedId === tile.id;
          return (
            <button
              key={tile.id}
              type="button"
              onClick={() => handleClick(tile)}
              disabled={isMatched}
              className={cn(
                'flex min-h-[4rem] flex-col items-center justify-center gap-1.5 rounded-md border p-2 text-center text-sm transition-colors',
                isMatched && 'invisible',
                isSelected && 'border-primary bg-primary/10',
                !isMatched && !isSelected && 'border-border bg-card hover:border-primary/50',
                wrong && isSelected && 'border-destructive bg-destructive/10',
              )}
            >
              {tile.imagePath && (
                <div className="h-8 w-12 shrink-0 overflow-hidden rounded border border-border bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={flashcardImageUrl(tile.imagePath) || ''}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </div>
              )}
              <span className="line-clamp-2">{tile.text}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
