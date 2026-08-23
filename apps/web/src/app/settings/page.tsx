import type { Metadata } from 'next';
import type { MeProfile } from '@flashcard/contracts';
import { ProfileForm } from '@/components/settings/profile-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { apiServer } from '@/lib/api/server';

export const metadata: Metadata = {
  title: 'Cai dat',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const me = await apiServer<MeProfile>('/profiles/me');

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-3xl font-bold tracking-tight">Cai dat</h1>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Ho so cong khai</CardTitle>
          <CardDescription>
            Nhung thong tin nay hien tren trang /u/{me.username} ma ai cung xem duoc.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm profile={me} />
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Tai khoan</CardTitle>
          <CardDescription>Thong tin dang nhap do Supabase Auth quan ly.</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-1 text-sm">
            <dt className="text-muted-foreground">Email</dt>
            <dd className="font-medium">{me.email ?? 'Khong co'}</dd>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
