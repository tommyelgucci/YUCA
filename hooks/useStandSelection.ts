'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/** Desde dónde se hizo la selección, para saber qué panel hay que desplazar. */
export type SelectionOrigin = 'mapa' | 'lista' | 'url';

const PARAM = 'stand';

/**
 * Stand seleccionado, compartido por el mapa y la lista de participantes.
 *
 * El id vive también en la URL (`/evento?stand=C20`) para que sea enlazable:
 * un artista puede publicar "estoy en la C20" con un link que abre el mapa ya
 * centrado en su mesa.
 *
 * La URL se actualiza con `history.replaceState` en vez de `router.replace`
 * a propósito: es sólo estado de interfaz, no queremos re-renderizar el árbol
 * del servidor ni llenar el historial en cada clic.
 */
export function useStandSelection() {
  const [selected, setSelected] = useState<string | null>(null);
  const originRef = useRef<SelectionOrigin>('url');

  /*
   * Lectura inicial del enlace compartido.
   *
   * Tiene que ser en un efecto, aunque la regla `set-state-in-effect` prefiera
   * lo contrario: `window` no existe al renderizar en el servidor. Ponerlo en
   * el valor inicial del `useState` haría que el servidor pintara "nada
   * seleccionado" y el navegador "C20 seleccionada" en el mismo render, que es
   * un desajuste de hidratación y React lo tira todo abajo. Después de montar
   * es el único momento en que se puede saber qué dice la URL.
   */
  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get(PARAM);
    if (fromUrl) {
      originRef.current = 'url';
      // eslint-disable-next-line react-hooks/set-state-in-effect -- ver arriba
      setSelected(fromUrl);
    }
  }, []);

  const select = useCallback((standId: string | null, origin: SelectionOrigin) => {
    originRef.current = origin;
    setSelected((prev) => {
      // Volver a tocar el mismo stand lo deselecciona.
      const next = prev === standId ? null : standId;

      const url = new URL(window.location.href);
      if (next) url.searchParams.set(PARAM, next);
      else url.searchParams.delete(PARAM);
      window.history.replaceState(null, '', url);

      return next;
    });
  }, []);

  return { selected, origin: originRef, select };
}
