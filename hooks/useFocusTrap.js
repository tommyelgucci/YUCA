import { useEffect, useRef } from 'react';

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

/**
 * Atrapa el foco dentro de `containerRef` mientras `active` sea true.
 *
 * - Enfoca al abrir el primer elemento con `data-autofocus` (o el primero útil).
 * - Cicla con Tab / Shift+Tab sin salir del diálogo.
 * - Cierra con Escape.
 * - Devuelve el foco al elemento que abrió la capa al desmontarse.
 */
export function useFocusTrap(active, containerRef, onEscape) {
  // Se guarda en ref para no re-montar el listener en cada render del padre.
  // La asignación va en su propio efecto y no en el cuerpo del render: escribir
  // un ref mientras se renderiza rompe el render concurrente de React, que
  // puede empezar un render y descartarlo. Al listener le da igual, porque sólo
  // lee el ref cuando alguien pulsa Escape, o sea siempre después de montar.
  const escapeRef = useRef(onEscape);
  useEffect(() => {
    escapeRef.current = onEscape;
  }, [onEscape]);

  useEffect(() => {
    const node = containerRef.current;
    if (!active || !node) return undefined;

    const previouslyFocused = document.activeElement;

    const getFocusable = () =>
      Array.from(node.querySelectorAll(FOCUSABLE)).filter(
        (el) => !el.hasAttribute('aria-hidden') && el.offsetParent !== null,
      );

    // El foco inicial se pide en el siguiente frame: así la animación de
    // entrada ya montó el contenido y el elemento es enfocable.
    const frame = window.requestAnimationFrame(() => {
      const target = node.querySelector('[data-autofocus]') || getFocusable()[0] || node;
      target.focus({ preventScroll: true });
    });

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        escapeRef.current?.();
        return;
      }

      if (event.key !== 'Tab') return;

      const items = getFocusable();
      if (items.length === 0) {
        event.preventDefault();
        return;
      }

      const first = items[0];
      const last = items[items.length - 1];
      const current = document.activeElement;

      if (event.shiftKey && (current === first || !node.contains(current))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && current === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener('keydown', handleKeyDown);
      if (previouslyFocused instanceof HTMLElement) {
        previouslyFocused.focus({ preventScroll: true });
      }
    };
  }, [active, containerRef]);
}
