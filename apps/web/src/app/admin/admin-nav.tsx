'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, AlertTriangle, Users, BookOpen, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AdminNavProps {
  userDisplayName: string;
}

export function AdminNav({ userDisplayName }: AdminNavProps) {
  const pathname = usePathname();

  const navItems = [
    {
      href: '/admin',
      label: 'Tổng quan',
      icon: BarChart3,
      exact: true,
    },
    {
      href: '/admin/reports',
      label: 'Báo cáo vi phạm',
      icon: AlertTriangle,
      exact: false,
    },
  ];

  const upcomingItems = [
    {
      label: 'Người dùng',
      icon: Users,
      badge: 'Giai đoạn 2',
    },
    {
      label: 'Bộ thẻ học',
      icon: BookOpen,
      badge: 'Giai đoạn 2',
    },
  ];

  return (
    <div className="border-b border-border bg-card/60 backdrop-blur-md sticky top-16 z-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between py-3 gap-3">
          {/* Left: Branding & Status */}
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-xs">
              <span className="font-bold text-sm">ADM</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold tracking-tight text-foreground">
                  Trung tâm Quản trị
                </h1>
                <span className="inline-flex items-center rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-semibold text-primary">
                  Admin Portal
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Đăng nhập với tư cách: <strong className="text-foreground">{userDisplayName}</strong>
              </p>
            </div>
          </div>

          {/* Right: Return button */}
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shadow-2xs"
            >
              <ArrowLeft className="size-3.5" />
              <span>Về Bảng điều khiển</span>
            </Link>
          </div>
        </div>

        {/* Tab Navigation */}
        <nav className="flex items-center gap-1 -mb-px overflow-x-auto no-scrollbar pt-1">
          {navItems.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold border-b-2 transition-all whitespace-nowrap',
                  isActive
                    ? 'border-primary text-primary bg-primary/5 rounded-t-lg'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                )}
              >
                <Icon className="size-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}

          {upcomingItems.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className="flex items-center gap-2 px-3.5 py-2.5 text-xs font-medium text-muted-foreground/60 border-b-2 border-transparent cursor-not-allowed whitespace-nowrap"
                title="Tính năng này sẽ được mở ở Giai đoạn 2"
              >
                <Icon className="size-4 opacity-50" />
                <span>{item.label}</span>
                <span className="rounded-full bg-muted px-1.5 py-0.2 text-[10px] text-muted-foreground">
                  {item.badge}
                </span>
              </div>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
