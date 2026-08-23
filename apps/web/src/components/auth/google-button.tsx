'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';

/**
 * Google OAuth di theo luong PKCE: Supabase tra ve mot `code`, route
 * /auth/callback doi code lay session roi dat cookie o phia server.
 */
export function GoogleButton({ next, onError }: { next?: string; onError: (message: string) => void }) {
  const [loading, setLoading] = useState(false);

  async function signIn() {
    setLoading(true);
    const supabase = createClient();

    const callback = new URL('/auth/callback', window.location.origin);
    if (next) callback.searchParams.set('next', next);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: callback.toString() },
    });

    if (error) {
      setLoading(false);
      onError(`Không khởi tạo được đăng nhập Google: ${error.message}`);
    }
    // Thanh cong thi trinh duyet dieu huong sang Google, khong can tat loading.
  }

  return (
    <Button variant="outline" block onClick={signIn} disabled={loading}>
      <GoogleMark />
      {loading ? 'Đang chuyển hướng...' : 'Tiếp tục với Google'}
    </Button>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4">
      <path
        fill="#4285F4"
        d="M23.06 12.25c0-.85-.08-1.67-.22-2.45H12v4.64h6.2a5.3 5.3 0 0 1-2.3 3.48v2.9h3.72c2.18-2 3.44-4.96 3.44-8.57Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.11 0 5.72-1.03 7.62-2.79l-3.72-2.89c-1.03.69-2.35 1.1-3.9 1.1-3 0-5.54-2.03-6.45-4.75H1.7v2.98A11.5 11.5 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.55 14.67a6.9 6.9 0 0 1 0-4.4V7.29H1.7a11.5 11.5 0 0 0 0 10.36l3.85-2.98Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.69 0 3.21.58 4.4 1.72l3.3-3.3C17.71 1.22 15.1 0 12 0 7.44 0 3.5 2.62 1.7 6.44l3.85 2.98C6.46 6.78 9 4.75 12 4.75Z"
      />
    </svg>
  );
}
