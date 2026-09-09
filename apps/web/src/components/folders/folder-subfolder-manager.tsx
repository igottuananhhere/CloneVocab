'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import {
  Check,
  Loader2,
  Plus,
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

  // Danh sach thu muc con / chu de
  const [subfolders, setSubfolders] = useState<FolderSummary[]>(folder.subfolders);
  // Tab dang chon: 'all' hoac id cua subfolder
  const [activeTab, setActiveTab] = useState<string>('all');

  // Cache danh sach bo the theo tung thu muc: { [folderId]: StudySetSummary[] }
  const [setsByFolder, setSetsByFolder] = useState<Record<string, StudySetSummary[]>>({
    [folder.id]: folder.studySets,
  });
  const [loadingSubfolder, setLoadingSubfolder] = useState(false);

  // Modal tao chu de con
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newSubfolderName, setNewSubfolderName] = useState('');
  const [creatingSubfolder, setCreatingSubfolder] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Modal them tai lieu hoc (bo the) vao chu de dang chon
  const [showAddSetsModal, setShowAddSetsModal] = useState(false);
  const [selectedSetIds, setSelectedSetIds] = useState<Set<string>>(new Set());
  const [savingSets, setSavingSets] = useState(false);
  const [addSetsSearch, setAddSetsSearch] = useState('');

  // ID thu muc dang duoc active thao tac (folder hien tai hoac subfolder)
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

  // Xu ly tao chu de con moi
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
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể tạo chủ đề. Thử lại sau.';
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
          // Fallback neu endpoint batch chua kip deploy
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
      {/* Subfolder Pills Bar: [Tất cả] [HOUSE] [Environment] [+] */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={cn(
            'inline-flex items-center rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
            activeTab === 'all'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground',
          )}
        >
          Tất cả
        </button>

        {subfolders.map((sub) => {
          const isSelected = activeTab === sub.id;
          return (
            <button
              key={sub.id}
              type="button"
              onClick={() => setActiveTab(sub.id)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
                isSelected
                  ? 'bg-primary text-primary-foreground shadow-sm ring-2 ring-primary/30'
                  : 'bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <span>{sub.name}</span>
            </button>
          );
        })}

        {/* Nut them chu de con [+] */}
        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          title="Thêm chủ đề con"
          className="inline-flex size-8 items-center justify-center rounded-full border border-border/70 bg-card text-muted-foreground hover:border-primary hover:bg-primary/10 hover:text-primary transition-colors"
        >
          <Plus className="size-4" aria-hidden="true" />
          <span className="sr-only">Thêm chủ đề</span>
        </button>
      </div>

      {/* Khu vuc danh sach bo the hoac Empty State */}
      {loadingSubfolder ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      ) : currentSets.length === 0 ? (
        /* Empty State Card giong anh mau */
        <Card className="border-border/60 bg-card/60 shadow-sm backdrop-blur">
          <CardContent className="py-16 text-center space-y-4">
            {/* Minh hoa 3 the ghi nho mau sac */}
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
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
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
                  className="px-5 gap-2 font-medium rounded-xl border-border"
                >
                  <span>Chọn từ bộ thẻ có sẵn</span>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">
              {currentSets.length} bộ thẻ trong {activeTitle}
            </span>
            <div className="flex items-center gap-2">
              <Link
                href={`/sets/create?folderId=${targetFolderId}`}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:border-primary/40 hover:bg-accent transition-colors shadow-xs"
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
                  className="gap-1.5 rounded-xl text-xs font-semibold"
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
                    className="absolute top-3 right-3 z-20 rounded-md p-1.5 bg-background/80 text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-destructive hover:text-destructive-foreground transition-all shadow-sm"
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

      {/* Modal Tao Chu De Con */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Tạo chủ đề mới</h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="size-4" />
                <span className="sr-only">Đóng</span>
              </button>
            </div>

            <p className="text-sm text-muted-foreground">
              Chủ đề mới sẽ nằm trong thư mục <strong className="text-foreground">{folder.name}</strong>.
            </p>

            <form onSubmit={handleCreateSubfolder} className="space-y-4">
              <Field id="subfolder-name" label="Tên chủ đề" error={createError ?? undefined}>
                <Input
                  value={newSubfolderName}
                  onChange={(e) => setNewSubfolderName(e.target.value)}
                  placeholder="Ví dụ: HOUSE, Environment, Travel..."
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
                >
                  Hủy
                </Button>
                <Button type="submit" disabled={creatingSubfolder || !newSubfolderName.trim()}>
                  {creatingSubfolder ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Đang tạo...
                    </>
                  ) : (
                    'Tạo chủ đề'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Chon Bo The Them Vao Chu De */}
      {showAddSetsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in">
          <div className="flex w-full max-w-lg max-h-[85vh] flex-col rounded-xl border border-border bg-card shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <div>
                <h3 className="text-lg font-semibold">Thêm tài liệu học</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Vào chủ đề <strong className="text-foreground">{activeTitle}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddSetsModal(false)}
                className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="size-4" />
                <span className="sr-only">Đóng</span>
              </button>
            </div>

            <div className="p-4 border-b border-border/50">
              <Input
                value={addSetsSearch}
                onChange={(e) => setAddSetsSearch(e.target.value)}
                placeholder="Tìm theo tên bộ thẻ hoặc môn học..."
                className="h-10 text-sm"
              />
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {filteredAvailableSets.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  Không tìm thấy bộ thẻ nào phù hợp.
                </div>
              ) : (
                filteredAvailableSets.map((s) => {
                  const isChecked = selectedSetIds.has(s.id);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => toggleSelectSet(s.id)}
                      className={cn(
                        'flex w-full items-center justify-between rounded-lg border p-3 text-left transition-colors',
                        isChecked
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:bg-muted/40',
                      )}
                    >
                      <div className="min-w-0 pr-3">
                        <div className="font-medium text-sm truncate">{s.title}</div>
                        <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{s.cardCount} thẻ</span>
                          {s.subject && (
                            <>
                              <span>·</span>
                              <span>{s.subject}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div
                        className={cn(
                          'flex size-5 shrink-0 items-center justify-center rounded border transition-colors',
                          isChecked
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-muted-foreground/40',
                        )}
                      >
                        {isChecked && <Check className="size-3.5" />}
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            <div className="flex items-center justify-between border-t border-border px-6 py-3.5 bg-muted/20">
              <Link
                href={`/sets/create?folderId=${targetFolderId}`}
                className="text-xs font-medium text-primary hover:underline"
                onClick={() => setShowAddSetsModal(false)}
              >
                + Tạo bộ thẻ mới cho thư mục này
              </Link>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddSetsModal(false)}
                  disabled={savingSets}
                >
                  Hủy
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSaveSets}
                  disabled={savingSets}
                >
                  {savingSets ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Đang lưu...
                    </>
                  ) : (
                    `Lưu (${selectedSetIds.size})`
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
