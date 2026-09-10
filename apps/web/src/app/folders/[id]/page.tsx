import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Folder } from 'lucide-react';
import type { FolderDetail, StudySetSummary } from '@flashcard/contracts';
import { FolderActions } from '@/components/folders/folder-actions';
import { FolderSubfolderManager } from '@/components/folders/folder-subfolder-manager';
import { apiServer } from '@/lib/api/server';
import { ApiRequestError } from '@/lib/api/request';

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

  let allUserSets: StudySetSummary[] = [];
  try {
    allUserSets = await apiServer<StudySetSummary[]>('/study-sets/mine');
  } catch {
    allUserSets = [];
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Breadcrumb da cap */}
      <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/dashboard" className="hover:text-foreground">
          Bảng điều khiển
        </Link>
        <span aria-hidden="true">/</span>

        {folder.parent && (
          <>
            <Link href={`/folders/${folder.parent.id}`} className="hover:text-foreground truncate max-w-xs">
              {folder.parent.name}
            </Link>
            <span aria-hidden="true">/</span>
          </>
        )}

        <span className="text-foreground font-medium truncate max-w-xs">{folder.name}</span>
      </nav>

      {/* Header thu muc giong thiet ke mau */}
      <header className="flex items-center justify-between gap-4 pb-4">
        <div className="flex items-center gap-3.5">
          <div className="flex size-12 items-center justify-center rounded-xl bg-card border border-border/80 text-primary shadow-sm">
            {folder.parent ? (
              <Folder className="size-6" aria-hidden="true" />
            ) : (
              <Folder className="size-6 text-primary" aria-hidden="true" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                {folder.parent ? `Chủ đề con · Thuộc ${folder.parent.name}` : 'Thư mục lớn'}
              </span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">{folder.name}</h1>
            {folder.description && (
              <p className="mt-1 text-sm text-muted-foreground">{folder.description}</p>
            )}
          </div>
        </div>

        <FolderActions folder={folder} />
      </header>

      {/* Quan ly cac chu de con va danh sach bo the */}
      <FolderSubfolderManager folder={folder} allUserSets={allUserSets} />
    </div>
  );
}

