import type { Metadata } from 'next';
import { Alert } from '@/components/ui/alert';

export const metadata: Metadata = {
  title: 'Tạo bộ thẻ',
  robots: { index: false, follow: false },
};

export default function CreateStudySetPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold tracking-tight">Tạo bộ thẻ mới</h1>
      <p className="mt-2 text-muted-foreground">
        Thêm tiêu đề, mô tả và các thẻ ghi nhớ cho bộ thẻ của bạn.
      </p>
      <Alert className="mt-8">
        Form tạo bộ thẻ (dán nhanh, sắp xếp kéo-thả, upload ảnh) sẽ hoạt động ở Giai
        đoạn 2, khi API bộ thẻ và tải ảnh hoàn thành.
      </Alert>
    </div>
  );
}
