import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { LearnSession } from '@flashcard/contracts';
import { LearnClient } from '@/components/study/learn-client';
import { apiServer } from '@/lib/api/server';
import { ApiRequestError } from '@/lib/api/request';

type PageProps = { params: Promise<{ id: string }> };

export const metadata: Metadata = {
  title: 'Học lại',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

async function loadSession(id: string): Promise<LearnSession | null> {
  try {
    return await apiServer<LearnSession>(`/study-sets/${id}/learn`);
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 404) return null;
    throw error;
  }
}

export default async function LearnPage({ params }: PageProps) {
  const { id } = await params;
  const session = await loadSession(id);
  if (!session) notFound();

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <header className="mb-6">
        <Link href={`/sets/${id}`} className="text-sm text-muted-foreground hover:text-foreground">
          ← Quay lại bộ thẻ
        </Link>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Học lại ngắt quãng</h1>
        <p className="text-sm text-muted-foreground">
          Hệ thống ưu tiên thẻ đến hạn và nhắc lại đúng lúc.
        </p>
      </header>

      <LearnClient setId={id} items={session.items} />
    </div>
  );
}
