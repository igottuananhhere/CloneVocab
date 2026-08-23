import type { Metadata } from 'next';
import { Alert } from '@/components/ui/alert';

export const metadata: Metadata = {
  title: 'Khám phá',
  description: 'Khám phá các bộ thẻ công khai do cộng đồng tạo ra.',
};

export default function ExplorePage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-3xl font-bold tracking-tight">Khám phá</h1>
      <p className="mt-2 text-muted-foreground">
        Danh sách bộ thẻ công khai và tìm kiếm toàn văn.
      </p>
      <Alert className="mt-8">
        Trang này sẽ hoạt động ở giai đoạn 2, khi API bộ thẻ và tìm kiếm được triển khai.
      </Alert>
    </div>
  );
}
