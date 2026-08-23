import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Dang xuat bang POST chu khong phai GET: mot the <img> hay lien ket cua trang khac
 * khong the dang xuat nguoi dung ngoai y muon.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient();
  await supabase.auth.signOut();

  return NextResponse.redirect(new URL('/', request.url), { status: 303 });
}
