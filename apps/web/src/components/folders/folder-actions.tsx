'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Edit, FolderX, Loader2, MoreHorizontal, Trash2, X } from 'lucide-react';
import type { FolderDetail, FolderSummary } from '@flashcard/contracts';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { apiBrowser } from '@/lib/api/browser';

export function FolderActions({ folder }: { folder: FolderDetail | FolderSummary }) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [name, setName] = useState(folder.name);
  const [description, setDescription] = useState(folder.description ?? '');
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpdate(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError(null);

    try {
      await apiBrowser(`/folders/${folder.id}`, {
        method: 'PATCH',
        body: {
          name: name.trim(),
          description: description.trim() || null,
        },
      });

      setOpenEdit(false);
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể cập nhật thư mục.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Bạn có chắc muốn xóa thư mục "${folder.name}"? Các bộ thẻ bên trong sẽ KHÔNG bị mất.`)) {
      return;
    }

    setDeleting(true);
    try {
      await apiBrowser(`/folders/${folder.id}`, { method: 'DELETE' });
      router.push('/dashboard');
      router.refresh();
    } catch {
      window.alert('Không thể xóa thư mục. Vui lòng thử lại sau.');
      setDeleting(false);
    }
  }

  return (
    <>
      <div className="relative">
        <button
          type="button"
          onClick={() => setMenuOpen((prev) => !prev)}
          className="inline-flex size-9 items-center justify-center rounded-full bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          title="Tùy chọn thư mục"
        >
          <MoreHorizontal className="size-5" />
          <span className="sr-only">Tùy chọn thư mục</span>
        </button>

        {menuOpen && (
          <>
            <div className="fixed inset-0 z-20" onClick={() => setMenuOpen(false)} />
            <div className="absolute right-0 top-full mt-1.5 z-30 w-44 rounded-xl border border-border bg-card p-1.5 shadow-xl animate-in fade-in zoom-in-95">
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  setName(folder.name);
                  setDescription(folder.description ?? '');
                  setOpenEdit(true);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
              >
                <Edit className="size-4 text-muted-foreground" />
                <span>Đổi tên / Sửa</span>
              </button>

              <button
                type="button"
                disabled={deleting}
                onClick={() => {
                  setMenuOpen(false);
                  handleDelete();
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
              >
                <Trash2 className="size-4" />
                <span>{deleting ? 'Đang xóa...' : 'Xóa thư mục'}</span>
              </button>
            </div>
          </>
        )}
      </div>

      {openEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Chỉnh sửa thư mục</h3>
              <button
                type="button"
                onClick={() => setOpenEdit(false)}
                className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="size-4" />
                <span className="sr-only">Đóng</span>
              </button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-4">
              <Field id="edit-folder-name" label="Tên thư mục" error={error ?? undefined}>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={80}
                  required
                />
              </Field>

              <Field id="edit-folder-desc" label="Mô tả">
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={500}
                  rows={3}
                />
              </Field>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpenEdit(false)}
                  disabled={loading}
                >
                  Hủy
                </Button>
                <Button type="submit" disabled={loading || !name.trim()}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Đang lưu...
                    </>
                  ) : (
                    'Lưu thay đổi'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export function RemoveSetFromFolderButton({
  folderId,
  setId,
  title,
}: {
  folderId: string;
  setId: string;
  title: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleRemove(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (!window.confirm(`Bỏ bộ thẻ "${title}" khỏi thư mục này?`)) {
      return;
    }

    setLoading(true);
    try {
      await apiBrowser(`/folders/${folderId}/sets/${setId}`, { method: 'DELETE' });
      router.refresh();
    } catch {
      window.alert('Không thể bỏ bộ thẻ khỏi thư mục. Thử lại sau.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleRemove}
      disabled={loading}
      title="Bỏ khỏi thư mục này"
      className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
    >
      <FolderX className="size-4" aria-hidden="true" />
      <span className="sr-only">Bỏ khỏi thư mục</span>
    </button>
  );
}
