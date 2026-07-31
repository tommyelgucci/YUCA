import type { Activity } from '@/lib/types';

/**
 * Actividades y juegos de la edición vigente.
 *
 * ⚠️ Datos de demostración. Horarios y cupos reales pendientes de confirmar.
 */
export const actividades: Activity[] = [
  {
    id: 'stamp-rally',
    slug: 'cacería-de-sellos',
    title: 'Cacería de Sellos',
    kind: 'stamp-rally',
    description:
      'Recorre la feria juntando sellos en tu cartilla. Cada stand participante tiene el suyo. Completa la cartilla y canjéala por premios en el stand de acreditación.',
    banner: null, // TODO: /actividades/stamp-rally.jpg
    conditions: [
      'Retira tu cartilla gratis en la entrada',
      'Necesitas 8 sellos de stands distintos',
      'Canje hasta 30 minutos antes del cierre',
    ],
    capacity: null, // sin límite: participa quien quiera
    enrolled: 0,
    schedule: 'Todo el día',
    location: 'Toda la feria',
  },
  {
    id: 'pasarela-cosplay',
    slug: 'pasarela-cosplay',
    title: 'Pasarela Cosplay',
    kind: 'pasarela',
    description:
      'La competencia insignia del festival. Categorías de armado propio y comprado, con jurado invitado y premios en efectivo.',
    banner: null,
    conditions: [
      'Inscripción previa obligatoria',
      'Un cosplay por participante',
      'Presentarse 45 minutos antes para el chequeo',
    ],
    capacity: 24,
    enrolled: 24, // agotada: la UI muestra "Inscripciones agotadas"
    schedule: 'Horario por confirmar',
    location: 'Teatro — Escenario',
  },
  {
    id: 'taller-tinta',
    slug: 'taller-entintado',
    title: 'Taller de entintado',
    kind: 'taller',
    description:
      'Sesión práctica de entintado tradicional con pincel y plumilla. Los materiales los pone la organización.',
    banner: null,
    conditions: ['Cupo limitado', 'Desde 14 años', 'Trae tu propio boceto si quieres'],
    capacity: 20,
    enrolled: 14,
    schedule: 'Horario por confirmar',
    location: 'Teatro — Sala 2',
  },
  {
    id: 'concurso-ilustracion',
    slug: 'concurso-ilustracion-express',
    title: 'Ilustración exprés',
    kind: 'concurso',
    description:
      'Una hora, un tema sorpresa y el material que traigas. El público vota la favorita y hay premio para las tres primeras.',
    banner: null,
    conditions: ['Inscripción el mismo día', 'Materiales propios', 'Tema sorpresa'],
    capacity: 30,
    enrolled: 8,
    schedule: 'Horario por confirmar',
    location: 'Galería — Zona central',
  },
];
