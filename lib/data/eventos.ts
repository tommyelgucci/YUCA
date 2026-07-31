import type { Edition } from '@/lib/types';
import { edicionActual } from './edicion';

/**
 * Druida — evento propio de Proyecto Yuca, anterior al próximo YukaWaii.
 *
 * Lleva feria de artistas con mesas, igual que el YukaWaii. Su plano no se
 * puede dibujar todavía porque depende de la sede, así que su página aún no
 * tiene mapa: en cuanto se confirme el local, se añade su propio plano.
 */
export const druida: Edition = {
  id: 'druida-2026',
  name: 'Druida',
  startsAt: '2026-09-19',
  endsAt: null,
  dateLabel: '19 de septiembre de 2026',
  venue: 'Sede por anunciar', // TODO
  address: 'Dirección por anunciar', // TODO
  city: 'Santa Cruz de la Sierra', // TODO: confirmar
  ticket: {
    priceBob: null, // TODO: confirmar si es entrada libre
    label: 'Entrada por confirmar',
    methods: ['qr'],
  },
  standPriceBob: 250, // TODO: precio real de la mesa
  description:
    'Otro encuentro de la comunidad Yuca. Detalles de sede y programa pronto en nuestras redes.',
  hasFeria: true, // el plano se publica cuando se confirme la sede
};

/**
 * Agenda pública, del evento más cercano al más lejano.
 * `edicionActual` es la edición del YukaWaii a la que pertenece el mapa.
 */
export const proximosEventos: Edition[] = [druida, edicionActual];
