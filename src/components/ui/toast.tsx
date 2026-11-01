'use client';

import * as React from 'react';
import { Toast as ToastPrimitive } from 'radix-ui';
import { X } from 'lucide-react';
import { cn } from 'cn';

export type ToastVariant = 'default' | 'success' | 'error';

export interface ToastInput {
  title: string;
  description?: string;
  variant?: ToastVariant;
}

interface ToastItem extends ToastInput {
  id: string;
}

interface ToastContextValue {
  toast: (input: ToastInput) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<ToastItem[]>([]);

  const toast = React.useCallback((input: ToastInput) => {
    const id = crypto.randomUUID();
    setItems(current => [...current.slice(-2), { ...input, id }]);
  }, []);

  const remove = React.useCallback((id: string) => {
    setItems(current => current.filter(item => item.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      <ToastPrimitive.Provider swipeDirection="right">
        {children}
        {items.map(item => {
          const variant = item.variant ?? 'default';
          return (
            <ToastPrimitive.Root
              key={item.id}
              defaultOpen
              duration={variant === 'error' ? Infinity : 5000}
              onOpenChange={open => {
                if (!open) remove(item.id);
              }}
              className={cn(
                'pointer-events-auto flex w-full items-start gap-3 rounded-xl border bg-card p-3 text-card-foreground shadow-xl',
                'data-[state=open]:animate-in data-[state=closed]:animate-out',
                'data-[state=open]:slide-in-from-right-full data-[state=closed]:fade-out-80',
                'data-[swipe=end]:animate-out data-[swipe=end]:fade-out-80',
                variant === 'success' && 'border-emerald-500/40',
                variant === 'error' && 'border-rose-500/40'
              )}
            >
              <div className="flex-1 min-w-0">
                <ToastPrimitive.Title className="text-sm font-semibold">{item.title}</ToastPrimitive.Title>
                {item.description && (
                  <ToastPrimitive.Description className="mt-0.5 text-xs text-muted-foreground">
                    {item.description}
                  </ToastPrimitive.Description>
                )}
              </div>
              <ToastPrimitive.Close
                aria-label="Dismiss notification"
                className="rounded-lg p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X size={14} />
              </ToastPrimitive.Close>
            </ToastPrimitive.Root>
          );
        })}
        <ToastPrimitive.Viewport className="fixed bottom-4 right-4 z-[100] flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2 outline-none" />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = React.useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
}
