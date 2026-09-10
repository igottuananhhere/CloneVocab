'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Check,
  RotateCcw,
  Shuffle,
  Sparkles,
  Trophy,
  X,
} from 'lucide-react';
import type { Flashcard } from '@flashcard/contracts';
import { Button } from '@/components/ui/button';
import { apiBrowser } from '@/lib/api/browser';
import { flashcardImageUrl } from '@/lib/flashcard-image';
import { NextModesSuggestions } from '@/components/study/next-modes-suggestions';

export interface ParsedVocabCard {
  id: string;
  word: string;
  ipa?: string;
  type?: string;
  meaning: string;
  imagePath?: string | null;
}

export function parseVocabCard(card: Flashcard): ParsedVocabCard {
  // Neu dinh dang JSON
  if (card.definition.trim().startsWith('{') && card.definition.trim().endsWith('}')) {
    try {
      const parsed = JSON.parse(card.definition);
      return {
        id: card.id,
        word: parsed.word || card.term,
        ipa: parsed.ipa,
        type: parsed.type,
        meaning: parsed.meaning || parsed.definition || card.definition,
        imagePath: card.imagePath,
      };
    } catch {
      // Tiep tuc xu ly thong thuong neu parse loi
    }
  }

  let word = card.term.trim();
  let rawMeaning = card.definition.trim();
  let type: string | undefined;
  let ipa: string | undefined;

  // 1. Trich xuat phien am IPA: /.../ hoac [...]
  const ipaRegex = /\/([^\/]+)\/|\[([^\]]+)\]/;
  const ipaMatch = rawMeaning.match(ipaRegex) || word.match(ipaRegex);
  if (ipaMatch) {
    ipa = ipaMatch[0].trim();
    rawMeaning = rawMeaning.replace(ipaMatch[0], '').trim();
    word = word.replace(ipaMatch[0], '').trim();
  }

  // 2. Trich xuat tu loai: (n), (adj), (v), (adv), (prep), (conj), (pron), (phr), (phrase), (idiom)...
  const typeRegex = /\((n|v|adj|adv|prep|conj|pron|phr|phrase|idiom|num|int|vi|vt|to-v)\.?\)/i;
  const typeMatch = rawMeaning.match(typeRegex) || word.match(typeRegex);
  if (typeMatch) {
    type = typeMatch[1]?.toLowerCase();
    rawMeaning = rawMeaning.replace(typeMatch[0], '').trim();
    word = word.replace(typeMatch[0], '').trim();
  }

  // Lam sach cac dau phan cach o dau hoac cuoi nghia
  const cleanMeaning = rawMeaning
    .replace(/^[:\-–—\s]+/, '')
    .replace(/[:\-–—\s]+$/, '')
    .trim();

  return {
    id: card.id,
    word: word || card.term,
    ipa,
    type,
    meaning: cleanMeaning || card.definition,
    imagePath: card.imagePath,
  };
}

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

interface FlipClientProps {
  setId: string;
  cards: Flashcard[];
  setTitle?: string;
}

