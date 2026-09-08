'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { ChevronDown, ChevronRight, Folder, FolderPlus, Loader2, X } from 'lucide-react';
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
  const [parentId, setParentId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Quan ly trang thai dong/mo cua tung thu muc cha
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    for (const f of initialFolders) {
      if (pathname === `/folders/${f.id}` && f.parentId) {
        map[f.parentId] = true;
      }
      if (pathname === `/folders/${f.id}`) {
        map[f.id] = true;
      }
    }
    return map;
  });

  // Tu dong mo thu muc cha khi truy cap vao thu muc con
  useEffect(() => {
    for (const f of folders) {
      if (pathname === `/folders/${f.id}` && f.parentId) {
        setExpanded((prev) => ({ ...prev, [f.parentId!]: true }));
      }
    }
  }, [pathname, folders]);

  // Chia danh sach thanh thu muc goc va thu muc con
  const rootFolders = folders.filter((f) => !f.parentId);
  const getChildren = (pid: string) => folders.filter((f) => f.parentId === pid);
  // Bao ve neu co thu muc con co parentId khong ton tai
  const orphanSubfolders = folders.filter(
    (f) => f.parentId && !rootFolders.some((r) => r.id === f.parentId),
  );
  const displayedRoots = [...rootFolders, ...orphanSubfolders];

  function toggleExpand(folderId: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setExpanded((prev) => ({ ...prev, [folderId]: !prev[folderId] }));
  }

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
          parentId: parentId.trim() || undefined,
        },
      });

      setFolders((prev) => [created, ...prev]);
      if (parentId) {
        setExpanded((prev) => ({ ...prev, [parentId]: true }));
      }
      setName('');
      setDescription('');
      setParentId('');
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
          onClick={() => {
            setParentId('');
            setOpenModal(true);
          }}
          title="Tạo thư mục mới"
          className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <FolderPlus className="size-4" aria-hidden="true" />
          <span className="sr-only">Tạo thư mục</span>
        </button>
      </div>

      {displayedRoots.length === 0 ? (
        <p className="mt-2 px-3 text-xs text-muted-foreground/80">
          Chưa có thư mục nào. Nhấn + để tạo thư mục gom nhóm các bộ thẻ.
        </p>
      ) : (
        <ul className="mt-1 flex flex-col gap-0.5">
          {displayedRoots.map((folder) => {
            const children = getChildren(folder.id);
            const hasChildren = children.length > 0;
            const isExpanded = !!expanded[folder.id];
            const isActive = pathname === `/folders/${folder.id}`;

            return (
              <li key={folder.id} className="space-y-0.5">
                <div
                  className={cn(
                    'group flex items-center justify-between gap-1 rounded-md px-2 py-1.5 text-sm transition-colors',
                    isActive
                      ? 'bg-primary/10 font-medium text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                >
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    {hasChildren ? (
                      <button
                        type="button"
                        onClick={(e) => toggleExpand(folder.id, e)}
                        className="flex size-5 shrink-0 items-center justify-center rounded hover:bg-muted-foreground/15 text-muted-foreground"
                        aria-label={isExpanded ? 'Thu gọn' : 'Mở rộng'}
                      >
                        {isExpanded ? (
                          <ChevronDown className="size-3.5" />
                        ) : (
                          <ChevronRight className="size-3.5" />
                        )}
                      </button>
                    ) : (
                      <div className="size-5 shrink-0" />
                    )}

                    <Link
                      href={`/folders/${folder.id}`}
                      className="flex items-center gap-2 min-w-0 flex-1 truncate"
                    >
                      <Folder className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                      <span className="truncate">{folder.name}</span>
                    </Link>
                  </div>

                  {folder.setCount > 0 && (
                    <span className="text-xs text-muted-foreground/70 tabular-nums shrink-0 pr-1">
                      {folder.setCount}
                    </span>
                  )}
                </div>

                {/* Danh sach thu muc con / chu de */}
                {hasChildren && isExpanded && (
                  <ul className="ml-5 border-l border-border/70 pl-2 space-y-0.5">
                    {children.map((child) => {
                      const isChildActive = pathname === `/folders/${child.id}`;
                      return (
                        <li key={child.id}>
                          <Link
                            href={`/folders/${child.id}`}
                            className={cn(
                              'flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-xs transition-colors',
                              isChildActive
                                ? 'bg-primary/10 font-medium text-primary'
                                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                            )}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <Folder className="size-3.5 shrink-0 opacity-70" aria-hidden="true" />
                              <span className="truncate">{child.name}</span>
                            </div>
                            {child.setCount > 0 && (
                              <span className="text-[11px] text-muted-foreground/70 tabular-nums">
                                {child.setCount}
                              </span>
                            )}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
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
                  placeholder="Ví dụ: Tiếng Anh, Ôn thi Đại học..."
                  maxLength={80}
                  autoFocus
                  required
                />
              </Field>

              {rootFolders.length > 0 && (
                <div className="space-y-1.5">
                  <label htmlFor="sidebar-parent-folder" className="text-sm font-medium">
                    Thư mục cha (tùy chọn)
                  </label>
                  <select
                    id="sidebar-parent-folder"
                    value={parentId}
                    onChange={(e) => setParentId(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Không (Tạo thành thư mục gốc)</option>
                    {rootFolders.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground">
                    Chọn thư mục cha nếu muốn tạo chủ đề con bên trong.
                  </p>
                </div>
              )}

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
