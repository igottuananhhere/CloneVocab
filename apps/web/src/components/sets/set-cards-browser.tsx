'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Search,
  Star,
  Volume2,
  X,
  Sparkles,
  Layers,
} from 'lucide-react';
import type { Flashcard } from '@flashcard/contracts';
import { parseVocabCard } from '@/components/study/flip-client';
import { flashcardImageUrl } from '@/lib/flashcard-image';
import { cn } from '@/lib/utils';

interface SetCardsBrowserProps {
  setId: string;
  cards: Flashcard[];
}

export function SetCardsBrowser({ setId, cards }: SetCardsBrowserProps) {
  const [search, setSearch] = useState('');
  const [filterStarredOnly, setFilterStarredOnly] = useState(false);
  const [starredIds, setStarredIds] = useState<Set<string>>(new Set());

  // Đọc danh sách sao đã lưu từ localStorage
  const loadStarred = useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem(`starred_cards_${setId}`);
      if (saved) {
        setStarredIds(new Set(JSON.parse(saved)));
      } else {
        setStarredIds(new Set());
      }
    } catch {
      // Ignore storage errors
    }
  }, [setId]);

  useEffect(() => {
    loadStarred();

    // Lắng nghe sự kiện nếu thẻ được gắn sao từ component preview
    function handleStorageChange(e: StorageEvent) {
      if (e.key === `starred_cards_${setId}`) {
        loadStarred();
      }
    }
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [setId, loadStarred]);

  // Lưu sao vào localStorage
  function toggleStar(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    setStarredIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try {
        localStorage.setItem(`starred_cards_${setId}`, JSON.stringify(Array.from(next)));
      } catch {
        // Ignore
      }
      return next;
    });
  }

  // Phát âm tiếng Anh bằng Web Speech API
  function handleSpeak(e: React.MouseEvent, text: string) {
    e.stopPropagation();
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  }

  // Phân tích các thẻ từ vựng (tách IPA, type, meaning)
  const parsedCards = useMemo(() => {
    return cards.map((c) => ({
      original: c,
      parsed: parseVocabCard(c),
    }));
  }, [cards]);

  // Lọc theo từ khóa tìm kiếm và trạng thái đánh dấu sao
  const filteredCards = useMemo(() => {
    const q = search.trim().toLowerCase();
    return parsedCards.filter(({ parsed, original }) => {
      if (filterStarredOnly && !starredIds.has(parsed.id)) {
        return false;
      }
      if (!q) return true;
      return (
        parsed.word.toLowerCase().includes(q) ||
        parsed.meaning.toLowerCase().includes(q) ||
        original.term.toLowerCase().includes(q) ||
        original.definition.toLowerCase().includes(q) ||
        Boolean(parsed.ipa?.toLowerCase().includes(q)) ||
        Boolean(parsed.type?.toLowerCase().includes(q))
      );
    });
  }, [parsedCards, search, filterStarredOnly, starredIds]);

  const starredCount = starredIds.size;

  return (
    <div className="space-y-4">
      {/* Header và Thanh công cụ tìm kiếm / lọc */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Layers className="size-4" />
          </div>
          <h2 className="text-xl font-bold tracking-tight">
            Thuật ngữ trong học phần
          </h2>
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground font-mono">
            {cards.length}
          </span>
        </div>

        {/* Thanh tìm kiếm và bộ lọc sao */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Ô tìm kiếm nhanh */}
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm kiếm thuật ngữ..."
              className="w-full rounded-xl border border-border bg-background py-1.5 pl-9 pr-8 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 cursor-pointer"
                title="Xóa tìm kiếm"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {/* Bộ lọc Thẻ đã đánh dấu sao */}
          {starredCount > 0 && (
            <button
              type="button"
              onClick={() => setFilterStarredOnly((prev) => !prev)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer shadow-xs',
                filterStarredOnly
                  ? 'border-amber-500/40 bg-amber-500/15 text-amber-500 hover:bg-amber-500/25'
                  : 'border-border bg-card text-muted-foreground hover:text-foreground hover:bg-accent/50'
              )}
            >
              <Star
                className={cn(
                  'size-3.5',
                  filterStarredOnly ? 'fill-amber-500 text-amber-500' : 'text-amber-500'
                )}
              />
              <span>Có sao ({starredCount})</span>
            </button>
          )}
        </div>
      </div>

      {/* Danh sách thẻ dạng thẻ bo góc hiện đại */}
      {filteredCards.length > 0 ? (
        <div className="space-y-2.5">
          {filteredCards.map(({ parsed, original }, idx) => {
            const isStarred = starredIds.has(parsed.id);
            const imgUrl = flashcardImageUrl(original.imagePath);

            return (
              <div
                key={parsed.id}
                className="group relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-border/80 bg-card p-4 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
              >
                {/* Cột Trái: Từ khóa, Phát âm, Loại từ */}
                <div className="flex-1 sm:max-w-[45%] flex items-start gap-3">
                  <span className="mt-1 flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground font-mono">
                    {idx + 1}
                  </span>
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="text-base font-bold tracking-tight text-foreground">
                        {parsed.word}
                      </span>
                      {parsed.ipa && (
                        <span className="font-mono text-xs text-muted-foreground/80 tracking-wide">
                          {parsed.ipa}
                        </span>
                      )}
                      {parsed.type && (
                        <span className="inline-flex items-center rounded-md border border-primary/20 bg-primary/5 px-2 py-0.5 text-[11px] font-semibold text-primary">
                          {parsed.type}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Phân cách dạng nét đứt hoặc border trên desktop */}
                <div className="hidden sm:block h-8 w-px bg-border/60 mx-1 shrink-0" />

                {/* Cột Giữa: Định nghĩa / Nghĩa tiếng Việt */}
                <div className="flex-1 text-sm font-medium text-foreground leading-relaxed">
                  {parsed.meaning}
                </div>

                {/* Cột Phải: Ảnh minh họa và các nút thao tác */}
                <div className="flex items-center justify-end gap-2 pt-2 sm:pt-0 border-t border-border/40 sm:border-t-0">
                  {imgUrl && (
                    <div className="relative size-12 shrink-0 overflow-hidden rounded-xl border border-border bg-muted">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imgUrl}
                        alt={parsed.word}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                      />
                    </div>
                  )}

                  {/* Nút phát âm */}
                  <button
                    type="button"
                    onClick={(e) => handleSpeak(e, parsed.word)}
                    className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer"
                    title="Phát âm tiếng Anh"
                  >
                    <Volume2 className="size-4" />
                  </button>

                  {/* Nút gắn sao */}
                  <button
                    type="button"
                    onClick={(e) => toggleStar(e, parsed.id)}
                    className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-amber-500/10 hover:text-amber-500 transition-colors cursor-pointer"
                    title={isStarred ? 'Bỏ đánh dấu sao' : 'Đánh dấu sao'}
                  >
                    <Star
                      className={cn(
                        'size-4 transition-colors',
                        isStarred
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-muted-foreground group-hover:text-foreground/70'
                      )}
                    />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Trạng thái không tìm thấy kết quả */
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground mb-3">
            <Sparkles className="size-5" />
          </div>
          <h3 className="text-base font-bold">Không tìm thấy thuật ngữ phù hợp</h3>
          <p className="mt-1 text-xs text-muted-foreground max-w-sm">
            {filterStarredOnly
              ? 'Bạn chưa đánh dấu sao cho thuật ngữ nào hoặc từ khóa không khớp.'
              : `Không có thuật ngữ nào khớp với "${search}".`}
          </p>
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setFilterStarredOnly(false);
            }}
            className="mt-4 rounded-xl border border-border bg-card px-4 py-1.5 text-xs font-semibold hover:bg-muted transition-colors cursor-pointer"
          >
            Đặt lại bộ lọc
          </button>
        </div>
      )}
    </div>
  );
}
