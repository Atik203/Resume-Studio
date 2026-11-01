import { useEffect, useRef } from 'react';

/**
 * Close a popover/menu when the user clicks outside its container or presses
 * Escape. The container must wrap both the trigger and the menu so clicking
 * the trigger toggles rather than immediately reopening.
 */
export function useDismiss(
  ref: React.RefObject<HTMLElement | null>,
  onDismiss: () => void,
  enabled: boolean
): void {
  const dismissRef = useRef(onDismiss);
  useEffect(() => {
    dismissRef.current = onDismiss;
  }, [onDismiss]);

  useEffect(() => {
    if (!enabled) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (ref.current?.contains(target)) return;
      dismissRef.current();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        dismissRef.current();
      }
    };

    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [enabled, ref]);
}
