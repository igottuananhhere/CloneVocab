'use client';

import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

const ORDER = ['light', 'dark', 'system'] as const;
const LABEL: Record<(typeof ORDER)[number], string> = {
  light: 'Giao dien sang',
  dark: 'Giao dien toi',
  system: 'Theo he thong',
};

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Theme that chi biet duoc o phia client. Render placeholder cho den khi mounted
  // de HTML cua server va client khong lech nhau.
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className="h-11 w-11" aria-hidden="true" />;
  }

  const current = (ORDER as readonly string[]).includes(theme ?? '')
    ? (theme as (typeof ORDER)[number])
    : 'system';
  const next = ORDER[(ORDER.indexOf(current) + 1) % ORDER.length] as (typeof ORDER)[number];

  const Icon = current === 'light' ? Sun : current === 'dark' ? Moon : Monitor;

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(next)}
      aria-label={`${LABEL[current]}. Chuyen sang ${LABEL[next].toLowerCase()}`}
      title={LABEL[current]}
    >
      <Icon aria-hidden="true" />
    </Button>
  );
}
