import { NextResponse, type NextRequest } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { resolveSafeNext } from '@/lib/safe-redirect';

/**
 * Diem tra ve cua Google OAuth va cua lien ket xac nhan email.
 * - Neu la Google OAuth: Supabase gui `code` (PKCE)
 * - Neu la lien ket xac nhan email: Supabase gui `token_hash` va `type` (hoac `code`)
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get('code');
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const next = resolveSafeNext(searchParams.get('next'));

  const supabase = await createClient();

  // 1. Xu ly xac nhan email qua token_hash
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    });
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error.message)}`,
    );
  }

  // 2. Xu ly OAuth PKCE qua code
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error.message)}`,
    );
  }

  // 3. Khong co code hoac bi huy / loi tu nha cung cap
  const reason = searchParams.get('error_description') ?? 'Thiếu thông tin xác thực.';
  return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(reason)}`);
}
