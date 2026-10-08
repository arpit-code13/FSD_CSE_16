import { useEffect, useId, useRef } from 'react';

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * Accessible dialog: labelled, Esc to close, focus trapped inside and restored on close.
 * Children receive nothing special - give one element `data-autofocus` to choose the first focus.
 */
export default function Modal({ title, hideTitle = false, onClose, children, className = '', align = 'center' }) {
  const titleId = useId();
  const dialogRef = useRef(null);

  useEffect(() => {
    const previous = document.activeElement;
    const dialog = dialogRef.current;
    (dialog.querySelector('[data-autofocus]') ?? dialog).focus({ preventScroll: true });
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
      if (previous instanceof HTMLElement && document.contains(previous)) previous.focus({ preventScroll: true });
    };
  }, []);

  const onKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key !== 'Tab') return;
    const items = [...dialogRef.current.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex animate-fade justify-center bg-ink/40 backdrop-blur-[2px] ${
        align === 'center' ? 'items-center p-4' : 'items-stretch sm:items-center sm:p-4'
      }`}
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={hideTitle ? undefined : titleId}
        aria-label={hideTitle ? title : undefined}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        className={`flex w-full animate-pop flex-col bg-surface shadow-modal focus:outline-none ${className}`}
      >
        {!hideTitle && (
          <h2 id={titleId} className="sr-only">
            {title}
          </h2>
        )}
        {children}
      </div>
    </div>
  );
}
