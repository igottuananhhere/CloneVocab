import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
      <p className="text-sm font-medium text-muted-foreground">Loi 404</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">Khong tim thay trang</h1>
      <p className="mt-3 text-muted-foreground">
        Duong dan nay khong ton tai, hoac noi dung da bi xoa.
      </p>
      <Link href="/" className={buttonVariants({ className: 'mt-8' })}>
        Ve trang chu
      </Link>
    </div>
  );
}
