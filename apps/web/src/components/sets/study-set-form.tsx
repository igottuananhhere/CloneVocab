'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useRef, useEffect, type FormEvent } from 'react';
import {
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  Folder,
  ImagePlus,
  Keyboard,
  Loader2,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
} from 'lucide-react';
import {
  createStudySetSchema,
  updateStudySetSchema,
  type StudySetDetail,
  type Visibility,
} from '@flashcard/contracts';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { apiBrowser } from '@/lib/api/browser';
import { ApiRequestError } from '@/lib/api/request';
import { flashcardImageUrl } from '@/lib/flashcard-image';
import { uploadFlashcardImage } from '@/lib/upload-flashcard-image';
import { BulkImportDialog, type ImportedCard } from './bulk-import-dialog';
import { SetVisibilityBadge } from './set-visibility-badge';
import { cn } from '@/lib/utils';

type CardDraft = { term: string; definition: string; imagePath?: string | null };

const LANGUAGES = [
  { value: 'vi', label: 'Tiếng Việt' },
  { value: 'en', label: 'Tiếng Anh' },
  { value: 'ja', label: 'Tiếng Nhật' },
  { value: 'fr', label: 'Tiếng Pháp' },
  { value: 'zh', label: 'Tiếng Trung' },
  { value: 'ko', label: 'Tiếng Hàn' },
  { value: 'es', label: 'Tiếng Tây Ban Nha' },
  { value: 'de', label: 'Tiếng Đức' },
];

