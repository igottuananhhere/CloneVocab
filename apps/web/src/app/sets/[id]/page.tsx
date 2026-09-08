import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  BookOpen,
  Layers,
  Repeat,
  Timer,
  TriangleAlert,
} from 'lucide-react';
import type { StudySetDetail } from '@flashcard/contracts';
import { buttonVariants } from '@/components/ui/button';
import { DeleteSetButton } from '@/components/sets/delete-set-button';
import { SaveSetButton } from '@/components/sets/save-set-button';
import { AddToFolderDialog } from '@/components/folders/add-to-folder-dialog';
import { ReportSetDialog } from '@/components/sets/report-set-dialog';
import { apiServer } from '@/lib/api/server';
import { createClient } from '@/lib/supabase/server';
import { ApiRequestError } from '@/lib/api/request';
import { flashcardImageUrl } from '@/lib/flashcard-image';
import { SetFlashcardPreview } from '@/components/study/set-flashcard-preview';
import { cn } from '@/lib/utils';

type PageProps = { params: Promise<{ id: string }> };

// Chi tiet co the la private nen khong duoc prerender, va can token cua chu so huu.
export const dynamic = 'force-dynamic';

async function loadSet(id: string): Promise<StudySetDetail | null> {
  try {
    return await apiServer<StudySetDetail>(`/study-sets/${id}`);
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 404) {
      return null;
    }
    throw error;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const set = await loadSet(id);

  if (!set) {
    return { title: 'Không tìm thấy bộ thẻ', robots: { index: false } };
  }

  return {
    title: set.title,
    description: set.description ?? `Bộ thẻ ghi nhớ ${set.cardCount} thẻ.`,
    robots: set.visibility === 'PUBLIC' ? undefined : { index: false },
    alternates: { canonical: `/sets/${set.id}` },
    openGraph: {
      title: set.title,
      description: set.description ?? `Bộ thẻ ghi nhớ ${set.cardCount} thẻ.`,
      type: 'article',
    },
  };
}

const MODES = [
  { icon: Layers, label: 'Thẻ ghi nhớ', hint: 'Lật thẻ hai mặt', href: 'cards' },
  { icon: Repeat, label: 'Học lại', hint: 'Ôn tập ngắt quãng', href: 'learn' },
  { icon: BookOpen, label: 'Kiểm tra', hint: 'Tự luận & trắc nghiệm', href: 'test' },
  { icon: Timer, label: 'Ghép cặp', hint: 'Trò chơi tính giờ', href: 'match' },
];

export default async function StudySetPage({ params }: PageProps) {
  const { id } = await params;
  const set = await loadSet(id);

  if (!set) {
    notFound();
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isOwner = user?.id === set.ownerId;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <header className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1 className="text-3xl font-bold tracking-tight">{set.title}</h1>
          <div className="flex flex-wrap items-center gap-2">
            <AddToFolderDialog setId={set.id} isLoggedIn={Boolean(user)} />
            {!isOwner && (
              <>
                <SaveSetButton
                  setId={set.id}
                  initialSaved={Boolean(set.isSaved)}
                  isLoggedIn={Boolean(user)}
                />
                <ReportSetDialog setId={set.id} />
              </>
            )}
            {isOwner && (
              <>
                <Link
                  href={`/sets/${set.id}/edit`}
                  className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
                >
                  Chỉnh sửa
                </Link>
                <DeleteSetButton setId={set.id} title={set.title} />
              </>
            )}
          </div>
        </div>

        {set.description && <p className="text-muted-foreground">{set.description}</p>}

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <span>{set.cardCount} thẻ</span>
          {set.subject && (
            <>
              <span aria-hidden="true">·</span>
              <span>{set.subject}</span>
            </>
          )}
          <span aria-hidden="true">·</span>
          <Link href={`/u/${set.owner.username}`} className="hover:text-foreground hover:underline">
            {set.owner.displayName ?? set.owner.username}
          </Link>
          {set.visibility !== 'PUBLIC' && (
            <>
              <span aria-hidden="true">·</span>
              <span className="capitalize">
                {set.visibility === 'PRIVATE' ? 'Riêng tư' : 'Chỉ qua link'}
              </span>
            </>
          )}
        </div>
      </header>

      {/* Các chế độ học tập (Quizlet style tabs) */}
      <section aria-label="Chế độ học" className="mt-8">
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
          {MODES.map((mode) => {
            const isFlashcard = mode.href === 'cards';
            return (
              <Link
                key={mode.label}
                href={`/sets/${set.id}/${mode.href}`}
                className={cn(
                  'flex items-center justify-center sm:justify-start gap-2.5 rounded-xl border p-3 font-medium transition-all duration-150 shadow-xs text-sm',
                  isFlashcard
                    ? 'border-primary/50 bg-primary/10 text-primary hover:bg-primary/20'
                    : 'border-border bg-card text-foreground hover:border-primary/30 hover:bg-accent/50'
                )}
              >
                <mode.icon className="size-4 shrink-0" aria-hidden="true" />
                <span>{mode.label}</span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Khung xem trước thẻ Flashcard trực tiếp */}
      {set.flashcards.length > 0 && (
        <section aria-label="Thẻ ghi nhớ" className="mt-6">
          <SetFlashcardPreview setId={set.id} cards={set.flashcards} setTitle={set.title} />
        </section>
      )}

      <section aria-labelledby="cards-heading" className="mt-12">
        <div className="flex items-center justify-between mb-4">
          <h2 id="cards-heading" className="text-xl font-bold">
            Danh sách thẻ ({set.flashcards.length})
          </h2>
        </div>
        <ul className="mt-3 divide-y divide-border rounded-lg border border-border">
          {set.flashcards.map((card, index) => {
            const imgUrl = flashcardImageUrl(card.imagePath);
            return (
              <li
                key={card.id}
                className={cn(
                  'grid gap-3 p-4 sm:items-center sm:gap-4',
                  imgUrl ? 'sm:grid-cols-[1fr_1fr_auto]' : 'sm:grid-cols-2',
                )}
              >
                <div>
                  <p className="text-xs text-muted-foreground">Mặt trước</p>
                  <p className="font-medium">{card.term}</p>
                </div>
                <div className="sm:border-l sm:border-border sm:pl-4">
                  <p className="text-xs text-muted-foreground">Mặt sau</p>
                  <p className="font-medium">{card.definition}</p>
                </div>
                {imgUrl && (
                  <div className="flex justify-start sm:justify-end sm:pl-2">
                    <div className="relative h-14 w-20 overflow-hidden rounded-md border border-border bg-muted">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imgUrl}
                        alt={card.term}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  </div>
                )}
                <span className="sr-only">Thẻ {index + 1}</span>
              </li>
            );
          })}
        </ul>
      </section>

      {!isOwner && (
        <p className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
          <TriangleAlert className="size-4" aria-hidden="true" />
          Bạn chỉ có thể chỉnh sửa bộ thẻ do chính mình tạo.
        </p>
      )}
    </div>
  );
}
