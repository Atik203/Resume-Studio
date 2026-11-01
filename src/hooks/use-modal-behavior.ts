import { useEffect, useRef } from 'react';

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Modal keyboard behavior: focus the first control on open, close on Escape,
 * and restore focus to the element that opened the modal. Tab trapping is a
 * documented follow-up; it is intentionally not implemented in this pass.
 */
export function useModalBehavior(
  ref: React.RefObject<HTMLElement | null>,
  onClose: () => void,
  enabled: boolean
): void {
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!enabled) return;

    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const container = ref.current;
    const first = container?.querySelector<HTMLElement>(FOCUSABLE);
    first?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeRef.current();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      if (previous?.isConnected) previous.focus();
    };
  }, [enabled, ref]);
}
