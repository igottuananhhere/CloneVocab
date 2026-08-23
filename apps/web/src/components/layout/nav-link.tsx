'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Tach rieng thanh Client Component vi day la noi duy nhat trong sidebar can biet
 * URL hien tai (usePathname chi dung duoc o client). Phan con lai cua sidebar (danh
 * sach muc, du lieu nguoi dung) van la Server Component.
 *
 * `icon` nhan vao mot ReactNode (JSX da render) chu khong phai component reference:
 * React khong serialize duoc mot ham/component khi truyen qua ranh gioi Server ->
 * Client Component, chi serialize duoc element da render.
 */
export function NavLink({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon: ReactNode;
}) {
  const pathname = usePathname();
  const active = pathname === href || (href !== '/' && pathname.startsWith(`${href}/`));

  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
        active
          ? 'bg-primary/10 text-primary'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
      )}
    >
      {icon}
      <span className="truncate">{label}</span>
    </Link>
  );
}
