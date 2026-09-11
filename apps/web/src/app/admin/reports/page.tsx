import type { AdminReportListResponse } from '@flashcard/contracts';
import { apiServer } from '@/lib/api/server';
import { ReportsTable } from './reports-table';

export const metadata = {
  title: 'Kiểm duyệt Báo cáo vi phạm | Quản trị viên CloneVocab',
};

export default async function AdminReportsPage() {
  let initialReports: AdminReportListResponse | null = null;
  let errorMsg: string | null = null;

  try {
    initialReports = await apiServer<AdminReportListResponse>('/admin/reports?limit=100');
  } catch (err) {
    errorMsg = err instanceof Error ? err.message : 'Không thể tải danh sách báo cáo vi phạm.';
  }

  if (errorMsg || !initialReports) {
    return (
      <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-6 text-center">
        <p className="text-sm font-medium text-destructive">{errorMsg ?? 'Lỗi không xác định.'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          Kiểm duyệt Báo cáo Vi phạm
        </h2>
        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
          Xem xét các phản ánh từ học viên, kiểm tra nội dung vi phạm bản quyền, spam hoặc không phù hợp để bảo vệ cộng đồng.
        </p>
      </div>

      <ReportsTable initialItems={initialReports.items} />
    </div>
  );
}
