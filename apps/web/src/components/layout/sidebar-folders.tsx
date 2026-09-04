'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Folder, FolderPlus, Loader2, X } from 'lucide-react';
import type { FolderSummary } from '@flashcard/contracts';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { apiBrowser } from '@/lib/api/browser';
import { cn } from '@/lib/utils';

export function SidebarFolders({ initialFolders }: { initialFolders: FolderSummary[] }) {
  const pathname = usePathname();
  const router = useRouter();
  const [folders, setFolders] = useState<FolderSummary[]>(initialFolders);
  const [openModal, setOpenModal] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const created = await apiBrowser<FolderSummary>('/folders', {
        method: 'POST',
        body: {
          name: name.trim(),
          description: description.trim() || undefined,
        },
      });

      setFolders((prev) => [created, ...prev]);
      setName('');
      setDescription('');
      setOpenModal(false);
      router.push(`/folders/${created.id}`);
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể tạo thư mục. Thử lại sau.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-6 flex flex-1 flex-col">
      <div className="flex items-center justify-between px-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Thư mục của bạn
        </span>
        <button
          type="button"
          onClick={() => setOpenModal(true)}
          title="Tạo thư mục mới"
          className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <FolderPlus className="size-4" aria-hidden="true" />
          <span className="sr-only">Tạo thư mục</span>
        </button>
      </div>

      {folders.length === 0 ? (
        <p className="mt-2 px-3 text-xs text-muted-foreground/80">
          Chưa có thư mục nào. Nhấn + để tạo thư mục gom nhóm các bộ thẻ.
        </p>
      ) : (
        <ul className="mt-1 flex flex-col gap-0.5">
          {folders.map((folder) => {
            const isActive = pathname === `/folders/${folder.id}`;
            return (
              <li key={folder.id}>
                <Link
                  href={`/folders/${folder.id}`}
                  className={cn(
                    'flex items-center justify-between gap-2 rounded-md px-3 py-2 text-sm transition-colors',
                    isActive
                      ? 'bg-primary/10 font-medium text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Folder className="size-4 shrink-0" aria-hidden="true" />
                    <span className="truncate">{folder.name}</span>
                  </div>
                  {folder.setCount > 0 && (
                    <span className="text-xs text-muted-foreground/70 tabular-nums">
                      {folder.setCount}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {/* Modal Tạo Thư Mục */}
      {openModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Tạo thư mục mới</h3>
              <button
                type="button"
                onClick={() => setOpenModal(false)}
                className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="size-4" />
                <span className="sr-only">Đóng</span>
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <Field id="sidebar-folder-name" label="Tên thư mục" error={error ?? undefined}>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ví dụ: Ôn thi Đại học, Từ vựng IELTS..."
                  maxLength={80}
                  autoFocus
                  required
                />
              </Field>

              <Field id="sidebar-folder-desc" label="Mô tả (tùy chọn)">
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Thêm mô tả ngắn về thư mục này..."
                  maxLength={500}
                  rows={3}
                />
              </Field>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpenModal(false)}
                  disabled={loading}
                >
                  Hủy
                </Button>
                <Button type="submit" disabled={loading || !name.trim()}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Đang tạo...
                    </>
                  ) : (
                    'Tạo thư mục'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
