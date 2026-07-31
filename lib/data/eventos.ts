import type { Edition } from '@/lib/types';
import { edicionActual } from './edicion';

/**
 * Druida — evento propio de Proyecto Yuca, anterior al próximo YukaWaii.
 *
 * ⚠️ Se confirmó la fecha (19 de septiembre) pero no el año de forma explícita:
 * se asume 2026 por ser el próximo 19 de septiembre. Verificar antes de
 * publicar, igual que la sede y si tendrá feria con mapa de stands.
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
  standPriceBob: 0, // TODO: confirmar si habrá mesas y a qué precio
  description:
    'Otro encuentro de la comunidad Yuca. Detalles de sede y programa pronto en nuestras redes.',
  hasFeria: false, // TODO: confirmar si tendrá feria con mapa de stands
};

/**
 * Agenda pública, del evento más cercano al más lejano.
 * `edicionActual` es la edición del YukaWaii a la que pertenece el mapa.
 */
export const proximosEventos: Edition[] = [druida, edicionActual];
