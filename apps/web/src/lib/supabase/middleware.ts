import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { publicEnv } from '@/lib/env';

/** Duong dan bat buoc dang nhap. So khop theo tien to. */
const PROTECTED_PREFIXES = ['/dashboard', '/settings', '/sets/create'];

/** Cac che do hoc nam duoi /sets/[id]/<mode>, bat buoc dang nhap de luu tien do. */
const STUDY_MODES = ['learn', 'test', 'match', 'cards', 'edit'];

function isProtected(pathname: string): boolean {
  if (
    PROTECTED_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    )
  ) {
    return true;
  }
  const segments = pathname.split('/');
  return (
    segments.length === 4 &&
    segments[1] === 'sets' &&
    segments[3] !== undefined &&
    STUDY_MODES.includes(segments[3])
  );
}

/**
 * Lam moi session Supabase o moi request va chan som cac trang can dang nhap.
 * Chay o middleware nen nguoi chua dang nhap khong bao gio tai duoc HTML cua trang rieng.
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // getUser() xac thuc token voi Supabase. KHONG dung getSession() o day: no chi doc
  // cookie va tin noi dung ben trong, cookie thi client sua duoc.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const needsAuth = isProtected(pathname);

  if (needsAuth && !user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Da dang nhap thi khong con ly do o lai trang dang nhap/dang ky.
  if (user && (pathname === '/login' || pathname === '/register')) {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = '/dashboard';
    dashboardUrl.search = '';
    return NextResponse.redirect(dashboardUrl);
  }

  return response;
}
