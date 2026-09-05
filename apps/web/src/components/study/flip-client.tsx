'use client';

import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import type { Flashcard } from '@flashcard/contracts';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { apiBrowser } from '@/lib/api/browser';
import { flashcardImageUrl } from '@/lib/flashcard-image';

export function FlipClient({
  setId,
  cards,
}: {
  setId: string;
  cards: Flashcard[];
}) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [results, setResults] = useState<Record<string, boolean>>({});
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);

  const card = cards[index];

  function record(known: boolean) {
    if (!card) return;
    const all = { ...results, [card.id]: known };
    setResults(all);
    setFlipped(false);
    if (index + 1 < cards.length) {
      setIndex(index + 1);
    } else {
      finish(all);
    }
  }

  async function finish(all: Record<string, boolean>) {
    setSaving(true);
    try {
      await apiBrowser(`/study-sets/${setId}/review`, {
        method: 'POST',
        body: {
          results: Object.entries(all).map(([flashcardId, correct]) => ({
            flashcardId,
            correct,
          })),
        },
      });
    } finally {
      setSaving(false);
      setDone(true);
    }
  }

  function restart() {
    setResults({});
    setIndex(0);
    setFlipped(false);
    setDone(false);
  }

  useEffect(() => {
    if (done) return;

    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.code === 'Space' || e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        setFlipped((prev) => !prev);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (flipped) {
          record(false);
        } else if (index > 0) {
          setIndex((prev) => prev - 1);
          setFlipped(false);
        }
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (flipped) {
          record(true);
        } else if (index + 1 < cards.length) {
          setIndex((prev) => prev + 1);
          setFlipped(false);
        }
      } else if (e.key === '1' && flipped) {
        e.preventDefault();
        record(false);
      } else if (e.key === '2' && flipped) {
        e.preventDefault();
        record(true);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [flipped, index, cards.length, done, card]);

  const knownCount = Object.values(results).filter(Boolean).length;
  const progressPercent = Math.round(((index + (done ? 1 : 0)) / cards.length) * 100);

  if (done) {
    return (
      <Card>
        <CardContent className="space-y-4 py-8 text-center">
          <p className="text-3xl font-bold">Hoàn thành!</p>
          <p className="text-muted-foreground">
            Đã thuộc {knownCount} / {cards.length} thẻ
          </p>
          <div className="flex justify-center gap-3">
            <Button onClick={restart} className="gap-2">
              <RotateCcw className="size-4" />
              <span>Học lại</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!card) return null;

  const imgUrl = flashcardImageUrl(card.imagePath);

  return (
    <Card className="overflow-hidden shadow-sm">
      {/* Thanh tien trinh muot ma */}
      <div className="h-1.5 w-full bg-muted">
        <div
          className="h-full bg-primary transition-all duration-300 ease-out"
          style={{
            width: `${Math.min(100, Math.max(0, ((index + 1) / cards.length) * 100))}%`,
          }}
        />
      </div>

      <button
        type="button"
        onClick={() => setFlipped((value) => !value)}
        className="flex min-h-[19rem] w-full flex-col items-center justify-center p-6 text-center transition-colors hover:bg-muted/10 focus:outline-none"
      >
        {imgUrl && (
          <div className="mb-4 max-h-48 max-w-xs overflow-hidden rounded-lg border border-border bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imgUrl}
              alt="Ảnh minh họa"
              className="max-h-48 w-auto object-contain"
            />
          </div>
        )}
        <span className="text-2xl font-semibold select-none">{flipped ? card.definition : card.term}</span>
        <span className="mt-3 text-sm text-muted-foreground select-none">
          {flipped ? 'Mặt sau (Định nghĩa)' : 'Mặt trước (Thuật ngữ) — nhấn hoặc bấm Space để lật'}
        </span>
      </button>

      {/* Cac nut hanh dong & phim tat */}
      {!flipped ? (
        <div className="flex items-center justify-between border-t border-border p-4">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={index === 0}
            onClick={() => {
              setIndex((prev) => prev - 1);
              setFlipped(false);
            }}
            className="gap-1 text-muted-foreground"
          >
            <ChevronLeft className="size-4" />
            <kbd className="hidden sm:inline-block rounded border bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
              ←
            </kbd>
            <span>Trước</span>
          </Button>

          <Button type="button" onClick={() => setFlipped(true)} className="gap-2">
            <span>Lật thẻ</span>
            <kbd className="hidden sm:inline-block rounded border border-primary-foreground/30 bg-primary-foreground/10 px-1.5 py-0.5 text-[10px] font-mono">
              Space
            </kbd>
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={index + 1 >= cards.length}
            onClick={() => {
              setIndex((prev) => prev + 1);
              setFlipped(false);
            }}
            className="gap-1 text-muted-foreground"
          >
            <span>Sau</span>
            <kbd className="hidden sm:inline-block rounded border bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
              →
            </kbd>
            <ChevronRight className="size-4" />
          </Button>
        </div>
      ) : (
        <div className="flex items-center justify-center gap-4 border-t border-border p-4">
          <Button
            type="button"
            variant="outline"
            disabled={saving}
            onClick={() => record(false)}
            className="gap-2 border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <kbd className="rounded border border-destructive/30 bg-destructive/10 px-1.5 py-0.5 text-[10px] font-mono">
              1 hoặc ←
            </kbd>
            <span>Chưa thuộc</span>
          </Button>
          <Button
            type="button"
            disabled={saving}
            onClick={() => record(true)}
            className="gap-2 bg-success text-success-foreground hover:bg-success/90"
          >
            <span>Đã thuộc</span>
            <kbd className="rounded border border-white/30 bg-black/10 px-1.5 py-0.5 text-[10px] font-mono">
              2 hoặc →
            </kbd>
          </Button>
        </div>
      )}

      {/* Footer chi so */}
      <div className="flex flex-wrap items-center justify-between border-t border-border/50 bg-muted/20 px-4 py-2.5 text-xs text-muted-foreground">
        <span>
          Thẻ {index + 1} / {cards.length} ({progressPercent}%)
        </span>
        <div className="hidden sm:flex items-center gap-3">
          <span>
            <kbd className="rounded border bg-background px-1 font-mono text-[10px]">Space</kbd> Lật
          </span>
          <span>
            <kbd className="rounded border bg-background px-1 font-mono text-[10px]">←</kbd>{' '}
            <kbd className="rounded border bg-background px-1 font-mono text-[10px]">→</kbd> Chuyển / Đánh giá
          </span>
        </div>
      </div>
    </Card>
  );
}
