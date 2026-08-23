import Link from 'next/link';
import { BookOpen, Layers, Repeat, Timer } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';

const MODES = [
  {
    icon: Layers,
    title: 'The ghi nho',
    description: 'Lat the hai mat, vuot tren dien thoai, dung phim mui ten tren may tinh.',
  },
  {
    icon: Repeat,
    title: 'Hoc lai ngat quang',
    description: 'He thong chon dung the ban sap quen de nhac lai dung luc.',
  },
  {
    icon: BookOpen,
    title: 'Kiem tra',
    description: 'Tu sinh de tu bo the, cham diem va chi ro cau ban con sai.',
  },
  {
    icon: Timer,
    title: 'Ghep cap',
    description: 'Tro choi ghep the tinh gio, ghi lai ky luc tot nhat cua ban.',
  },
];

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="mx-auto max-w-6xl px-4">
      <section className="py-16 sm:py-24">
        <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
          Hoc nhanh hon voi bo the ghi nho cua chinh ban
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
          Tao bo the trong vai phut, hoc theo bon che do khac nhau, va theo doi tung the ban da
          thuoc. Mien phi, khong can loi moi.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          {user ? (
            <Link href="/dashboard" className={buttonVariants({ size: 'lg' })}>
              Vao bang dieu khien
            </Link>
          ) : (
            <>
              <Link href="/register" className={buttonVariants({ size: 'lg' })}>
                Bat dau mien phi
              </Link>
              <Link
                href="/login"
                className={buttonVariants({ variant: 'outline', size: 'lg' })}
              >
                Toi da co tai khoan
              </Link>
            </>
          )}
        </div>
      </section>

      <section className="pb-20" aria-labelledby="modes-heading">
        <h2 id="modes-heading" className="text-2xl font-semibold tracking-tight">
          Bon cach hoc mot bo the
        </h2>

        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {MODES.map((mode) => (
            <li key={mode.title}>
              <Card className="h-full">
                <CardContent className="pt-6">
                  <mode.icon className="size-6 text-primary" aria-hidden="true" />
                  <h3 className="mt-4 font-semibold">{mode.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{mode.description}</p>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
