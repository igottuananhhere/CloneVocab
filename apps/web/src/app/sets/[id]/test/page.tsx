import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { GeneratedTest } from '@flashcard/contracts';
import { TestClient } from '@/components/study/test-client';
import { apiServer } from '@/lib/api/server';
import { ApiRequestError } from '@/lib/api/request';

type PageProps = { params: Promise<{ id: string }> };

export const metadata: Metadata = {
  title: 'Kiểm tra',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

async function loadTest(id: string): Promise<GeneratedTest | null> {
  try {
    return await apiServer<GeneratedTest>(`/study-sets/${id}/test`);
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 404) return null;
    throw error;
  }
}

export default async function TestPage({ params }: PageProps) {
  const { id } = await params;
  const test = await loadTest(id);
  if (!test) notFound();

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <header className="mb-6">
        <Link href={`/sets/${id}`} className="text-sm text-muted-foreground hover:text-foreground">
          ← Quay lại bộ thẻ
        </Link>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Kiểm tra</h1>
        <p className="text-sm text-muted-foreground">
          Tự luận và trắc nghiệm từ bộ thẻ, chấm điểm ngay.
        </p>
      </header>

      <TestClient setId={id} questions={test.questions} />
    </div>
  );
}
