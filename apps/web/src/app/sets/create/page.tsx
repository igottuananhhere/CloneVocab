import type { Metadata } from 'next';
import { StudySetForm } from '@/components/sets/study-set-form';

export const metadata: Metadata = {
  title: 'Tạo bộ thẻ',
  robots: { index: false, follow: false },
};

export default function CreateStudySetPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-bold tracking-tight">Tạo bộ thẻ mới</h1>
      <p className="mt-2 text-muted-foreground">
        Thêm tiêu đề, mô tả và các thẻ ghi nhớ cho bộ thẻ của bạn.
      </p>
      <div className="mt-8">
        <StudySetForm mode="create" />
      </div>
    </div>
  );
}
