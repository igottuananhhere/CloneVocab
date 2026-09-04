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
    <div className="mx-auto max-w-2xl px-4 py-10">
      <header className="mb-6">
        <Link href={`/sets/${id}`} className="text-sm text-muted-foreground hover:text-foreground">
          ← Quay lại bộ thẻ
        </Link>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Ghép cặp</h1>
        <p className="text-sm text-muted-foreground">
          Ghép nhanh thuật ngữ với định nghĩa, tính thời gian hoàn thành.
        </p>
      </header>

      <MatchClient setId={id} cards={set.flashcards} />
    </div>
  );
}
