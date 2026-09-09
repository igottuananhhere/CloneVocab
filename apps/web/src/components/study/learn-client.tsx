'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Flame,
  RotateCcw,
  Sparkles,
  Trophy,
  Volume2,
  XCircle,
} from 'lucide-react';
import type { LearnItem } from '@flashcard/contracts';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { apiBrowser } from '@/lib/api/browser';
import { flashcardImageUrl } from '@/lib/flashcard-image';
import { cn } from '@/lib/utils';

function parsePrompt(prompt: string) {
  let word = prompt.trim();
  let type: string | undefined;

  const typeMatch = word.match(/\(([a-zA-Z\s,]+)\)$/);
  if (typeMatch) {
    type = typeMatch[1]?.trim();
    word = word.replace(/\(([a-zA-Z\s,]+)\)$/, '').trim();
  }

  return { word, type };
}

function handleSpeak(text: string) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  utterance.rate = 0.9;
  window.speechSynthesis.speak(utterance);
}

export function LearnClient({ setId, items }: { setId: string; items: LearnItem[] }) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [results, setResults] = useState<Record<string, boolean>>({});
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);

  // Dem nguoc 10 giay
  const [timeLeft, setTimeLeft] = useState(10);
  const autoAdvanceRef = useRef<NodeJS.Timeout | null>(null);

  const item = items[index];
  const answered = selected !== null;

  const { word, type } = useMemo(() => {
    return item ? parsePrompt(item.prompt) : { word: '', type: undefined };
  }, [item]);

  const finish = useCallback(async () => {
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
  }, [setId, results]);

  const next = useCallback(() => {
    if (autoAdvanceRef.current) {
      clearTimeout(autoAdvanceRef.current);
      autoAdvanceRef.current = null;
    }
    if (index + 1 < items.length) {
      setIndex((prev) => prev + 1);
      setSelected(null);
      setTimeLeft(10);
    } else {
      finish();
    }
  }, [index, items.length, finish]);

  // Xu ly khi het 10 giay
  const handleTimeout = useCallback(() => {
    if (selected !== null || !item) return;
    setSelected(-1); // -1 = het gio
    setStreak(0);
    setResults((prev) => ({ ...prev, [item.flashcardId]: false }));

    // Hien thi dap an dung trong 2s roi tu dong chuyen sang cau tiep theo
    autoAdvanceRef.current = setTimeout(() => {
      next();
    }, 2000);
  }, [item, selected, next]);

  // Bo dem thoi gian 10s cho moi cau
  useEffect(() => {
    if (done || answered) return;

    setTimeLeft(10);
    const startTime = Date.now();
    const duration = 10000; // 10s

    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, Math.ceil((duration - elapsed) / 1000));
      setTimeLeft(remaining);

      if (remaining <= 0) {
        clearInterval(timer);
        handleTimeout();
      }
    }, 200);

    return () => clearInterval(timer);
  }, [index, done, answered, handleTimeout]);

  // Chon dap an
  function choose(choiceIndex: number) {
    if (answered || !item || choiceIndex >= item.choices.length) return;
    setSelected(choiceIndex);
    const correct = choiceIndex === item.correctIndex;

    if (correct) {
      setCorrectCount((prev) => prev + 1);
      setStreak((prev) => {
        const nextStreak = prev + 1;
        setMaxStreak((m) => Math.max(m, nextStreak));
        return nextStreak;
      });
      setResults((prev) => ({ ...prev, [item.flashcardId]: true }));

      // Tu dong phat am tu tieng Anh khi dung
      handleSpeak(word);

      // Tu dong chuyen sang cau tiep theo sau 750ms
      autoAdvanceRef.current = setTimeout(() => {
        next();
      }, 750);
    } else {
      setStreak(0);
      setResults((prev) => ({ ...prev, [item.flashcardId]: false }));

      // Tu dong chuyen sau 3.5s de nguoi dung co thoi gian doc dap an dung
      autoAdvanceRef.current = setTimeout(() => {
        next();
      }, 3500);
    }
  }

  function restart() {
    if (autoAdvanceRef.current) {
      clearTimeout(autoAdvanceRef.current);
      autoAdvanceRef.current = null;
    }
    setResults({});
    setCorrectCount(0);
    setStreak(0);
    setMaxStreak(0);
    setIndex(0);
    setSelected(null);
    setTimeLeft(10);
    setDone(false);
  }

  // Phim tat: 1-4 de chon, Space / Enter de tiep theo
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answered, index, items.length, done, item, results, next]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (autoAdvanceRef.current) {
        clearTimeout(autoAdvanceRef.current);
      }
    };
  }, []);

  const progressPercent = Math.round(((index + (done ? 1 : 0)) / items.length) * 100);

  // MAN HINH HOAN THANH
  if (done) {
    const accuracy = Math.round((correctCount / items.length) * 100);
    const isMastered = accuracy >= 80;

    return (
      <Card className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-b from-card via-card to-primary/5 shadow-2xl">
        <CardContent className="space-y-6 py-12 text-center">
          {/* Huy hieu cup chien thang */}
          <div className="relative mx-auto flex size-20 items-center justify-center rounded-3xl bg-gradient-to-tr from-amber-500 to-yellow-300 text-amber-950 shadow-lg shadow-amber-500/30 animate-in zoom-in-75 duration-300">
            <Trophy className="size-10" />
            <Sparkles className="absolute -top-2 -right-2 size-6 text-amber-400 animate-bounce" />
          </div>

          <div className="space-y-2">
            <h2 className="text-3xl font-extrabold tracking-tight text-foreground">
              {isMastered ? 'Xuất sắc! Bạn đã hoàn thành!' : 'Hoàn thành phiên học!'}
            </h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Thuật toán lặp lại ngắt quãng đã cập nhật tiến độ ghi nhớ cho từng từ vựng vào hệ thống.
            </p>
          </div>

          {/* 3 Thong so tong ket */}
          <div className="grid grid-cols-3 gap-3 max-w-md mx-auto pt-2">
            <div className="rounded-2xl border border-border/80 bg-background/60 p-3 backdrop-blur-xs">
              <span className="text-xs text-muted-foreground">Độ chính xác</span>
              <p className="text-2xl font-black text-primary mt-0.5">{accuracy}%</p>
            </div>
            <div className="rounded-2xl border border-border/80 bg-background/60 p-3 backdrop-blur-xs">
              <span className="text-xs text-muted-foreground">Số từ đúng</span>
              <p className="text-2xl font-black text-emerald-500 mt-0.5">
                {correctCount} / {items.length}
              </p>
            </div>
            <div className="rounded-2xl border border-border/80 bg-background/60 p-3 backdrop-blur-xs">
              <span className="text-xs text-muted-foreground">Chuỗi dài nhất</span>
              <p className="text-2xl font-black text-amber-500 mt-0.5 flex items-center justify-center gap-1">
                <Flame className="size-4 fill-amber-500" />
                <span>{maxStreak}</span>
              </p>
            </div>
          </div>

          {/* Cac nut hanh dong */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
            <Button onClick={restart} variant="outline" className="rounded-xl font-semibold gap-2 h-11 px-5 shadow-xs">
              <RotateCcw className="size-4" />
              <span>Học lại phiên này</span>
            </Button>
            <Link
              href={`/sets/${setId}`}
              className={cn(
                buttonVariants({ size: 'md' }),
                'rounded-xl font-semibold gap-2 h-11 px-6 shadow-md shadow-primary/25'
              )}
            >
              <span>Quay lại bộ thẻ</span>
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!item) return null;

  const isCorrect = selected === item.correctIndex;
  const isTimeout = selected === -1;

  // Mau cua thanh dem nguoc
  const timerColor =
    timeLeft > 5
      ? 'bg-primary'
      : timeLeft > 3
        ? 'bg-amber-500'
        : 'bg-rose-500 animate-pulse';

  return (
    <div className="space-y-4">
      {/* Thanh Header Game: Tien trinh, Chuoi Flame, Bo dem gio 10s */}
      <div className="flex items-center justify-between gap-3 px-1 text-xs">
        {/* So cau & Tien trinh */}
        <div className="flex items-center gap-2 font-mono">
          <span className="font-bold text-foreground">
            {index + 1} / {items.length}
          </span>
          <span className="text-muted-foreground font-sans">({progressPercent}%)</span>
        </div>

        {/* Chuoi Streak Flame */}
        {streak > 1 && (
          <div className="flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-amber-500 font-bold text-xs animate-in zoom-in-75">
            <Flame className="size-3.5 fill-amber-500 text-amber-500 animate-bounce" />
            <span>Chuỗi {streak} câu!</span>
          </div>
        )}

        {/* Dong ho dem nguoc 10 giay */}
        <div
          className={cn(
            'flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono font-bold transition-all shadow-xs',
            timeLeft > 5
              ? 'border-border bg-card text-foreground'
              : timeLeft > 3
                ? 'border-amber-500/40 bg-amber-500/15 text-amber-500'
                : 'border-rose-500/50 bg-rose-500/20 text-rose-500 animate-pulse'
          )}
        >
          <Clock className="size-3.5" />
          <span>{timeLeft}s</span>
        </div>
      </div>

      {/* Main Game Card */}
      <Card className="relative overflow-hidden rounded-3xl border border-purple-500/20 bg-gradient-to-b from-card via-card to-purple-500/5 shadow-xl transition-all">
        {/* Thanh dem nguoc 10s chay tren dau card */}
        <div className="h-1.5 w-full bg-muted/60 overflow-hidden">
          <div
            className={cn('h-full transition-all duration-200 ease-linear', timerColor)}
            style={{ width: answered ? '0%' : `${(timeLeft / 10) * 100}%` }}
          />
        </div>

        <CardContent className="space-y-6 p-6 sm:p-8">
          {/* Anh minh hoa neu co */}
          {item.imagePath && (
            <div className="mx-auto max-h-48 max-w-xs overflow-hidden rounded-2xl border border-border bg-muted shadow-xs">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={flashcardImageUrl(item.imagePath) || ''}
                alt={word}
                className="max-h-48 w-auto object-contain mx-auto"
              />
            </div>
          )}

          {/* Tu vung / Thuat ngu de hoi */}
          <div className="flex flex-col items-center justify-center text-center space-y-2.5 py-2">
            <div className="flex flex-wrap items-center justify-center gap-2">
              <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
                {word}
              </span>
              {type && (
                <span className="inline-flex items-center rounded-lg border border-primary/25 bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                  ({type})
                </span>
              )}
              <button
                type="button"
                onClick={() => handleSpeak(word)}
                className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-colors cursor-pointer"
                title="Nghe phát âm tiếng Anh"
              >
                <Volume2 className="size-4" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Chọn định nghĩa tiếng Việt chính xác:
            </p>
          </div>

          {/* 4 Lua chon dap an */}
          <ul className="grid gap-3">
            {item.choices.map((choice, choiceIndex) => {
              const isOptionCorrect = choiceIndex === item.correctIndex;
              const isOptionChosen = choiceIndex === selected;

              return (
                <li key={choiceIndex}>
                  <button
                    type="button"
                    onClick={() => choose(choiceIndex)}
                    disabled={answered}
                    className={cn(
                      'group relative flex w-full items-center justify-between gap-3 rounded-2xl border p-4 text-left font-medium transition-all duration-200 cursor-pointer shadow-xs select-none',
                      // Chua tra loi
                      !answered &&
                        'border-border/80 bg-background/80 hover:-translate-y-0.5 hover:border-primary/50 hover:bg-accent/40 focus:outline-none focus:ring-2 focus:ring-primary/20',
                      // Dung
                      answered &&
                        isOptionCorrect &&
                        'border-emerald-500 bg-emerald-500/15 ring-2 ring-emerald-500/30 text-foreground font-semibold',
                      // Sai
                      answered &&
                        isOptionChosen &&
                        !isOptionCorrect &&
                        'border-rose-500 bg-rose-500/15 ring-2 ring-rose-500/30 text-foreground',
                      // Khong duoc chon khi da tra loi
                      answered &&
                        !isOptionChosen &&
                        !isOptionCorrect &&
                        'opacity-40 border-border/60 bg-muted/20'
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Badge so 1, 2, 3, 4 */}
                      <span
                        className={cn(
                          'flex size-7 shrink-0 items-center justify-center rounded-xl border text-xs font-bold font-mono transition-colors',
                          answered && isOptionCorrect
                            ? 'border-emerald-500 bg-emerald-500 text-white'
                            : answered && isOptionChosen && !isOptionCorrect
                              ? 'border-rose-500 bg-rose-500 text-white'
                              : 'border-border bg-muted/60 text-muted-foreground group-hover:border-primary/40 group-hover:bg-primary/10 group-hover:text-primary'
                        )}
                      >
                        {choiceIndex + 1}
                      </span>
                      <span className="text-sm sm:text-base leading-snug">{choice}</span>
                    </div>

                    {/* Phim tat 1-4 hoac icon check/x */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {answered && isOptionCorrect && (
                        <CheckCircle2 className="size-5 text-emerald-500 animate-in zoom-in-75" />
                      )}
                      {answered && isOptionChosen && !isOptionCorrect && (
                        <XCircle className="size-5 text-rose-500 animate-in zoom-in-75" />
                      )}
                      {!answered && (
                        <kbd className="hidden sm:inline-block rounded-md border border-border/80 bg-muted/60 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
                          {choiceIndex + 1}
                        </kbd>
                      )}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>

          {/* Thanh phan hoi sau khi tra loi */}
          {answered && (
            <div
              className={cn(
                'flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4 animate-in fade-in slide-in-from-bottom-2',
                isCorrect
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : 'border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400'
              )}
            >
              <div className="flex items-center gap-2 text-sm font-bold">
                {isCorrect ? (
                  <>
                    <CheckCircle2 className="size-5 shrink-0" />
                    <span>Chính xác! Đang tự động chuyển thẻ...</span>
                  </>
                ) : isTimeout ? (
                  <>
                    <Clock className="size-5 shrink-0" />
                    <span>Hết 10 giây! Tự tính là chưa thuộc.</span>
                  </>
                ) : (
                  <>
                    <XCircle className="size-5 shrink-0" />
                    <span>Chưa chính xác! Hãy ghi nhớ lại thẻ này.</span>
                  </>
                )}
              </div>

              <Button
                type="button"
                onClick={next}
                disabled={saving}
                size="sm"
                className="rounded-xl font-semibold gap-1.5 shadow-xs"
              >
                <span>{index + 1 < items.length ? 'Tiếp tục ngay' : 'Xem kết quả'}</span>
                <kbd className="hidden sm:inline-block rounded bg-primary-foreground/20 px-1 font-mono text-[10px]">
                  Space ↵
                </kbd>
              </Button>
            </div>
          )}
        </CardContent>

        {/* Footer huong dan */}
        <div className="flex flex-wrap items-center justify-between border-t border-border/40 bg-muted/20 px-6 py-3 text-xs text-muted-foreground">
          <span>Phím số 1 - 4 để chọn nhanh</span>
          <span className="hidden sm:inline">Trả lời đúng sẽ tự động sang câu tiếp theo</span>
        </div>
      </Card>
    </div>
  );
}
