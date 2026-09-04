import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { StudySetDetail } from '@flashcard/contracts';
import { FlipClient } from '@/components/study/flip-client';
import { apiServer } from '@/lib/api/server';
import { ApiRequestError } from '@/lib/api/request';

type PageProps = { params: Promise<{ id: string }> };

export const metadata: Metadata = {
  title: 'Thẻ ghi nhớ',
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

export default async function CardsPage({ params }: PageProps) {
  const { id } = await params;
  const set = await loadSet(id);
  if (!set) notFound();

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <header className="mb-6">
        <Link href={`/sets/${id}`} className="text-sm text-muted-foreground hover:text-foreground">
          ← {set.title}
        </Link>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Thẻ ghi nhớ</h1>
        <p className="text-sm text-muted-foreground">Lật thẻ và đánh giá bạn đã thuộc chưa.</p>
      </header>

      <FlipClient setId={id} cards={set.flashcards} />
    </div>
  );
}
