import Link from 'next/link';
import { Eye, Lock, Users } from 'lucide-react';
import type { StudySetSummary } from '@flashcard/contracts';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const VISIBILITY_META: Record<
  StudySetSummary['visibility'],
  { label: string; icon: typeof Eye; className: string }
> = {
  PUBLIC: { label: 'Công khai', icon: Users, className: 'text-success' },
  UNLISTED: { label: 'Link', icon: Eye, className: 'text-muted-foreground' },
  PRIVATE: { label: 'Riêng tư', icon: Lock, className: 'text-muted-foreground' },
};

export function StudySetCard({ set }: { set: StudySetSummary }) {
  const visibility = VISIBILITY_META[set.visibility];
  const VisibilityIcon = visibility.icon;

  return (
    <Card className="transition-colors hover:border-primary/50">
      <Link href={`/sets/${set.id}`} className="block rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary">
        <CardContent className="pt-5">
          <div className="flex items-start justify-between gap-3">
            <h3 className="line-clamp-2 font-semibold tracking-tight">{set.title}</h3>
            <span
              className={cn('inline-flex shrink-0 items-center gap-1 text-xs', visibility.className)}
              title={visibility.label}
            >
              <VisibilityIcon className="size-3.5" aria-hidden="true" />
              <span className="sr-only">{visibility.label}</span>
            </span>
          </div>

          {set.description && (
            <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">{set.description}</p>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span>{set.cardCount} thẻ</span>
            {set.subject && (
              <>
                <span aria-hidden="true">·</span>
                <span>{set.subject}</span>
              </>
            )}
            <span aria-hidden="true">·</span>
            <Link
              href={`/u/${set.owner.username}`}
              className="hover:text-foreground hover:underline"
              onClick={(event) => event.stopPropagation()}
            >
              {set.owner.displayName ?? set.owner.username}
            </Link>
          </div>
        </CardContent>
      </Link>
    </Card>
  );
}
