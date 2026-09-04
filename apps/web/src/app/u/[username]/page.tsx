import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { Profile, StudySetSummary } from '@flashcard/contracts';
import { StudySetCard } from '@/components/sets/study-set-card';
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

async function loadPublicSets(username: string): Promise<StudySetSummary[]> {
  try {
    return await apiRequest<StudySetSummary[]>(
      `/study-sets?owner=${encodeURIComponent(username)}`,
      { next: { revalidate: 60 } },
    );
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 404) {
      return [];
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
  const sets = await loadPublicSets(profile.username);

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

      <section className="mt-8" aria-labelledby="sets-heading">
        <h2 id="sets-heading" className="text-lg font-semibold">
          Bộ thẻ công khai
          <span className="ml-2 text-base font-normal text-muted-foreground">{sets.length}</span>
        </h2>

        {sets.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            {name} chưa chia sẻ bộ thẻ công khai nào.
          </p>
        ) : (
          <ul className="mt-4 grid gap-4 sm:grid-cols-2">
            {sets.map((set) => (
              <li key={set.id}>
                <StudySetCard set={set} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
