import type { ReactNode } from 'react';
import Link from 'next/link';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import type { MeProfile } from '@flashcard/contracts';
import { apiServer } from '@/lib/api/server';
import { AdminNav } from './admin-nav';

export const metadata = {
  title: 'Trung tâm Quản trị | CloneVocab',
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminLayout({ children }: { children: ReactNode }) {
  let profile: MeProfile | null = null;
  try {
    profile = await apiServer<MeProfile>('/profiles/me');
  } catch {
    profile = null;
  }

  // Chặn truy cập nếu không phải ADMIN
  if (!profile || profile.role !== 'ADMIN') {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 py-16 text-center">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive mb-6 shadow-sm border border-destructive/20">
          <ShieldAlert className="size-8" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          403 - Quyền truy cập bị từ chối
        </h1>
        <p className="mt-3 max-w-md text-sm text-muted-foreground leading-relaxed">
          Khu vực này được bảo mật nghiêm ngặt và chỉ dành cho Quản trị viên (Admin) của CloneVocab. Tài khoản của bạn hiện không có thẩm quyền truy cập.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground shadow-sm hover:opacity-90 transition-opacity"
          >
            <ArrowLeft className="size-4" />
            <span>Quay về Bảng điều khiển</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/20 pb-16">
      <AdminNav userDisplayName={profile.displayName || profile.username} />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8">
        {children}
      </div>
    </div>
  );
}
