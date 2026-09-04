'use client';

import { useState } from 'react';
import type { LearnItem } from '@flashcard/contracts';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { apiBrowser } from '@/lib/api/browser';
import { cn } from '@/lib/utils';

const OPTION_CLASS =
  'w-full rounded-md border border-input bg-background px-4 py-3 text-left text-base transition-colors hover:border-primary';

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
    if (answered || !item) return;
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

  if (done) {
    return (
      <Card>
        <CardContent className="space-y-4 py-8 text-center">
          <p className="text-lg font-semibold">Kết quả học</p>
          <p className="text-muted-foreground">
            Bạn trả lời đúng {correctCount} / {items.length} thẻ. Tiến độ ôn tập đã được lưu.
          </p>
          <div className="flex justify-center gap-3">
            <Button onClick={restart}>Học lại</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!item) return null;

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Thẻ {index + 1} / {items.length}
      </p>
      <Card>
        <CardContent className="space-y-4 pt-6">
          <p className="text-xl font-semibold">{item.prompt}</p>

          <ul className="grid gap-2">
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
                      answered && isCorrect && 'border-success bg-success/10',
                      answered && isChosen && !isCorrect && 'border-destructive bg-destructive/10',
                    )}
                  >
                    {choice}
                  </button>
                </li>
              );
            })}
          </ul>

          {answered && (
            <div className="flex items-center justify-between border-t border-border pt-4">
              <span
                className={cn(
                  'text-sm font-medium',
                  selected === item.correctIndex ? 'text-success' : 'text-destructive',
                )}
              >
                {selected === item.correctIndex ? 'Chính xác!' : 'Chưa đúng'}
              </span>
              <Button onClick={next} disabled={saving}>
                {index + 1 < items.length ? 'Tiếp theo' : 'Hoàn thành'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
