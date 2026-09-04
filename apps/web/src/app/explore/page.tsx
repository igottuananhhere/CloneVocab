import type { Metadata } from 'next';
import Link from 'next/link';
import { Compass, Flame, Sparkles, Search, X } from 'lucide-react';
import type { PaginatedStudySets } from '@flashcard/contracts';
import { StudySetCard } from '@/components/sets/study-set-card';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { apiRequest } from '@/lib/api/request';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Khám phá',
  description: 'Khám phá các bộ thẻ công khai do cộng đồng tạo ra.',
};

export const dynamic = 'force-dynamic';

type PageProps = {
  searchParams: Promise<{
    q?: string;
    subject?: string;
    sort?: string;
    page?: string;
  }>;
};

const POPULAR_SUBJECTS = [
  'Tiếng Anh',
  'Tiếng Nhật',
  'IELTS',
  'Từ vựng',
  'Lập trình',
  'Khoa học',
  'Lịch sử',
];

function buildUrl({
  q,
  subject,
  sort,
  page,
}: {
  q?: string;
  subject?: string;
  sort?: string;
  page?: number;
}) {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (subject) params.set('subject', subject);
  if (sort && sort !== 'latest') params.set('sort', sort);
  if (page && page > 1) params.set('page', String(page));
  const query = params.toString();
  return query ? `/explore?${query}` : '/explore';
}

