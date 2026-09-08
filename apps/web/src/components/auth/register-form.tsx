'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { GoogleButton } from './google-button';
import { createClient } from '@/lib/supabase/client';
import { registerSchema, toFieldErrors } from '@/lib/validation/auth';

export function RegisterForm() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [registeredEmail, setRegisteredEmail] = useState<string>('');
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // State cho xac thuc ma OTP
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpSubmitting, setOtpSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

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
    setRegisteredEmail(parsed.data.email);

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

    // Khi tat xac thuc email tren Supabase, co session ngay va vao thang
    if (result.session) {
      window.location.href = '/dashboard';
      return;
    }

    setSubmitting(false);
    setAwaitingConfirmation(true);
  }

  // Xac thuc ma 6 so (OTP) truc tiep tren form
  async function onVerifyOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setOtpError(null);

    const cleanOtp = otp.trim();
    if (!cleanOtp) {
      setOtpError('Vui lòng nhập mã xác nhận 6 số từ email.');
      return;
    }

    setOtpSubmitting(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.verifyOtp({
      email: registeredEmail,
      token: cleanOtp,
      type: 'signup',
    });

    if (error) {
      setOtpSubmitting(false);
      setOtpError(
        error.message.toLowerCase().includes('expired')
          ? 'Mã xác nhận đã hết hạn. Vui lòng bấm gửi lại mã.'
          : error.message,
      );
      return;
    }

    if (data.session) {
      window.location.href = '/dashboard';
    } else {
      setOtpSubmitting(false);
      setOtpError('Xác nhận thành công! Vui lòng chuyển sang trang đăng nhập.');
    }
  }

  // Gui lai ma
  async function onResendOtp() {
    if (!registeredEmail || resending) return;
    setResending(true);
    setOtpError(null);
    setResendSuccess(false);

    const supabase = createClient();
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: registeredEmail,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });

    setResending(false);
    if (error) {
      setOtpError(`Không thể gửi lại mã: ${error.message}`);
    } else {
      setResendSuccess(true);
      setTimeout(() => setResendSuccess(false), 5000);
    }
  }

  if (awaitingConfirmation) {
    return (
      <div className="space-y-6">
        <Alert tone="success">
          <p className="font-semibold text-base">Xác nhận email tài khoản</p>
          <p className="mt-1 text-sm leading-relaxed">
            Mã xác nhận đã được gửi đến <strong>{registeredEmail}</strong>. Bạn có thể nhập mã xác
            nhận vào bên dưới để vào học ngay, hoặc nhấp vào liên kết trong email.
          </p>
        </Alert>

        {otpError && <Alert tone="error">{otpError}</Alert>}
        {resendSuccess && <Alert tone="success">Đã gửi lại mã xác nhận mới vào email của bạn!</Alert>}

        <form onSubmit={onVerifyOtp} className="space-y-4">
          <Field id="otp" label="Mã xác nhận (OTP 6 số)" hint="Kiểm tra email của bạn để lấy mã">
            <Input
              name="otp"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={8}
              placeholder="Ví dụ: 123456"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className="text-center text-xl tracking-widest font-mono font-bold"
              required
              autoFocus
            />
          </Field>

          <Button type="submit" block disabled={otpSubmitting}>
            {otpSubmitting ? 'Đang xác nhận...' : 'Xác nhận & Vào học ngay'}
          </Button>
        </form>

        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2">
          <button
            type="button"
            onClick={onResendOtp}
            disabled={resending}
            className="text-primary hover:underline disabled:opacity-50"
          >
            {resending ? 'Đang gửi lại...' : 'Chưa nhận được mã? Gửi lại'}
          </button>

          <button
            type="button"
            onClick={() => setAwaitingConfirmation(false)}
            className="hover:underline"
          >
            Đổi email khác
          </button>
        </div>
      </div>
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
