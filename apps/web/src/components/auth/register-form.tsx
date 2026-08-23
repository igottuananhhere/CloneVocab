'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { GoogleButton } from './google-button';
import { createClient } from '@/lib/supabase/client';
import { registerSchema, toFieldErrors } from '@/lib/validation/auth';

export function RegisterForm() {
  const router = useRouter();

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const data = new FormData(event.currentTarget);
    const parsed = registerSchema.safeParse({
      email: data.get('email'),
      password: data.get('password'),
      confirmPassword: data.get('confirmPassword'),
    });

    if (!parsed.success) {
      setErrors(toFieldErrors(parsed.error));
      return;
    }

    setErrors({});
    setSubmitting(true);

    const supabase = createClient();
    const { data: result, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });

    if (error) {
      setSubmitting(false);
      setFormError(error.message);
      return;
    }

    // Khi bat xac thuc email, Supabase khong tra ve session ngay. Local (config.toml
    // dat enable_confirmations = false) thi co session va vao thang duoc.
    if (result.session) {
      router.refresh();
      router.push('/dashboard');
      return;
    }

    setSubmitting(false);
    setAwaitingConfirmation(true);
  }

  if (awaitingConfirmation) {
    return (
      <Alert tone="success">
        <p className="font-medium">Kiểm tra hộp thư của bạn</p>
        <p className="mt-1">
          Chúng tôi vừa gửi một liên kết xác nhận. Mở liên kết đó để kích hoạt tài khoản.
        </p>
      </Alert>
    );
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

        <Field
          id="password"
          label="Mật khẩu"
          hint="Ít nhất 8 ký tự"
          error={errors.password}
        >
          <Input
            name="password"
            type="password"
            autoComplete="new-password"
            invalid={Boolean(errors.password)}
            required
          />
        </Field>

        <Field id="confirmPassword" label="Nhập lại mật khẩu" error={errors.confirmPassword}>
          <Input
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            invalid={Boolean(errors.confirmPassword)}
            required
          />
        </Field>

        <Button type="submit" block disabled={submitting}>
          {submitting ? 'Đang tạo tài khoản...' : 'Tạo tài khoản'}
        </Button>
      </form>

      <div className="flex items-center gap-3" aria-hidden="true">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">hoặc</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <GoogleButton onError={setFormError} />

      <p className="text-center text-sm text-muted-foreground">
        Đã có tài khoản?{' '}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Đăng nhập
        </Link>
      </p>
    </div>
  );
}
