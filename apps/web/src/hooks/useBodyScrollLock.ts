import { useEffect } from 'react';

let lockCount = 0;

/**
 * Locks document scrolling when a modal or overlay is open.
 * Supports nested modals via reference counting.
 */
export function useBodyScrollLock(isLocked: boolean = true) {
  useEffect(() => {
    if (!isLocked) return;

    lockCount++;
    if (lockCount === 1) {
      document.body.classList.add('modal-open');
      document.documentElement.classList.add('modal-open');
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    }

    return () => {
      lockCount--;
      if (lockCount <= 0) {
        lockCount = 0;
        document.body.classList.remove('modal-open');
        document.documentElement.classList.remove('modal-open');
        document.body.style.overflow = '';
        document.documentElement.style.overflow = '';
      }
    };
  }, [isLocked]);
}
