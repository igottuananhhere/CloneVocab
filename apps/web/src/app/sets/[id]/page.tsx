import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowRight,
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
import { SetFlashcardPreview } from '@/components/study/set-flashcard-preview';
import { SetCardsBrowser } from '@/components/sets/set-cards-browser';
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
  {
    icon: Layers,
    label: 'Thẻ ghi nhớ',
    hint: 'Lật thẻ & ôn tập từ vựng',
    href: 'cards',
    cardStyle:
      'border-blue-500/20 bg-gradient-to-br from-blue-500/10 via-card to-card hover:border-blue-500/50 hover:shadow-blue-500/10',
    iconStyle:
      'bg-blue-500/15 text-blue-500 group-hover:bg-blue-500 group-hover:text-white',
    tag: 'Phổ biến nhất',
  },
  {
    icon: Repeat,
    label: 'Học lại',
    hint: 'Ghi nhớ sâu theo Leitner',
    href: 'learn',
    cardStyle:
      'border-purple-500/20 bg-gradient-to-br from-purple-500/10 via-card to-card hover:border-purple-500/50 hover:shadow-purple-500/10',
    iconStyle:
      'bg-purple-500/15 text-purple-500 group-hover:bg-purple-500 group-hover:text-white',
    tag: 'Ghi nhớ sâu',
  },
  {
    icon: BookOpen,
    label: 'Kiểm tra',
    hint: 'Trắc nghiệm & tự luận tính điểm',
    href: 'test',
    cardStyle:
      'border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-card to-card hover:border-emerald-500/50 hover:shadow-emerald-500/10',
    iconStyle:
      'bg-emerald-500/15 text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white',
    tag: 'Đo lường',
  },
  {
    icon: Timer,
    label: 'Ghép cặp',
    hint: 'Đua tốc độ kết nối cặp từ',
    href: 'match',
    cardStyle:
      'border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-card to-card hover:border-amber-500/50 hover:shadow-amber-500/10',
    iconStyle:
      'bg-amber-500/15 text-amber-500 group-hover:bg-amber-500 group-hover:text-white',
    tag: 'Thử thách',
  },
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

      {/* Bento Grid các chế độ học tập chuẩn Quizlet Plus */}
      <section aria-label="Chế độ học" className="mt-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Chế độ học tập
          </h2>
          <span className="text-xs text-muted-foreground hidden sm:inline">
            Chọn phương pháp ôn luyện phù hợp
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {MODES.map((mode) => {
            const Icon = mode.icon;
            return (
              <Link
                key={mode.href}
                href={`/sets/${set.id}/${mode.href}`}
                className={cn(
                  'group relative flex flex-col justify-between rounded-2xl border p-4 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:shadow-md cursor-pointer',
                  mode.cardStyle
                )}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <div
                      className={cn(
                        'flex size-10 items-center justify-center rounded-xl transition-colors duration-200',
                        mode.iconStyle
                      )}
                    >
                      <Icon className="size-5" aria-hidden="true" />
                    </div>
                    <span className="rounded-full bg-background/80 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground backdrop-blur-xs border border-border/60">
                      {mode.tag}
                    </span>
                  </div>
                  <div className="mt-3">
                    <h3 className="font-bold text-foreground text-base tracking-tight">
                      {mode.label}
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                      {mode.hint}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-foreground/80 group-hover:text-primary transition-colors pt-2 border-t border-border/40">
                  <span>Bắt đầu</span>
                  <ArrowRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-1" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

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
