'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Bookmark, Compass, FolderOpen, Plus, Search } from 'lucide-react';
import type { StudySetSummary } from '@flashcard/contracts';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { StudySetCard } from '@/components/sets/study-set-card';
import { cn } from '@/lib/utils';

interface DashboardSetsExplorerProps {
  mySets: StudySetSummary[];
  savedSets: StudySetSummary[];
  initialTab?: string;
}

export function DashboardSetsExplorer({
  mySets,
  savedSets,
  initialTab = 'mine',
}: DashboardSetsExplorerProps) {
  const [activeTab, setActiveTab] = useState<'mine' | 'saved'>(
    initialTab === 'saved' ? 'saved' : 'mine',
  );
  const [searchQuery, setSearchQuery] = useState('');

  const currentList = activeTab === 'mine' ? mySets : savedSets;

  const filteredSets = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return currentList;
    return currentList.filter(
      (set) =>
        set.title.toLowerCase().includes(q) ||
        (set.subject && set.subject.toLowerCase().includes(q)) ||
        (set.description && set.description.toLowerCase().includes(q)),
    );
  }, [currentList, searchQuery]);

  return (
    <section aria-label="Quản lý bộ thẻ" className="space-y-6 pt-2">
      {/* Tab Navigation & Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
        {/* Tabs */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('mine')}
            className={cn(
              'inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all cursor-pointer',
              activeTab === 'mine'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            <FolderOpen className="size-4" aria-hidden="true" />
            <span>Bộ thẻ của bạn</span>
            <span
              className={cn(
                'ml-1 rounded-full px-2 py-0.5 text-xs font-mono',
                activeTab === 'mine'
                  ? 'bg-primary-foreground/20 text-primary-foreground'
                  : 'bg-muted text-muted-foreground',
              )}
            >
              {mySets.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('saved')}
            className={cn(
              'inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all cursor-pointer',
              activeTab === 'saved'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            <Bookmark className="size-4" aria-hidden="true" />
            <span>Đã lưu</span>
            <span
              className={cn(
                'ml-1 rounded-full px-2 py-0.5 text-xs font-mono',
                activeTab === 'saved'
                  ? 'bg-primary-foreground/20 text-primary-foreground'
                  : 'bg-muted text-muted-foreground',
              )}
            >
              {savedSets.length}
            </span>
          </button>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2.5">
          {/* Search box */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              placeholder="Tìm nhanh bộ thẻ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs rounded-xl bg-muted/40 border-border/70 focus:bg-background"
            />
          </div>

          {activeTab === 'mine' ? (
            <Link
              href="/sets/create"
              className={cn(buttonVariants({ size: 'sm' }), 'shrink-0 rounded-xl gap-1.5')}
            >
              <Plus className="size-4" aria-hidden="true" />
              <span className="hidden xs:inline">Tạo bộ thẻ</span>
            </Link>
          ) : (
            <Link
              href="/explore"
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'shrink-0 rounded-xl gap-1.5')}
            >
              <Compass className="size-4" aria-hidden="true" />
              <span className="hidden xs:inline">Khám phá</span>
            </Link>
          )}
        </div>
      </div>

      {/* Grid Danh sách bộ thẻ */}
      {currentList.length === 0 ? (
        activeTab === 'mine' ? (
          <Card className="border-dashed border-2 rounded-2xl bg-muted/10">
            <CardContent className="py-16 text-center">
              <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <FolderOpen className="size-7" aria-hidden="true" />
              </div>
              <h3 className="mt-4 text-lg font-bold">Chưa có bộ thẻ nào</h3>
              <p className="mt-1.5 text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
                Tạo bộ thẻ đầu tiên của bạn để bắt đầu học tập và ghi nhớ từ vựng hiệu quả hơn.
              </p>
              <Link
                href="/sets/create"
                className={cn(buttonVariants({ size: 'sm' }), 'mt-6 gap-1.5 rounded-xl shadow-xs')}
              >
                <Plus className="size-4" aria-hidden="true" />
                <span>Tạo bộ thẻ mới</span>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-dashed border-2 rounded-2xl bg-muted/10">
            <CardContent className="py-16 text-center">
              <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500">
                <Bookmark className="size-7" aria-hidden="true" />
              </div>
              <h3 className="mt-4 text-lg font-bold">Chưa lưu bộ thẻ nào</h3>
              <p className="mt-1.5 text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
                Khám phá kho từ vựng phong phú của cộng đồng và bấm &quot;Lưu bộ thẻ&quot; để ôn tập bất cứ lúc nào.
              </p>
              <Link
                href="/explore"
                className={cn(buttonVariants({ size: 'sm' }), 'mt-6 gap-1.5 rounded-xl shadow-xs')}
              >
                <Compass className="size-4" aria-hidden="true" />
                <span>Khám phá bộ thẻ</span>
              </Link>
            </CardContent>
          </Card>
        )
      ) : filteredSets.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <p className="text-sm">Không tìm thấy bộ thẻ nào phù hợp với từ khóa &ldquo;{searchQuery}&rdquo;</p>
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="mt-2 text-xs font-semibold text-primary hover:underline cursor-pointer"
          >
            Xóa bộ lọc tìm kiếm
          </button>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredSets.map((set) => (
            <li key={set.id}>
              <StudySetCard set={set} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
