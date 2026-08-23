import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
      <p className="text-sm font-medium text-muted-foreground">Lỗi 404</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">Không tìm thấy trang</h1>
      <p className="mt-3 text-muted-foreground">
        Đường dẫn này không tồn tại, hoặc nội dung đã bị xóa.
      </p>
      <Link href="/" className={cn(buttonVariants(), 'mt-8')}>
        Về trang chủ
      </Link>
    </div>
  );
}
