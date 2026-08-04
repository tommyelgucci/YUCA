'use client';

import { createContext, useContext, useMemo } from 'react';
import { stands as standsMock } from '@/lib/data/feria';
import { expositores as expositoresMock } from '@/lib/data/expositores';
import type { Exhibitor, Stand } from '@/lib/types';

/**
 * Las mesas y los expositores de la edición, para toda la vista de evento.
 *
 * Antes cada componente importaba `lib/data/` directamente, o sea que el mapa
 * enseñaba un plano de mentira aunque hubiera expositores reales en la base.
 * Ahora los datos entran una sola vez, desde el servidor, y bajan por aquí.
 *
 * Es contexto y no props porque los consumen cuatro componentes a dos niveles
 * de profundidad (`EventTabs` → paneles → mapa y ficha), y encadenarlos a mano
 * obligaría a que las pestañas —que no usan ni una mesa— acarreen los datos
 * sólo para pasarlos.
 *
 * El valor por defecto son los mocks: así un componente suelto en pruebas, o
 * un clon sin base configurada, sigue teniendo algo que dibujar.
 */

export interface Feria {
  stands: Stand[];
  expositores: Exhibitor[];
  /** `demostracion` = datos de `lib/data/`, no de la base. */
  origen: 'base' | 'demostracion';
}

const FeriaContext = createContext<Feria>({
  stands: standsMock,
  expositores: expositoresMock,
  origen: 'demostracion',
});

export const FeriaProvider = FeriaContext.Provider;

/**
 * La feria más los tres accesos que antes vivían en `lib/data/`.
 *
 * Se memorizan los índices para no recorrer las listas en cada render de cada
 * mesa: el plano dibuja medio centenar y cada una pregunta por su ocupante.
 */
export function useFeria() {
  const feria = useContext(FeriaContext);

  return useMemo(() => {
    const porId = new Map(feria.stands.map((stand) => [stand.id, stand]));
    const porStand = new Map(
      feria.expositores
        .filter((expositor) => expositor.standId)
        .map((expositor) => [expositor.standId!, expositor]),
    );

    return {
      ...feria,
      getStand: (id: string | null | undefined) => (id ? porId.get(id) : undefined),
      getExpositorPorStand: (id: string | null | undefined) => (id ? porStand.get(id) : undefined),
      standsDeEspacio: (espacioId: Stand['espacioId']) =>
        feria.stands.filter((stand) => stand.espacioId === espacioId),
    };
  }, [feria]);
}
