import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { resolveSafeNext } from '@/lib/safe-redirect';

/**
 * Diem tra ve cua Google OAuth va cua lien ket xac nhan email.
 * Supabase gui kem mot `code`; doi code lay session o phia server de cookie duoc dat
 * bang HttpOnly, JavaScript cua trang khong cham vao refresh token duoc.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get('code');
  const next = resolveSafeNext(searchParams.get('next'));

  if (!code) {
    // Google tu choi uy quyen, hoac nguoi dung bam huy: Supabase dat ly do vao
    // error_description. Chuyen nguyen van ve trang dang nhap de nguoi dung doc duoc.
    const reason = searchParams.get('error_description') ?? 'Thieu ma xac thuc.';
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(reason)}`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