export function StudySetForm({
  mode,
  initial,
}: {
  mode: 'create' | 'edit';
  initial?: StudySetDetail;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const folderId = searchParams.get('folderId');

  // Thong tin bo the
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [subject, setSubject] = useState(initial?.subject ?? '');
  const [language, setLanguage] = useState(initial?.language ?? 'vi');
  const [visibility, setVisibility] = useState<Visibility>(initial?.visibility ?? 'PUBLIC');
  const [showAdvanced, setShowAdvanced] = useState(Boolean(initial?.subject));

  // Danh sach the ghi nho
  const [cards, setCards] = useState<CardDraft[]>(
    initial?.flashcards.map((card) => ({
      term: card.term,
      definition: card.definition,
      imagePath: card.imagePath,
    })) ?? [
      { term: '', definition: '', imagePath: null },
      { term: '', definition: '', imagePath: null },
      { term: '', definition: '', imagePath: null },
      { term: '', definition: '', imagePath: null },
      { term: '', definition: '', imagePath: null },
    ],
  );

  // Upload anh theo tung the
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);

  // Cong cu tren thanh toolbar
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [autoSuggest, setAutoSuggest] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  // Trang thai form
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveAction, setSaveAction] = useState<'view' | 'learn'>('view');

  // Ho tro phim tat toan cuc: Ctrl + Enter de luu
  const submitFormRef = useRef(submitForm);
  submitFormRef.current = submitForm;

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        submitFormRef.current('view');
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  function updateCard(index: number, field: 'term' | 'definition', value: string) {
    setCards((prev) => prev.map((card, i) => (i === index ? { ...card, [field]: value } : card)));
  }

  function addCard() {
    setCards((prev) => [...prev, { term: '', definition: '', imagePath: null }]);
  }

  function removeCard(index: number) {
    setCards((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  }

  function removeImage(index: number) {
    setCards((prev) => prev.map((card, i) => (i === index ? { ...card, imagePath: null } : card)));
  }

  async function handleImageSelect(index: number, file: File) {
    setUploadingIndex(index);
    try {
      const path = await uploadFlashcardImage(file);
      setCards((prev) => prev.map((card, i) => (i === index ? { ...card, imagePath: path } : card)));
    } catch (err: unknown) {
      setStatus({
        tone: 'error',
        message: err instanceof Error ? err.message : 'Không thể tải ảnh lên.',
      });
    } finally {
      setUploadingIndex(null);
    }
  }

  function moveCard(index: number, direction: -1 | 1) {
    setCards((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      const moving = next[index]!;
      const swap = next[target]!;
      next[index] = swap;
      next[target] = moving;
      return next;
    });
  }

  // Dao nguoc toan bo Thuat ngu va Dinh nghia
  function handleSwapAll() {
    setCards((prev) =>
      prev.map((c) => ({
        ...c,
        term: c.definition,
        definition: c.term,
      })),
    );
  }

  // Xoa tat ca the de bat dau lai
  function handleClearAll() {
    if (window.confirm('Bạn có chắc muốn xóa tất cả các thẻ trong học phần này?')) {
      setCards([
        { term: '', definition: '', imagePath: null },
        { term: '', definition: '', imagePath: null },
      ]);
    }
  }

  // Nhan the tu hop thoai Import van ban
  function handleImportedCards(imported: ImportedCard[], importMode: 'append' | 'replace') {
    if (importMode === 'replace') {
      setCards(imported);
    } else {
      // Neu danh sach hien tai chi co cac the rong thi thay the
      const nonEmptyCards = cards.filter((c) => c.term.trim() || c.definition.trim());
      if (nonEmptyCards.length === 0) {
        setCards(imported);
      } else {
        // Bao ve bo sung: loai bo nhung the trung voi danh sach the hien tai
        const existingKeys = new Set(
          nonEmptyCards
            .map((c) => c.term.trim().replace(/\s+/g, ' ').toLowerCase())
            .filter(Boolean),
        );
        const filteredNewCards = imported.filter(
          (c) => !existingKeys.has(c.term.trim().replace(/\s+/g, ' ').toLowerCase()),
        );
        setCards([...nonEmptyCards, ...filteredNewCards]);
      }
    }
  }

  // Gui form luu hoc phan
  async function submitForm(target: 'view' | 'learn') {
    setSaveAction(target);
    setStatus(null);

    // Loc bo nhung the hoan toan rong
    const activeCards = cards.filter((c) => c.term.trim() || c.definition.trim());
    if (activeCards.length < 2) {
      setErrors({
        flashcards: 'Học phần phải có ít nhất 2 thẻ ghi nhớ có nội dung.',
      });
      return;
    }

    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      subject: subject.trim() || null,
      language,
      visibility,
      flashcards: activeCards.map((card) => ({
        term: card.term.trim(),
        definition: card.definition.trim(),
        imagePath: card.imagePath ?? null,
      })),
    };

    const schema = mode === 'create' ? createStudySetSchema : updateStudySetSchema;
    const parsed = schema.safeParse(payload);

    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path.join('.') || '_';
        fieldErrors[key] ??= issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    setSaving(true);

    try {
      const result =
        mode === 'create'
          ? await apiBrowser<StudySetDetail>('/study-sets', {
              method: 'POST',
              body: parsed.data,
            })
          : await apiBrowser<StudySetDetail>(`/study-sets/${initial!.id}`, {
              method: 'PATCH',
              body: parsed.data,
            });

      if (mode === 'create' && folderId) {
        try {
          await apiBrowser(`/folders/${folderId}/sets/${result.id}`, {
            method: 'POST',
          });
        } catch (e) {
          console.error('Không thể liên kết bộ thẻ vào thư mục:', e);
        }
        if (target === 'learn') {
          router.push(`/sets/${result.id}/learn`);
        } else {
          router.push(`/folders/${folderId}`);
        }
        router.refresh();
        return;
      }

      if (target === 'learn') {
        router.push(`/sets/${result.id}/learn`);
      } else {
        router.push(`/sets/${result.id}`);
      }
      router.refresh();
    } catch (error) {
      if (error instanceof ApiRequestError && error.details) {
        setErrors(
          Object.fromEntries(
            Object.entries(error.details).map(([key, messages]) => [key, messages[0] ?? '']),
          ),
        );
      } else {
        setStatus({
          tone: 'error',
          message:
            error instanceof ApiRequestError
              ? error.message
              : 'Không kết nối được tới máy chủ. Thử lại sau.',
        });
      }
    } finally {
      setSaving(false);
    }
  }

  function handleFormSubmit(e: FormEvent) {
    e.preventDefault();
    submitForm('view');
  }

  // Danh sach the khi co tim kiem
  const filteredIndices = searchQuery.trim()
    ? cards
        .map((c, i) => ({ c, i }))
        .filter(
          ({ c }) =>
            c.term.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.definition.toLowerCase().includes(searchQuery.toLowerCase()),
        )
        .map(({ i }) => i)
    : cards.map((_, i) => i);

  return (
    <form onSubmit={handleFormSubmit} className="space-y-6 pb-20" noValidate>
      {/* Header Bar giong thiet ke mau: Tieu de + Badge Cong khai + Nut Tao / Tao va on luyen */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/70 pb-5">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              {mode === 'create' ? 'Tạo một học phần mới' : 'Chỉnh sửa học phần'}
            </h1>
            {folderId && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                <Folder className="size-3.5" />
                <span>Lưu vào thư mục</span>
              </span>
            )}
          </div>
          <div>
            <SetVisibilityBadge value={visibility} onChange={setVisibility} />
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-center">
          <Button
            type="button"
            variant="outline"
            disabled={saving}
            onClick={() => submitForm('view')}
            className="font-medium h-10 px-5 shadow-sm"
          >
            {saving && saveAction === 'view' ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Đang lưu...
              </>
            ) : mode === 'create' ? (
              'Tạo'
            ) : (
              'Lưu'
            )}
          </Button>

          <Button
            type="button"
            disabled={saving}
            onClick={() => submitForm('learn')}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold h-10 px-6 shadow-md transition-all"
          >
            {saving && saveAction === 'learn' ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Đang lưu...
              </>
            ) : mode === 'create' ? (
              'Tạo và ôn luyện'
            ) : (
              'Lưu và ôn luyện'
            )}
          </Button>
        </div>
      </div>

      {status && <Alert tone={status.tone}>{status.message}</Alert>}
      {errors.flashcards && <Alert tone="error">{errors.flashcards}</Alert>}

      {/* Khu vuc nhap Tieu de va Mo ta giong anh mau */}
      <div className="space-y-3.5">
        <div>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Tiêu đề"
            className={cn(
              'h-14 rounded-xl px-4 text-lg font-semibold placeholder:text-muted-foreground/60 shadow-sm border-border/80 bg-card',
              errors.title && 'border-destructive focus-visible:ring-destructive',
            )}
            maxLength={100}
            required
            autoFocus={mode === 'create'}
          />
          {errors.title && <p className="mt-1 text-xs text-destructive">{errors.title}</p>}
        </div>

        <div>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Thêm mô tả..."
            rows={2}
            className="rounded-xl px-4 py-3 text-sm placeholder:text-muted-foreground/60 shadow-sm border-border/80 bg-card"
            maxLength={500}
          />
        </div>

        {/* Tuy chon mo rong: Mon hoc & Ngon ngu */}
        <div>
          <button
            type="button"
            onClick={() => setShowAdvanced((prev) => !prev)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            <SlidersHorizontal className="size-3.5" />
            <span>Tùy chọn chủ đề môn học & ngôn ngữ</span>
            {showAdvanced ? (
              <ChevronUp className="size-3.5" />
            ) : (
              <ChevronDown className="size-3.5" />
            )}
          </button>

          {showAdvanced && (
            <div className="mt-2.5 grid gap-4 sm:grid-cols-2 rounded-xl border border-border/70 bg-card/60 p-4 animate-in fade-in">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Chủ đề / Môn học
                </label>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Ví dụ: Tiếng Anh, Từ vựng, IELTS, Lịch sử..."
                  className="h-10 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Ngôn ngữ
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {LANGUAGES.map((lang) => (
                    <option key={lang.value} value={lang.value}>
                      {lang.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Thanh cong cu Toolbar ngay tren danh sach the giong thiet ke mau */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-4">
        {/* Nhom nut ben trai: [+ Nhap] */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowImportDialog(true)}
            className="rounded-full gap-1.5 font-semibold text-xs h-9 px-4 border-border/80 hover:border-primary hover:text-primary transition-all shadow-sm"
          >
            <Plus className="size-3.5" />
            <span>Nhập</span>
          </Button>
        </div>

        {/* Nhom cong cu ben phai: [Goi y switch] [🔍] [↔] [⌨️] [🗑] */}
        <div className="flex items-center gap-2">
          {/* Cong tac Goi y */}
          <div className="flex items-center gap-2 pr-1 text-xs text-muted-foreground">
            <span className="font-medium">Gợi ý</span>
            <button
              type="button"
              role="switch"
              aria-checked={autoSuggest}
              onClick={() => setAutoSuggest((v) => !v)}
              className={cn(
                'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
                autoSuggest ? 'bg-primary' : 'bg-muted-foreground/30',
              )}
            >
              <span
                className={cn(
                  'pointer-events-none inline-block size-4 transform rounded-full bg-white shadow-lg ring-0 transition-transform',
                  autoSuggest ? 'translate-x-4' : 'translate-x-0',
                )}
              />
            </button>
          </div>

          {/* Nut Tim kiem */}
          <button
            type="button"
            onClick={() => setShowSearch((v) => !v)}
            title="Tìm kiếm thẻ trong danh sách"
            className={cn(
              'inline-flex size-8 items-center justify-center rounded-lg border transition-colors',
              showSearch
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border/70 bg-card text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            <Search className="size-4" />
            <span className="sr-only">Tìm kiếm thẻ</span>
          </button>

          {/* Nut Dao mat the (Swap term & definition) */}
          <button
            type="button"
            onClick={handleSwapAll}
            title="Đảo vị trí Thuật ngữ và Định nghĩa của tất cả thẻ"
            className="inline-flex size-8 items-center justify-center rounded-lg border border-border/70 bg-card text-muted-foreground hover:border-primary hover:text-primary hover:bg-primary/10 transition-colors"
          >
            <ArrowUpDown className="size-4" />
            <span className="sr-only">Đảo thẻ</span>
          </button>

          {/* Nut Huong dan phim tat */}
          <button
            type="button"
            onClick={() => setShowShortcutsModal(true)}
            title="Xem phím tắt học phần"
            className="inline-flex size-8 items-center justify-center rounded-lg border border-border/70 bg-card text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <Keyboard className="size-4" />
            <span className="sr-only">Phím tắt</span>
          </button>

          {/* Nut Xoa tat ca the (Mau do giong thiet ke mau) */}
          <button
            type="button"
            onClick={handleClearAll}
            title="Xóa tất cả các thẻ"
            className="inline-flex size-8 items-center justify-center rounded-lg bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors"
          >
            <Trash2 className="size-4" />
            <span className="sr-only">Xóa tất cả thẻ</span>
          </button>
        </div>
      </div>

      {/* Thanh tim kiem khi duoc bat */}
      {showSearch && (
        <div className="relative animate-in fade-in">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo thuật ngữ hoặc định nghĩa..."
            className="pl-10 pr-10 h-10 rounded-xl"
            autoFocus
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      )}

      {/* Danh sach the hoc (Flashcards) giong thiet ke mau */}
      <div className="space-y-4 pt-1">
        {filteredIndices.length === 0 ? (
          <div className="py-12 text-center rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">
            Không tìm thấy thẻ nào phù hợp với từ khóa &ldquo;{searchQuery}&rdquo;.
          </div>
        ) : (
          filteredIndices.map((cardIndex) => {
            const card = cards[cardIndex]!;
            const hasTermError = Boolean(errors[`flashcards.${cardIndex}.term`]);
            const hasDefError = Boolean(errors[`flashcards.${cardIndex}.definition`]);

            return (
              <div
                key={cardIndex}
                className="group relative rounded-2xl border border-border/80 bg-card p-5 shadow-sm transition-all hover:border-border hover:shadow-md"
              >
                {/* Header cua the: So thu tu ben trai, nut di chuyen & xoa ben phai */}
                <div className="flex items-center justify-between border-b border-border/50 pb-3 mb-4">
                  <span className="text-base font-bold text-foreground tabular-nums">
                    {cardIndex + 1}
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => moveCard(cardIndex, -1)}
                      disabled={cardIndex === 0}
                      title="Di chuyển lên"
                      className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30 transition-colors"
                    >
                      <ChevronUp className="size-4" />
                      <span className="sr-only">Lên</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => moveCard(cardIndex, 1)}
                      disabled={cardIndex === cards.length - 1}
                      title="Di chuyển xuống"
                      className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30 transition-colors"
                    >
                      <ChevronDown className="size-4" />
                      <span className="sr-only">Xuống</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => removeCard(cardIndex)}
                      disabled={cards.length <= 1}
                      title="Xóa thẻ"
                      className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/15 hover:text-destructive disabled:opacity-30 transition-colors ml-1"
                    >
                      <Trash2 className="size-4" />
                      <span className="sr-only">Xóa thẻ</span>
                    </button>
                  </div>
                </div>

                {/* Noi dung the: THUẬT NGỮ | ĐỊNH NGHĨA | HÌNH ẢNH */}
                <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto] items-start">
                  {/* O Thuat ngu */}
                  <div className="space-y-1.5">
                    <Input
                      value={card.term}
                      onChange={(e) => updateCard(cardIndex, 'term', e.target.value)}
                      placeholder="Nhập thuật ngữ"
                      className={cn(
                        'h-11 rounded-lg border-border/80 bg-background text-sm font-medium shadow-none transition-colors',
                        hasTermError && 'border-destructive focus-visible:ring-destructive',
                      )}
                    />
                    <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-0.5">
                      Thuật ngữ
                    </div>
                  </div>

                  {/* O Dinh nghia */}
                  <div className="space-y-1.5">
                    <Input
                      value={card.definition}
                      onChange={(e) => updateCard(cardIndex, 'definition', e.target.value)}
                      placeholder="Nhập định nghĩa"
                      className={cn(
                        'h-11 rounded-lg border-border/80 bg-background text-sm shadow-none transition-colors',
                        hasDefError && 'border-destructive focus-visible:ring-destructive',
                      )}
                    />
                    <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-0.5">
                      Định nghĩa
                    </div>
                  </div>

                  {/* O Hinh anh (Dashed square giong thiet ke mau) */}
                  <div className="flex flex-col items-center justify-center">
                    {card.imagePath ? (
                      <div className="relative group/img size-[68px] overflow-hidden rounded-xl border border-border bg-muted shadow-sm">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={flashcardImageUrl(card.imagePath) || ''}
                          alt="Ảnh thẻ"
                          className="h-full w-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(cardIndex)}
                          title="Gỡ ảnh này"
                          className="absolute inset-0 flex items-center justify-center bg-black/60 text-white opacity-0 group-hover/img:opacity-100 transition-opacity"
                        >
                          <Trash2 className="size-4 text-rose-300" />
                        </button>
                      </div>
                    ) : (
                      <label
                        title="Thêm hình ảnh cho thẻ này"
                        className={cn(
                          'flex flex-col items-center justify-center size-[68px] rounded-xl border-2 border-dashed border-border/80 hover:border-primary/60 hover:bg-muted/40 text-muted-foreground hover:text-foreground transition-all cursor-pointer shadow-sm',
                          uploadingIndex === cardIndex && 'opacity-60 pointer-events-none',
                        )}
                      >
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          className="sr-only"
                          disabled={uploadingIndex === cardIndex}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleImageSelect(cardIndex, file);
                            e.target.value = '';
                          }}
                        />
                        {uploadingIndex === cardIndex ? (
                          <Loader2 className="size-5 animate-spin text-primary" />
                        ) : (
                          <>
                            <ImagePlus className="size-5 mb-0.5 text-muted-foreground/80" />
                            <span className="text-[10px] font-medium leading-none">Hình ảnh</span>
                          </>
                        )}
                      </label>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Nut Them The lon hinh vien thuoc o chinh giua giong thiet ke mau */}
      <div className="flex justify-center pt-4">
        <Button
          type="button"
          onClick={addCard}
          size="lg"
          className="rounded-full px-8 py-3 bg-muted hover:bg-muted/80 text-foreground font-semibold text-sm shadow-sm transition-all border border-border/70 gap-2"
        >
          <Plus className="size-4" />
          <span>Thêm thẻ</span>
        </Button>
      </div>

      {/* Cum nut hanh dong o goc duoi ben phai giong thiet ke mau */}
      <div className="flex items-center justify-end gap-3 pt-6 border-t border-border/70">
        <Button
          type="button"
          variant="outline"
          disabled={saving}
          onClick={() => submitForm('view')}
          className="font-medium h-10 px-6 shadow-sm"
        >
          {saving && saveAction === 'view' ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Đang lưu...
            </>
          ) : mode === 'create' ? (
            'Tạo'
          ) : (
            'Lưu'
          )}
        </Button>

        <Button
          type="button"
          disabled={saving}
          onClick={() => submitForm('learn')}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold h-10 px-7 shadow-md transition-all"
        >
          {saving && saveAction === 'learn' ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Đang lưu...
            </>
          ) : mode === 'create' ? (
            'Tạo và ôn luyện'
          ) : (
            'Lưu và ôn luyện'
          )}
        </Button>
      </div>

      {/* Hop thoai Nhap tu van ban */}
      <BulkImportDialog
        open={showImportDialog}
        onClose={() => setShowImportDialog(false)}
        onImport={handleImportedCards}
        existingTerms={cards.map((c) => c.term)}
      />

      {/* Modal Huong dan phim tat */}
      {showShortcutsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Keyboard className="size-5 text-primary" />
                <h3 className="text-lg font-semibold">Phím tắt thao tác nhanh</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowShortcutsModal(false)}
                className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="size-4" />
                <span className="sr-only">Đóng</span>
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between py-1.5 border-b border-border/50">
                <span className="text-muted-foreground">Chuyển giữa Thuật ngữ & Định nghĩa</span>
                <kbd className="rounded border border-border bg-muted px-2 py-0.5 font-mono text-xs">
                  Tab
                </kbd>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-border/50">
                <span className="text-muted-foreground">Lưu học phần ngay lập tức</span>
                <kbd className="rounded border border-border bg-muted px-2 py-0.5 font-mono text-xs">
                  Ctrl + Enter
                </kbd>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-border/50">
                <span className="text-muted-foreground">Nhập từ vựng nhanh từ văn bản</span>
                <span className="text-xs font-medium text-primary">Nút &quot;+ Nhập&quot;</span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button type="button" onClick={() => setShowShortcutsModal(false)}>
                Đã hiểu
              </Button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}

