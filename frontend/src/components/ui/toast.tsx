'use client';

import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { CheckCircle, AlertTriangle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);

  const toast = useCallback((message: string, type: ToastType = 'success') => {
    const id = ++counter.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  const dismiss = (id: number) => setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              'pointer-events-auto flex items-center gap-3 rounded-lg border px-4 py-3 text-sm shadow-lg min-w-[260px] max-w-sm',
              t.type === 'success' && 'bg-card border-green-500/30 text-foreground',
              t.type === 'error'   && 'bg-card border-red-500/30 text-foreground',
              t.type === 'info'    && 'bg-card border-border text-foreground',
            )}
          >
            {t.type === 'success' && <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />}
            {t.type === 'error'   && <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />}
            <span className="flex-1">{t.message}</span>
            <button
              onClick={() => dismiss(t.id)}
              className="text-muted-foreground hover:text-foreground shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}
