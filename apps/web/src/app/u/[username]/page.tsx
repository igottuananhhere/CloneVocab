import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { Profile } from '@flashcard/contracts';
import { Alert } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { apiRequest, ApiRequestError } from '@/lib/api/request';
import { formatDate } from '@/lib/utils';

type PageProps = { params: Promise<{ username: string }> };

/**
 * Ho so cong khai la endpoint khong can dang nhap, nen goi apiRequest truc tiep thay vi
 * apiServer - khong dong toi cookie thi Next moi cache duoc trang nay.
 */
async function loadProfile(username: string): Promise<Profile | null> {
  try {
    return await apiRequest<Profile>(`/profiles/${encodeURIComponent(username)}`, {
      next: { revalidate: 60 },
    });
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 404) {
      return null;
    }
    throw error;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username } = await params;
  const profile = await loadProfile(username);

  if (!profile) {
    return { title: 'Không tìm thấy người dùng', robots: { index: false } };
  }

  const name = profile.displayName ?? profile.username;

  return {
    title: name,
    description: profile.bio ?? `Các bộ thẻ ghi nhớ công khai của ${name}.`,
    alternates: { canonical: `/u/${profile.username}` },
    openGraph: {
      title: name,
      description: profile.bio ?? `Các bộ thẻ ghi nhớ công khai của ${name}.`,
      type: 'profile',
    },
  };
}

export default async function PublicProfilePage({ params }: PageProps) {
  const { username } = await params;
  const profile = await loadProfile(username);

  if (!profile) {
    notFound();
  }

  const name = profile.displayName ?? profile.username;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <header className="flex items-start gap-4">
        <div
          className="flex size-16 shrink-0 items-center justify-center rounded-full bg-primary text-2xl font-semibold text-primary-foreground"
          aria-hidden="true"
        >
          {name.slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-3xl font-bold tracking-tight">{name}</h1>
          <p className="text-muted-foreground">@{profile.username}</p>
          {profile.bio && <p className="mt-3 max-w-prose">{profile.bio}</p>}
          <p className="mt-2 text-sm text-muted-foreground">
            Tham gia từ {formatDate(profile.createdAt)}
          </p>
        </div>
      </header>

      <Card className="mt-8">
        <CardContent className="pt-6">
          <h2 className="text-lg font-semibold">Bộ thẻ công khai</h2>
          <Alert className="mt-4">
            Danh sách bộ thẻ sẽ hiện ở đây khi API bộ thẻ hoàn thành ở giai đoạn 2.
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
