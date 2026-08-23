import { cn } from '@/lib/utils';

/** Giu cho san cho noi dung dang tai de bo cuc khong nhay khi du lieu ve. */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('skeleton', className)} aria-hidden="true" {...props} />;
}
