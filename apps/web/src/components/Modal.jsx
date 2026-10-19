import { useEffect, useId, useRef } from 'react';
import Icon from './Icon.jsx';

/**
 * Diálogo modal accesible: foco inicial dentro, Escape y clic fuera lo cierran, y el foco vuelve
 * al elemento que lo abrió. Es propio (no <dialog>) para comportarse igual en todos los navegadores.
 */
export default function Modal({ title, onClose, children, wide = false }) {
  const titleId = useId();
  const panel = useRef(null);

  useEffect(() => {
    const previous = document.activeElement;
    const first = panel.current?.querySelector('input, select, textarea, button:not([data-close])');
    (first ?? panel.current)?.focus();

    const onKey = (event) => {
      if (event.key === 'Escape') onClose();
      if (event.key !== 'Tab') return;
      const focusable = [...panel.current.querySelectorAll('a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled)')];
      if (focusable.length === 0) return;
      const [head, tail] = [focusable[0], focusable.at(-1)];
      if (event.shiftKey && document.activeElement === head) { event.preventDefault(); tail.focus(); }
      else if (!event.shiftKey && document.activeElement === tail) { event.preventDefault(); head.focus(); }
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      previous?.focus?.();
    };
  }, [onClose]);

  return (
    <div className="modal" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className={`modal__panel${wide ? ' modal__panel--wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby={titleId} ref={panel} tabIndex={-1}>
        <div className="modal__head">
          <h2 id={titleId}>{title}</h2>
          <button type="button" className="icon-button" data-close onClick={onClose} aria-label="Cerrar">
            <Icon name="close" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
