import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { StudySetDetail } from '@flashcard/contracts';
import { StudySetForm } from '@/components/sets/study-set-form';
import { apiServer } from '@/lib/api/server';
import { createClient } from '@/lib/supabase/server';
import { ApiRequestError } from '@/lib/api/request';

type PageProps = { params: Promise<{ id: string }> };

export const metadata: Metadata = {
  title: 'Chỉnh sửa bộ thẻ',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

async function loadOwnedSet(id: string, userId: string): Promise<StudySetDetail | null> {
  try {
    const set = await apiServer<StudySetDetail>(`/study-sets/${id}`);
    return set.ownerId === userId ? set : null;
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 404) {
      return null;
    }
    throw error;
  }
}

export default async function EditStudySetPage({ params }: PageProps) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    notFound();
  }

  const set = await loadOwnedSet(id, user.id);

  if (!set) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-bold tracking-tight">Chỉnh sửa bộ thẻ</h1>
      <p className="mt-2 text-muted-foreground">Cập nhật thông tin và danh sách thẻ.</p>
      <div className="mt-8">
        <StudySetForm mode="edit" initial={set} />
      </div>
    </div>
  );
}
