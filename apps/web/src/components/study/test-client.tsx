'use client';

import { useState } from 'react';
import type { TestQuestion, TestResult } from '@flashcard/contracts';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { apiBrowser } from '@/lib/api/browser';
import { ApiRequestError } from '@/lib/api/request';
import { flashcardImageUrl } from '@/lib/flashcard-image';
import { cn } from '@/lib/utils';

export function TestClient({
  setId,
  questions,
}: {
  setId: string;
  questions: TestQuestion[];
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<TestResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [startedAt] = useState(() => Date.now());
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await apiBrowser<TestResult>(`/study-sets/${setId}/test`, {
        method: 'POST',
        body: { answers, durationMs: Date.now() - startedAt },
      });
      setResult(res);
    } catch (err) {
      setError(
        err instanceof ApiRequestError ? err.message : 'Không thể nộp bài. Thử lại sau.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="flex items-center justify-between py-6">
            <div>
              <p className="text-sm text-muted-foreground">Điểm của bạn</p>
              <p className="text-3xl font-bold">{result.scorePercent}%</p>
            </div>
            <p className="text-sm text-muted-foreground">
              Đúng {result.correctCount} / {result.totalCount}
            </p>
          </CardContent>
        </Card>

        <ul className="space-y-3">
          {result.questions.map((q, i) => (
            <li key={q.id}>
              <Card>
                <CardContent className="space-y-1 pt-5 text-sm">
                  <p className="text-xs text-muted-foreground">
                    Câu {i + 1} · {q.prompt}
                  </p>
                  <p className={cn(q.correct ? 'text-success' : 'text-destructive')}>
                    {q.correct ? '✓ Đúng' : '✗ Sai'} — Đáp án: {q.correctAnswer}
                  </p>
                  <p className="text-muted-foreground">Bạn chọn: {q.yourAnswer || '(trống)'}</p>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>

        <Button variant="outline" onClick={() => setResult(null)}>
          Làm lại
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-destructive">{error}</p>}

      {questions.map((q, qi) => (
        <Card key={q.id}>
          <CardContent className="space-y-3 pt-5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              {q.instruction}
            </p>
            {q.imagePath && (
              <div className="max-h-40 max-w-xs overflow-hidden rounded-md border border-border bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={flashcardImageUrl(q.imagePath) || ''}
                  alt={q.prompt}
                  className="max-h-40 w-auto object-contain"
                />
              </div>
            )}
            <p className="font-medium">
              {qi + 1}. {q.prompt}
            </p>

            {q.type === 'MULTIPLE_CHOICE' &&
              q.choices?.map((choice, i) => (
                <label key={i} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name={q.id}
                    value={i}
                    onChange={(e) =>
                      setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))
                    }
                  />
                  {choice}
                </label>
              ))}

            {q.type === 'WRITTEN' && (
              <input
                className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base"
                placeholder="Nhập câu trả lời"
                onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
              />
            )}

            {q.type === 'TRUE_FALSE' && (
              <div className="flex gap-2">
                {[
                  { value: 'true', label: 'Đúng' },
                  { value: 'false', label: 'Sai' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: opt.value }))}
                    className={cn(
                      'flex-1 rounded-md border border-input px-4 py-2 text-sm',
                      answers[q.id] === opt.value && 'border-primary bg-primary/10',
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      <Button onClick={submit} disabled={submitting}>
        {submitting ? 'Đang nộp...' : 'Nộp bài'}
      </Button>
    </div>
  );
}
