'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Lightbulb,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  Settings,
  Shuffle,
  Star,
  Volume2,
} from 'lucide-react';
import type { Flashcard } from '@flashcard/contracts';
import { parseVocabCard, type ParsedVocabCard } from './flip-client';
import { flashcardImageUrl } from '@/lib/flashcard-image';

function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = result[i]!;
    result[i] = result[j]!;
    result[j] = temp;
  }
  return result;
}

interface SetFlashcardPreviewProps {
  setId: string;
  cards: Flashcard[];
  setTitle?: string;
}

export function SetFlashcardPreview({
  setId,
  cards,
  setTitle,
}: SetFlashcardPreviewProps) {
  const allParsed = useMemo(() => cards.map(parseVocabCard), [cards]);

  const [deck, setDeck] = useState<ParsedVocabCard[]>(allParsed);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [isShuffled, setIsShuffled] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [frontMode, setFrontMode] = useState<'term' | 'definition'>('term');
  const [showSettings, setShowSettings] = useState(false);
  const [trackProgress, setTrackProgress] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [starredIds, setStarredIds] = useState<Set<string>>(new Set());

  const containerRef = useRef<HTMLDivElement>(null);

  // Dong bo khi cards prop thay doi
  useEffect(() => {
    setDeck(isShuffled ? shuffleArray(allParsed) : allParsed);
    setIndex(0);
    setFlipped(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allParsed]);

  // Doc sao da luu tu localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem(`starred_cards_${setId}`);
      if (saved) {
        setStarredIds(new Set(JSON.parse(saved)));
      }
    } catch {}
  }, [setId]);

  // Luu sao vao localStorage
  function toggleStar(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    setStarredIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try {
        localStorage.setItem(`starred_cards_${setId}`, JSON.stringify(Array.from(next)));
      } catch {}
      return next;
    });
  }

  // Phat am tieng Anh bang Web Speech API
  function handleSpeak(e: React.MouseEvent, text: string) {
    e.stopPropagation();
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  }

  // Tu dong phat (Autoplay)
  useEffect(() => {
    if (!isPlaying) return;

    const timer = setInterval(() => {
      setFlipped((prev) => {
        if (!prev) {
          return true;
        } else {
          setIndex((idx) => (idx + 1) % deck.length);
          return false;
        }
      });
    }, 2800);

    return () => clearInterval(timer);
  }, [isPlaying, deck.length]);

  const currentCard = deck[index];

  const handlePrev = useCallback(() => {
    setIndex((prev) => {
      setFlipped(false);
      setShowHint(false);
      if (prev > 0) {
        return prev - 1;
      }
      return deck.length > 0 ? deck.length - 1 : 0;
    });
  }, [deck.length]);

  const handleNext = useCallback(() => {
    setIndex((prev) => {
      setFlipped(false);
      setShowHint(false);
      if (prev + 1 < deck.length) {
        return prev + 1;
      }
      return 0; // Quay ve 1 khi den cuoi cung
    });
  }, [deck.length]);

  // Phim tat ban phim: Space de lat, Mui ten Trai/Phai de chuyen the
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement)?.isContentEditable
      ) {
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        setFlipped((prev) => !prev);
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePrev, handleNext]);

  function handleToggleShuffle() {
    if (isShuffled) {
      setIsShuffled(false);
      setDeck(allParsed);
    } else {
      setIsShuffled(true);
      setDeck(shuffleArray(allParsed));
    }
    setIndex(0);
    setFlipped(false);
    setShowHint(false);
  }

  // Toan man hinh (Fullscreen)
  function toggleFullscreen() {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {
        setIsFullscreen(!isFullscreen);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  }

  useEffect(() => {
    function onFullscreenChange() {
      setIsFullscreen(Boolean(document.fullscreenElement));
    }
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  if (!currentCard) {
    return null;
  }

  const isStarred = starredIds.has(currentCard.id);

  const mainWord = frontMode === 'term' ? currentCard.word : currentCard.meaning;
  const backWord = frontMode === 'term' ? currentCard.meaning : currentCard.word;

  return (
    <div
      ref={containerRef}
      className={`w-full select-none transition-colors ${
        isFullscreen ? 'fixed inset-0 z-50 bg-[#13182e] p-6 flex flex-col justify-between overflow-y-auto' : ''
      }`}
    >
      {/* Header khi che do Fullscreen */}
      {isFullscreen && (
        <div className="flex items-center justify-between pb-4 text-white max-w-4xl mx-auto w-full">
          <div className="flex items-center gap-3">
            {setTitle && <h2 className="text-base font-bold truncate max-w-md">{setTitle}</h2>}
            <span className="text-xs text-white/60 bg-white/10 px-2.5 py-1 rounded-full font-mono">
              {index + 1} / {deck.length}
            </span>
          </div>
          <button
            type="button"
            onClick={toggleFullscreen}
            className="flex items-center gap-1.5 text-xs text-white/80 hover:text-white px-2.5 py-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <Minimize2 className="size-4" />
            <span>Thu nhỏ (Esc)</span>
          </button>
        </div>
      )}

      {/* Khung the Flashcard xem truoc truc tiep */}
      <div className={`w-full [perspective:1200px] ${isFullscreen ? 'max-w-4xl mx-auto my-auto' : ''}`}>
        <div
          key={`${currentCard.id}-${index}`}
          onClick={() => setFlipped((prev) => !prev)}
          className={`relative h-[320px] sm:h-[370px] w-full cursor-pointer rounded-2xl border border-[#384166] bg-[#252c48] text-white shadow-xl transition-transform duration-500 [transform-style:preserve-3d] hover:border-primary/40 ${
            flipped ? '[transform:rotateY(180deg)]' : ''
          }`}
        >
          {/* MAT TRUOC */}
          <div className="absolute inset-0 flex flex-col justify-between p-6 [backface-visibility:hidden]">
            {/* Top Toolbar ben trong the */}
            <div className="flex items-center justify-between text-xs text-white/70">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowHint((prev) => !prev);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 hover:bg-white/10 hover:text-white transition-colors"
                title="Hiện gợi ý từ loại"
              >
                <Lightbulb className={`size-4 ${showHint ? 'text-amber-400' : ''}`} />
                <span>{showHint ? (currentCard.type ? `Từ loại: (${currentCard.type})` : 'Không có gợi ý') : 'Hiển thị gợi ý'}</span>
              </button>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={(e) => handleSpeak(e, currentCard.word)}
                  className="rounded-lg p-2 hover:bg-white/10 hover:text-white transition-colors"
                  title="Phát âm tiếng Anh"
                >
                  <Volume2 className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={(e) => toggleStar(e, currentCard.id)}
                  className="rounded-lg p-2 hover:bg-white/10 hover:text-white transition-colors"
                  title={isStarred ? 'Bỏ đánh dấu sao' : 'Đánh dấu sao'}
                >
                  <Star
                    className={`size-4 ${
                      isStarred ? 'fill-amber-400 text-amber-400' : 'text-white/70'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Noi dung chinh o giua */}
            <div className="flex flex-col items-center justify-center text-center my-auto px-4">
              {currentCard.imagePath && (
                <div className="mb-3 max-h-32 max-w-xs overflow-hidden rounded-xl border border-white/10 bg-black/20">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={flashcardImageUrl(currentCard.imagePath) || ''}
                    alt="Ảnh minh họa"
                    className="max-h-32 w-auto object-contain"
                  />
                </div>
              )}

              <div className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white">
                {mainWord}
              </div>

              {frontMode === 'term' && currentCard.ipa && (
                <div className="mt-2 text-base sm:text-lg font-medium text-white/70 font-mono tracking-wider">
                  {currentCard.ipa}
                </div>
              )}

              {showHint && currentCard.type && (
                <div className="mt-3 inline-flex items-center rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 py-0.5 text-xs font-semibold text-amber-400">
                  ({currentCard.type})
                </div>
              )}
            </div>

            {/* Chi dan nhan lat */}
            <div className="text-center text-xs text-white/40 font-medium">
              Nhấn vào thẻ hoặc bấm Space để lật
            </div>
          </div>

          {/* MAT SAU */}
          <div className="absolute inset-0 flex flex-col justify-between p-6 [backface-visibility:hidden] [transform:rotateY(180deg)]">
            <div className="flex items-center justify-between text-xs text-white/70">
              <span className="text-xs text-white/50 font-mono">
                {frontMode === 'term' ? currentCard.word : currentCard.meaning}
              </span>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={(e) => handleSpeak(e, currentCard.word)}
                  className="rounded-lg p-2 hover:bg-white/10 hover:text-white transition-colors"
                  title="Phát âm tiếng Anh"
                >
                  <Volume2 className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={(e) => toggleStar(e, currentCard.id)}
                  className="rounded-lg p-2 hover:bg-white/10 hover:text-white transition-colors"
                  title={isStarred ? 'Bỏ đánh dấu sao' : 'Đánh dấu sao'}
                >
                  <Star
                    className={`size-4 ${
                      isStarred ? 'fill-amber-400 text-amber-400' : 'text-white/70'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Noi dung mat sau o giua */}
            <div className="flex flex-col items-center justify-center text-center my-auto px-4">
              <div className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-wide text-white leading-relaxed max-w-lg">
                {frontMode === 'term' && currentCard.type && (
                  <span className="text-amber-400 mr-2 font-semibold">
                    ({currentCard.type})
                  </span>
                )}
                <span>{backWord}</span>
              </div>

              {frontMode === 'definition' && currentCard.ipa && (
                <div className="mt-2 text-base text-white/70 font-mono">
                  {currentCard.ipa}
                </div>
              )}
            </div>

            {/* Chi dan mat sau */}
            <div className="text-center text-xs text-white/40 font-medium">
              Nhấn để lật lại mặt trước
            </div>
          </div>
        </div>
      </div>

      {/* Thanh cong cu dieu khien phia duoi the (Chuan Quizlet) */}
      <div className={`flex items-center justify-between mt-4 px-1 text-sm text-foreground ${isFullscreen ? 'max-w-4xl mx-auto w-full text-white' : ''}`}>
        {/* Trai: Toggle Theo doi tien do */}
        <div className="flex items-center gap-2">
          <label
            htmlFor="preview-track-toggle"
            className="text-xs text-muted-foreground cursor-pointer select-none hidden sm:inline"
          >
            Theo dõi tiến độ
          </label>
          <button
            id="preview-track-toggle"
            type="button"
            role="switch"
            aria-checked={trackProgress}
            onClick={() => setTrackProgress((prev) => !prev)}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${
              trackProgress ? 'bg-primary' : 'bg-muted-foreground/30'
            }`}
            title="Theo dõi tiến độ học tập"
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out mt-0.5 ml-0.5 ${
                trackProgress ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Giua: Dieu huong [ ← ]   X / Y   [ → ] */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={handlePrev}
            disabled={deck.length <= 1}
            className="flex size-9 items-center justify-center rounded-full border border-border bg-card text-foreground hover:bg-muted disabled:opacity-30 disabled:pointer-events-none transition-colors shadow-xs cursor-pointer"
            title={index === 0 ? "Quay lại thẻ cuối (Phím ←)" : "Thẻ trước (Phím ←)"}
          >
            <ChevronLeft className="size-5" />
          </button>

          <span className="text-sm font-semibold tracking-wider font-mono">
            {index + 1} / {deck.length}
          </span>

          <button
            type="button"
            onClick={handleNext}
            disabled={deck.length <= 1}
            className="flex size-9 items-center justify-center rounded-full border border-border bg-card text-foreground hover:bg-muted disabled:opacity-30 disabled:pointer-events-none transition-colors shadow-xs cursor-pointer"
            title={index + 1 >= deck.length ? "Quay về thẻ đầu tiên (Phím →)" : "Thẻ tiếp theo (Phím →)"}
          >
            <ChevronRight className="size-5" />
          </button>
        </div>

        {/* Phai: Autoplay [▶], Shuffle [⇌], Settings [⚙], Fullscreen [⤢] */}
        <div className="flex items-center gap-1">
          {/* Autoplay */}
          <button
            type="button"
            onClick={() => setIsPlaying((p) => !p)}
            className={`rounded-lg p-2 transition-colors ${
              isPlaying
                ? 'bg-primary/15 text-primary'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
            title={isPlaying ? 'Dừng tự động phát' : 'Tự động phát'}
          >
            {isPlaying ? <Pause className="size-4" /> : <Play className="size-4" />}
          </button>

          {/* Shuffle */}
          <button
            type="button"
            onClick={handleToggleShuffle}
            className={`rounded-lg p-2 transition-colors ${
              isShuffled
                ? 'bg-primary/15 text-primary'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
            title={isShuffled ? 'Tắt trộn thẻ' : 'Trộn ngẫu nhiên'}
          >
            <Shuffle className="size-4" />
          </button>

          {/* Settings / Tuy chon mat truoc */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowSettings((s) => !s)}
              className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              title="Tùy chọn hiển thị"
            >
              <Settings className="size-4" />
            </button>

            {showSettings && (
              <div className="absolute bottom-full right-0 mb-2 w-52 rounded-xl border border-border bg-card p-3 shadow-xl z-20 text-xs space-y-2 animate-in fade-in zoom-in-95">
                <div className="font-semibold text-foreground">Mặt trước hiển thị:</div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="frontMode"
                    value="term"
                    checked={frontMode === 'term'}
                    onChange={() => {
                      setFrontMode('term');
                      setShowSettings(false);
                    }}
                    className="text-primary"
                  />
                  <span>Thuật ngữ (Từ gốc)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="frontMode"
                    value="definition"
                    checked={frontMode === 'definition'}
                    onChange={() => {
                      setFrontMode('definition');
                      setShowSettings(false);
                    }}
                    className="text-primary"
                  />
                  <span>Định nghĩa (Nghĩa)</span>
                </label>
              </div>
            )}
          </div>

          {/* Fullscreen */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            title={isFullscreen ? 'Thu nhỏ' : 'Toàn màn hình'}
          >
            {isFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
          </button>
        </div>
      </div>

      {/* Thanh tiến độ học Quizlet */}
      <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-border/40">
        <div
          className="h-full bg-primary transition-all duration-300 ease-out"
          style={{ width: `${deck.length > 0 ? ((index + 1) / deck.length) * 100 : 0}%` }}
        />
      </div>
    </div>
  );
}
