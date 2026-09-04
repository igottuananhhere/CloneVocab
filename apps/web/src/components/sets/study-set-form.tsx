'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import {
  createStudySetSchema,
  updateStudySetSchema,
  type StudySetDetail,
  type Visibility,
} from '@flashcard/contracts';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { apiBrowser } from '@/lib/api/browser';
import { ApiRequestError } from '@/lib/api/request';

type CardDraft = { term: string; definition: string };

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

const VISIBILITIES: Array<{ value: Visibility; label: string; hint: string }> = [
  { value: 'PUBLIC', label: 'Công khai', hint: 'Ai cũng tìm và xem được' },
  { value: 'UNLISTED', label: 'Chỉ qua link', hint: 'Không hiện trên trang khám phá' },
  { value: 'PRIVATE', label: 'Riêng tư', hint: 'Chỉ bạn xem được' },
];

const selectClass =
  'flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

export function StudySetForm({
  mode,
  initial,
}: {
  mode: 'create' | 'edit';
  initial?: StudySetDetail;
}) {
  const router = useRouter();

  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [subject, setSubject] = useState(initial?.subject ?? '');
  const [language, setLanguage] = useState(initial?.language ?? 'vi');
  const [visibility, setVisibility] = useState<Visibility>(initial?.visibility ?? 'PRIVATE');
  const [cards, setCards] = useState<CardDraft[]>(
    initial?.flashcards.map((card) => ({ term: card.term, definition: card.definition })) ?? [
      { term: '', definition: '' },
      { term: '', definition: '' },
    ],
  );
  const [bulk, setBulk] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);
  const [saving, setSaving] = useState(false);

  function updateCard(index: number, field: 'term' | 'definition', value: string) {
    setCards((prev) => prev.map((card, i) => (i === index ? { ...card, [field]: value } : card)));
  }

  function addCard() {
    setCards((prev) => [...prev, { term: '', definition: '' }]);
  }

  function removeCard(index: number) {
    setCards((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
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

  /** Phan tich van ban dan: moi dong la mot the, tach tai tab / " | " / "::" / " - ". */
  function applyBulk() {
    const parsed = parseBulk(bulk);
    if (parsed.length === 0) return;
    setCards((prev) => [...prev, ...parsed]);
    setBulk('');
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);

    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      subject: subject.trim() || null,
      language,
      visibility,
      flashcards: cards.map((card) => ({
        term: card.term.trim(),
        definition: card.definition.trim(),
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

      router.push(`/sets/${result.id}`);
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

  return (
    <form onSubmit={onSubmit} className="space-y-8" noValidate>
      {status && <Alert tone={status.tone}>{status.message}</Alert>}

      <Card>
        <CardContent className="space-y-5 pt-6">
          <Field id="title" label="Tiêu đề" error={errors.title}>
            <Input
              name="title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Ví dụ: Tiếng Nhật sơ cấp - Chào hỏi"
              invalid={Boolean(errors.title)}
              required
            />
          </Field>

          <Field id="description" label="Mô tả" hint="Tùy chọn." error={errors.description}>
            <Textarea
              name="description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Giới thiệu ngắn về bộ thẻ này"
              invalid={Boolean(errors.description)}
            />
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field id="subject" label="Chủ đề" hint="Tùy chọn." error={errors.subject}>
              <Input
                name="subject"
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                placeholder="Ví dụ: Ngoại ngữ"
                invalid={Boolean(errors.subject)}
              />
            </Field>

            <Field id="language" label="Ngôn ngữ">
              <select
                id="language"
                className={selectClass}
                value={language}
                onChange={(event) => setLanguage(event.target.value)}
              >
                {LANGUAGES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field id="visibility" label="Quyền xem">
            <select
              id="visibility"
              className={selectClass}
              value={visibility}
              onChange={(event) => setVisibility(event.target.value as Visibility)}
            >
              {VISIBILITIES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label} — {option.hint}
                </option>
              ))}
            </select>
          </Field>
        </CardContent>
      </Card>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Thẻ ghi nhớ</h2>
          <span className="text-sm text-muted-foreground">{cards.length} thẻ</span>
        </div>

        {errors.flashcards && <Alert tone="error">{errors.flashcards}</Alert>}

        <ul className="space-y-3">
          {cards.map((card, index) => (
            <li key={index}>
              <Card>
                <CardContent className="grid gap-3 pt-4 sm:grid-cols-[1fr_1fr_auto]">
                  <Input
                    aria-label={`Mặt trước thẻ ${index + 1}`}
                    value={card.term}
                    onChange={(event) => updateCard(index, 'term', event.target.value)}
                    placeholder="Mặt trước (từ / câu hỏi)"
                    invalid={Boolean(errors[`flashcards.${index}.term`])}
                  />
                  <Input
                    aria-label={`Mặt sau thẻ ${index + 1}`}
                    value={card.definition}
                    onChange={(event) => updateCard(index, 'definition', event.target.value)}
                    placeholder="Mặt sau (nghĩa / đáp án)"
                    invalid={Boolean(errors[`flashcards.${index}.definition`])}
                  />
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Chuyển lên"
                      disabled={index === 0}
                      onClick={() => moveCard(index, -1)}
                    >
                      ↑
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Chuyển xuống"
                      disabled={index === cards.length - 1}
                      onClick={() => moveCard(index, 1)}
                    >
                      ↓
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Xóa thẻ"
                      disabled={cards.length <= 1}
                      onClick={() => removeCard(index)}
                    >
                      ✕
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>

        <Button type="button" variant="outline" onClick={addCard}>
          + Thêm thẻ
        </Button>

        <Card>
          <CardContent className="space-y-3 pt-6">
            <details>
              <summary className="cursor-pointer text-sm font-medium text-muted-foreground">
                Thêm nhanh từ văn bản
              </summary>
              <div className="mt-3 space-y-3">
                <Textarea
                  value={bulk}
                  onChange={(event) => setBulk(event.target.value)}
                  placeholder={'Mỗi dòng một thẻ, cách bằng tab, " | ", "::" hoặc " - "\nVí dụ:\nこんにちは\tXin chào'}
                  className="min-h-32 font-mono text-sm"
                />
                <Button type="button" variant="outline" size="sm" onClick={applyBulk}>
                  Thêm vào danh sách
                </Button>
              </div>
            </details>
          </CardContent>
        </Card>
      </section>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={saving}>
          {saving ? 'Đang lưu...' : mode === 'create' ? 'Tạo bộ thẻ' : 'Lưu thay đổi'}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          Hủy
        </Button>
      </div>
    </form>
  );
}

/** Tach tung dong thanh { term, definition }. Tra ve [] neu khong co du lieu hop le. */
function parseBulk(text: string): CardDraft[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/\t|::|\s[-–—]\s|\s\|\s/);
      if (!match || match.index === undefined) {
        return { term: line, definition: '' };
      }
      const separator = match[0] ?? '';
      return {
        term: line.slice(0, match.index).trim(),
        definition: line.slice(match.index + separator.length).trim(),
      };
    });
}
