'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export type SelectOption = { value: string; label: string };

type SelectProps = {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
};

export function Select({ value, onChange, options, placeholder, className }: SelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = options.find(o => o.value === value);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={cn(
          'flex h-9 items-center justify-between gap-2 rounded-md border border-input bg-muted px-3 text-sm text-foreground',
          'focus:outline-none focus:ring-2 focus:ring-ring transition-colors hover:bg-muted/80',
          'min-w-[140px]',
        )}
      >
        <span className={cn(!selected && 'text-muted-foreground')}>
          {selected?.label ?? placeholder ?? 'Seçin'}
        </span>
        <ChevronDown className={cn('w-3.5 h-3.5 text-muted-foreground shrink-0 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className={cn(
          'absolute z-50 mt-1 min-w-full rounded-md border border-border bg-card shadow-lg',
          'overflow-hidden',
        )}>
          {options.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={cn(
                'flex w-full items-center px-3 py-2 text-sm text-left transition-colors',
                'hover:bg-muted',
                opt.value === value
                  ? 'text-primary font-medium bg-primary/10'
                  : 'text-foreground',
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
