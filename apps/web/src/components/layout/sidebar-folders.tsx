'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import {
  ChevronDown,
  ChevronRight,
  EyeOff,
  Folder,
  FolderOpen,
  FolderPlus,
  FolderTree,
  Loader2,
  Plus,
  X,
} from 'lucide-react';
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
  const [mounted, setMounted] = useState(false);
  const [openModal, setOpenModal] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [parentId, setParentId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Dong bo khi initialFolders thay doi tu phia server
  useEffect(() => {
    if (initialFolders && initialFolders.length > 0) {
      setFolders(initialFolders);
    }
  }, [initialFolders]);

  // Luon fetch moi nhat ngay khi mount tren client de tranh cache server cu
  useEffect(() => {
    apiBrowser<FolderSummary[]>('/folders/mine')
      .then((fresh) => {
        if (fresh && Array.isArray(fresh)) {
          setFolders(fresh);
        }
      })
      .catch(() => {});
  }, []);

  // Lang nghe su kien folders-updated de cap nhat danh sach tuc thi
  useEffect(() => {
    function handleFoldersUpdated() {
      apiBrowser<FolderSummary[]>('/folders/mine')
        .then((fresh) => {
          if (fresh && Array.isArray(fresh)) {
            setFolders(fresh);
          }
        })
        .catch(() => {});
    }
    window.addEventListener('folders-updated', handleFoldersUpdated);
    return () => window.removeEventListener('folders-updated', handleFoldersUpdated);
  }, []);

  // Chia danh sach thanh thu muc lon (goc) va thu muc nho (con)
  const rootFolders = folders.filter((f) => !f.parentId);
  const getChildren = (pid: string) => folders.filter((f) => f.parentId === pid);
  const orphanSubfolders = folders.filter(
    (f) => f.parentId && !rootFolders.some((r) => r.id === f.parentId),
  );
  const displayedRoots = [...rootFolders, ...orphanSubfolders];

  // Quan ly trang thai dong/mo (expand/collapse) cua tung thu muc lon (mac dinh MO RONG tat ca thu muc co con)
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    for (const f of initialFolders) {
      map[f.id] = true;
      if (f.parentId) {
        map[f.parentId] = true;
      }
    }
    return map;
  });

  // Tu dong mo thu muc lon khi dang truy cap vao thu muc nho cua no
  useEffect(() => {
    for (const f of folders) {
      if (pathname === `/folders/${f.id}` && f.parentId) {
        setExpanded((prev) => ({ ...prev, [f.parentId!]: true }));
      }
    }
  }, [pathname, folders]);

  // Kiem tra xem co thu muc nho nao dang duoc hien thi khong
  const hasAnySubfolders = folders.some((f) => !!f.parentId);
  const isAnyExpanded = displayedRoots.some((f) => {
    const children = getChildren(f.id);
    return children.length > 0 && !!expanded[f.id];
  });

  function toggleExpand(folderId: string, e?: React.MouseEvent) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setExpanded((prev) => ({ ...prev, [folderId]: !prev[folderId] }));
  }

  function toggleAllSubfolders() {
    if (isAnyExpanded) {
      setExpanded({});
    } else {
      const allExpandedMap: Record<string, boolean> = {};
      for (const f of displayedRoots) {
        allExpandedMap[f.id] = true;
      }
      setExpanded(allExpandedMap);
    }
  }

  function openCreateModal(parentFolderId: string = '') {
    setParentId(parentFolderId);
    setName('');
    setDescription('');
    setError(null);
    setOpenModal(true);
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

      window.dispatchEvent(new CustomEvent('folders-updated'));
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
      {/* Header thanh thu muc */}
      <div className="flex items-center justify-between px-3 py-1">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Thư mục của bạn
        </span>
        <div className="flex items-center gap-1">
          {hasAnySubfolders && (
            <button
              type="button"
              onClick={toggleAllSubfolders}
              title={
                isAnyExpanded
                  ? 'Ẩn các thư mục nhỏ (Chỉ hiện thư mục lớn)'
                  : 'Hiển thị tất cả thư mục nhỏ'
              }
              className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
            >
              {isAnyExpanded ? (
                <EyeOff className="size-3.5 text-primary" aria-hidden="true" />
              ) : (
                <FolderTree className="size-3.5" aria-hidden="true" />
              )}
              <span className="sr-only">
                {isAnyExpanded ? 'Ẩn thư mục nhỏ' : 'Hiện thư mục nhỏ'}
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={() => openCreateModal('')}
            title="Tạo thư mục lớn mới"
            className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
          >
            <FolderPlus className="size-4" aria-hidden="true" />
            <span className="sr-only">Tạo thư mục</span>
          </button>
        </div>
      </div>

      {displayedRoots.length === 0 ? (
        <p className="mt-2 px-3 text-xs text-muted-foreground/80">
          Chưa có thư mục nào. Nhấn + để tạo thư mục gom nhóm các bộ thẻ.
        </p>
      ) : (
        <ul className="mt-1 flex flex-col gap-1">
          {displayedRoots.map((folder) => {
            const children = getChildren(folder.id);
            const hasChildren = children.length > 0;
            const isExpanded = !!expanded[folder.id];
            const isActive = pathname === `/folders/${folder.id}`;

            return (
              <li key={folder.id} className="space-y-0.5">
                {/* Dong Thu Muc Lon */}
                <div
                  className={cn(
                    'group relative flex items-center justify-between gap-1 rounded-lg px-2 py-1.5 text-sm transition-all',
                    isActive
                      ? 'bg-primary/10 font-bold text-primary shadow-xs'
                      : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground',
                  )}
                >
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    {/* Nut mui ten dong/mo thu muc con */}
                    {hasChildren ? (
                      <button
                        type="button"
                        onClick={(e) => toggleExpand(folder.id, e)}
                        className="flex size-6 shrink-0 items-center justify-center rounded-md hover:bg-primary/15 hover:text-primary text-muted-foreground cursor-pointer transition-colors"
                        title={
                          isExpanded
                            ? 'Ẩn các thư mục nhỏ (Chỉ hiện thư mục lớn)'
                            : 'Hiển thị các thư mục nhỏ'
                        }
                        aria-label={isExpanded ? 'Ẩn thư mục nhỏ' : 'Hiện thư mục nhỏ'}
                      >
                        {isExpanded ? (
                          <ChevronDown className="size-3.5 stroke-[2.5]" />
                        ) : (
                          <ChevronRight className="size-3.5 stroke-[2.5]" />
                        )}
                      </button>
                    ) : (
                      <div className="size-6 shrink-0" />
                    )}

                    {/* Link mo thu muc lon */}
                    <Link
                      href={`/folders/${folder.id}`}
                      title={folder.name}
                      className="flex items-center gap-2 min-w-0 flex-1 truncate"
                    >
                      {isExpanded && hasChildren ? (
                        <FolderOpen className="size-4 shrink-0 text-primary" aria-hidden="true" />
                      ) : (
                        <Folder className="size-4 shrink-0 text-muted-foreground group-hover:text-primary transition-colors" aria-hidden="true" />
                      )}
                      <span className="truncate">{folder.name}</span>
                    </Link>
                  </div>

                  {/* Cac nut hanh dong ben phai */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        openCreateModal(folder.id);
                      }}
                      title={`Thêm thư mục nhỏ vào ${folder.name}`}
                      className="opacity-0 group-hover:opacity-100 flex size-6 items-center justify-center rounded hover:bg-primary/15 hover:text-primary text-muted-foreground transition-opacity cursor-pointer"
                    >
                      <Plus className="size-3.5" />
                      <span className="sr-only">Thêm thư mục nhỏ</span>
                    </button>

                    {hasChildren ? (
                      <span
                        className="text-[10px] font-mono rounded-md bg-primary/10 text-primary px-1.5 py-0.5 font-bold"
                        title={`${children.length} thư mục con`}
                      >
                        {children.length} con
                      </span>
                    ) : folder.setCount > 0 ? (
                      <span className="text-xs text-muted-foreground/70 tabular-nums px-1 font-mono">
                        {folder.setCount}
                      </span>
                    ) : null}
                  </div>
                </div>

                {/* DANH SACH THƯ MỤC NHỎ */}
                {hasChildren && isExpanded && (
                  <ul className="ml-5 border-l-2 border-primary/30 pl-2.5 py-0.5 space-y-0.5 animate-in fade-in slide-in-from-top-1 duration-150">
                    {children.map((child) => {
                      const isChildActive = pathname === `/folders/${child.id}`;
                      return (
                        <li key={child.id}>
                          <Link
                            href={`/folders/${child.id}`}
                            title={child.name}
                            className={cn(
                              'group/child flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-xs transition-colors cursor-pointer',
                              isChildActive
                                ? 'bg-primary/15 font-bold text-primary'
                                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                            )}
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <Folder className="size-3.5 shrink-0 opacity-70 group-hover/child:opacity-100 text-primary transition-opacity" aria-hidden="true" />
                              <span className="truncate">{child.name}</span>
                            </div>
                            {child.setCount > 0 && (
                              <span className="text-[11px] text-muted-foreground/70 tabular-nums shrink-0 font-mono">
                                {child.setCount}
                              </span>
                            )}
                          </Link>
                        </li>
                      );
                    })}

                    <li>
                      <button
                        type="button"
                        onClick={() => openCreateModal(folder.id)}
                        className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer w-full text-left"
                      >
                        <Plus className="size-3" />
                        <span>Thêm thư mục nhỏ...</span>
                      </button>
                    </li>
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {/* Modal Tao Thu Muc Lon / Thu Muc Nho (Su dung createPortal de khong bi bop hep boi sidebar) */}
      {mounted && openModal && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in"
          onClick={() => setOpenModal(false)}
        >
          <div
            className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 overflow-hidden box-border"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-border/40">
              <h3 className="text-lg font-bold text-foreground">
                {parentId ? 'Tạo thư mục nhỏ mới' : 'Tạo thư mục lớn mới'}
              </h3>
              <button
                type="button"
                onClick={() => setOpenModal(false)}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer transition-colors"
              >
                <X className="size-4" />
                <span className="sr-only">Đóng</span>
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 pt-1">
              <Field
                id="sidebar-folder-name"
                label={parentId ? 'Tên thư mục nhỏ' : 'Tên thư mục lớn'}
                error={error ?? undefined}
              >
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={
                    parentId
                      ? 'Ví dụ: Unit 1, Ngữ pháp, Từ vựng chuyên ngành...'
                      : 'Ví dụ: Tiếng Anh, Ôn thi Đại học...'
                  }
                  maxLength={80}
                  autoFocus
                  required
                  className="rounded-xl"
                />
              </Field>

              {rootFolders.length > 0 && (
                <div className="space-y-1.5">
                  <label htmlFor="sidebar-parent-folder" className="text-sm font-medium text-foreground">
                    Thuộc thư mục lớn
                  </label>
                  <select
                    id="sidebar-parent-folder"
                    value={parentId}
                    onChange={(e) => setParentId(e.target.value)}
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                  >
                    <option value="">Không (Tạo thành thư mục lớn độc lập)</option>
                    {rootFolders.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground">
                    Chọn thư mục lớn nếu muốn tạo thư mục nhỏ nằm bên trong.
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
                  className="rounded-xl"
                />
              </Field>

              <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5 pt-3 border-t border-border/40">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpenModal(false)}
                  disabled={loading}
                  className="w-full sm:w-auto rounded-xl px-4 font-semibold cursor-pointer"
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  disabled={loading || !name.trim()}
                  className="w-full sm:w-auto rounded-xl px-5 font-semibold cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Đang tạo...
                    </>
                  ) : (
                    parentId ? 'Tạo thư mục nhỏ' : 'Tạo thư mục lớn'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
