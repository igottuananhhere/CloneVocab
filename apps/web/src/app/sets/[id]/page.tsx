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
import { apiServer } from '@/lib/api/server';
import { createClient } from '@/lib/supabase/server';
import { ApiRequestError } from '@/lib/api/request';
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
    <div className="mx-auto max-w-3xl px-4 py-10">
      <header className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1 className="text-3xl font-bold tracking-tight">{set.title}</h1>
          <div className="flex items-center gap-2">
            {!isOwner && (
              <SaveSetButton
                setId={set.id}
                initialSaved={Boolean(set.isSaved)}
                isLoggedIn={Boolean(user)}
              />
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

      <section aria-labelledby="modes-heading" className="mt-8">
        <h2 id="modes-heading" className="text-lg font-semibold">
          Học bộ thẻ này
        </h2>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          {MODES.map((mode) => (
            <li key={mode.label}>
              <Link
                href={`/sets/${set.id}/${mode.href}`}
                className="flex h-full items-center gap-3 rounded-lg border border-border p-4 transition-colors hover:border-primary/50"
              >
                <mode.icon className="size-5 shrink-0 text-primary" aria-hidden="true" />
                <div>
                  <p className="font-medium">{mode.label}</p>
                  <p className="text-xs text-muted-foreground">{mode.hint}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="cards-heading" className="mt-10">
        <h2 id="cards-heading" className="text-lg font-semibold">
          Danh sách thẻ
        </h2>
        <ul className="mt-3 divide-y divide-border rounded-lg border border-border">
          {set.flashcards.map((card, index) => (
            <li key={card.id} className="grid gap-1 p-4 sm:grid-cols-2 sm:gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Mặt trước</p>
                <p className="font-medium">{card.term}</p>
              </div>
              <div className="sm:border-l sm:border-border sm:pl-4">
                <p className="text-xs text-muted-foreground">Mặt sau</p>
                <p className="font-medium">{card.definition}</p>
              </div>
              <span className="sr-only">Thẻ {index + 1}</span>
            </li>
          ))}
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
