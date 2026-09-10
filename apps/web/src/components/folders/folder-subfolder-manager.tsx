'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  FolderOpen,
  FolderPlus,
  FolderTree,
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
import { Textarea } from '@/components/ui/textarea';
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Kiem tra thu muc hien tai la Thu Muc Lon (Root) hay Thu Muc Con (Subfolder)
  const isRootFolder = !folder.parentId;

  // ==========================================
  // PHẦN DÀNH CHO THƯ MỤC LỚN (PARENT FOLDER)
  // Quản lý các thư mục con / Unit theo chủ đề
  // ==========================================
  const [subfolders, setSubfolders] = useState<FolderSummary[]>(folder.subfolders || []);
  const [subfolderSearch, setSubfolderSearch] = useState('');
  const [openCreateSubfolderModal, setOpenCreateSubfolderModal] = useState(false);
  const [newSubfolderName, setNewSubfolderName] = useState('');
  const [newSubfolderDesc, setNewSubfolderDesc] = useState('');
  const [creatingSubfolder, setCreatingSubfolder] = useState(false);
  const [subfolderError, setSubfolderError] = useState<string | null>(null);
  const [deletingSubfolderId, setDeletingSubfolderId] = useState<string | null>(null);

  // Dong bo subfolders khi folder thay doi
  useEffect(() => {
    setSubfolders(folder.subfolders || []);
  }, [folder.subfolders]);

  // Tong so bo the trong tat ca cac thu muc con
  const totalSetsInSubfolders = subfolders.reduce((sum, item) => sum + (item.setCount || 0), 0);

  // Loc cac thu muc con theo tu khoa tim kiem
  const filteredSubfolders = subfolders.filter(
    (item) =>
      item.name.toLowerCase().includes(subfolderSearch.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(subfolderSearch.toLowerCase())),
  );

  // Xu ly tao thu muc con moi trong thu muc lon
  async function handleCreateSubfolder(e: FormEvent) {
    e.preventDefault();
    if (!newSubfolderName.trim()) return;

    setCreatingSubfolder(true);
    setSubfolderError(null);

    try {
      const created = await apiBrowser<FolderSummary>('/folders', {
        method: 'POST',
        body: {
          name: newSubfolderName.trim(),
          description: newSubfolderDesc.trim() || undefined,
          parentId: folder.id,
        },
      });

      setSubfolders((prev) => [...prev, created]);
      setNewSubfolderName('');
      setNewSubfolderDesc('');
      setOpenCreateSubfolderModal(false);

      // Thong bao den sidebar de dong bo ngay lap tuc
      window.dispatchEvent(new CustomEvent('folders-updated'));
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể tạo thư mục con. Vui lòng thử lại.';
      setSubfolderError(msg);
    } finally {
      setCreatingSubfolder(false);
    }
  }

  // Xu ly xoa thu muc con khoi thu muc lon
  async function handleDeleteSubfolder(e: React.MouseEvent, childId: string, childName: string) {
    e.preventDefault();
    e.stopPropagation();

    if (!window.confirm(`Bạn có chắc muốn xóa thư mục con "${childName}"? Các bộ thẻ bên trong sẽ KHÔNG bị mất.`)) {
      return;
    }

    setDeletingSubfolderId(childId);
    try {
      await apiBrowser(`/folders/${childId}`, { method: 'DELETE' });
      setSubfolders((prev) => prev.filter((item) => item.id !== childId));
      window.dispatchEvent(new CustomEvent('folders-updated'));
      router.refresh();
    } catch {
      window.alert('Không thể xóa thư mục con. Vui lòng thử lại sau.');
    } finally {
      setDeletingSubfolderId(null);
    }
  }

  // ==========================================
  // PHẦN DÀNH CHO THƯ MỤC CON (SUBFOLDER)
  // Quản lý các bộ thẻ từ vựng trong topic/unit này
  // ==========================================
  const [sets, setSets] = useState<StudySetSummary[]>(folder.studySets || []);
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

  // Luu cac bo the da chon vao thu muc con nay
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
      console.error('Lỗi cập nhật bộ thẻ vào thư mục con:', err);
      window.alert('Không thể cập nhật danh sách bộ thẻ. Vui lòng thử lại.');
    } finally {
      setSavingSets(false);
    }
  }

  // Xoa 1 bo the khoi thu muc con nay
  async function handleRemoveSetFromSubfolder(setId: string) {
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

  // Trang thai mo rong muc bo the rieng le neu co trong thu muc lon (legacy)
  const [showLegacySets, setShowLegacySets] = useState(false);

  // ==========================================
  // VIEW 1: THƯ MỤC LỚN (CHỈ QUẢN LÝ THƯ MỤC CON)
  // ==========================================
  if (isRootFolder) {
    return (
      <div className="mt-8 space-y-8">
        {/* Banner thong ke thu muc lon */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-border/70 bg-gradient-to-r from-card via-card to-primary/5 p-5 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <FolderTree className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base text-foreground">
                  Cấu trúc chủ đề trong {folder.name}
                </span>
                <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-semibold text-primary">
                  Thư mục lớn
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {subfolders.length} thư mục con (Units) · {totalSetsInSubfolders} bộ thẻ từ vựng đã phân loại
              </p>
            </div>
          </div>

          <Button
            type="button"
            onClick={() => {
              setNewSubfolderName('');
              setNewSubfolderDesc('');
              setSubfolderError(null);
              setOpenCreateSubfolderModal(true);
            }}
            className="rounded-xl shadow-xs gap-2 font-semibold cursor-pointer shrink-0"
          >
            <Plus className="size-4" />
            <span>Tạo thư mục con mới</span>
          </Button>
        </div>

        {/* Danh sach chu de / thu muc con */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <FolderOpen className="size-5 text-primary" />
                <span>Danh sách các thư mục con & chủ đề</span>
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Mỗi thư mục con lưu trữ các bộ thẻ từ vựng theo từng chủ đề riêng (Unit 1, Unit 2...)
              </p>
            </div>

            {subfolders.length > 3 && (
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={subfolderSearch}
                  onChange={(e) => setSubfolderSearch(e.target.value)}
                  placeholder="Tìm kiếm chủ đề con..."
                  className="pl-8 h-8 text-xs rounded-xl"
                />
              </div>
            )}
          </div>

          {subfolders.length === 0 ? (
            /* Empty State khi thu muc lon chua co thu muc con nao */
            <Card className="border-dashed border-border/80 bg-card/60 shadow-sm backdrop-blur">
              <CardContent className="py-16 text-center space-y-4">
                <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-xs">
                  <FolderPlus className="size-7" />
                </div>

                <div className="space-y-1.5 max-w-md mx-auto">
                  <h3 className="text-lg font-bold tracking-tight text-foreground">
                    Chưa có thư mục con nào trong {folder.name}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Thư mục lớn dùng để gom các chủ đề học tập. Hãy tạo các thư mục nhỏ (ví dụ: Unit 1, Unit 2...) để bắt đầu phân loại và lưu trữ các bộ thẻ từ vựng.
                  </p>
                </div>

                <div className="pt-2">
                  <Button
                    type="button"
                    onClick={() => {
                      setNewSubfolderName('');
                      setNewSubfolderDesc('');
                      setSubfolderError(null);
                      setOpenCreateSubfolderModal(true);
                    }}
                    className="rounded-xl shadow-xs gap-2 font-semibold px-6 cursor-pointer"
                  >
                    <Plus className="size-4" />
                    <span>Tạo thư mục con đầu tiên</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            /* Luoi cac chu de / thu muc con */
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredSubfolders.map((child) => {
                const isDeleting = deletingSubfolderId === child.id;
                return (
                  <Link
                    key={child.id}
                    href={`/folders/${child.id}`}
                    className="group relative flex flex-col justify-between rounded-2xl border border-border bg-card p-5 shadow-xs transition-all duration-200 hover:shadow-md hover:border-primary/50 hover:bg-muted/30 cursor-pointer overflow-hidden"
                  >
                    <div>
                      {/* Hang tren cung: Icon & So luong the & Nut xoa nhanh */}
                      <div className="flex items-start justify-between gap-2 pb-3">
                        <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors shadow-xs">
                          <BookOpen className="size-5" />
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span
                            className={cn(
                              'rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums',
                              child.setCount > 0
                                ? 'bg-primary/15 text-primary'
                                : 'bg-muted text-muted-foreground',
                            )}
                          >
                            {child.setCount > 0 ? `${child.setCount} bộ thẻ` : 'Chưa có thẻ'}
                          </span>

                          <button
                            type="button"
                            onClick={(e) => handleDeleteSubfolder(e, child.id, child.name)}
                            disabled={isDeleting}
                            title={`Xóa thư mục con "${child.name}"`}
                            className="flex size-7 items-center justify-center rounded-md text-muted-foreground/60 opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all cursor-pointer"
                          >
                            {isDeleting ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="size-3.5" />
                            )}
                            <span className="sr-only">Xóa</span>
                          </button>
                        </div>
                      </div>

                      {/* Ten chu de con */}
                      <h3 className="text-base font-bold tracking-tight text-foreground group-hover:text-primary transition-colors line-clamp-1">
                        {child.name}
                      </h3>

                      {/* Mo ta chu de con */}
                      <p className="mt-1 text-xs text-muted-foreground line-clamp-2 leading-relaxed min-h-[2rem]">
                        {child.description || 'Chưa có mô tả cho chủ đề này.'}
                      </p>
                    </div>

                    {/* Chan the: Nut vao xem bo the */}
                    <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between text-xs font-semibold text-primary">
                      <span>Mở danh sách bộ thẻ</span>
                      <ArrowRight className="size-3.5 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Neu truoc day co bo the nao luu truc tiep trong thu muc lon, hien thi khu vuc phu o cuoi de khong bi mat du lieu */}
        {folder.studySets && folder.studySets.length > 0 && (
          <div className="mt-10 pt-6 border-t border-border/60">
            <button
              type="button"
              onClick={() => setShowLegacySets((prev) => !prev)}
              className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              {showLegacySets ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
              <span>
                Bộ thẻ chưa phân loại vào thư mục con ({folder.studySets.length})
              </span>
            </button>

            {showLegacySets && (
              <div className="mt-4 space-y-3 animate-in fade-in">
                <p className="text-xs text-muted-foreground">
                  Gợi ý: Hãy thêm các bộ thẻ này vào các thư mục con bên trên (Unit 1, Unit 2...) để tổ chức học tập khoa học hơn.
                </p>
                <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {folder.studySets.map((set) => (
                    <li key={set.id}>
                      <StudySetCard set={set} />
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Modal Tao Thu Muc Con Moi */}
        {mounted && openCreateSubfolderModal && createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in"
            onClick={() => setOpenCreateSubfolderModal(false)}
          >
            <div
              className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 overflow-hidden box-border"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-2 border-b border-border/40">
                <div>
                  <h3 className="text-lg font-bold text-foreground">
                    Tạo thư mục con mới
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Nằm trong thư mục lớn: <strong className="text-foreground">{folder.name}</strong>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpenCreateSubfolderModal(false)}
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer transition-colors"
                >
                  <X className="size-4" />
                  <span className="sr-only">Đóng</span>
                </button>
              </div>

              <form onSubmit={handleCreateSubfolder} className="space-y-4">
                <Field
                  id="subfolder-name"
                  label="Tên thư mục con / Unit"
                  error={subfolderError ?? undefined}
                >
                  <Input
                    value={newSubfolderName}
                    onChange={(e) => setNewSubfolderName(e.target.value)}
                    placeholder="Ví dụ: Unit 1: School Life, Unit 2: Family..."
                    maxLength={80}
                    autoFocus
                    required
                  />
                </Field>

                <Field id="subfolder-desc" label="Mô tả chủ đề (tùy chọn)">
                  <Textarea
                    value={newSubfolderDesc}
                    onChange={(e) => setNewSubfolderDesc(e.target.value)}
                    placeholder="Tóm tắt nội dung từ vựng hoặc bài học trong chủ đề này..."
                    maxLength={500}
                    rows={3}
                  />
                </Field>

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border/40">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setOpenCreateSubfolderModal(false)}
                    disabled={creatingSubfolder}
                    className="cursor-pointer"
                  >
                    Hủy
                  </Button>
                  <Button
                    type="submit"
                    disabled={creatingSubfolder || !newSubfolderName.trim()}
                    className="cursor-pointer font-semibold"
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
          </div>,
          document.body,
        )}
      </div>
    );
  }

  // ==========================================
  // VIEW 2: THƯ MỤC CON (CHỨA CÁC BỘ THẺ TỪ VỰNG)
  // ==========================================
  return (
    <div className="mt-6 space-y-6">
      {/* Thanh dieu huong quay ve thu muc lon */}
      {folder.parent && (
        <div className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/30 px-4 py-2.5">
          <Link
            href={`/folders/${folder.parent.id}`}
            className="inline-flex items-center gap-2 text-xs font-semibold text-primary hover:underline group"
          >
            <ArrowLeft className="size-3.5 group-hover:-translate-x-0.5 transition-transform" />
            <span>Quay lại thư mục lớn: <strong>{folder.parent.name}</strong></span>
          </Link>

          <span className="text-[11px] text-muted-foreground">
            Chủ đề thuộc: <strong className="text-foreground">{folder.parent.name}</strong>
          </span>
        </div>
      )}

      {/* KHU VỰC DANH SÁCH BỘ THẺ TRONG THƯ MỤC CON NÀY */}
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
              Chưa có bộ thẻ từ vựng nào trong {folder.name}
            </h3>

            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              {allUserSets.length === 0
                ? 'Bạn chưa có bộ thẻ nào. Hãy tạo bộ thẻ đầu tiên cho chủ đề này!'
                : `Chọn từ các bộ thẻ có sẵn hoặc tạo bộ thẻ mới để lưu vào chủ đề ${folder.name}.`}
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Link
                href={`/sets/create?folderId=${folder.id}`}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm cursor-pointer"
              >
                <Plus className="size-4" />
                <span>Tạo bộ thẻ mới cho chủ đề này</span>
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
              {sets.length} bộ thẻ từ vựng trong {folder.name}
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
                  onClick={() => handleRemoveSetFromSubfolder(set.id)}
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

      {/* Modal Chon Bo The Them Vao Thu Muc Con */}
      {mounted && showAddSetsModal && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="flex w-full max-w-lg max-h-[85vh] flex-col rounded-2xl border border-border bg-card shadow-2xl overflow-hidden box-border">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <div>
                <h3 className="text-lg font-semibold">Thêm tài liệu học vào chủ đề</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Chủ đề: <strong className="text-foreground">{folder.name}</strong>
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
                  className="pl-9 rounded-xl"
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
                  className="cursor-pointer font-semibold"
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
        </div>,
        document.body,
      )}
    </div>
  );
}
