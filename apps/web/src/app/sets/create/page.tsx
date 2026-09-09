import type { Metadata } from 'next';
import { Suspense } from 'react';
import { StudySetForm } from '@/components/sets/study-set-form';

export const metadata: Metadata = {
  title: 'Tạo bộ thẻ',
  robots: { index: false, follow: false },
};

export default function CreateStudySetPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <Suspense fallback={<div className="py-20 text-center text-muted-foreground text-sm">Đang tải biểu mẫu...</div>}>
        <StudySetForm mode="create" />
      </Suspense>
    </div>
  );
}
