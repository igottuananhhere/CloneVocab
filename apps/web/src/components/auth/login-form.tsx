'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { GoogleButton } from './google-button';
import { resolveSafeNext } from '@/lib/safe-redirect';
import { createClient } from '@/lib/supabase/client';
import { loginSchema, toFieldErrors } from '@/lib/validation/auth';

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Loc truoc khi dung: router.push() nhan ca URL tuyet doi, nen mot ?next= khong duoc
  // kiem tra se day nguoi vua dang nhap sang trang cua ke tan cong.
  const next = resolveSafeNext(searchParams.get('next'));

  const [errors, setErrors] = useState<Record<string, string>>({});
  // /auth/callback dieu huong ve day kem ?error=... khi luong OAuth that bai. Doc ngay o
  // gia tri khoi tao, neu khong thi loi cua Google se bien mat khong dau vet.
  const [formError, setFormError] = useState<string | null>(() => searchParams.get('error'));
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const data = new FormData(event.currentTarget);
    const parsed = loginSchema.safeParse({
      email: data.get('email'),
      password: data.get('password'),
    });

    if (!parsed.success) {
      setErrors(toFieldErrors(parsed.error));
      return;
    }

    setErrors({});
    setSubmitting(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword(parsed.data);

    if (error) {
      setSubmitting(false);
      // Khong noi ro la sai email hay sai mat khau: tranh de lo tai khoan nao ton tai.
      setFormError(
        error.message.toLowerCase().includes('invalid')
          ? 'Email hoặc mật khẩu không đúng.'
          : error.message,
      );
      return;
    }

    // refresh() de Server Component doc lai cookie session moi truoc khi dieu huong.
    router.refresh();
    router.push(next);
  }

  return (
    <div className="space-y-5">
      {formError && <Alert tone="error">{formError}</Alert>}

      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Field id="email" label="Email" error={errors.email}>
          <Input
            name="email"
            type="email"
            autoComplete="email"
            placeholder="ban@example.com"
            invalid={Boolean(errors.email)}
            required
          />
        </Field>

        <Field id="password" label="Mật khẩu" error={errors.password}>
          <Input
            name="password"
            type="password"
            autoComplete="current-password"
            invalid={Boolean(errors.password)}
            required
          />
        </Field>

        <Button type="submit" block disabled={submitting}>
          {submitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
        </Button>
      </form>

      <div className="flex items-center gap-3" aria-hidden="true">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">hoặc</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <GoogleButton next={next} onError={setFormError} />

      <p className="text-center text-sm text-muted-foreground">
        Chưa có tài khoản?{' '}
        <Link href="/register" className="font-medium text-primary hover:underline">
          Đăng ký miễn phí
        </Link>
      </p>
    </div>
  );
}
