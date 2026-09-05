'use client';

import { useState } from 'react';
import { CheckCircle2, RotateCcw, Send } from 'lucide-react';
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

  const answeredCount = Object.keys(answers).length;

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
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="flex items-center justify-between py-6">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Điểm của bạn</p>
              <p className="text-4xl font-bold text-primary">{result.scorePercent}%</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold">
                Đúng {result.correctCount} / {result.totalCount} câu
              </p>
              <p className="text-xs text-muted-foreground">
                Thời gian làm bài: {Math.round((result.durationMs ?? 0) / 1000)} giây
              </p>
            </div>
          </CardContent>
        </Card>

        <ul className="space-y-3">
          {result.questions.map((q, i) => (
            <li key={q.id}>
              <Card>
                <CardContent className="space-y-2 pt-5 text-sm">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Câu {i + 1} · {q.prompt}
                  </p>
                  <p className={cn('font-medium', q.correct ? 'text-success' : 'text-destructive')}>
                    {q.correct ? '✓ Đúng' : '✗ Sai'} — Đáp án đúng: {q.correctAnswer}
                  </p>
                  <p className="text-muted-foreground">Bạn chọn: {q.yourAnswer || '(để trống)'}</p>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>

        <div className="flex justify-center pt-2">
          <Button variant="outline" onClick={() => setResult(null)} className="gap-2">
            <RotateCcw className="size-4" />
            <span>Làm lại bài kiểm tra</span>
          </Button>
        </div>
      </div>
    );
  }

  const CHOICE_LABELS = ['A', 'B', 'C', 'D', 'E', 'F'];

  return (
    <div className="space-y-4">
      {/* Header thong ke so cau da tra loi */}
      <div className="sticky top-16 z-10 flex items-center justify-between rounded-lg border border-border bg-background/95 p-3 backdrop-blur shadow-sm">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CheckCircle2 className="size-4 text-primary" />
          <span>
            Đã trả lời: <strong className="text-foreground">{answeredCount}</strong> / {questions.length} câu
          </span>
        </div>
        <Button
          onClick={submit}
          disabled={submitting || answeredCount === 0}
          size="sm"
          className="gap-1.5"
        >
          <Send className="size-3.5" />
          <span>{submitting ? 'Đang nộp...' : 'Nộp bài'}</span>
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {questions.map((q, qi) => (
        <Card key={q.id}>
          <CardContent className="space-y-3 pt-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {q.instruction}
              </span>
              <span className="text-xs text-muted-foreground">Câu {qi + 1} / {questions.length}</span>
            </div>

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

            <p className="text-lg font-medium leading-snug">
              {qi + 1}. {q.prompt}
            </p>

            {q.type === 'MULTIPLE_CHOICE' && (
              <div className="grid gap-2 pt-1">
                {q.choices?.map((choice, i) => {
                  const isSelected = answers[q.id] === String(i);
                  return (
                    <label
                      key={i}
                      className={cn(
                        'flex cursor-pointer items-center justify-between gap-3 rounded-lg border p-3 text-sm transition-colors',
                        isSelected
                          ? 'border-primary bg-primary/5 font-medium'
                          : 'border-border hover:bg-muted/50',
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={cn(
                            'flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold',
                            isSelected
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'border-border bg-muted/60 text-muted-foreground',
                          )}
                        >
                          {CHOICE_LABELS[i] ?? i + 1}
                        </span>
                        <span>{choice}</span>
                      </div>
                      <input
                        type="radio"
                        name={q.id}
                        value={i}
                        checked={isSelected}
                        onChange={(e) =>
                          setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))
                        }
                        className="sr-only"
                      />
                    </label>
                  );
                })}
              </div>
            )}

            {q.type === 'WRITTEN' && (
              <input
                className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Nhập câu trả lời của bạn..."
                value={answers[q.id] || ''}
                onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
              />
            )}

            {q.type === 'TRUE_FALSE' && (
              <div className="flex gap-3 pt-1">
                {[
                  { value: 'true', label: 'Đúng' },
                  { value: 'false', label: 'Sai' },
                ].map((opt) => {
                  const isSelected = answers[q.id] === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: opt.value }))}
                      className={cn(
                        'flex-1 rounded-lg border p-3 text-sm font-semibold transition-colors',
                        isSelected
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border hover:bg-muted/50 text-muted-foreground',
                      )}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      <div className="flex justify-end pt-2">
        <Button onClick={submit} disabled={submitting || answeredCount === 0} size="lg" className="gap-2">
          <Send className="size-4" />
          <span>
            {submitting ? 'Đang nộp bài...' : `Nộp bài (${answeredCount}/${questions.length})`}
          </span>
        </Button>
      </div>
    </div>
  );
}
