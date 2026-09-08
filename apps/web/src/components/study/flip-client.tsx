'use client';

import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, RotateCcw, RotateCw, Shuffle } from 'lucide-react';
import type { Flashcard } from '@flashcard/contracts';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { apiBrowser } from '@/lib/api/browser';
import { flashcardImageUrl } from '@/lib/flashcard-image';

function shuffleCards(array: Flashcard[]): Flashcard[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = shuffled[i]!;
    shuffled[i] = shuffled[j]!;
    shuffled[j] = temp;
  }
  return shuffled;
}

export function FlipClient({
  setId,
  cards,
}: {
  setId: string;
  cards: Flashcard[];
}) {
  const [isShuffled, setIsShuffled] = useState(false);
  const [deck, setDeck] = useState<Flashcard[]>(cards);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [results, setResults] = useState<Record<string, boolean>>({});
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);

  // Dong bo khi prop cards thay doi
  useEffect(() => {
    setDeck(isShuffled ? shuffleCards(cards) : cards);
    setIndex(0);
    setFlipped(false);
    setResults({});
    setDone(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards]);

  const card = deck[index];

  function toggleShuffle() {
    if (isShuffled) {
      setIsShuffled(false);
      setDeck(cards);
    } else {
      setIsShuffled(true);
      setDeck(shuffleCards(cards));
    }
    setIndex(0);
    setFlipped(false);
    setResults({});
    setDone(false);
  }

  function handleReshuffle() {
    setIsShuffled(true);
    setDeck(shuffleCards(cards));
    setIndex(0);
    setFlipped(false);
    setResults({});
    setDone(false);
  }

  function record(known: boolean) {
    if (!card) return;
    const all = { ...results, [card.id]: known };
    setResults(all);
    setFlipped(false);
    if (index + 1 < deck.length) {
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
    if (isShuffled) {
      setDeck(shuffleCards(cards));
    }
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
        } else if (index + 1 < deck.length) {
          setIndex((prev) => prev + 1);
          setFlipped(false);
        }
      } else if (e.key === '1' && flipped) {
        e.preventDefault();
        record(false);
      } else if (e.key === '2' && flipped) {
        e.preventDefault();
        record(true);
      } else if ((e.key === 's' || e.key === 'S') && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        toggleShuffle();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flipped, index, deck.length, done, card, isShuffled]);

  const knownCount = Object.values(results).filter(Boolean).length;
  const progressPercent = Math.round(((index + (done ? 1 : 0)) / deck.length) * 100);

  if (done) {
    return (
      <Card>
        <CardContent className="space-y-4 py-8 text-center">
          <p className="text-3xl font-bold">Hoàn thành!</p>
          <p className="text-muted-foreground">
            Đã thuộc {knownCount} / {deck.length} thẻ
          </p>
          <div className="flex justify-center gap-3">
            <Button onClick={restart} className="gap-2">
              <RotateCcw className="size-4" />
              <span>Học lại</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setIsShuffled(true);
                setDeck(shuffleCards(cards));
                restart();
              }}
              className="gap-2"
            >
              <Shuffle className="size-4" />
              <span>Trộn thẻ & Học lại</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!card) return null;

  const imgUrl = flashcardImageUrl(card.imagePath);

  return (
    <div className="space-y-3">
      {/* Thanh dieu khien tren the */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {deck.length} thẻ ghi nhớ
          </span>
          {isShuffled && (
            <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary animate-in fade-in duration-200">
              <Shuffle className="size-3" /> Đã trộn ngẫu nhiên
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isShuffled && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleReshuffle}
              className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted"
              title="Xáo trộn lại ngẫu nhiên một lượt mới"
            >
              <RotateCw className="size-3.5" />
              <span>Xáo lại</span>
            </Button>
          )}

          <Button
            type="button"
            variant={isShuffled ? 'secondary' : 'outline'}
            size="sm"
            onClick={toggleShuffle}
            className={`h-8 gap-1.5 text-xs font-medium transition-all ${
              isShuffled
                ? 'border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary shadow-xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
            title={
              isShuffled
                ? 'Nhấn để tắt trộn và quay về thứ tự ban đầu (Phím S)'
                : 'Trộn thẻ ngẫu nhiên linh tinh (Phím S)'
            }
          >
            <Shuffle className="size-3.5" />
            <span>{isShuffled ? 'Đang trộn' : 'Trộn thẻ'}</span>
            <kbd className="hidden sm:inline-block rounded border bg-background/60 px-1 py-0.5 text-[9px] font-mono text-muted-foreground">
              S
            </kbd>
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden shadow-sm">
        {/* Thanh tien trinh muot ma */}
        <div className="h-1.5 w-full bg-muted">
          <div
            className="h-full bg-primary transition-all duration-300 ease-out"
            style={{
              width: `${Math.min(100, Math.max(0, ((index + 1) / deck.length) * 100))}%`,
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
              disabled={index + 1 >= deck.length}
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
          <div className="flex items-center gap-2">
            <span>
              Thẻ {index + 1} / {deck.length} ({progressPercent}%)
            </span>
            {isShuffled && (
              <span className="text-[11px] font-medium text-primary">• Đã trộn</span>
            )}
          </div>
          <div className="hidden sm:flex items-center gap-3">
            <span>
              <kbd className="rounded border bg-background px-1 font-mono text-[10px]">Space</kbd> Lật
            </span>
            <span>
              <kbd className="rounded border bg-background px-1 font-mono text-[10px]">←</kbd>{' '}
              <kbd className="rounded border bg-background px-1 font-mono text-[10px]">→</kbd> Chuyển / Đánh giá
            </span>
            <span>
              <kbd className="rounded border bg-background px-1 font-mono text-[10px]">S</kbd> Trộn thẻ
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}
