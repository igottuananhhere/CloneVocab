'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import {
  Check,
  ChevronRight,
  Eye,
  EyeOff,
  Folder,
  Loader2,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import type { FolderDetail, FolderSummary, StudySetSummary } from '@flashcard/contracts';
import { StudySetCard } from '@/components/sets/study-set-card';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { apiBrowser } from '@/lib/api/browser';
import { cn } from '@/lib/utils';

export function FolderSubfolderManager({
  folder,
  allUserSets,
}: {
  folder: FolderDetail;
  allUserSets: StudySetSummary[];
}) {
  const router = useRouter();

  // Danh sach thu muc con
  const [subfolders, setSubfolders] = useState<FolderSummary[]>(folder.subfolders);
  // Trang thai an / hien thu muc con (de chi hien thu muc lon)
  const [showSubfolders, setShowSubfolders] = useState<boolean>(true);

  // Tab dang chon de loc bo the: 'all' hoac id cua subfolder
  const [activeTab, setActiveTab] = useState<string>('all');

  // Cache danh sach bo the theo tung thu muc: { [folderId]: StudySetSummary[] }
  const [setsByFolder, setSetsByFolder] = useState<Record<string, StudySetSummary[]>>({
    [folder.id]: folder.studySets,
  });
  const [loadingSubfolder, setLoadingSubfolder] = useState(false);

  // Modal tao thu muc con
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newSubfolderName, setNewSubfolderName] = useState('');
  const [creatingSubfolder, setCreatingSubfolder] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Modal them bo the vao thu muc
  const [showAddSetsModal, setShowAddSetsModal] = useState(false);
  const [selectedSetIds, setSelectedSetIds] = useState<Set<string>>(new Set());
  const [savingSets, setSavingSets] = useState(false);
  const [addSetsSearch, setAddSetsSearch] = useState('');

  // Luu tuy chon an / hien thu muc con vao localStorage de ghi nho
  useEffect(() => {
    try {
      const saved = localStorage.getItem('hide_subfolder_section');
      if (saved === 'true') {
        setShowSubfolders(false);
      }
    } catch {}
  }, []);

  function toggleShowSubfolders() {
    setShowSubfolders((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('hide_subfolder_section', String(!next));
      } catch {}
      return next;
    });
  }

  // ID thu muc dang duoc active thao tac
  const targetFolderId = activeTab === 'all' ? folder.id : activeTab;
  const activeSubfolder = subfolders.find((s) => s.id === activeTab);
  const activeTitle = activeTab === 'all' ? folder.name : (activeSubfolder?.name ?? folder.name);

  // Khi chuyen sang mot subfolder chua co cache sets, fetch ve
  useEffect(() => {
    if (activeTab === 'all') return;
    if (setsByFolder[activeTab]) return;

    let cancelled = false;
    setLoadingSubfolder(true);

    apiBrowser<FolderDetail>(`/folders/${activeTab}`)
      .then((detail) => {
        if (!cancelled) {
          setSetsByFolder((prev) => ({ ...prev, [activeTab]: detail.studySets }));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSetsByFolder((prev) => ({ ...prev, [activeTab]: [] }));
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingSubfolder(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeTab, setsByFolder]);

  // Bo the hien thi tren man hinh
  const currentSets = activeTab === 'all'
    ? Array.from(
        new Map(
          Object.values(setsByFolder)
            .flat()
            .map((s) => [s.id, s]),
        ).values(),
      )
    : setsByFolder[activeTab] ?? [];

  // Xu ly tao thu muc con moi
  async function handleCreateSubfolder(e: FormEvent) {
    e.preventDefault();
    if (!newSubfolderName.trim()) return;

    setCreatingSubfolder(true);
    setCreateError(null);

    try {
      const created = await apiBrowser<FolderSummary>('/folders', {
        method: 'POST',
        body: {
          name: newSubfolderName.trim(),
          parentId: folder.id,
        },
      });

      setSubfolders((prev) => [...prev, created]);
      setSetsByFolder((prev) => ({ ...prev, [created.id]: [] }));
      setActiveTab(created.id);
      setNewSubfolderName('');
      setShowCreateModal(false);

      // Thong bao de thanh sidebar cap nhat cay thu muc ngay
      window.dispatchEvent(new CustomEvent('folders-updated'));
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể tạo thư mục con. Thử lại sau.';
      setCreateError(msg);
    } finally {
      setCreatingSubfolder(false);
    }
  }

  // Mo modal them tai lieu hoc
  function openAddSetsModal() {
    const existingIds = new Set(currentSets.map((s) => s.id));
    setSelectedSetIds(existingIds);
    setAddSetsSearch('');
    setShowAddSetsModal(true);
  }

  function toggleSelectSet(setId: string) {
    setSelectedSetIds((prev) => {
      const next = new Set(prev);
      if (next.has(setId)) {
        next.delete(setId);
      } else {
        next.add(setId);
      }
      return next;
    });
  }

  // Luu cac bo the da chon vao folder/subfolder dang active
  async function handleSaveSets() {
    setSavingSets(true);
    const targetId = targetFolderId;

    try {
      const currentIds = new Set(currentSets.map((s) => s.id));
      const toAdd = Array.from(selectedSetIds).filter((id) => !currentIds.has(id));
      const toRemove = Array.from(currentIds).filter((id) => !selectedSetIds.has(id));

      if (toAdd.length > 0) {
        try {
          await apiBrowser(`/folders/${targetId}/sets/batch`, {
            method: 'POST',
            body: { setIds: toAdd },
          });
        } catch {
          await Promise.all(
            toAdd.map((id) =>
              apiBrowser(`/folders/${targetId}/sets/${id}`, { method: 'POST' }),
            ),
          );
        }
      }

      if (toRemove.length > 0) {
        await Promise.all(
          toRemove.map((id) =>
            apiBrowser(`/folders/${targetId}/sets/${id}`, { method: 'DELETE' }),
          ),
        );
      }

      const updatedSets = allUserSets.filter((s) => selectedSetIds.has(s.id));
      setSetsByFolder((prev) => ({ ...prev, [targetId]: updatedSets }));
      setShowAddSetsModal(false);
      window.dispatchEvent(new CustomEvent('folders-updated'));
      router.refresh();
    } catch (err) {
      console.error('Lỗi cập nhật bộ thẻ vào thư mục:', err);
      window.alert('Không thể cập nhật danh sách bộ thẻ. Vui lòng thử lại.');
    } finally {
      setSavingSets(false);
    }
  }

  // Xoa 1 bo the khoi folder
  async function handleRemoveSetFromFolder(setId: string) {
    const targetId = targetFolderId;
    try {
      await apiBrowser(`/folders/${targetId}/sets/${setId}`, { method: 'DELETE' });
      setSetsByFolder((prev) => ({
        ...prev,
        [targetId]: (prev[targetId] ?? []).filter((s) => s.id !== setId),
      }));
      window.dispatchEvent(new CustomEvent('folders-updated'));
      router.refresh();
    } catch {
      window.alert('Không thể gỡ bộ thẻ khỏi thư mục.');
    }
  }

  const filteredAvailableSets = allUserSets.filter(
    (s) =>
      s.title.toLowerCase().includes(addSetsSearch.toLowerCase()) ||
      (s.subject && s.subject.toLowerCase().includes(addSetsSearch.toLowerCase())),
  );

  return (
    <div className="mt-6 space-y-6">
      {/* Neu day la Thu Muc Con: Hien thi lien ket quay lai Thu Muc Lon */}
      {folder.parent && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/25 bg-primary/5 p-4 animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Folder className="size-4" />
            </div>
            <div>
              <span className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">
                Thư mục con thuộc
              </span>
              <p className="font-bold text-sm text-foreground">{folder.parent.name}</p>
            </div>
          </div>
          <Link
            href={`/folders/${folder.parent.id}`}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted hover:border-primary/40 transition-all shadow-xs"
          >
            <span>← Quay lại thư mục lớn ({folder.parent.name})</span>
          </Link>
        </div>
      )}

      {/* KHỐI HIỂN THỊ THƯ MỤC CON KÈM NÚT ẨN / HIỆN ĐỂ CHỈ HIỆN THƯ MỤC LỚN */}
      <section
        aria-label="Quản lý thư mục con"
        className="space-y-3 rounded-2xl border border-border/80 bg-card/60 p-4 sm:p-5 shadow-xs transition-all"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Tieu de & so luong thu muc con */}
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Folder className="size-4" />
            </div>
            <h2 className="text-sm sm:text-base font-bold tracking-tight text-foreground flex items-center gap-2">
              <span>Thư mục con</span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-mono font-semibold text-muted-foreground">
                {subfolders.length}
              </span>
            </h2>
          </div>

          {/* Cac nut hanh dong: An/Hien thu muc con & Tao thu muc con */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={toggleShowSubfolders}
              className="h-8 gap-1.5 rounded-xl text-xs font-semibold hover:border-primary/40 cursor-pointer"
              title={
                showSubfolders
                  ? 'Ẩn tất cả thư mục con để chỉ hiện thư mục lớn'
                  : 'Hiển thị danh sách thư mục con'
              }
            >
              {showSubfolders ? (
                <>
                  <EyeOff className="size-3.5 text-muted-foreground" />
                  <span>Ẩn thư mục con (Chỉ hiện thư mục lớn)</span>
                </>
              ) : (
                <>
                  <Eye className="size-3.5 text-primary" />
                  <span>Hiển thị thư mục con ({subfolders.length})</span>
                </>
              )}
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={() => setShowCreateModal(true)}
              className="h-8 gap-1.5 rounded-xl text-xs font-semibold cursor-pointer"
            >
              <Plus className="size-3.5" />
              <span>Tạo thư mục con</span>
            </Button>
          </div>
        </div>

        {/* Luoi the cac Thu muc con (khi duoc phep hien thi) */}
        {showSubfolders && (
          <div className="pt-2 animate-in fade-in slide-in-from-top-1 duration-200">
            {subfolders.length === 0 ? (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-xl border border-dashed border-border/80 bg-muted/20 p-4 text-xs text-muted-foreground">
                <p>
                  Thư mục này hiện chưa có thư mục con nào. Tạo thư mục con để phân nhóm các bộ thẻ theo từng chủ đề hoặc bài học nhỏ hơn.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCreateModal(true)}
                  className="rounded-lg text-xs font-semibold shrink-0 cursor-pointer gap-1"
                >
                  <Plus className="size-3" />
                  <span>Tạo thư mục con ngay</span>
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {subfolders.map((sub) => (
                  <Link
                    key={sub.id}
                    href={`/folders/${sub.id}`}
                    className="group relative flex items-center justify-between gap-3 rounded-xl border border-border/80 bg-background/90 p-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:bg-card hover:shadow-sm cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                        <Folder className="size-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                          {sub.name}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {sub.setCount} bộ thẻ
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* THANH TAB LỌC BỘ THẺ: [Tất cả] [Thư mục con 1] [Thư mục con 2] */}
      {subfolders.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mr-1">
            Lọc thẻ:
          </span>
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={cn(
              'inline-flex items-center rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer',
              activeTab === 'all'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            Tất cả ({folder.name})
          </button>

          {subfolders.map((sub) => {
            const isSelected = activeTab === sub.id;
            return (
              <button
                key={sub.id}
                type="button"
                onClick={() => setActiveTab(sub.id)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer',
                  isSelected
                    ? 'bg-primary text-primary-foreground shadow-xs ring-2 ring-primary/30'
                    : 'bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                <Folder className="size-3 opacity-70" />
                <span>{sub.name}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* KHU VỰC DANH SÁCH BỘ THẺ */}
      {loadingSubfolder ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      ) : currentSets.length === 0 ? (
        <Card className="border-border/60 bg-card/60 shadow-sm backdrop-blur">
          <CardContent className="py-16 text-center space-y-4">
            <div className="mx-auto flex items-center justify-center gap-1.5 py-2">
              <div className="size-10 rounded-lg bg-blue-500 shadow-lg -rotate-12 flex flex-col justify-center items-center p-1.5 text-white/80">
                <div className="w-5 h-1 bg-white/80 rounded mb-1" />
                <div className="w-4 h-1 bg-white/60 rounded mb-1" />
                <div className="w-3 h-1 bg-white/40 rounded" />
              </div>
              <div className="size-11 rounded-lg bg-purple-500 shadow-xl z-10 flex flex-col justify-center items-center p-1.5 text-white/90">
                <div className="w-6 h-1.5 bg-white/90 rounded mb-1.5" />
                <div className="w-5 h-1 bg-white/70 rounded mb-1" />
                <div className="w-5 h-1 bg-white/50 rounded" />
              </div>
              <div className="size-10 rounded-lg bg-amber-500 shadow-lg rotate-12 flex flex-col justify-center items-center p-1.5 text-white/80">
                <div className="w-5 h-1 bg-white/80 rounded mb-1" />
                <div className="w-4 h-1 bg-white/60 rounded mb-1" />
                <div className="w-3 h-1 bg-white/40 rounded" />
              </div>
            </div>

            <h3 className="text-lg font-semibold tracking-tight">
              Thêm tài liệu học cho {activeTitle}
            </h3>

            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              {allUserSets.length === 0
                ? 'Bạn chưa có bộ thẻ nào. Hãy tạo bộ thẻ đầu tiên để bắt đầu học tập!'
                : `Chọn từ các bộ thẻ của bạn để đưa vào ${activeTitle} và ôn tập hiệu quả hơn.`}
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Link
                href={`/sets/create?folderId=${targetFolderId}`}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm cursor-pointer"
              >
                <Plus className="size-4" />
                <span>Tạo bộ thẻ mới cho thư mục</span>
              </Link>
              {allUserSets.length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={openAddSetsModal}
                  size="md"
                  className="px-5 gap-2 font-medium rounded-xl border-border cursor-pointer"
                >
                  <span>Chọn từ bộ thẻ có sẵn</span>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span className="text-sm font-semibold text-muted-foreground">
              {currentSets.length} bộ thẻ trong {activeTitle}
            </span>
            <div className="flex items-center gap-2">
              <Link
                href={`/sets/create?folderId=${targetFolderId}`}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-1.5 text-xs font-semibold text-foreground hover:border-primary/40 hover:bg-accent transition-colors shadow-xs cursor-pointer"
              >
                <Plus className="size-3.5" />
                <span>Tạo bộ thẻ mới</span>
              </Link>
              {allUserSets.length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={openAddSetsModal}
                  className="gap-1.5 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  <span>Thêm từ có sẵn</span>
                </Button>
              )}
            </div>
          </div>

          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {currentSets.map((set) => (
              <li key={set.id} className="group relative">
                <StudySetCard set={set} />
                {activeTab !== 'all' && (
                  <button
                    type="button"
                    onClick={() => handleRemoveSetFromFolder(set.id)}
                    title={`Gỡ khỏi ${activeTitle}`}
                    className="absolute top-3 right-3 z-20 rounded-md p-1.5 bg-background/80 text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-destructive hover:text-destructive-foreground transition-all shadow-sm cursor-pointer"
                  >
                    <Trash2 className="size-4" />
                    <span className="sr-only">Gỡ khỏi thư mục</span>
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Modal Tao Thu Muc Con */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Tạo thư mục con mới</h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
              >
                <X className="size-4" />
                <span className="sr-only">Đóng</span>
              </button>
            </div>

            <p className="text-sm text-muted-foreground">
              Thư mục con mới sẽ nằm bên trong thư mục lớn <strong className="text-foreground">{folder.name}</strong>.
            </p>

            <form onSubmit={handleCreateSubfolder} className="space-y-4">
              <Field id="subfolder-name" label="Tên thư mục con" error={createError ?? undefined}>
                <Input
                  value={newSubfolderName}
                  onChange={(e) => setNewSubfolderName(e.target.value)}
                  placeholder="Ví dụ: Unit 1, Ngữ pháp, Từ vựng chuyên ngành..."
                  maxLength={80}
                  autoFocus
                  required
                />
              </Field>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateModal(false)}
                  disabled={creatingSubfolder}
                  className="cursor-pointer"
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  disabled={creatingSubfolder || !newSubfolderName.trim()}
                  className="cursor-pointer"
                >
                  {creatingSubfolder ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Đang tạo...
                    </>
                  ) : (
                    'Tạo thư mục con'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Chon Bo The Them Vao Thu Muc */}
      {showAddSetsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in">
          <div className="flex w-full max-w-lg max-h-[85vh] flex-col rounded-xl border border-border bg-card shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <div>
                <h3 className="text-lg font-semibold">Thêm tài liệu học</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Vào thư mục <strong className="text-foreground">{activeTitle}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddSetsModal(false)}
                className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
              >
                <X className="size-4" />
                <span className="sr-only">Đóng</span>
              </button>
            </div>

            <div className="border-b border-border p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={addSetsSearch}
                  onChange={(e) => setAddSetsSearch(e.target.value)}
                  placeholder="Tìm kiếm trong các bộ thẻ của bạn..."
                  className="pl-9"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2 max-h-96">
              {filteredAvailableSets.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Không tìm thấy bộ thẻ nào phù hợp.
                </p>
              ) : (
                filteredAvailableSets.map((set) => {
                  const isChecked = selectedSetIds.has(set.id);
                  return (
                    <div
                      key={set.id}
                      onClick={() => toggleSelectSet(set.id)}
                      className={cn(
                        'flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer select-none',
                        isChecked
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:bg-muted/50',
                      )}
                    >
                      <div className="min-w-0 flex-1 pr-3">
                        <p className="font-semibold text-sm truncate">{set.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {set.cardCount} thẻ · {set.subject || 'Chưa phân loại'}
                        </p>
                      </div>
                      <div
                        className={cn(
                          'flex size-5 items-center justify-center rounded border transition-colors',
                          isChecked
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-muted-foreground/30',
                        )}
                      >
                        {isChecked && <Check className="size-3.5 stroke-[3]" />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex items-center justify-between border-t border-border px-6 py-4 bg-muted/20">
              <span className="text-xs text-muted-foreground">
                Đã chọn <strong className="text-foreground">{selectedSetIds.size}</strong> bộ thẻ
              </span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddSetsModal(false)}
                  disabled={savingSets}
                  className="cursor-pointer"
                >
                  Hủy
                </Button>
                <Button
                  type="button"
                  onClick={handleSaveSets}
                  disabled={savingSets}
                  className="cursor-pointer"
                >
                  {savingSets ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Đang lưu...
                    </>
                  ) : (
                    'Lưu thay đổi'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
