'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  Check,
  Loader2,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import type { FolderDetail, StudySetSummary } from '@flashcard/contracts';
import { StudySetCard } from '@/components/sets/study-set-card';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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

  // Danh sach bo the trong thu muc nay
  const [sets, setSets] = useState<StudySetSummary[]>(folder.studySets);

  // Modal them bo the vao thu muc
  const [showAddSetsModal, setShowAddSetsModal] = useState(false);
  const [selectedSetIds, setSelectedSetIds] = useState<Set<string>>(new Set());
  const [savingSets, setSavingSets] = useState(false);
  const [addSetsSearch, setAddSetsSearch] = useState('');

  // Mo modal them tai lieu hoc
  function openAddSetsModal() {
    const existingIds = new Set(sets.map((s) => s.id));
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

  // Luu cac bo the da chon vao thu muc
  async function handleSaveSets() {
    setSavingSets(true);

    try {
      const currentIds = new Set(sets.map((s) => s.id));
      const toAdd = Array.from(selectedSetIds).filter((id) => !currentIds.has(id));
      const toRemove = Array.from(currentIds).filter((id) => !selectedSetIds.has(id));

      if (toAdd.length > 0) {
        try {
          await apiBrowser(`/folders/${folder.id}/sets/batch`, {
            method: 'POST',
            body: { setIds: toAdd },
          });
        } catch {
          await Promise.all(
            toAdd.map((id) =>
              apiBrowser(`/folders/${folder.id}/sets/${id}`, { method: 'POST' }),
            ),
          );
        }
      }

      if (toRemove.length > 0) {
        await Promise.all(
          toRemove.map((id) =>
            apiBrowser(`/folders/${folder.id}/sets/${id}`, { method: 'DELETE' }),
          ),
        );
      }

      const updatedSets = allUserSets.filter((s) => selectedSetIds.has(s.id));
      setSets(updatedSets);
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

  // Xoa 1 bo the khoi thu muc
  async function handleRemoveSetFromFolder(setId: string) {
    try {
      await apiBrowser(`/folders/${folder.id}/sets/${setId}`, { method: 'DELETE' });
      setSets((prev) => prev.filter((s) => s.id !== setId));
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
    <div className="mt-8 space-y-6">
      {/* KHU VỰC DANH SÁCH BỘ THẺ TRONG THƯ MỤC */}
      {sets.length === 0 ? (
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
              Thêm tài liệu học cho {folder.name}
            </h3>

            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              {allUserSets.length === 0
                ? 'Bạn chưa có bộ thẻ nào. Hãy tạo bộ thẻ đầu tiên để bắt đầu học tập!'
                : `Chọn từ các bộ thẻ của bạn để đưa vào ${folder.name} và ôn tập hiệu quả hơn.`}
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Link
                href={`/sets/create?folderId=${folder.id}`}
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
              {sets.length} bộ thẻ trong {folder.name}
            </span>
            <div className="flex items-center gap-2">
              <Link
                href={`/sets/create?folderId=${folder.id}`}
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
            {sets.map((set) => (
              <li key={set.id} className="group relative">
                <StudySetCard set={set} />
                <button
                  type="button"
                  onClick={() => handleRemoveSetFromFolder(set.id)}
                  title={`Gỡ khỏi ${folder.name}`}
                  className="absolute top-3 right-3 z-20 rounded-md p-1.5 bg-background/80 text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-destructive hover:text-destructive-foreground transition-all shadow-sm cursor-pointer"
                >
                  <Trash2 className="size-4" />
                  <span className="sr-only">Gỡ khỏi thư mục</span>
                </button>
              </li>
            ))}
          </ul>
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
                  Vào thư mục <strong className="text-foreground">{folder.name}</strong>
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
