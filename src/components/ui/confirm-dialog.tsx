'use client';

import * as React from 'react';
import { AlertDialog as AlertDialogPrimitive } from 'radix-ui';
import { Button } from '@/components/ui/button';

export interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = React.createContext<ConfirmContextValue | null>(null);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [options, setOptions] = React.useState<ConfirmOptions | null>(null);
  const resolveRef = React.useRef<((value: boolean) => void) | null>(null);

  const confirm = React.useCallback((next: ConfirmOptions) => {
    return new Promise<boolean>(resolve => {
      resolveRef.current?.(false);
      resolveRef.current = resolve;
      setOptions(next);
    });
  }, []);

  const close = React.useCallback((value: boolean) => {
    resolveRef.current?.(value);
    resolveRef.current = null;
    setOptions(null);
  }, []);

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <AlertDialogPrimitive.Root
        open={Boolean(options)}
        onOpenChange={open => {
          if (!open) close(false);
        }}
      >
        <AlertDialogPrimitive.Portal>
          <AlertDialogPrimitive.Overlay className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm" />
          <AlertDialogPrimitive.Content className="fixed left-1/2 top-1/2 z-[110] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-2xl">
            <AlertDialogPrimitive.Title className="text-base font-bold">
              {options?.title}
            </AlertDialogPrimitive.Title>
            {options?.description && (
              <AlertDialogPrimitive.Description className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {options.description}
              </AlertDialogPrimitive.Description>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <AlertDialogPrimitive.Cancel asChild>
                <Button variant="outline">{options?.cancelLabel ?? 'Cancel'}</Button>
              </AlertDialogPrimitive.Cancel>
              <AlertDialogPrimitive.Action asChild>
                <Button
                  variant={options?.destructive ? 'destructive' : 'default'}
                  onClick={() => close(true)}
                >
                  {options?.confirmLabel ?? 'Confirm'}
                </Button>
              </AlertDialogPrimitive.Action>
            </div>
          </AlertDialogPrimitive.Content>
        </AlertDialogPrimitive.Portal>
      </AlertDialogPrimitive.Root>
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmContextValue {
  const context = React.useContext(ConfirmContext);
  if (!context) throw new Error('useConfirm must be used within ConfirmProvider');
  return context;
}
