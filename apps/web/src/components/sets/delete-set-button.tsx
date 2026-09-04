'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { apiBrowser } from '@/lib/api/browser';

export function DeleteSetButton({ setId, title }: { setId: string; title: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onDelete() {
    if (!window.confirm(`Xóa bộ thẻ "${title}"? Thao tác này không thể hoàn tác.`)) {
      return;
    }

    setPending(true);
    try {
      await apiBrowser(`/study-sets/${setId}`, { method: 'DELETE' });
      router.push('/dashboard');
      router.refresh();
    } catch {
      setPending(false);
      window.alert('Không thể xóa bộ thẻ. Thử lại sau.');
    }
  }

  return (
    <Button type="button" variant="destructive" size="sm" disabled={pending} onClick={onDelete}>
      {pending ? 'Đang xóa...' : 'Xóa bộ thẻ'}
    </Button>
  );
}
