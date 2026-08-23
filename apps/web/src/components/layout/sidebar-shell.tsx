'use client';

import { X } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Phan hien thi cua sidebar tren mobile (drawer + backdrop). Thuan presentational -
 * trang thai mo/dong do ShellInteractive so huu va truyen vao qua props, vi nut bam mo
 * menu nam o topbar (mot vi tri DOM khac) con aside nay nam o vi tri sidebar - hai noi
 * DOM khac nhau nhung phai dung chung mot trang thai.
 */
export function SidebarShell({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  return (
    <>
      {open && (
        // Backdrop: bam ra ngoai de dong, hanh vi ky vong cua moi drawer/modal.
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng menu điều hướng"
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-72 flex-col overflow-y-auto border-r border-border bg-card transition-transform',
          'md:static md:z-0 md:w-64 md:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-center justify-end p-2 md:hidden">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex size-11 items-center justify-center rounded-md hover:bg-muted"
            aria-label="Đóng menu điều hướng"
          >
            <X aria-hidden="true" />
          </button>
        </div>

        {children}
      </aside>
    </>
  );
}
