'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { GoogleButton } from './google-button';
import { createClient } from '@/lib/supabase/client';
import { apiRequest } from '@/lib/api/request';
import { registerSchema, toFieldErrors } from '@/lib/validation/auth';

export function RegisterForm() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
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

    try {
      // 1. Goi backend API de tao tai khoan va tu dong kich hoat (khong can check email)
      await apiRequest('/auth/register', {
        method: 'POST',
        body: {
          email: parsed.data.email,
          password: parsed.data.password,
        },
      });

      // 2. Dang nhap truc tiep ngay sau khi tai khoan duoc kich hoat
      const supabase = createClient();
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: parsed.data.email,
        password: parsed.data.password,
      });

      if (loginError) {
        // Neu vi ly do nao do chua dang nhap duoc thi chuyen den trang dang nhap
        window.location.href = `/login?message=${encodeURIComponent('Đăng ký thành công! Vui lòng đăng nhập.')}`;
        return;
      }

      // 3. Vao thang Dashboard hoc luon
      window.location.href = '/dashboard';
    } catch (err: unknown) {
      setSubmitting(false);
      setFormError(err instanceof Error ? err.message : 'Không thể đăng ký. Vui lòng thử lại.');
    }
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
          {submitting ? 'Đang tạo tài khoản & đăng nhập...' : 'Tạo tài khoản'}
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

