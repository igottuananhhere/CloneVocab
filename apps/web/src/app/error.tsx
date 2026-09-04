'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Alert } from '@/components/ui/alert';
import { Button, buttonVariants } from '@/components/ui/button';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const isServerComponentError =
    error.message?.includes('Server Components render') ||
    error.message?.includes('fetch failed') ||
    Boolean(error.digest);

  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center">
      <h1 className="text-2xl font-bold tracking-tight">Đã có lỗi xảy ra</h1>

      {isServerComponentError ? (
        <Alert tone="error" className="mt-6 space-y-2 text-left">
          <p className="font-semibold">Lỗi kết nối máy chủ dữ liệu (Backend API)</p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Máy chủ giao diện chưa thể kết nối tới Backend API (NestJS). Nếu bạn đang chạy trên máy
            tính cá nhân, hãy đảm bảo lệnh <code className="font-mono">pnpm dev</code> đang chạy.
            Nếu đang trên Netlify, Backend API cần được deploy lên dịch vụ hosting (Render hoặc
            Railway) và cấu hình biến <code className="font-mono">NEXT_PUBLIC_API_URL</code>.
          </p>
        </Alert>
      ) : (
        <Alert tone="error" className="mt-6 text-left">
          {error.message || 'Lỗi không xác định.'}
        </Alert>
      )}

      <div className="mt-6 flex items-center justify-center gap-3">
        <Button onClick={reset}>Thử lại</Button>
        <Link href="/" className={buttonVariants({ variant: 'outline' })}>
          Về trang chủ
        </Link>
      </div>
    </div>
  );
}
