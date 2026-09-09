'use client';

import { useState, useCallback } from 'react';
import {
  Volume2,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  RotateCw,
  Star,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const DEMO_CARDS = [
  {
    id: 'demo-1',
    word: 'substantial',
    ipa: '/səbˈstænʃl/',
    type: 'adj',
    meaning: 'Lớn lao, đáng kể, có giá trị thực sự',
    example: 'The team achieved a substantial increase in vocabulary retention.',
  },
  {
    id: 'demo-2',
    word: 'perseverance',
    ipa: '/ˌpɜːsəˈvɪərəns/',
    type: 'n',
    meaning: 'Sự kiên trì, bền bỉ vượt qua thử thách',
    example: 'Success in language learning requires patience and perseverance.',
  },
  {
    id: 'demo-3',
    word: 'fluency',
    ipa: '/ˈfluːənsi/',
    type: 'n',
    meaning: 'Sự lưu loát, trôi chảy khi giao tiếp ngôn ngữ',
    example: 'Daily flashcard practice leads to natural speaking fluency.',
  },
];

export function InteractiveHeroDemo() {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [isStarred, setIsStarred] = useState(false);

  const card = DEMO_CARDS[index]!;

  const handleNext = useCallback(() => {
    setFlipped(false);
    setIndex((prev) => (prev + 1) % DEMO_CARDS.length);
  }, []);

  const handlePrev = useCallback(() => {
    setFlipped(false);
    setIndex((prev) => (prev - 1 + DEMO_CARDS.length) % DEMO_CARDS.length);
  }, []);

  function handleSpeak(e: React.MouseEvent) {
    e.stopPropagation();
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(card.word);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  }

  return (
    <div className="relative mx-auto w-full max-w-lg">
      {/* Hiệu ứng nền phát sáng dịu nhẹ */}
      <div className="absolute -inset-2 rounded-3xl bg-gradient-to-r from-blue-500/20 via-primary/20 to-purple-500/20 blur-xl opacity-75 dark:opacity-50" />

      <div className="relative rounded-3xl border border-border/80 bg-card/95 p-5 shadow-2xl backdrop-blur-md">
        {/* Thanh tiêu đề nhỏ mô phỏng demo */}
        <div className="flex items-center justify-between pb-3 text-xs text-muted-foreground border-b border-border/50">
          <div className="flex items-center gap-1.5 font-medium text-primary">
            <Sparkles className="size-3.5 animate-pulse text-amber-500" />
            <span>Thử lật thẻ ngay bây giờ</span>
          </div>
          <span className="font-mono font-semibold rounded-full bg-muted px-2 py-0.5 text-[11px]">
            {index + 1} / {DEMO_CARDS.length}
          </span>
        </div>

        {/* Khung lật thẻ 3D */}
        <div className="mt-3 [perspective:1000px]">
          <div
            onClick={() => setFlipped((prev) => !prev)}
            className={cn(
              'relative h-56 sm:h-64 w-full cursor-pointer rounded-2xl border border-blue-500/20 bg-gradient-to-br from-card via-card to-blue-500/5 shadow-md transition-transform duration-500 [transform-style:preserve-3d] hover:border-primary/50 select-none',
              flipped && '[transform:rotateY(180deg)]'
            )}
          >
            {/* MẶT TRƯỚC: Thuật ngữ tiếng Anh */}
            <div className="absolute inset-0 flex flex-col justify-between p-5 [backface-visibility:hidden]">
              <div className="flex items-center justify-between text-xs">
                <span className="inline-flex items-center rounded-md border border-primary/25 bg-primary/10 px-2 py-0.5 font-semibold text-primary">
                  {card.type}
                </span>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handleSpeak}
                    className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                    title="Phát âm tiếng Anh"
                  >
                    <Volume2 className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsStarred((prev) => !prev);
                    }}
                    className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-amber-500/10 hover:text-amber-500 transition-colors"
                    title="Đánh dấu sao"
                  >
                    <Star
                      className={cn(
                        'size-4',
                        isStarred ? 'fill-amber-400 text-amber-400' : ''
                      )}
                    />
                  </button>
                </div>
              </div>

              <div className="text-center my-auto px-2">
                <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                  {card.word}
                </h3>
                <p className="mt-1 font-mono text-sm text-muted-foreground">
                  {card.ipa}
                </p>
              </div>

              <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground/80">
                <RotateCw className="size-3" />
                <span>Nhấn để xem nghĩa tiếng Việt</span>
              </div>
            </div>

            {/* MẶT SAU: Định nghĩa tiếng Việt & Ví dụ */}
            <div className="absolute inset-0 flex flex-col justify-between p-5 [backface-visibility:hidden] [transform:rotateY(180deg)]">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-semibold text-primary">{card.word}</span>
                <span className="text-[11px] text-muted-foreground">Mặt sau</span>
              </div>

              <div className="text-center my-auto px-2 space-y-2">
                <p className="text-lg sm:text-xl font-bold text-foreground leading-snug">
                  {card.meaning}
                </p>
                <p className="text-xs text-muted-foreground italic leading-relaxed">
                  &ldquo;{card.example}&rdquo;
                </p>
              </div>

              <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground/80">
                <CheckCircle2 className="size-3 text-emerald-500" />
                <span>Nhấn để lật lại từ vựng</span>
              </div>
            </div>
          </div>
        </div>

        {/* Nút điều hướng dưới thẻ */}
        <div className="mt-4 flex items-center justify-between pt-1">
          <div className="text-xs text-muted-foreground">
            Phím tắt: Lật thẻ <kbd className="rounded border bg-muted px-1 py-0.5 font-mono text-[10px]">Click</kbd>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrev}
              className="flex size-8 items-center justify-center rounded-full border border-border bg-card text-foreground hover:bg-muted transition-colors shadow-xs"
              title="Thẻ trước"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="flex size-8 items-center justify-center rounded-full border border-border bg-card text-foreground hover:bg-muted transition-colors shadow-xs"
              title="Thẻ kế tiếp"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
