import Link from 'next/link';
import { BookOpen, Layers, Repeat, Timer } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';

const MODES = [
  {
    icon: Layers,
    title: 'Thẻ ghi nhớ',
    description: 'Lật thẻ hai mặt, vuốt trên điện thoại, dùng phím mũi tên trên máy tính.',
  },
  {
    icon: Repeat,
    title: 'Học lại ngắt quãng',
    description: 'Hệ thống chọn đúng thẻ bạn sắp quên để nhắc lại đúng lúc.',
  },
  {
    icon: BookOpen,
    title: 'Kiểm tra',
    description: 'Tự sinh đề từ bộ thẻ, chấm điểm và chỉ rõ câu bạn còn sai.',
  },
  {
    icon: Timer,
    title: 'Ghép cặp',
    description: 'Trò chơi ghép thẻ tính giờ, ghi lại kỷ lục tốt nhất của bạn.',
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
          Học nhanh hơn với bộ thẻ ghi nhớ của chính bạn
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
          Tạo bộ thẻ trong vài phút, học theo bốn chế độ khác nhau, và theo dõi từng thẻ bạn đã
          thuộc. Miễn phí, không cần lời mời.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          {user ? (
            <Link href="/dashboard" className={buttonVariants({ size: 'lg' })}>
              Vào bảng điều khiển
            </Link>
          ) : (
            <>
              <Link href="/register" className={buttonVariants({ size: 'lg' })}>
                Bắt đầu miễn phí
              </Link>
              <Link
                href="/login"
                className={buttonVariants({ variant: 'outline', size: 'lg' })}
              >
                Tôi đã có tài khoản
              </Link>
            </>
          )}
        </div>
      </section>

      <section className="pb-20" aria-labelledby="modes-heading">
        <h2 id="modes-heading" className="text-2xl font-semibold tracking-tight">
          Bốn cách học một bộ thẻ
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
