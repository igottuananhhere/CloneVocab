'use client';

import { useEffect, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import type { LearnItem } from '@flashcard/contracts';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { apiBrowser } from '@/lib/api/browser';
import { flashcardImageUrl } from '@/lib/flashcard-image';
import { cn } from '@/lib/utils';

const OPTION_CLASS =
  'w-full rounded-lg border border-input bg-background p-3.5 text-left text-base transition-colors hover:border-primary focus:outline-none';

export function LearnClient({ setId, items }: { setId: string; items: LearnItem[] }) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [results, setResults] = useState<Record<string, boolean>>({});
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);

  const item = items[index];
  const answered = selected !== null;

  function choose(choiceIndex: number) {
    if (answered || !item || choiceIndex >= item.choices.length) return;
    setSelected(choiceIndex);
    const correct = choiceIndex === item.correctIndex;
    if (correct) setCorrectCount((value) => value + 1);
    setResults((prev) => ({ ...prev, [item.flashcardId]: correct }));
  }

  function next() {
    if (index + 1 < items.length) {
      setIndex(index + 1);
      setSelected(null);
    } else {
      finish();
    }
  }

  async function finish() {
    setSaving(true);
    try {
      await apiBrowser(`/study-sets/${setId}/review`, {
        method: 'POST',
        body: {
          results: Object.entries(results).map(([flashcardId, correct]) => ({
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
    setCorrectCount(0);
    setIndex(0);
    setSelected(null);
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

      if (!answered) {
        if (e.key === '1') {
          e.preventDefault();
          choose(0);
        } else if (e.key === '2') {
          e.preventDefault();
          choose(1);
        } else if (e.key === '3') {
          e.preventDefault();
          choose(2);
        } else if (e.key === '4') {
          e.preventDefault();
          choose(3);
        }
      } else {
        if (e.code === 'Space' || e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          next();
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [answered, index, items.length, done, item, results]);

  const progressPercent = Math.round(((index + (done ? 1 : 0)) / items.length) * 100);

  if (done) {
    return (
      <Card>
        <CardContent className="space-y-4 py-8 text-center">
          <p className="text-2xl font-bold">Kết quả học</p>
          <p className="text-muted-foreground">
            Bạn trả lời đúng {correctCount} / {items.length} thẻ. Tiến độ ôn tập đã được lưu.
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

  if (!item) return null;

  return (
    <div className="space-y-3">
      <Card className="overflow-hidden shadow-sm">
        {/* Thanh tien trinh muot ma */}
        <div className="h-1.5 w-full bg-muted">
          <div
            className="h-full bg-primary transition-all duration-300 ease-out"
            style={{
              width: `${Math.min(100, Math.max(0, ((index + 1) / items.length) * 100))}%`,
            }}
          />
        </div>

        <CardContent className="space-y-4 pt-6">
          {item.imagePath && (
            <div className="max-h-48 max-w-xs overflow-hidden rounded-lg border border-border bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={flashcardImageUrl(item.imagePath) || ''}
                alt={item.prompt}
                className="max-h-48 w-auto object-contain"
              />
            </div>
          )}
          <p className="text-xl font-semibold">{item.prompt}</p>

          <ul className="grid gap-2.5">
            {item.choices.map((choice, choiceIndex) => {
              const isCorrect = choiceIndex === item.correctIndex;
              const isChosen = choiceIndex === selected;
              return (
                <li key={choiceIndex}>
                  <button
                    type="button"
                    onClick={() => choose(choiceIndex)}
                    disabled={answered}
                    className={cn(
                      OPTION_CLASS,
                      answered && isCorrect && 'border-success bg-success/10 font-medium',
                      answered && isChosen && !isCorrect && 'border-destructive bg-destructive/10 font-medium',
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={cn(
                            'flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold',
                            answered && isCorrect
                              ? 'border-success bg-success text-success-foreground'
                              : answered && isChosen && !isCorrect
                                ? 'border-destructive bg-destructive text-destructive-foreground'
                                : 'border-border bg-muted/60 text-muted-foreground',
                          )}
                        >
                          {choiceIndex + 1}
                        </span>
                        <span className="truncate">{choice}</span>
                      </div>
                      <kbd className="hidden sm:inline-block rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
                        {choiceIndex + 1}
                      </kbd>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>

          {answered && (
            <div className="flex items-center justify-between border-t border-border pt-4 animate-in fade-in">
              <span
                className={cn(
                  'text-sm font-semibold',
                  selected === item.correctIndex ? 'text-success' : 'text-destructive',
                )}
              >
                {selected === item.correctIndex ? '✓ Chính xác!' : '✗ Chưa đúng'}
              </span>
              <Button onClick={next} disabled={saving} className="gap-2">
                <span>{index + 1 < items.length ? 'Tiếp theo' : 'Hoàn thành'}</span>
                <kbd className="hidden sm:inline-block rounded border border-primary-foreground/30 bg-primary-foreground/10 px-1.5 py-0.5 text-[10px] font-mono">
                  Space ↵
                </kbd>
              </Button>
            </div>
          )}
        </CardContent>

        {/* Footer chi so & phim tat */}
        <div className="flex flex-wrap items-center justify-between border-t border-border/50 bg-muted/20 px-4 py-2.5 text-xs text-muted-foreground">
          <span>
            Thẻ {index + 1} / {items.length} ({progressPercent}%)
          </span>
          <div className="hidden sm:flex items-center gap-3">
            <span>
              <kbd className="rounded border bg-background px-1 font-mono text-[10px]">1 - 4</kbd> Chọn đáp án
            </span>
            {answered && (
              <span>
                <kbd className="rounded border bg-background px-1 font-mono text-[10px]">Space / Enter</kbd> Tiếp theo
              </span>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
