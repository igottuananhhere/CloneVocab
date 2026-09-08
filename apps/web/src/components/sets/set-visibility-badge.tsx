'use client';

import { useState, useRef, useEffect } from 'react';
import { Globe, Link as LinkIcon, Lock, ChevronDown } from 'lucide-react';
import type { Visibility } from '@flashcard/contracts';
import { cn } from '@/lib/utils';

const OPTIONS: Array<{
  value: Visibility;
  label: string;
  hint: string;
  icon: typeof Globe;
}> = [
  {
    value: 'PUBLIC',
    label: 'Công khai',
    hint: 'Mọi người đều có thể tìm và xem',
    icon: Globe,
  },
  {
    value: 'UNLISTED',
    label: 'Chỉ qua link',
    hint: 'Chỉ những ai có liên kết mới xem được',
    icon: LinkIcon,
  },
  {
    value: 'PRIVATE',
    label: 'Riêng tư',
    hint: 'Chỉ bạn mới có quyền xem học phần này',
    icon: Lock,
  },
];

export function SetVisibilityBadge({
  value,
  onChange,
}: {
  value: Visibility;
  onChange: (val: Visibility) => void;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentOption = OPTIONS.find((o) => o.value === value) ?? OPTIONS[0]!;
  const Icon = currentOption.icon;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold tracking-wide transition-all shadow-sm',
          'border border-border/80 bg-muted/70 hover:bg-muted text-foreground',
        )}
      >
        <Icon className="size-3.5 text-primary" aria-hidden="true" />
        <span>{currentOption.label}</span>
        <ChevronDown className="size-3 text-muted-foreground opacity-80" />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 z-40 w-64 rounded-xl border border-border bg-card p-1.5 shadow-xl animate-in fade-in zoom-in-95">
          <div className="px-2 py-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Quyền xem học phần
          </div>
          <div className="space-y-0.5">
            {OPTIONS.map((opt) => {
              const OptIcon = opt.icon;
              const isSelected = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  className={cn(
                    'flex w-full items-start gap-2.5 rounded-lg p-2 text-left text-xs transition-colors',
                    isSelected
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-foreground hover:bg-muted',
                  )}
                >
                  <OptIcon className="mt-0.5 size-4 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold">{opt.label}</div>
                    <div className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                      {opt.hint}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
