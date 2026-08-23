import type { Metadata } from 'next';
import { Alert } from '@/components/ui/alert';

export const metadata: Metadata = {
  title: 'Kham pha',
  description: 'Kham pha cac bo the cong khai do cong dong tao ra.',
};

export default function ExplorePage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-3xl font-bold tracking-tight">Kham pha</h1>
      <p className="mt-2 text-muted-foreground">
        Danh sach bo the cong khai va tim kiem toan van.
      </p>
      <Alert className="mt-8">
        Trang nay se hoat dong o giai doan 2, khi API bo the va tim kiem duoc trien khai.
      </Alert>
    </div>
  );
}
