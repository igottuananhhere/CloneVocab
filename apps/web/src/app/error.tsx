'use client';

import { useEffect } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Bien the nay se duoc thay bang mot dich vu theo doi loi that o buoc chuan bi
    // production. Hien tai ghi console de con dau vet khi dev.
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <h1 className="text-3xl font-bold tracking-tight">Da co loi xay ra</h1>
      <Alert tone="error" className="mt-6 text-left">
        {error.message || 'Loi khong xac dinh.'}
      </Alert>
      <Button className="mt-6" onClick={reset}>
        Thu lai
      </Button>
    </div>
  );
}
