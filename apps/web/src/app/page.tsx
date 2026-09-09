import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  ArrowRight,
  BookOpen,
  CheckCircle,
  Layers,
  Repeat,
  Sparkles,
  Timer,
  Zap,
} from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/server';
import { InteractiveHeroDemo } from '@/components/landing/interactive-hero-demo';
import { cn } from '@/lib/utils';

const FEATURES = [
  {
    icon: Layers,
    title: 'Thẻ ghi nhớ trực quan',
    description:
      'Lật thẻ 2 mặt mượt mà, hỗ trợ phát âm tiếng Anh chuẩn xác, gán nhãn loại từ và hình ảnh minh họa sinh động.',
    cardStyle:
      'border-blue-500/20 bg-gradient-to-br from-blue-500/10 via-card to-card hover:border-blue-500/50',
    iconStyle: 'bg-blue-500/15 text-blue-500',
    tag: 'Cơ bản',
  },
  {
    icon: Repeat,
    title: 'Học lại ngắt quãng (Leitner)',
    description:
      'Thuật toán Spaced Repetition thông minh tự động gợi ý ôn tập đúng vào thời điểm bạn sắp quên từ vựng.',
    cardStyle:
      'border-purple-500/20 bg-gradient-to-br from-purple-500/10 via-card to-card hover:border-purple-500/50',
    iconStyle: 'bg-purple-500/15 text-purple-500',
    tag: 'Khoa học',
  },
  {
    icon: BookOpen,
    title: 'Kiểm tra thông minh',
    description:
      'Tự động tạo bộ đề trắc nghiệm và tự luận từ chính học phần của bạn, chấm điểm tức thì và phân tích tiến độ.',
    cardStyle:
      'border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-card to-card hover:border-emerald-500/50',
    iconStyle: 'bg-emerald-500/15 text-emerald-500',
    tag: 'Đánh giá',
  },
  {
    icon: Timer,
    title: 'Ghép cặp đua tốc độ',
    description:
      'Trò chơi kết nối thuật ngữ và định nghĩa đối kháng với thời gian, lưu kỷ lục cao nhất để thử thách bản thân.',
    cardStyle:
      'border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-card to-card hover:border-amber-500/50',
    iconStyle: 'bg-amber-500/15 text-amber-500',
    tag: 'Thử thách',
  },
];

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect('/dashboard');
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-16 space-y-20">
      {/* Hero Section: 2 Columns */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
        {/* Left Column: Copy & CTAs */}
        <div className="lg:col-span-7 space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
            <Sparkles className="size-3.5 text-amber-500" />
            <span>Nền tảng học từ vựng thông minh thế hệ mới</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight text-foreground">
            Học nhanh hơn, nhớ sâu hơn cùng{' '}
            <span className="bg-gradient-to-r from-primary via-blue-500 to-indigo-500 bg-clip-text text-transparent">
              bộ thẻ ghi nhớ
            </span>{' '}
            của chính bạn
          </h1>

          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-xl">
            Tạo bộ từ vựng chỉ trong vài phút, ôn tập với 4 phương pháp học tập chuẩn
            khoa học và theo dõi sát sao từng từ bạn đã ghi nhớ. Miễn phí, tiện lợi và không giới hạn.
          </p>

          {/* Bullet points */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 text-xs sm:text-sm font-medium text-foreground/80">
            <div className="flex items-center gap-2">
              <CheckCircle className="size-4 text-emerald-500 shrink-0" />
              <span>Phát âm chuẩn tiếng Anh bản xứ</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="size-4 text-emerald-500 shrink-0" />
              <span>Thuật toán lặp lại ngắt quãng Leitner</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="size-4 text-emerald-500 shrink-0" />
              <span>Đề kiểm tra & Game ghép từ tính giờ</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="size-4 text-emerald-500 shrink-0" />
              <span>Đồng bộ tiến độ học tập trên mọi thiết bị</span>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              href="/register"
              className={cn(
                buttonVariants({ size: 'lg' }),
                'rounded-xl font-semibold shadow-md shadow-primary/20 gap-2'
              )}
            >
              <span>Bắt đầu học miễn phí</span>
              <ArrowRight className="size-4" />
            </Link>
            <Link
              href="/login"
              className={cn(
                buttonVariants({ variant: 'outline', size: 'lg' }),
                'rounded-xl font-semibold'
              )}
            >
              Tôi đã có tài khoản
            </Link>
          </div>
        </div>

        {/* Right Column: Interactive 3D Demo Card */}
        <div className="lg:col-span-5 flex justify-center">
          <InteractiveHeroDemo />
        </div>
      </section>

      {/* 4 Study Modes Section */}
      <section aria-labelledby="modes-heading" className="space-y-6 pt-4">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary uppercase tracking-wider">
            <Zap className="size-3.5" />
            <span>Phương pháp học chuẩn khoa học</span>
          </div>
          <h2 id="modes-heading" className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Bốn chế độ học tập chuyên sâu
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            Đa dạng hóa cách tiếp cận giúp não bộ kích hoạt liên kết từ vựng nhanh gấp 3 lần cách học truyền thống.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((mode) => {
            const Icon = mode.icon;
            return (
              <div
                key={mode.title}
                className={cn(
                  'group relative flex flex-col justify-between rounded-2xl border p-5 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:shadow-md',
                  mode.cardStyle
                )}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div
                      className={cn(
                        'flex size-10 items-center justify-center rounded-xl transition-colors duration-200',
                        mode.iconStyle
                      )}
                    >
                      <Icon className="size-5" aria-hidden="true" />
                    </div>
                    <span className="rounded-full bg-background/80 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground backdrop-blur-xs border border-border/60">
                      {mode.tag}
                    </span>
                  </div>
                  <h3 className="mt-4 text-base font-bold tracking-tight text-foreground">
                    {mode.title}
                  </h3>
                  <p className="mt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    {mode.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Bottom CTA Banner */}
      <section className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card p-8 sm:p-12 text-center shadow-lg">
        <div className="relative z-10 max-w-2xl mx-auto space-y-4">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Sẵn sàng làm chủ vốn từ vựng của bạn?
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            Tham gia ngay hôm nay để tạo các bộ thẻ tùy chỉnh và ghi nhớ từ vựng hiệu quả hơn mỗi ngày.
          </p>
          <div className="pt-2">
            <Link
              href="/register"
              className={cn(
                buttonVariants({ size: 'lg' }),
                'rounded-xl font-semibold shadow-md shadow-primary/20 gap-2 px-8'
              )}
            >
              <span>Đăng ký tài khoản miễn phí</span>
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
