'use client';

import { useMemo, useState } from 'react';
import type { Flashcard } from '@flashcard/contracts';
import { Button } from '@/components/ui/button';
import { apiBrowser } from '@/lib/api/browser';
import { flashcardImageUrl } from '@/lib/flashcard-image';
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
    const seconds = Math.round((bestMs ?? Date.now() - startedAt) / 1000);
    return (
      <div className="rounded-lg border border-border p-8 text-center">
        <p className="text-lg font-semibold">Hoàn thành!</p>
        <p className="mt-1 text-muted-foreground">Thời gian: {seconds}s</p>
        <Button className="mt-4" onClick={restart}>
          Chơi lại
        </Button>
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
