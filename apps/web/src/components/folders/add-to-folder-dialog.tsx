'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Check, Folder, FolderPlus, Loader2, Plus, X } from 'lucide-react';
import type { FolderSummary } from '@flashcard/contracts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiBrowser } from '@/lib/api/browser';
import { cn } from '@/lib/utils';

export function AddToFolderDialog({
  setId,
  isLoggedIn,
  className,
}: {
  setId: string;
  isLoggedIn: boolean;
  className?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [folders, setFolders] = useState<FolderSummary[]>([]);
  const [selectedFolderIds, setSelectedFolderIds] = useState<Set<string>>(new Set());
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Tao nhanh thu muc
  const [showCreate, setShowCreate] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [creating, setCreating] = useState(false);

  async function handleOpen() {
    if (!isLoggedIn) {
      router.push(`/login?redirect=${encodeURIComponent(`/sets/${setId}`)}`);
      return;
    }

    setOpen(true);
    setLoading(true);

    try {
      const [mine, checked] = await Promise.all([
        apiBrowser<FolderSummary[]>('/folders/mine'),
        apiBrowser<{ folderIds: string[] }>(`/folders/check-set/${setId}`),
      ]);

      setFolders(mine);
      setSelectedFolderIds(new Set(checked.folderIds));
    } catch {
      window.alert('Không thể tải danh sách thư mục. Thử lại sau.');
      setOpen(false);
    } finally {
      setLoading(false);
    }
  }

  async function handleToggle(folderId: string) {
    const isCurrentlyIn = selectedFolderIds.has(folderId);
    setUpdatingId(folderId);

    try {
      if (isCurrentlyIn) {
        await apiBrowser(`/folders/${folderId}/sets/${setId}`, { method: 'DELETE' });
        setSelectedFolderIds((prev) => {
          const next = new Set(prev);
          next.delete(folderId);
          return next;
        });
      } else {
        await apiBrowser(`/folders/${folderId}/sets/${setId}`, { method: 'POST' });
        setSelectedFolderIds((prev) => {
          const next = new Set(prev);
          next.add(folderId);
          return next;
        });
      }
      router.refresh();
    } catch {
      window.alert('Thao tác thất bại. Vui lòng thử lại.');
    } finally {
      setUpdatingId(null);
    }
  }

  const [selectedParentId, setSelectedParentId] = useState<string>('');

  // Phan cap cay thu muc
  const rootFolders = folders.filter((f) => !f.parentId);
  const getChildren = (parentId: string) => folders.filter((f) => f.parentId === parentId);
  // Cac folder con ma parent khong co trong list (neu co)
  const orphanChildren = folders.filter((f) => f.parentId && !folders.some((p) => p.id === f.parentId));

  async function handleQuickCreate(e: FormEvent) {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    setCreating(true);
    try {
      const created = await apiBrowser<FolderSummary>('/folders', {
        method: 'POST',
        body: {
          name: newFolderName.trim(),
          parentId: selectedParentId || undefined,
        },
      });

      // Tu dong them bo the vao thu muc moi tao
      await apiBrowser(`/folders/${created.id}/sets/${setId}`, { method: 'POST' });

      setFolders((prev) => [...prev, created]);
      setSelectedFolderIds((prev) => new Set(prev).add(created.id));
      setNewFolderName('');
      setSelectedParentId('');
      setShowCreate(false);
      router.refresh();
    } catch {
      window.alert('Không thể tạo thư mục mới.');
    } finally {
      setCreating(false);
    }
  }

  function renderFolderRow(folder: FolderSummary, isChild = false) {
    const isChecked = selectedFolderIds.has(folder.id);
    const isUpdating = updatingId === folder.id;

    return (
      <li key={folder.id}>
        <button
          type="button"
          onClick={() => handleToggle(folder.id)}
          disabled={isUpdating}
          className={cn(
            'flex w-full items-center justify-between p-3 text-left hover:bg-muted/50 transition-colors',
            isChild && 'pl-8 bg-muted/20',
          )}
        >
          <div className="flex items-center gap-2.5 min-w-0 pr-2">
            {isChild && <span className="text-muted-foreground/60 text-xs">└</span>}
            <Folder className={cn('size-4 shrink-0', isChild ? 'text-primary/70' : 'text-muted-foreground')} />
            <span className={cn('truncate text-sm', isChild ? 'text-foreground/90' : 'font-medium')}>
              {folder.name}
            </span>
          </div>

          <div
            className={cn(
              'flex size-5 shrink-0 items-center justify-center rounded border transition-colors',
              isChecked
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-input bg-background',
            )}
          >
            {isUpdating ? (
              <Loader2 className="size-3 animate-spin text-current" />
            ) : isChecked ? (
              <Check className="size-3.5" />
            ) : null}
          </div>
        </button>
      </li>
    );
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleOpen}
        className={cn('gap-1.5', className)}
        title="Thêm bộ thẻ vào thư mục"
      >
        <FolderPlus className="size-4" aria-hidden="true" />
        <span>Thêm vào thư mục</span>
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Thêm vào thư mục</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="size-4" />
                <span className="sr-only">Đóng</span>
              </button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-10 text-muted-foreground">
                <Loader2 className="mr-2 size-5 animate-spin" />
                <span>Đang tải thư mục...</span>
              </div>
            ) : (
              <div className="space-y-3">
                {folders.length === 0 && !showCreate ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    Bạn chưa có thư mục nào. Hãy tạo thư mục đầu tiên để gom nhóm các bộ thẻ.
                  </p>
                ) : (
                  <ul className="max-h-64 overflow-y-auto divide-y divide-border rounded-lg border border-border">
                    {rootFolders.map((root) => {
                      const children = getChildren(root.id);
                      return (
                        <div key={root.id}>
                          {renderFolderRow(root, false)}
                          {children.map((child) => renderFolderRow(child, true))}
                        </div>
                      );
                    })}
                    {orphanChildren.map((child) => renderFolderRow(child, true))}
                  </ul>
                )}

                {/* Form tao nhanh thu muc */}
                {showCreate ? (
                  <form onSubmit={handleQuickCreate} className="space-y-2 pt-2">
                    <Input
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      placeholder="Tên thư mục mới..."
                      maxLength={80}
                      autoFocus
                      required
                    />

                    {rootFolders.length > 0 && (
                      <select
                        value={selectedParentId}
                        onChange={(e) => setSelectedParentId(e.target.value)}
                        className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                      >
                        <option value="">Thư mục gốc (không thuộc thư mục nào)</option>
                        {rootFolders.map((r) => (
                          <option key={r.id} value={r.id}>
                            Nằm trong thư mục: {r.name}
                          </option>
                        ))}
                      </select>
                    )}

                    <div className="flex justify-end gap-2 pt-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowCreate(false)}
                      >
                        Hủy
                      </Button>
                      <Button type="submit" size="sm" disabled={creating || !newFolderName.trim()}>
                        {creating ? 'Đang tạo...' : 'Tạo & Thêm'}
                      </Button>
                    </div>
                  </form>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full gap-2 border-dashed"
                    onClick={() => setShowCreate(true)}
                  >
                    <Plus className="size-4" />
                    <span>Tạo thư mục hoặc chủ đề mới</span>
                  </Button>
                )}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button type="button" onClick={() => setOpen(false)}>
                Hoàn tất
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
