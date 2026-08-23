import type { Metadata } from 'next';
import type { MeProfile } from '@flashcard/contracts';
import { ProfileForm } from '@/components/settings/profile-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { apiServer } from '@/lib/api/server';

export const metadata: Metadata = {
  title: 'Cài đặt',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const me = await apiServer<MeProfile>('/profiles/me');

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-3xl font-bold tracking-tight">Cài đặt</h1>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Hồ sơ công khai</CardTitle>
          <CardDescription>
            Những thông tin này hiện trên trang /u/{me.username} mà ai cũng xem được.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm profile={me} />
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Tài khoản</CardTitle>
          <CardDescription>Thông tin đăng nhập do Supabase Auth quản lý.</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-1 text-sm">
            <dt className="text-muted-foreground">Email</dt>
            <dd className="font-medium">{me.email ?? 'Không có'}</dd>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
