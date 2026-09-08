'use client';

import { useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, FileText, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

export type ImportedCard = {
  term: string;
  definition: string;
  imagePath?: string | null;
};

export type ParsedCardPreview = {
  term: string;
  definition: string;
  imagePath?: string | null;
  isDuplicate: boolean;
  duplicateReason?: 'existing' | 'batch';
};

type DelimiterOption = 'auto' | 'colon' | 'tab' | 'dash' | 'pipe' | 'comma';

interface BulkImportDialogProps {
  open: boolean;
  onClose: () => void;
  onImport: (cards: ImportedCard[], mode: 'append' | 'replace') => void;
  existingTerms?: string[];
}

export function BulkImportDialog({
  open,
  onClose,
  onImport,
  existingTerms = [],
}: BulkImportDialogProps) {
  const [text, setText] = useState('');
  const [termSeparator, setTermSeparator] = useState<DelimiterOption>('auto');
  const [cardSeparator, setCardSeparator] = useState<'newline' | 'semicolon'>('newline');
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');

  // Tap hop cac tu hien da co trong bo the (chuan hoa chu thuong va khoang trang)
  const existingSet = useMemo(() => {
    return new Set(
      existingTerms
        .map((t) => t.trim().replace(/\s+/g, ' ').toLowerCase())
        .filter(Boolean),
    );
  }, [existingTerms]);

  // Parse text vao danh sach the xem truoc va tu dong kiem tra trung lap
  const parsedCards = useMemo(() => {
    if (!text.trim()) return [];

    const rawBlocks =
      cardSeparator === 'newline'
        ? text.split(/\r?\n/)
        : text.split(';');

    const results: ParsedCardPreview[] = [];
    const seenInBatch = new Set<string>();

    for (const raw of rawBlocks) {
      const line = raw.trim();
      if (!line) continue;

      let term = '';
      let definition = '';

      if (termSeparator === 'colon') {
        const idx = line.indexOf(':');
        if (idx !== -1) {
          term = line.slice(0, idx).trim();
          definition = line.slice(idx + 1).trim();
        } else {
          term = line;
        }
      } else if (termSeparator === 'tab') {
        const parts = line.split(/\t+/);
        term = parts[0]?.trim() ?? '';
        definition = parts.slice(1).join(' ').trim();
      } else if (termSeparator === 'dash') {
        const match = line.match(/\s+[-–—]\s+/);
        if (match && match.index !== undefined) {
          term = line.slice(0, match.index).trim();
          definition = line.slice(match.index + match[0].length).trim();
        } else {
          term = line;
        }
      } else if (termSeparator === 'pipe') {
        const parts = line.split('|');
        term = parts[0]?.trim() ?? '';
        definition = parts.slice(1).join('|').trim();
      } else if (termSeparator === 'comma') {
        const idx = line.indexOf(',');
        if (idx !== -1) {
          term = line.slice(0, idx).trim();
          definition = line.slice(idx + 1).trim();
        } else {
          term = line;
        }
      } else {
        // 'auto' mode: Tu dong nhan dien thong minh
        // 1. Phim Tab
        if (line.includes('\t')) {
          const parts = line.split(/\t+/);
          term = parts[0]?.trim() ?? '';
          definition = parts.slice(1).join(' ').trim();
        }
        // 2. Dau hai cham
        else if (line.match(/::/)) {
          const match = line.match(/::/);
          if (match && match.index !== undefined) {
            term = line.slice(0, match.index).trim();
            definition = line.slice(match.index + 2).trim();
          }
        } else if (line.match(/\s*:\s+/)) {
          const match = line.match(/\s*:\s+/);
          if (match && match.index !== undefined) {
            term = line.slice(0, match.index).trim();
            definition = line.slice(match.index + match[0].length).trim();
          }
        }
        // 3. Dau gach ngang giua 2 khoang trang " - "
        else if (line.match(/\s+[-–—]\s+/)) {
          const match = line.match(/\s+[-–—]\s+/);
          if (match && match.index !== undefined) {
            term = line.slice(0, match.index).trim();
            definition = line.slice(match.index + match[0].length).trim();
          }
        }
        // 4. Dau gach dung "|"
        else if (line.includes('|')) {
          const parts = line.split('|');
          term = parts[0]?.trim() ?? '';
          definition = parts.slice(1).join('|').trim();
        }
        // Fallback neu chi co dau hai cham don ":"
        else if (line.includes(':')) {
          const idx = line.indexOf(':');
          term = line.slice(0, idx).trim();
          definition = line.slice(idx + 1).trim();
        } else {
          term = line;
          definition = '';
        }
      }

      if (term || definition) {
        const cleanTerm = term.trim();
        const normKey = cleanTerm.replace(/\s+/g, ' ').toLowerCase();

        let isDuplicate = false;
        let duplicateReason: 'existing' | 'batch' | undefined;

        if (cleanTerm) {
          if (importMode === 'append' && existingSet.has(normKey)) {
            isDuplicate = true;
            duplicateReason = 'existing';
          } else if (seenInBatch.has(normKey)) {
            isDuplicate = true;
            duplicateReason = 'batch';
          } else {
            seenInBatch.add(normKey);
          }
        }

        results.push({
          term,
          definition,
          imagePath: null,
          isDuplicate,
          duplicateReason,
        });
      }
    }

    return results;
  }, [text, termSeparator, cardSeparator, importMode, existingSet]);

  // Danh sach the moi hop le (da loai bo trung lap)
  const validNewCards = useMemo(
    () => parsedCards.filter((c) => !c.isDuplicate && c.term.trim()),
    [parsedCards],
  );

  const duplicateCards = useMemo(
    () => parsedCards.filter((c) => c.isDuplicate),
    [parsedCards],
  );

  if (!open) return null;

  function handleSubmit() {
    if (validNewCards.length === 0) return;
    onImport(
      validNewCards.map((c) => ({
        term: c.term,
        definition: c.definition,
        imagePath: null,
      })),
      importMode,
    );
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 animate-in fade-in">
      <div className="flex w-full max-w-3xl max-h-[90vh] flex-col rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FileText className="size-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Nhập từ mới từ văn bản</h3>
              <p className="text-xs text-muted-foreground">
                Dán danh sách từ vựng theo cú pháp{' '}
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-primary font-semibold">
                  Thuật ngữ : Định nghĩa
                </code>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="size-5" />
            <span className="sr-only">Đóng</span>
          </button>
        </div>

        {/* Body (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Cau hinh dau phan cach */}
          <div className="grid gap-4 sm:grid-cols-2 rounded-xl border border-border/80 bg-muted/30 p-4">
            <div>
              <label
                htmlFor="term-sep-select"
                className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5"
              >
                Giữa Thuật ngữ & Định nghĩa
              </label>
              <select
                id="term-sep-select"
                value={termSeparator}
                onChange={(e) => setTermSeparator(e.target.value as DelimiterOption)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="auto">Tự động nhận diện (khuyên dùng)</option>
                <option value="colon">Dấu hai chấm &quot; : &quot;</option>
                <option value="tab">Phím Tab (Excel / Google Sheets)</option>
                <option value="dash">Dấu gạch ngang &quot; - &quot;</option>
                <option value="pipe">Dấu gạch đứng &quot; | &quot;</option>
                <option value="comma">Dấu phẩy &quot; , &quot;</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="card-sep-select"
                className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5"
              >
                Giữa các thẻ
              </label>
              <select
                id="card-sep-select"
                value={cardSeparator}
                onChange={(e) => setCardSeparator(e.target.value as 'newline' | 'semicolon')}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="newline">Xuống dòng (mỗi dòng 1 thẻ)</option>
                <option value="semicolon">Dấu chấm phẩy &quot; ; &quot;</option>
              </select>
            </div>
          </div>

          {/* Vung nhap van ban */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="bulk-import-textarea"
                className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              >
                Dán văn bản vào đây
              </label>
              <span className="text-xs text-muted-foreground">
                Ví dụ: <code className="font-mono text-primary">house (n) : nhà cửa</code>
              </span>
            </div>
            <Textarea
              id="bulk-import-textarea"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={`house (n) : nhà cửa\nenvironment (n) : môi trường\nsustainable (adj) : bền vững\nfamily (n) : gia đình`}
              className="min-h-44 font-mono text-sm leading-relaxed"
              autoFocus
            />
          </div>

          {/* Bang xem truoc truc tiep (Live Preview) */}
          {parsedCards.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-emerald-500" />
                  <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Xem trước ({parsedCards.length} thẻ được nhận diện
                    {duplicateCards.length > 0 && (
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                        {' '}— {validNewCards.length} thẻ hợp lệ sẽ được thêm
                      </span>
                    )}
                    )
                  </span>
                </div>
              </div>

              {duplicateCards.length > 0 && (
                <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
                  <AlertCircle className="size-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                  <div>
                    <span className="font-semibold">
                      Đã phát hiện và tự động lọc {duplicateCards.length} từ vựng bị trùng lặp.
                    </span>{' '}
                    <span>
                      Hệ thống sẽ tự động bỏ qua các từ trùng để tránh làm lặp thẻ trong học phần của bạn.
                    </span>
                  </div>
                </div>
              )}

              <div className="max-h-56 overflow-y-auto rounded-xl border border-border bg-card">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 border-b border-border bg-muted/80 backdrop-blur font-semibold text-muted-foreground">
                    <tr>
                      <th className="w-10 px-3 py-2 text-center">#</th>
                      <th className="w-1/2 px-3 py-2">MẶT TRƯỚC (THUẬT NGỮ)</th>
                      <th className="w-1/2 px-3 py-2">MẶT SAU (ĐỊNH NGHĨA)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {parsedCards.map((card, idx) => (
                      <tr
                        key={idx}
                        className={
                          card.isDuplicate
                            ? 'bg-amber-500/5 hover:bg-amber-500/10 transition-colors opacity-75'
                            : 'hover:bg-muted/30 transition-colors'
                        }
                      >
                        <td className="px-3 py-2 text-center text-muted-foreground font-mono">
                          {idx + 1}
                        </td>
                        <td className="px-3 py-2 font-medium">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className={
                                card.isDuplicate
                                  ? 'line-through text-muted-foreground'
                                  : 'text-foreground'
                              }
                            >
                              {card.term || (
                                <span className="text-destructive inline-flex items-center gap-1 not-italic no-underline">
                                  <AlertCircle className="size-3" /> Trống
                                </span>
                              )}
                            </span>
                            {card.isDuplicate && (
                              <span className="inline-flex items-center rounded-md border border-amber-500/30 bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                                {card.duplicateReason === 'existing'
                                  ? 'Đã có trong học phần (Bỏ qua)'
                                  : 'Trùng trong văn bản (Bỏ qua)'}
                              </span>
                            )}
                          </div>
                        </td>
                        <td
                          className={`px-3 py-2 ${
                            card.isDuplicate
                              ? 'line-through text-muted-foreground/70'
                              : 'text-muted-foreground'
                          }`}
                        >
                          {card.definition || (
                            <span className="text-amber-500 inline-flex items-center gap-1 not-italic no-underline">
                              <AlertCircle className="size-3" /> Chưa có nghĩa
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Che do chen the */}
          <div className="flex items-center gap-6 pt-1 text-sm">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="import-mode"
                value="append"
                checked={importMode === 'append'}
                onChange={() => setImportMode('append')}
                className="text-primary focus:ring-primary"
              />
              <span>Thêm tiếp vào danh sách thẻ hiện tại</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="import-mode"
                value="replace"
                checked={importMode === 'replace'}
                onChange={() => setImportMode('replace')}
                className="text-primary focus:ring-primary"
              />
              <span>Thay thế toàn bộ danh sách thẻ</span>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border px-6 py-4 bg-muted/20">
          <Button type="button" variant="outline" onClick={onClose}>
            Hủy
          </Button>

          <Button
            type="button"
            onClick={handleSubmit}
            disabled={validNewCards.length === 0}
            className="px-6 font-semibold shadow"
          >
            {validNewCards.length > 0
              ? `Nhập (${validNewCards.length} thẻ mới)`
              : duplicateCards.length > 0
                ? 'Tất cả thẻ đều bị trùng'
                : 'Nhập thẻ'}
          </Button>
        </div>
      </div>
    </div>
  );
}