export default async function ExplorePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const q = params.q?.trim() || '';
  const subject = params.subject?.trim() || '';
  const sort = params.sort === 'popular' ? 'popular' : 'latest';
  const page = Math.max(1, parseInt(params.page || '1', 10) || 1);

  const queryParams = new URLSearchParams();
  if (q) queryParams.set('q', q);
  if (subject) queryParams.set('subject', subject);
  queryParams.set('sort', sort);
  queryParams.set('page', String(page));
  queryParams.set('limit', '12');

  let data: PaginatedStudySets = { items: [], total: 0, page: 1, limit: 12, totalPages: 1 };
  try {
    data = await apiRequest<PaginatedStudySets>(`/study-sets?${queryParams.toString()}`);
  } catch (err) {
    console.error('Lỗi khi tải danh sách bộ thẻ khám phá:', err);
  }

  const hasFilter = Boolean(q || subject || sort !== 'latest');

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      {/* Header */}
      <div className="text-center sm:text-left">
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary mb-3">
          <Compass className="size-3.5" aria-hidden="true" />
          <span>Khám phá kho tàng kiến thức</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Khám phá bộ thẻ</h1>
        <p className="mt-2 text-muted-foreground">
          Tìm kiếm và học tập cùng hàng ngàn bộ thẻ ghi nhớ công khai được tạo bởi cộng đồng.
        </p>
      </div>

      {/* Thanh tìm kiếm chính */}
      <form action="/explore" method="get" className="mt-8">
        {subject && <input type="hidden" name="subject" value={subject} />}
        {sort !== 'latest' && <input type="hidden" name="sort" value={sort} />}
        <div className="relative flex items-center">
          <Search
            className="pointer-events-none absolute left-4 size-5 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            name="q"
            defaultValue={q}
            placeholder="Tìm kiếm theo chủ đề, tiêu đề, nội dung thẻ..."
            className="h-13 w-full rounded-xl border border-input bg-card pl-12 pr-28 text-base shadow-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <div className="absolute right-2 flex items-center gap-1">
            {q && (
              <Link
                href={buildUrl({ subject, sort })}
                className="inline-flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
                title="Xóa tìm kiếm"
              >
                <X className="size-4" aria-hidden="true" />
                <span className="sr-only">Xóa tìm kiếm</span>
              </Link>
            )}
            <button
              type="submit"
              className={cn(buttonVariants({ size: 'sm' }), 'rounded-lg px-4 font-medium')}
            >
              Tìm
            </button>
          </div>
        </div>
      </form>

      {/* Chủ đề phổ biến */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground mr-1">Chủ đề:</span>
        <Link
          href={buildUrl({ q, sort })}
          className={cn(
            'inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition-colors',
            !subject
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/80',
          )}
        >
          Tất cả
        </Link>
        {POPULAR_SUBJECTS.map((sub) => {
          const isActive = subject.toLowerCase() === sub.toLowerCase();
          return (
            <Link
              key={sub}
              href={buildUrl({ q, subject: isActive ? undefined : sub, sort })}
              className={cn(
                'inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80',
              )}
            >
              {sub}
            </Link>
          );
        })}
      </div>

      {/* Thanh điều khiển lọc & Sắp xếp */}
      <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <div className="text-sm text-muted-foreground">
          {data.total > 0 ? (
            <span>
              Tìm thấy <strong className="font-semibold text-foreground">{data.total}</strong> bộ
              thẻ
              {q && <> cho &ldquo;<span className="text-foreground">{q}</span>&rdquo;</>}
              {subject && <> trong môn <span className="text-foreground">&ldquo;{subject}&rdquo;</span></>}
            </span>
          ) : (
            <span>Không có bộ thẻ nào</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Sắp xếp:</span>
          <div className="inline-flex rounded-lg border border-border p-0.5 bg-muted/30">
            <Link
              href={buildUrl({ q, subject, sort: 'latest', page: 1 })}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                sort === 'latest'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Sparkles className="size-3.5" aria-hidden="true" />
              <span>Mới nhất</span>
            </Link>
            <Link
              href={buildUrl({ q, subject, sort: 'popular', page: 1 })}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                sort === 'popular'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Flame className="size-3.5" aria-hidden="true" />
              <span>Xem nhiều nhất</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Danh sách bộ thẻ */}
      {data.items.length === 0 ? (
        <Card className="mt-8 border-dashed">
          <CardContent className="py-16 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted">
              <Search className="size-6 text-muted-foreground" aria-hidden="true" />
            </div>
            <h2 className="mt-4 text-lg font-semibold">Không tìm thấy bộ thẻ nào</h2>
            <p className="mt-1 text-sm text-muted-foreground max-w-sm mx-auto">
              {hasFilter
                ? 'Hãy thử tìm với từ khóa khác hoặc xóa bộ lọc để xem tất cả bộ thẻ công khai.'
                : 'Chưa có bộ thẻ công khai nào được tạo. Hãy là người đầu tiên chia sẻ kiến thức!'}
            </p>
            {hasFilter ? (
              <Link
                href="/explore"
                className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'mt-6')}
              >
                Xóa bộ lọc
              </Link>
            ) : (
              <Link
                href="/sets/create"
                className={cn(buttonVariants({ size: 'sm' }), 'mt-6')}
              >
                + Tạo bộ thẻ ngay
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="mt-6">
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.items.map((set) => (
              <li key={set.id}>
                <StudySetCard set={set} />
              </li>
            ))}
          </ul>

          {/* Phân trang */}
          {data.totalPages > 1 && (
            <nav
              aria-label="Phân trang"
              className="mt-10 flex items-center justify-center gap-2"
            >
              {page > 1 ? (
                <Link
                  href={buildUrl({ q, subject, sort, page: page - 1 })}
                  className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
                >
                  Trang trước
                </Link>
              ) : (
                <span
                  className={cn(
                    buttonVariants({ variant: 'outline', size: 'sm' }),
                    'pointer-events-none opacity-40',
                  )}
                >
                  Trang trước
                </span>
              )}

              <span className="px-3 text-sm text-muted-foreground">
                Trang <strong className="font-semibold text-foreground">{data.page}</strong> /{' '}
                {data.totalPages}
              </span>

              {page < data.totalPages ? (
                <Link
                  href={buildUrl({ q, subject, sort, page: page + 1 })}
                  className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
                >
                  Trang sau
                </Link>
              ) : (
                <span
                  className={cn(
                    buttonVariants({ variant: 'outline', size: 'sm' }),
                    'pointer-events-none opacity-40',
                  )}
                >
                  Trang sau
                </span>
              )}
            </nav>
          )}
        </div>
      )}
    </div>
  );
}
