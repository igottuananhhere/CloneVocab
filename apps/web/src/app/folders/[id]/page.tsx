import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Compass, Folder, Plus } from 'lucide-react';
import type { FolderDetail } from '@flashcard/contracts';
import { FolderActions, RemoveSetFromFolderButton } from '@/components/folders/folder-actions';
import { StudySetCard } from '@/components/sets/study-set-card';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { apiServer } from '@/lib/api/server';
import { ApiRequestError } from '@/lib/api/request';
import { cn } from '@/lib/utils';

type PageProps = { params: Promise<{ id: string }> };

export const dynamic = 'force-dynamic';

async function loadFolder(id: string): Promise<FolderDetail | null> {
  try {
    return await apiServer<FolderDetail>(`/folders/${id}`);
  } catch (error) {
    if (error instanceof ApiRequestError && (error.status === 404 || error.status === 403)) {
      return null;
    }
    throw error;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const folder = await loadFolder(id);

  if (!folder) {
    return { title: 'Không tìm thấy thư mục', robots: { index: false } };
  }

  return {
    title: `Thư mục: ${folder.name}`,
    description: folder.description ?? `Thư mục ${folder.name} chứa ${folder.setCount} bộ thẻ.`,
    robots: { index: false },
  };
}

export default async function FolderDetailPage({ params }: PageProps) {
  const { id } = await params;
  const folder = await loadFolder(id);

  if (!folder) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/dashboard" className="hover:text-foreground">
          Bảng điều khiển
        </Link>
        <span aria-hidden="true">/</span>
        <span className="text-foreground font-medium truncate max-w-xs">{folder.name}</span>
      </nav>

      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Folder className="size-5" aria-hidden="true" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">{folder.name}</h1>
          </div>

          {folder.description && (
            <p className="mt-2 text-muted-foreground max-w-2xl">{folder.description}</p>
          )}

          <p className="text-sm text-muted-foreground font-medium pt-1">
            {folder.setCount} bộ thẻ trong thư mục
          </p>
        </div>

        <FolderActions folder={folder} />
      </header>

      {/* Danh sách các bộ thẻ trong thư mục */}
      {folder.studySets.length === 0 ? (
        <Card className="mt-8 border-dashed">
          <CardContent className="py-16 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted">
              <Folder className="size-6 text-muted-foreground" aria-hidden="true" />
            </div>
            <h2 className="mt-4 text-lg font-semibold">Thư mục chưa có bộ thẻ nào</h2>
            <p className="mt-1 text-sm text-muted-foreground max-w-sm mx-auto">
              Bạn có thể gom các bộ thẻ vào đây bằng cách mở bất kỳ bộ thẻ nào và chọn &quot;Thêm vào thư mục&quot;.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link href="/explore" className={cn(buttonVariants({ size: 'sm' }), 'gap-1.5')}>
                <Compass className="size-4" aria-hidden="true" />
                <span>Khám phá bộ thẻ</span>
              </Link>
              <Link
                href="/sets/create"
                className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1.5')}
              >
                <Plus className="size-4" aria-hidden="true" />
                <span>Tạo bộ thẻ mới</span>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="mt-8">
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {folder.studySets.map((set) => (
              <li key={set.id} className="group relative">
                <StudySetCard set={set} />
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <RemoveSetFromFolderButton
                    folderId={folder.id}
                    setId={set.id}
                    title={set.title}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

