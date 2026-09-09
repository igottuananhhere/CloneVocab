'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clock,
  Flame,
  Layers,
  RotateCcw,
  Sparkles,
  Timer,
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
  const [sessionItems, setSessionItems] = useState<LearnItem[]>(items);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [results, setResults] = useState<Record<string, boolean>>({});
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resultFilter, setResultFilter] = useState<'all' | 'correct' | 'incorrect'>('all');

  // Dem nguoc 10 giay
  const [timeLeft, setTimeLeft] = useState(10);
  const autoAdvanceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setSessionItems(items);
  }, [items]);

  const item = sessionItems[index];
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
    if (index + 1 < sessionItems.length) {
      setIndex((prev) => prev + 1);
      setSelected(null);
      setTimeLeft(10);
    } else {
      finish();
    }
  }, [index, sessionItems.length, finish]);

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

  function restart(onlyIncorrect: boolean = false) {
    if (autoAdvanceRef.current) {
      clearTimeout(autoAdvanceRef.current);
      autoAdvanceRef.current = null;
    }

    if (onlyIncorrect) {
      const incorrectList = sessionItems.filter(
        (it) => results[it.flashcardId] === false
      );
      if (incorrectList.length > 0) {
        setSessionItems(incorrectList);
      }
    } else {
      setSessionItems(items);
    }

    setResults({});
    setCorrectCount(0);
    setStreak(0);
    setMaxStreak(0);
    setIndex(0);
    setSelected(null);
    setTimeLeft(10);
    setResultFilter('all');
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
  }, [answered, index, sessionItems.length, done, item, results, next]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (autoAdvanceRef.current) {
        clearTimeout(autoAdvanceRef.current);
      }
    };
  }, []);

  const progressPercent = Math.round(((index + (done ? 1 : 0)) / sessionItems.length) * 100);

  // MAN HINH HOAN THANH
  if (done) {
    const accuracy = Math.round((correctCount / sessionItems.length) * 100);
    const isMastered = accuracy >= 80;
    const incorrectCount = sessionItems.length - correctCount;

    const correctItems = sessionItems.filter(
      (it) => results[it.flashcardId] === true
    );
    const incorrectItems = sessionItems.filter(
      (it) => results[it.flashcardId] === false
    );

    const displayedCards =
      resultFilter === 'correct'
        ? correctItems
        : resultFilter === 'incorrect'
          ? incorrectItems
          : sessionItems;

    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-3 duration-500 pb-12">
        {/* Banner Chuc mung & Diem so tong the */}
        <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-card via-card to-primary/10 p-6 sm:p-8 shadow-xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Ben trai: Loi chuc & Thong tin tong the */}
            <div className="space-y-2 text-center md:text-left flex-1">
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-500">
                <Sparkles className="size-3.5" />
                <span>Hoàn thành phiên ôn tập</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
                {isMastered ? 'Xuất sắc! Bạn đã làm chủ bộ thẻ 🎉' : 'Nỗ lực tuyệt vời! Đã hoàn thành 🎉'}
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-lg">
                Hệ thống lặp lại ngắt quãng (Spaced Repetition) đã ghi nhận tiến độ học của bạn để lên lịch nhắc nhở tối ưu.
              </p>
            </div>

            {/* Ben phai: Vong tron ty le diem (Circle Score Ring) */}
            <div className="flex items-center gap-6 shrink-0">
              <div className="relative flex size-28 sm:size-32 items-center justify-center rounded-full border-4 border-primary/20 bg-card shadow-inner">
                <div
                  className="absolute inset-0 rounded-full border-4 border-primary transition-all duration-1000"
                  style={{
                    clipPath: `polygon(50% 50%, -50% -50%, ${accuracy * 2}% -50%, ${accuracy * 2}% 200%, -50% 200%)`,
                  }}
                />
                <div className="flex flex-col items-center justify-center text-center">
                  <span className="text-2xl sm:text-3xl font-black text-foreground">{accuracy}%</span>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">Chính xác</span>
                </div>
              </div>
            </div>
          </div>

          {/* 3 Hop thong ke chi tiet: Dung, Sai, Chuoi dai nhat */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 pt-6 border-t border-border/60">
            {/* Dung */}
            <div className="flex items-center gap-3.5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3.5">
              <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-500 text-white font-bold">
                <CheckCircle2 className="size-5" />
              </div>
              <div>
                <span className="text-xs text-muted-foreground font-medium">Đã trả lời đúng</span>
                <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                  {correctCount} <span className="text-xs font-normal text-muted-foreground">từ</span>
                </p>
              </div>
            </div>

            {/* Sai / Chua thuoc */}
            <div className="flex items-center gap-3.5 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3.5">
              <div className="flex size-10 items-center justify-center rounded-xl bg-rose-500 text-white font-bold">
                <XCircle className="size-5" />
              </div>
              <div>
                <span className="text-xs text-muted-foreground font-medium">Cần ôn lại (Sai/Hết giờ)</span>
                <p className="text-xl font-bold text-rose-600 dark:text-rose-400">
                  {incorrectCount} <span className="text-xs font-normal text-muted-foreground">từ</span>
                </p>
              </div>
            </div>

            {/* Chuoi dung dai nhat */}
            <div className="flex items-center gap-3.5 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3.5">
              <div className="flex size-10 items-center justify-center rounded-xl bg-amber-500 text-white font-bold">
                <Flame className="size-5" />
              </div>
              <div>
                <span className="text-xs text-muted-foreground font-medium">Chuỗi đúng dài nhất</span>
                <p className="text-xl font-bold text-amber-600 dark:text-amber-400">
                  {maxStreak} <span className="text-xs font-normal text-muted-foreground">câu</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Danh sach chi tiet cac tu da hoc voi bo loc Dung / Sai */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
              <span>Chi tiết từ vựng trong phiên</span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-mono font-semibold text-muted-foreground">
                {sessionItems.length}
              </span>
            </h3>

            {/* Tabs loc */}
            <div className="flex items-center gap-1.5 rounded-xl border border-border bg-card p-1 text-xs">
              <button
                type="button"
                onClick={() => setResultFilter('all')}
                className={cn(
                  'rounded-lg px-3 py-1 font-semibold transition-colors cursor-pointer',
                  resultFilter === 'all'
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Tất cả ({sessionItems.length})
              </button>
              <button
                type="button"
                onClick={() => setResultFilter('correct')}
                className={cn(
                  'rounded-lg px-3 py-1 font-semibold transition-colors cursor-pointer',
                  resultFilter === 'correct'
                    ? 'bg-emerald-500 text-white shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Đúng ({correctItems.length})
              </button>
              {incorrectItems.length > 0 && (
                <button
                  type="button"
                  onClick={() => setResultFilter('incorrect')}
                  className={cn(
                    'rounded-lg px-3 py-1 font-semibold transition-colors cursor-pointer',
                    resultFilter === 'incorrect'
                      ? 'bg-rose-500 text-white shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  Cần ôn lại ({incorrectItems.length})
                </button>
              )}
            </div>
          </div>

          {/* List item */}
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {displayedCards.map((it) => {
              const isItemCorrect = results[it.flashcardId] === true;
              const { word: itemWord, type: itemType } = parsePrompt(it.prompt);
              const correctMeaning = it.choices[it.correctIndex];

              return (
                <div
                  key={it.flashcardId}
                  className={cn(
                    'flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border p-3.5 transition-all shadow-xs',
                    isItemCorrect
                      ? 'border-emerald-500/20 bg-emerald-500/5 hover:border-emerald-500/40'
                      : 'border-rose-500/20 bg-rose-500/5 hover:border-rose-500/40'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        'flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white',
                        isItemCorrect ? 'bg-emerald-500' : 'bg-rose-500'
                      )}
                    >
                      {isItemCorrect ? '✓' : '✗'}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-base text-foreground">{itemWord}</span>
                        {itemType && (
                          <span className="rounded-md border border-primary/20 bg-primary/5 px-1.5 py-0.5 text-[11px] font-semibold text-primary">
                            {itemType}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleSpeak(itemWord)}
                          className="text-muted-foreground hover:text-primary transition-colors p-0.5 cursor-pointer"
                          title="Phát âm"
                        >
                          <Volume2 className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="text-sm font-medium text-foreground sm:text-right pl-10 sm:pl-0">
                    {correctMeaning}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Nút chơi lại */}
        <div className="flex flex-wrap items-center gap-3 pt-2">
          {incorrectItems.length > 0 && (
            <Button
              type="button"
              onClick={() => restart(true)}
              className="rounded-xl font-semibold gap-2 bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/20 h-11 px-5 cursor-pointer"
            >
              <RotateCcw className="size-4" />
              <span>Chỉ ôn lại {incorrectItems.length} từ chưa thuộc</span>
            </Button>
          )}

          <Button
            type="button"
            variant="outline"
            onClick={() => restart(false)}
            className="rounded-xl font-semibold gap-2 h-11 px-5 cursor-pointer"
          >
            <RotateCcw className="size-4" />
            <span>Học lại toàn bộ ({items.length} từ)</span>
          </Button>

          <Link
            href={`/sets/${setId}`}
            className={cn(
              buttonVariants({ variant: 'ghost', size: 'md' }),
              'rounded-xl font-semibold'
            )}
          >
            Về trang bộ thẻ
          </Link>
        </div>

        {/* GOI Y CAC TRO CHOI TIEP THEO (Next Mode Suggestions) */}
        <div className="space-y-4 pt-6 border-t border-border/60">
          <div className="space-y-1 text-left">
            <h3 className="text-base font-bold tracking-tight text-foreground flex items-center gap-2">
              <Sparkles className="size-4 text-amber-500" />
              <span>Bước tiếp theo: Khám phá các chế độ học khác</span>
            </h3>
            <p className="text-xs text-muted-foreground">
              Thay đổi hình thức học giúp não bộ kích hoạt liên kết trí nhớ bền vững hơn.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Match Game */}
            <Link
              href={`/sets/${setId}/match`}
              className="group flex flex-col justify-between rounded-2xl border border-amber-500/25 bg-gradient-to-br from-amber-500/10 via-card to-card p-4 transition-all duration-200 hover:-translate-y-1 hover:border-amber-500/50 hover:shadow-md cursor-pointer text-left"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-amber-500/15 text-amber-500 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                    <Timer className="size-4" />
                  </div>
                  <span className="rounded-full bg-background/80 border border-border/60 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                    Đua phản xạ
                  </span>
                </div>
                <h4 className="mt-3 font-bold text-sm text-foreground">Ghép cặp tính giờ</h4>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  Đua tốc độ nối thẻ từ và nghĩa để lập kỷ lục cá nhân.
                </p>
              </div>
              <div className="mt-3 flex items-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-400 group-hover:underline pt-2 border-t border-border/40">
                <span>Chơi thử ngay</span>
                <ChevronRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
              </div>
            </Link>

            {/* Test Mode */}
            <Link
              href={`/sets/${setId}/test`}
              className="group flex flex-col justify-between rounded-2xl border border-emerald-500/25 bg-gradient-to-br from-emerald-500/10 via-card to-card p-4 transition-all duration-200 hover:-translate-y-1 hover:border-emerald-500/50 hover:shadow-md cursor-pointer text-left"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                    <BookOpen className="size-4" />
                  </div>
                  <span className="rounded-full bg-background/80 border border-border/60 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                    Đo lường
                  </span>
                </div>
                <h4 className="mt-3 font-bold text-sm text-foreground">Kiểm tra thông minh</h4>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  Tự tạo đề thi trắc nghiệm và tự luận chấm điểm ngay.
                </p>
              </div>
              <div className="mt-3 flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 group-hover:underline pt-2 border-t border-border/40">
                <span>Làm bài thi</span>
                <ChevronRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
              </div>
            </Link>

            {/* Flashcard Mode */}
            <Link
              href={`/sets/${setId}/cards`}
              className="group flex flex-col justify-between rounded-2xl border border-blue-500/25 bg-gradient-to-br from-blue-500/10 via-card to-card p-4 transition-all duration-200 hover:-translate-y-1 hover:border-blue-500/50 hover:shadow-md cursor-pointer text-left"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-blue-500/15 text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                    <Layers className="size-4" />
                  </div>
                  <span className="rounded-full bg-background/80 border border-border/60 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                    Ôn lại thẻ
                  </span>
                </div>
                <h4 className="mt-3 font-bold text-sm text-foreground">Thẻ ghi nhớ Flashcard</h4>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  Lật thẻ hai mặt truyền thống, hỗ trợ phát âm và gắn sao.
                </p>
              </div>
              <div className="mt-3 flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 group-hover:underline pt-2 border-t border-border/40">
                <span>Lật thẻ</span>
                <ChevronRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
              </div>
            </Link>
          </div>
        </div>
      </div>
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
            {index + 1} / {sessionItems.length}
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
                className="rounded-xl font-semibold gap-1.5 shadow-xs cursor-pointer"
              >
                <span>{index + 1 < sessionItems.length ? 'Tiếp tục ngay' : 'Xem kết quả'}</span>
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
