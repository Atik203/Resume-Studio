'use client';

import * as React from 'react';
import { Dialog as DialogPrimitive } from 'radix-ui';
import { cn } from 'cn';

export interface DialogShellProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  contentClassName?: string;
  overlayClassName?: string;
}

/**
 * Radix-backed dialog shell. Provides focus trapping, Escape/outside-click
 * dismissal, scroll locking, focus return, and an accessible title.
 */
export function DialogShell({
  open,
  onOpenChange,
  title,
  description,
  children,
  contentClassName,
  overlayClassName,
}: DialogShellProps) {
  const lastFocusedRef = React.useRef<HTMLElement | null>(null);

  // Remember the last focused element outside the dialog. This gives
  // externally controlled dialogs a reliable return target without requiring
  // every caller to wire Dialog.Trigger.
  React.useEffect(() => {
    const remember = (event?: FocusEvent) => {
      const target = event?.target ?? document.activeElement;
      if (!(target instanceof HTMLElement)) return;
      if (target.closest('[role="dialog"]')) return;
      lastFocusedRef.current = target;
    };
    remember();
    document.addEventListener('focusin', remember);
    return () => document.removeEventListener('focusin', remember);
  }, []);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            'fixed inset-0 z-50 bg-black/60 backdrop-blur-sm',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=open]:fade-in data-[state=closed]:fade-out',
            overlayClassName
          )}
        />
        <DialogPrimitive.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2',
            'max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card text-card-foreground shadow-2xl',
            'focus:outline-none',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=open]:fade-in data-[state=closed]:fade-out',
            'data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95',
            contentClassName
          )}
          aria-describedby={description ? 'dialog-description' : undefined}
          onCloseAutoFocus={event => {
            const target = lastFocusedRef.current;
            if (!target?.isConnected) return;
            event.preventDefault();
            target.focus();
          }}
        >
          <DialogPrimitive.Title className="sr-only">{title}</DialogPrimitive.Title>
          {description && (
            <DialogPrimitive.Description id="dialog-description" className="sr-only">
              {description}
            </DialogPrimitive.Description>
          )}
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
