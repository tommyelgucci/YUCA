import type { Edition } from '@/lib/types';

/**
 * Edición vigente del festival.
 *
 * ⚠️ Datos de demostración. Todo lo marcado con TODO debe reemplazarse con la
 * información real antes de publicar; la UI ya está preparada para mostrarla.
 */
export const edicionActual: Edition = {
  id: 'yukawaii-4',
  name: 'YukaWaii Fest 4',

  // Sólo se confirmó el mes: con `startsAt` en null la UI muestra `dateLabel`.
  startsAt: null, // TODO: día exacto
  endsAt: null,
  dateLabel: 'Noviembre 2026 · día por confirmar',

  venue: 'Sede por anunciar', // TODO
  address: 'Dirección por anunciar', // TODO
  city: 'Santa Cruz de la Sierra', // TODO: confirmar ciudad

  ticket: {
    priceBob: null, // null = entrada libre
    label: 'Entrada libre',
    methods: ['qr'],
  },

  // TODO: precio real de la mesa para expositores
  standPriceBob: 250,

  description:
    'Arte, ilustración, pasarela cosplay, trivias y sorpresas. Un día entero para encontrarse con la comunidad de artistas de Bolivia.',
  hasFeria: true,
  href: '/evento',
};
