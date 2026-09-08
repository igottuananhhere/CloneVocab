import type { Metadata } from 'next';
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
    <div className="-mx-4 -my-8 px-4 py-8 min-h-[calc(100vh-4rem)] bg-[#13182e] text-white flex flex-col items-center justify-center">
      <FlipClient setId={id} cards={set.flashcards} setTitle={set.title} />
    </div>
  );
}
