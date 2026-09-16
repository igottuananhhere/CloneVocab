import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { TriangleAlert } from 'lucide-react';
import type { StudySetDetail, StudyStats } from '@flashcard/contracts';
import { buttonVariants } from '@/components/ui/button';
import { DeleteSetButton } from '@/components/sets/delete-set-button';
import { SaveSetButton } from '@/components/sets/save-set-button';
import { AddToFolderDialog } from '@/components/folders/add-to-folder-dialog';
import { ReportSetDialog } from '@/components/sets/report-set-dialog';
import { apiServer } from '@/lib/api/server';
import { createClient } from '@/lib/supabase/server';
import { ApiRequestError } from '@/lib/api/request';
import { SetFlashcardPreview } from '@/components/study/set-flashcard-preview';
import { SetCardsBrowser } from '@/components/sets/set-cards-browser';
import { StudyModesBento } from '@/components/study/study-modes-bento';
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

  let stats: StudyStats | null = null;
  if (user) {
    try {
      stats = await apiServer<StudyStats>('/study/stats');
    } catch {
      stats = null;
    }
  }

  const ownerInitial =
    set.owner.displayName?.[0]?.toUpperCase() ??
    set.owner.username[0]?.toUpperCase() ??
    'U';

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:py-10">
      {/* Header học phần */}
      <header className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              {set.title}
            </h1>
            {set.description && (
              <p className="text-sm sm:text-base text-muted-foreground max-w-2xl leading-relaxed">
                {set.description}
              </p>
            )}
          </div>

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
                  className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'rounded-xl shadow-xs')}
                >
                  Chỉnh sửa
                </Link>
                <DeleteSetButton setId={set.id} title={set.title} />
              </>
            )}
          </div>
        </div>

        {/* Metadata badges: Tác giả, số thẻ, môn học, quyền riêng tư */}
        <div className="flex flex-wrap items-center gap-2.5 pt-1 text-xs text-muted-foreground">
          {/* Tác giả */}
          <Link
            href={`/u/${set.owner.username}`}
            className="group flex items-center gap-1.5 rounded-full border border-border/70 bg-card px-2.5 py-1 transition-colors hover:border-primary/40 hover:bg-accent/40"
          >
            <div className="flex size-5 items-center justify-center rounded-full bg-primary/15 text-primary text-[10px] font-bold">
              {ownerInitial}
            </div>
            <span className="font-medium text-foreground group-hover:underline">
              {set.owner.displayName ?? set.owner.username}
            </span>
          </Link>

          {/* Số thẻ */}
          <span className="inline-flex items-center rounded-full border border-border/70 bg-muted/60 px-2.5 py-1 font-semibold text-foreground/80 font-mono">
            {set.cardCount} thuật ngữ
          </span>

          {/* Môn học */}
          {set.subject && (
            <span className="inline-flex items-center rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 font-semibold text-primary">
              {set.subject}
            </span>
          )}

          {/* Quyền xem */}
          {set.visibility !== 'PUBLIC' && (
            <span className="inline-flex items-center rounded-full border border-amber-500/25 bg-amber-500/10 px-2.5 py-1 font-semibold text-amber-500">
              {set.visibility === 'PRIVATE' ? 'Riêng tư' : 'Chỉ qua liên kết'}
            </span>
          )}
        </div>
      </header>

      {/* Bento Grid bộ thẻ trò chơi & chế độ học tập nâng cấp */}
      <StudyModesBento setId={set.id} cardCount={set.cardCount} stats={stats} />

      {/* Khung xem trước thẻ Flashcard trực tiếp */}
      {set.flashcards.length > 0 && (
        <section aria-label="Thẻ ghi nhớ" className="mt-8">
          <SetFlashcardPreview setId={set.id} cards={set.flashcards} setTitle={set.title} />
        </section>
      )}

      {/* Danh sách thẻ từ vựng tương tác cao */}
      <section aria-labelledby="cards-heading" className="mt-12">
        <SetCardsBrowser setId={set.id} cards={set.flashcards} />
      </section>

      {!isOwner && (
        <p className="mt-8 flex items-center gap-2 text-xs text-muted-foreground">
          <TriangleAlert className="size-3.5" aria-hidden="true" />
          Bạn chỉ có thể chỉnh sửa bộ thẻ do chính mình tạo.
        </p>
      )}
    </div>
  );
}
