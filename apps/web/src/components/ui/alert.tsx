import * as React from 'react';
import { cn } from '@/lib/utils';

type AlertProps = React.HTMLAttributes<HTMLDivElement> & {
  tone?: 'error' | 'success' | 'info';
};

const TONE_CLASS: Record<NonNullable<AlertProps['tone']>, string> = {
  error: 'border-destructive/40 bg-destructive/10 text-destructive',
  success: 'border-success/40 bg-success/10 text-success',
  info: 'border-border bg-muted text-muted-foreground',
};

/**
 * role="alert" de trinh doc man hinh doc ngay noi dung khi thong bao xuat hien,
 * khong doi nguoi dung dieu huong toi.
 */
export function Alert({ className, tone = 'info', ...props }: AlertProps) {
  return (
    <div
      role="alert"
      className={cn('rounded-md border px-4 py-3 text-sm', TONE_CLASS[tone], className)}
      {...props}
    />
  );
}
