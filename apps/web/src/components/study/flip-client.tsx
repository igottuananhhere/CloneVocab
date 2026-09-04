'use client';

import { useState } from 'react';
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

  const knownCount = Object.values(results).filter(Boolean).length;

  if (done) {
    return (
      <Card>
        <CardContent className="space-y-4 py-8 text-center">
          <p className="text-3xl font-bold">Hoàn thành!</p>
          <p className="text-muted-foreground">
            Đã thuộc {knownCount} / {cards.length} thẻ
          </p>
          <div className="flex justify-center gap-3">
            <Button onClick={restart}>Học lại</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!card) return null;

  const imgUrl = flashcardImageUrl(card.imagePath);

  return (
    <Card>
      <button
        type="button"
        onClick={() => setFlipped((value) => !value)}
        className="flex min-h-[18rem] w-full flex-col items-center justify-center rounded-t-lg p-6 text-center"
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
            <Button variant="outline" disabled={saving} onClick={() => record(false)}>
              Chưa thuộc
            </Button>
            <Button disabled={saving} onClick={() => record(true)}>Đã thuộc</Button>
          </>
        )}
      </div>

      <p className="px-4 pb-4 text-center text-sm text-muted-foreground">
        Thẻ {index + 1} / {cards.length}
      </p>
    </Card>
  );
}