export function FlipClient({ setId, cards, setTitle }: FlipClientProps) {
  const storageKey = `vocab_quiz_progress_${setId}`;
  const trackPrefKey = `vocab_quiz_track_pref`;

  // Parse toan bo the sang dinh dang tu vung
  const allParsedCards = useMemo(() => cards.map(parseVocabCard), [cards]);

  // Che do Theo doi tien do: mac dinh bat
  const [trackProgress, setTrackProgress] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const pref = localStorage.getItem(trackPrefKey);
    return pref === null ? true : pref === 'true';
  });

  // Hang doi the trong vong hien tai
  const [roundCards, setRoundCards] = useState<ParsedVocabCard[]>(allParsedCards);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  // Gesture drag & swipe state
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [animatingOut, setAnimatingOut] = useState<'known' | 'learning' | null>(null);
  const dragStartRef = useRef<{ x: number; y: number; pointerId: number } | null>(null);
  const hasMovedRef = useRef(false);

  // Ngan phan loai nhi phan
  const [knownCards, setKnownCards] = useState<ParsedVocabCard[]>(allParsedCards.length === 0 ? [] : []);
  const [learningCards, setLearningCards] = useState<ParsedVocabCard[]>([]);

  // Ngan xep lich su Undo
  const [history, setHistory] = useState<
    Array<{
      card: ParsedVocabCard;
      category: 'known' | 'learning';
      prevIndex: number;
    }>
  >([]);

  // Vong hoc
  const [roundNumber, setRoundNumber] = useState(1);
  const [isRoundFinished, setIsRoundFinished] = useState(false);
  const [, setSavingReview] = useState(false);

  // Khoi phuc tien do tu localStorage neu co
  useEffect(() => {
    if (!trackProgress || typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (
        saved &&
        Array.isArray(saved.roundCards) &&
        saved.roundCards.length > 0 &&
        typeof saved.currentIndex === 'number'
      ) {
        setRoundCards(saved.roundCards);
        setCurrentIndex(Math.min(saved.currentIndex, saved.roundCards.length - 1));
        setKnownCards(saved.knownCards || []);
        setLearningCards(saved.learningCards || []);
        setRoundNumber(saved.roundNumber || 1);
        setIsRoundFinished(Boolean(saved.isRoundFinished));
      }
    } catch {
      // Bo qua loi
    }
  }, [storageKey, trackProgress]);

  // Luu tien do vao localStorage khi thay doi
  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(trackPrefKey, String(trackProgress));

    if (!trackProgress) {
      localStorage.removeItem(storageKey);
      return;
    }

    try {
      const data = {
        roundCards,
        currentIndex,
        knownCards,
        learningCards,
        roundNumber,
        isRoundFinished,
      };
      localStorage.setItem(storageKey, JSON.stringify(data));
    } catch {
      // Bo qua loi vuot han muc storage
    }
  }, [
    trackProgress,
    storageKey,
    trackPrefKey,
    roundCards,
    currentIndex,
    knownCards,
    learningCards,
    roundNumber,
    isRoundFinished,
  ]);

  const currentCard = roundCards[currentIndex];

  // Lat the
  function handleFlip() {
    setFlipped((prev) => !prev);
  }

  // Trigger flyout animation roi moi phan loai the
  function triggerClassify(category: 'known' | 'learning') {
    if (!currentCard || isRoundFinished || animatingOut) return;
    setAnimatingOut(category);
    setTimeout(() => {
      handleClassify(category);
      setAnimatingOut(null);
      setDragOffset({ x: 0, y: 0 });
    }, 220);
  }

  // Xu ly su kien Pointer (chuot & cam ung) de keo / quet the
  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (isRoundFinished || Boolean(animatingOut) || !currentCard) return;
    if (e.button !== 0) return; // Chi bat chuot trai

    dragStartRef.current = { x: e.clientX, y: e.clientY, pointerId: e.pointerId };
    hasMovedRef.current = false;
    setIsDragging(true);

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Bo qua neu trinh duyet khong ho tro
    }
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragStartRef.current || dragStartRef.current.pointerId !== e.pointerId) return;

    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;

    if (!hasMovedRef.current && Math.hypot(dx, dy) > 6) {
      hasMovedRef.current = true;
    }

    if (hasMovedRef.current) {
      setDragOffset({ x: dx, y: dy });
    }
  }

  function handlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragStartRef.current || dragStartRef.current.pointerId !== e.pointerId) return;

    dragStartRef.current = null;
    setIsDragging(false);

    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // Bo qua
    }

    // Neu khong di chuyen hoac di chuyen duoi 6px -> coi la CLICK de lat the xem nghia
    if (!hasMovedRef.current) {
      setDragOffset({ x: 0, y: 0 });
      handleFlip();
      return;
    }

    // Nguong phan loai quet the (90px)
    const threshold = 90;
    if (dragOffset.x >= threshold) {
      // Quet phai -> Da ghi nho
      triggerClassify('known');
    } else if (dragOffset.x <= -threshold) {
      // Quet trai -> Chua nho
      triggerClassify('learning');
    } else {
      // Chua vuot nguong -> the dan hoi quay ve giua
      setDragOffset({ x: 0, y: 0 });
    }
  }

  function handlePointerCancel() {
    dragStartRef.current = null;
    setIsDragging(false);
    setDragOffset({ x: 0, y: 0 });
  }

  // Phân loại: 'known' (✓ / →) hoặc 'learning' (✗ / ←)
  function handleClassify(category: 'known' | 'learning') {
    if (!currentCard || isRoundFinished) return;

    const targetCard = currentCard;
    const nextIndex = currentIndex + 1;

    setHistory((prev) => [
      ...prev,
      { card: targetCard, category, prevIndex: currentIndex },
    ]);

    if (category === 'known') {
      setKnownCards((prev) => [...prev.filter((c) => c.id !== targetCard.id), targetCard]);
      setLearningCards((prev) => prev.filter((c) => c.id !== targetCard.id));
    } else {
      setLearningCards((prev) => [...prev.filter((c) => c.id !== targetCard.id), targetCard]);
      setKnownCards((prev) => prev.filter((c) => c.id !== targetCard.id));
    }

    setFlipped(false);

    if (nextIndex < roundCards.length) {
      setCurrentIndex(nextIndex);
    } else {
      setIsRoundFinished(true);
      if (category === 'known' && learningCards.length === 0) {
        submitReview(allParsedCards.map((c) => ({ flashcardId: c.id, correct: true })));
      }
    }
  }

  // Hoàn tác Undo (↺ / Z)
  function handleUndo() {
    if (history.length === 0) return;

    const lastAction = history[history.length - 1]!;
    setHistory((prev) => prev.slice(0, -1));

    if (lastAction.category === 'known') {
      setKnownCards((prev) => prev.filter((c) => c.id !== lastAction.card.id));
    } else {
      setLearningCards((prev) => prev.filter((c) => c.id !== lastAction.card.id));
    }

    setCurrentIndex(lastAction.prevIndex);
    setFlipped(false);
    setIsRoundFinished(false);
    setDragOffset({ x: 0, y: 0 });
    setAnimatingOut(null);
  }

  // Trộn các thẻ còn lại (⇌ / S)
  function handleShuffle() {
    if (roundCards.length <= 1) return;

    const unreviewed = roundCards.slice(currentIndex);
    const shuffled = shuffleArray(unreviewed);
    const newQueue = [...roundCards.slice(0, currentIndex), ...shuffled];

    setRoundCards(newQueue);
    setFlipped(false);
    setDragOffset({ x: 0, y: 0 });
  }

  // Ôn lại ngay các từ chưa thuộc (Vòng tiếp theo)
  function handleRelearnUnmastered() {
    if (learningCards.length === 0) return;

    setRoundCards([...learningCards]);
    setLearningCards([]);
    setCurrentIndex(0);
    setFlipped(false);
    setHistory([]);
    setRoundNumber((r) => r + 1);
    setIsRoundFinished(false);
    setDragOffset({ x: 0, y: 0 });
    setAnimatingOut(null);
  }

  // Học lại toàn bộ từ đầu
  function handleRestartAll() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(storageKey);
    }
    setRoundCards(allParsedCards);
    setCurrentIndex(0);
    setFlipped(false);
    setKnownCards([]);
    setLearningCards([]);
    setHistory([]);
    setRoundNumber(1);
    setIsRoundFinished(false);
    setDragOffset({ x: 0, y: 0 });
    setAnimatingOut(null);
  }

  // Gửi đánh giá lên API backend
  async function submitReview(items: Array<{ flashcardId: string; correct: boolean }>) {
    setSavingReview(true);
    try {
      await apiBrowser(`/study-sets/${setId}/review`, {
        method: 'POST',
        body: { results: items },
      });
    } catch {
      // Non-blocking
    } finally {
      setSavingReview(false);
    }
  }

  // Xu ly phim tat ban phim
  useEffect(() => {
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

      if (e.code === 'Space' || e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        handleFlip();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        triggerClassify('learning');
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        triggerClassify('known');
      } else if ((e.key === 'z' || e.key === 'Z') && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        handleUndo();
      } else if ((e.key === 's' || e.key === 'S') && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        handleShuffle();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, roundCards.length, currentCard, isRoundFinished, history.length, animatingOut]);

  if (allParsedCards.length === 0) {
    return (
      <div className="py-16 text-center text-white/80 space-y-4">
        <p className="text-xl font-semibold">Học phần này chưa có thẻ ghi nhớ nào.</p>
        <Link href={`/sets/${setId}`} className="text-sm text-primary hover:underline">
          ← Quay lại trang học phần
        </Link>
      </div>
    );
  }

  // Tinh toan style cho cu chi keo & quet the
  const knownStampOpacity =
    animatingOut === 'known'
      ? 1
      : dragOffset.x > 15
      ? Math.min(1, Math.max(0, (dragOffset.x - 15) / 70))
      : 0;

  const learningStampOpacity =
    animatingOut === 'learning'
      ? 1
      : dragOffset.x < -15
      ? Math.min(1, Math.max(0, (-dragOffset.x - 15) / 70))
      : 0;

  let transformStyle = 'translate3d(0, 0, 0) rotate(0deg)';
  let transitionStyle = isDragging
    ? 'none'
    : 'transform 0.28s cubic-bezier(0.18, 0.89, 0.32, 1.15), opacity 0.22s ease';

  if (animatingOut === 'known') {
    transformStyle = 'translate3d(125%, 25px, 0) rotate(16deg)';
    transitionStyle = 'transform 0.22s ease-out, opacity 0.22s ease-out';
  } else if (animatingOut === 'learning') {
    transformStyle = 'translate3d(-125%, 25px, 0) rotate(-16deg)';
    transitionStyle = 'transform 0.22s ease-out, opacity 0.22s ease-out';
  } else if (isDragging) {
    const tiltDeg = Math.min(15, Math.max(-15, dragOffset.x * 0.065));
    transformStyle = `translate3d(${dragOffset.x}px, ${dragOffset.y * 0.3}px, 0) rotate(${tiltDeg}deg)`;
  }

  const cardOpacity = animatingOut ? 0 : 1;

  const dynamicBoxShadow =
    dragOffset.x > 20
      ? `0 20px 35px -10px rgba(16, 185, 129, ${Math.min(0.55, (dragOffset.x - 20) / 140)}), 0 0 18px rgba(16, 185, 129, 0.25)`
      : dragOffset.x < -20
      ? `0 20px 35px -10px rgba(244, 63, 94, ${Math.min(0.55, (-dragOffset.x - 20) / 140)}), 0 0 18px rgba(244, 63, 94, 0.25)`
      : '0 25px 50px -12px rgba(0, 0, 0, 0.5)';

  return (
    <div className="flex w-full max-w-3xl flex-col items-center justify-between min-h-[560px] select-none text-white px-2 py-4">
      {/* Header thong tin */}
      <div className="w-full flex items-center justify-between mb-4">
        <Link
          href={`/sets/${setId}`}
          className="inline-flex items-center gap-1.5 text-xs text-white/70 hover:text-white transition-colors"
        >
          <ArrowLeft className="size-4" />
          <span className="hidden sm:inline">Quay lại học phần</span>
        </Link>

        <div className="text-center flex-1 mx-4">
          <div className="text-xl font-bold tracking-tight text-white/95">
            {currentIndex + 1} / {roundCards.length}
          </div>
          <div className="text-xs font-semibold tracking-wider uppercase text-white/60 line-clamp-1 mt-0.5">
            {setTitle || 'BỘ THẺ TỪ VỰNG'}
          </div>
        </div>

        <div className="w-20 text-right">
          {roundNumber > 1 && (
            <span className="text-[11px] font-medium text-amber-400 bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 rounded-full">
              Vòng {roundNumber}
            </span>
          )}
        </div>
      </div>

      {/* 2 Badge: Dang hoc & Da biet */}
      <div className="w-full max-w-2xl flex items-center justify-between mb-2 px-1">
        {/* Góc trái: Đang học */}
        <div className="flex items-center gap-2 border border-amber-500/80 bg-amber-500/10 px-3.5 py-1 rounded-full text-xs font-bold text-amber-400 shadow-sm">
          <span className="flex size-4 items-center justify-center rounded-full bg-amber-500/20 text-[11px]">
            {learningCards.length}
          </span>
          <span>Đang học</span>
        </div>

        {/* Góc phải: Đã biết */}
        <div className="flex items-center gap-2 border border-emerald-500/80 bg-emerald-500/10 px-3.5 py-1 rounded-full text-xs font-bold text-emerald-400 shadow-sm">
          <span>Đã biết</span>
          <span className="flex size-4 items-center justify-center rounded-full bg-emerald-500/20 text-[11px]">
            {knownCards.length}
          </span>
        </div>
      </div>

      {/* Thanh huong dan thao tac quet the */}
      <div className="w-full max-w-2xl flex items-center justify-between px-2 text-[11px] font-medium text-white/50 mb-2.5">
        <span className="flex items-center gap-1 text-rose-300/80 font-semibold">
          <span>←</span> Quẹt trái: Chưa nhớ
        </span>
        <span className="text-white/40 hidden sm:inline">
          Click chuột hoặc nhấn Space để lật nghĩa
        </span>
        <span className="flex items-center gap-1 text-emerald-300/80 font-semibold">
          Quẹt phải: Đã ghi nhớ <span>→</span>
        </span>
      </div>

      {/* Khung the Flashcard 3D co ho tro keo chuot / quet trai phai */}
      <div className="w-full max-w-2xl [perspective:1200px] my-auto relative">
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          style={{
            transform: transformStyle,
            transition: transitionStyle,
            opacity: cardOpacity,
            boxShadow: dynamicBoxShadow,
          }}
          className={`relative w-full select-none touch-none rounded-2xl ${
            isDragging ? 'cursor-grabbing' : 'cursor-grab'
          }`}
        >
          {/* Con dau Stamp "ĐÃ GHI NHỚ" khi keo sang phai */}
          <div
            className="pointer-events-none absolute top-5 right-5 z-40 rounded-xl border-2 border-emerald-400 bg-emerald-500/25 px-4 py-1.5 text-sm sm:text-base font-black tracking-wider text-emerald-300 shadow-[0_0_25px_rgba(16,185,129,0.45)] uppercase rotate-12 backdrop-blur-xs transition-opacity duration-75 flex items-center gap-1.5"
            style={{ opacity: knownStampOpacity }}
          >
            <Check className="size-5 stroke-[3]" />
            <span>ĐÃ GHI NHỚ</span>
          </div>

          {/* Con dau Stamp "CHƯA NHỚ" khi keo sang trai */}
          <div
            className="pointer-events-none absolute top-5 left-5 z-40 rounded-xl border-2 border-rose-400 bg-rose-500/25 px-4 py-1.5 text-sm sm:text-base font-black tracking-wider text-rose-300 shadow-[0_0_25px_rgba(244,63,94,0.45)] uppercase -rotate-12 backdrop-blur-xs transition-opacity duration-75 flex items-center gap-1.5"
            style={{ opacity: learningStampOpacity }}
          >
            <X className="size-5 stroke-[3]" />
            <span>CHƯA NHỚ</span>
          </div>

          {/* The Flashcard 3D */}
          <div
            key={currentCard?.id || currentIndex}
            className={`relative h-[340px] sm:h-[390px] w-full rounded-2xl transition-transform duration-500 [transform-style:preserve-3d] shadow-2xl ${
              flipped ? '[transform:rotateY(180deg)]' : ''
            }`}
          >
            {/* Mặt trước: TỪ GỐC (Thuật ngữ) + IPA (TUYỆT ĐỐI KHÔNG HIỆN NGHĨA Ở ĐÂY) */}
            <div className="absolute inset-0 flex flex-col justify-between rounded-2xl border border-[#384166] bg-[#252c48] overflow-hidden [backface-visibility:hidden]">
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center pointer-events-none">
                {currentCard && (
                  <>
                    {currentCard.imagePath && (
                      <div className="mb-4 max-h-36 max-w-xs overflow-hidden rounded-xl border border-white/10 bg-black/20 pointer-events-none">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={flashcardImageUrl(currentCard.imagePath) || ''}
                          alt="Ảnh minh họa"
                          draggable={false}
                          className="max-h-36 w-auto object-contain pointer-events-none select-none"
                        />
                      </div>
                    )}

                    <div className="text-3xl sm:text-4xl md:text-5xl font-bold text-white tracking-tight">
                      {currentCard.word}
                    </div>

                    {currentCard.ipa && (
                      <div className="mt-2.5 text-base sm:text-lg font-medium text-white/70 font-mono tracking-wider">
                        {currentCard.ipa}
                      </div>
                    )}

                    <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white/5 border border-white/10 px-3 py-1 text-xs text-white/50">
                      <span>Click chuột hoặc nhấn Space để xem nghĩa</span>
                    </div>
                  </>
                )}
              </div>

              {/* Thanh huong dan mau tim/lavender o chan the */}
              <div className="bg-[#9bb0f5] text-[#13182e] py-2.5 px-4 flex items-center justify-center gap-2 text-xs font-semibold pointer-events-none">
                <span className="inline-flex items-center gap-1.5">
                  <span className="text-sm">💡</span> Thao tác:
                </span>
                <span>
                  Quẹt trái <kbd className="rounded border border-[#7a93e8] bg-white/40 px-1.5 py-0.5 font-mono text-[11px]">←</kbd> Chưa nhớ | Click / <kbd className="rounded border border-[#7a93e8] bg-white/40 px-1.5 py-0.5 font-mono text-[11px]">Space</kbd> xem nghĩa | Quẹt phải <kbd className="rounded border border-[#7a93e8] bg-white/40 px-1.5 py-0.5 font-mono text-[11px]">→</kbd> Đã nhớ
                </span>
              </div>
            </div>

            {/* Mặt sau: NGHĨA TIẾNG VIỆT (Chỉ hiện khi bấm lật thẻ) */}
            <div className="absolute inset-0 flex flex-col justify-between rounded-2xl border border-[#384166] bg-[#252c48] overflow-hidden [backface-visibility:hidden] [transform:rotateY(180deg)]">
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center pointer-events-none">
                {currentCard && (
                  <>
                    {/* Nhắc lại từ gốc nhỏ ở trên */}
                    <div className="text-base sm:text-lg font-medium text-white/50 mb-3 font-mono">
                      {currentCard.word} {currentCard.ipa ? `• ${currentCard.ipa}` : ''}
                    </div>

                    {/* Nghĩa tiếng Việt to, nổi bật */}
                    <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-white tracking-wide leading-snug max-w-lg">
                      {currentCard.type ? (
                        <span className="text-amber-400 font-semibold mr-2">
                          ({currentCard.type})
                        </span>
                      ) : null}
                      <span>{currentCard.meaning}</span>
                    </div>
                  </>
                )}
              </div>

              {/* Thanh huong dan chan the */}
              <div className="bg-[#9bb0f5] text-[#13182e] py-2.5 px-4 flex items-center justify-center gap-2 text-xs font-semibold pointer-events-none">
                <span className="inline-flex items-center gap-1.5">
                  <span className="text-sm">💡</span> Thao tác:
                </span>
                <span>
                  Quẹt trái <kbd className="rounded border border-[#7a93e8] bg-white/40 px-1.5 py-0.5 font-mono text-[11px]">←</kbd> Chưa nhớ | Click / <kbd className="rounded border border-[#7a93e8] bg-white/40 px-1.5 py-0.5 font-mono text-[11px]">Space</kbd> lật lại | Quẹt phải <kbd className="rounded border border-[#7a93e8] bg-white/40 px-1.5 py-0.5 font-mono text-[11px]">→</kbd> Đã nhớ
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3 cum nut duoi cung */}
      <div className="w-full max-w-2xl flex items-center justify-between mt-6 px-2">
        {/* Toggle Theo doi tien do */}
        <div className="flex items-center gap-2.5 text-xs text-white/70">
          <label
            htmlFor="toggle-track"
            className="cursor-pointer select-none hover:text-white transition-colors"
          >
            Theo dõi tiến độ
          </label>
          <button
            id="toggle-track"
            type="button"
            role="switch"
            aria-checked={trackProgress}
            onClick={() => setTrackProgress((prev) => !prev)}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${
              trackProgress ? 'bg-primary' : 'bg-white/20'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out mt-0.5 ml-0.5 ${
                trackProgress ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* 2 nut trung tam: ✗ va ✓ */}
        <div className="flex items-center gap-4">
          {/* Nut ✗ (Chua thuoc / Hoc lai) */}
          <button
            type="button"
            onClick={() => triggerClassify('learning')}
            title="Chưa thuộc (Kéo trái hoặc phím ←)"
            className="size-14 rounded-2xl border border-rose-500/30 bg-[#252c48] text-rose-400 hover:bg-rose-500/20 hover:border-rose-500/60 hover:text-rose-300 transition-all flex items-center justify-center shadow-lg active:scale-95"
          >
            <X className="size-6 stroke-[2.5]" />
          </button>

          {/* Nut ✓ (Da biet) */}
          <button
            type="button"
            onClick={() => triggerClassify('known')}
            title="Đã biết (Kéo phải hoặc phím →)"
            className="size-14 rounded-2xl border border-emerald-500/30 bg-[#252c48] text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500/60 hover:text-emerald-300 transition-all flex items-center justify-center shadow-lg active:scale-95"
          >
            <Check className="size-6 stroke-[2.5]" />
          </button>
        </div>

        {/* 2 nut chuc nang: Undo & Shuffle */}
        <div className="flex items-center gap-2">
          {/* Nut Undo */}
          <button
            type="button"
            onClick={handleUndo}
            disabled={history.length === 0}
            title="Hoàn tác (Phím Z)"
            className="size-10 rounded-xl border border-white/10 bg-[#252c48] text-white/70 hover:bg-white/10 hover:text-white transition-all flex items-center justify-center disabled:opacity-30 disabled:pointer-events-none active:scale-95"
          >
            <RotateCcw className="size-4" />
          </button>

          {/* Nut Shuffle */}
          <button
            type="button"
            onClick={handleShuffle}
            title="Trộn thẻ ngẫu nhiên (Phím S)"
            className="size-10 rounded-xl border border-white/10 bg-[#252c48] text-white/70 hover:bg-white/10 hover:text-white transition-all flex items-center justify-center active:scale-95"
          >
            <Shuffle className="size-4" />
          </button>
        </div>
      </div>

      {/* Popup tong ket vong hoc */}
      {isRoundFinished && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-3xl border border-[#384166] bg-[#252c48] p-6 sm:p-7 shadow-2xl text-center space-y-5 animate-in zoom-in-95">
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/20 text-primary">
              {learningCards.length === 0 ? (
                <Trophy className="size-8 text-amber-400" />
              ) : (
                <Sparkles className="size-8 text-primary" />
              )}
            </div>

            <div>
              <h3 className="text-2xl font-bold text-white">
                {learningCards.length === 0
                  ? 'Tuyệt vời! Hoàn thành 100%'
                  : `Kết thúc Vòng ${roundNumber}!`}
              </h3>
              <p className="mt-2 text-sm text-white/70">
                Bạn đã thuộc{' '}
                <span className="font-bold text-emerald-400">
                  {knownCards.length}
                </span>{' '}
                / {allParsedCards.length} từ vựng (
                {Math.round((knownCards.length / allParsedCards.length) * 100)}%).
              </p>

              {learningCards.length > 0 ? (
                <p className="mt-1 text-xs text-amber-400 font-medium">
                  Còn {learningCards.length} từ trong ngăn &quot;Đang học&quot; cần ôn lại.
                </p>
              ) : (
                <p className="mt-1 text-xs text-emerald-400 font-medium">
                  Toàn bộ từ vựng đã được bạn nắm vững hoàn hảo!
                </p>
              )}
            </div>

            <div className="space-y-2.5 pt-1">
              {learningCards.length > 0 && (
                <Button
                  type="button"
                  onClick={handleRelearnUnmastered}
                  className="w-full h-11 text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg cursor-pointer"
                >
                  Ôn lại ngay ({learningCards.length} từ chưa thuộc)
                </Button>
              )}

              <Button
                type="button"
                variant="outline"
                onClick={handleRestartAll}
                className="w-full h-11 text-sm font-semibold border-white/20 bg-white/5 hover:bg-white/10 text-white cursor-pointer"
              >
                Học lại toàn bộ từ đầu
              </Button>

              <Link
                href={`/sets/${setId}`}
                className="block text-xs text-white/60 hover:text-white pt-1 transition-colors"
              >
                Về trang chi tiết bộ thẻ →
              </Link>
            </div>

            {/* Goi y cac tro choi khac san co de do nham chan */}
            <div className="pt-4 border-t border-white/10 text-left">
              <NextModesSuggestions
                setId={setId}
                currentMode="cards"
                theme="dark"
                layout="compact-list"
                title="Đổi gió với các trò chơi khác"
                subtitle="Thử thách phản xạ và kiểm tra trí nhớ với các chế độ có sẵn:"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

