import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { StudySetDetail } from '@flashcard/contracts';
import { MatchClient } from '@/components/study/match-client';
import { apiServer } from '@/lib/api/server';
import { ApiRequestError } from '@/lib/api/request';

type PageProps = { params: Promise<{ id: string }> };

export const metadata: Metadata = {
  title: 'Ghép cặp',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

async function loadSet(id: string): Promise<StudySetDetail | null> {
  try {
    return await apiServer<StudySetDetail>(`/study-sets/${id}`);
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 404) return null;
    throw error;
  }
}

export default async function MatchPage({ params }: PageProps) {
  const { id } = await params;
  const set = await loadSet(id);
  if (!set) notFound();

  return (
    <div className="mx-auto max-w-4xl lg:max-w-5xl px-4 py-6 sm:py-8">
      <header className="mb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border/60 pb-4">
        <div>
          <Link
            href={`/sets/${id}`}
            className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1 mb-1"
          >
            ← Quay lại bộ thẻ: <span className="text-foreground font-semibold truncate max-w-xs">{set.title}</span>
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <span>Trò chơi Ghép cặp</span>
            <span className="rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-xs font-semibold">
              {set.flashcards.length} thẻ
            </span>
          </h1>
        </div>
        <p className="text-xs text-muted-foreground sm:text-right max-w-sm">
          Ghép chuẩn thuật ngữ với định nghĩa nhanh nhất có thể. Mỗi đợt gồm 10 từ vựng.
        </p>
      </header>

      <MatchClient setId={id} cards={set.flashcards} setTitle={set.title} />
    </div>
  );
}
