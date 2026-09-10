'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, RotateCcw, Send, Sparkles, Trophy } from 'lucide-react';
import type { TestQuestion, TestResult } from '@flashcard/contracts';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { apiBrowser } from '@/lib/api/browser';
import { ApiRequestError } from '@/lib/api/request';
import { flashcardImageUrl } from '@/lib/flashcard-image';
import { NextModesSuggestions } from '@/components/study/next-modes-suggestions';
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
    const isPassed = result.scorePercent >= 70;
    return (
      <div className="space-y-6 animate-in fade-in duration-300 pb-12">
        {/* Banner ket qua diem thi */}
        <Card className="border-primary/20 bg-gradient-to-br from-card via-card to-primary/10 overflow-hidden shadow-lg rounded-3xl">
          <CardContent className="flex flex-col sm:flex-row items-center justify-between gap-6 p-6 sm:p-8">
            <div className="space-y-2 text-center sm:text-left">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                {isPassed ? <Trophy className="size-3.5 text-amber-500" /> : <Sparkles className="size-3.5" />}
                <span>{isPassed ? 'Hoàn thành bài thi xuất sắc!' : 'Đã hoàn thành bài kiểm tra'}</span>
              </div>
              <p className="text-sm font-medium text-muted-foreground">Điểm số của bạn</p>
              <p className="text-5xl font-black text-primary tracking-tight">{result.scorePercent}%</p>
            </div>

            <div className="space-y-2 text-center sm:text-right border-t sm:border-t-0 sm:border-l border-border/60 pt-4 sm:pt-0 sm:pl-6">
              <p className="text-base font-bold text-foreground">
                Đúng {result.correctCount} / {result.totalCount} câu
              </p>
              <p className="text-xs text-muted-foreground">
                Thời gian làm bài: {Math.round((result.durationMs ?? 0) / 1000)} giây
              </p>
              <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2.5 pt-2">
                <Button variant="primary" onClick={() => setResult(null)} className="gap-2 rounded-xl font-semibold shadow-xs">
                  <RotateCcw className="size-4" />
                  <span>Làm lại bài kiểm tra</span>
                </Button>
                <Link
                  href={`/sets/${setId}`}
                  className={cn(buttonVariants({ variant: 'outline' }), 'rounded-xl font-semibold')}
                >
                  Về trang bộ thẻ
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Goi y cac tro choi & che do hoc khac san co de do nham chan */}
        <NextModesSuggestions
          setId={setId}
          currentMode="test"
          layout="grid"
          title="Đổi gió với các trò chơi khác sẵn có"
          subtitle="Thử thách khả năng phản xạ và ghi nhớ qua các hình thức luyện tập khác:"
        />

        {/* Chi tiet dap an bai kiem tra */}
        <div className="space-y-3 pt-4 border-t border-border/60">
          <h3 className="text-base font-bold text-foreground">Chi tiết câu hỏi & bài làm</h3>
          <ul className="space-y-3">
            {result.questions.map((q, i) => (
              <li key={q.id}>
                <Card className="rounded-2xl">
                  <CardContent className="space-y-2 pt-5 text-sm">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Câu {i + 1} · {q.prompt}
                    </p>
                    <p className={cn('font-medium', q.correct ? 'text-emerald-500' : 'text-rose-500')}>
                      {q.correct ? '✓ Đúng' : '✗ Sai'} — Đáp án đúng: {q.correctAnswer}
                    </p>
                    <p className="text-muted-foreground">Bạn chọn: {q.yourAnswer || '(để trống)'}</p>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
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
