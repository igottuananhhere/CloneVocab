'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Bookmark, BookmarkCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiBrowser } from '@/lib/api/browser';
import { cn } from '@/lib/utils';

export function SaveSetButton({
  setId,
  initialSaved = false,
  isLoggedIn,
  className,
}: {
  setId: string;
  initialSaved?: boolean;
  isLoggedIn: boolean;
  className?: string;
}) {
  const router = useRouter();
  const [saved, setSaved] = useState(initialSaved);
  const [loading, setLoading] = useState(false);

  async function handleToggleSave() {
    if (!isLoggedIn) {
      router.push(`/login?redirect=${encodeURIComponent(`/sets/${setId}`)}`);
      return;
    }

    const previous = saved;
    // Optimistic update
    setSaved(!previous);
    setLoading(true);

    try {
      if (previous) {
        // Đang lưu -> Bỏ lưu
        await apiBrowser(`/study-sets/${setId}/save`, { method: 'DELETE' });
      } else {
        // Chưa lưu -> Lưu
        await apiBrowser(`/study-sets/${setId}/save`, { method: 'POST' });
      }
      router.refresh();
    } catch {
      // Rollback nếu thất bại
      setSaved(previous);
      window.alert('Không thể cập nhật trạng thái lưu. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      type="button"
      variant={saved ? 'secondary' : 'outline'}
      size="sm"
      disabled={loading}
      onClick={handleToggleSave}
      className={cn(
        'gap-1.5 transition-all',
        saved && 'border-primary/40 bg-primary/10 text-primary hover:bg-primary/20',
        className,
      )}
      title={saved ? 'Bỏ lưu bộ thẻ này' : 'Lưu bộ thẻ này vào danh sách'}
    >
      {saved ? (
        <>
          <BookmarkCheck className="size-4 shrink-0 fill-current" aria-hidden="true" />
          <span>Đã lưu</span>
        </>
      ) : (
        <>
          <Bookmark className="size-4 shrink-0" aria-hidden="true" />
          <span>Lưu bộ thẻ</span>
        </>
      )}
    </Button>
  );
}

