'use client';

import { useState } from 'react';
import type { Flashcard } from '@flashcard/contracts';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { apiBrowser } from '@/lib/api/browser';

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
    const next = { ...results, [card.id]: known };
    setResults(next);
    if (index + 1 < cards.length) {
      setIndex(index + 1);
      setFlipped(false);
    } else {
      finish(next);
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

  if (done) {
    const known = Object.values(results).filter(Boolean).length;
    return (
      <Card>
        <CardContent className="space-y-4 py-8 text-center">
          <p className="text-lg font-semibold">Đã ôn xong {cards.length} thẻ</p>
          <p className="text-muted-foreground">
            Bạn thuộc {known} / {cards.length} thẻ. Tiến độ đã được lưu.
          </p>
          <div className="flex justify-center gap-3">
            <Button onClick={restart}>Học lại</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!card) return null;

  return (
    <Card>
      <button
        type="button"
        onClick={() => setFlipped((value) => !value)}
        className="flex min-h-[16rem] w-full flex-col items-center justify-center rounded-t-lg p-6 text-center"
      >
        <span className="text-2xl font-semibold">{flipped ? card.definition : card.term}</span>
        <span className="mt-3 text-sm text-muted-foreground">
          {flipped ? 'Mặt sau' : 'Mặt trước — nhấn để lật'}
        </span>
      </button>

      <div className="flex items-center justify-center gap-3 border-t border-border p-4">
        {!flipped ? (
          <Button onClick={() => setFlipped(true)}>Lật thẻ</Button>
        ) : (
          <>
            <Button variant="outline" onClick={() => record(false)}>
              Chưa thuộc
            </Button>
            <Button onClick={() => record(true)}>Đã thuộc</Button>
          </>
        )}
      </div>

      <p className="px-4 pb-4 text-center text-sm text-muted-foreground">
        Thẻ {index + 1} / {cards.length}
      </p>
    </Card>
  );
}
