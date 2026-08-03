/**
 * Reglas de participación que hay que aceptar antes de apartar una mesa.
 *
 * El pliego de la organización las pide como paso previo a la reserva y exige
 * poder decir quién aceptó y cuándo. Por eso lo que se guarda no es un "sí"
 * suelto sino la **versión** del texto: dentro de un año, ante un reclamo, hace
 * falta saber qué decían las reglas el día que esa persona las aceptó, no lo
 * que dicen hoy.
 *
 * Cómo cambiarlas: editar las reglas y **subir `version`**. Las reservas ya
 * hechas conservan la versión vieja; las nuevas piden aceptar la nueva.
 *
 * TODO: este texto es provisional. Está escrito a partir de lo que la
 * plataforma ya impone (edad, plazo de pago, una mesa por expositor) y de lo
 * que dijo el audio, pero el reglamento oficial lo tiene que dar la
 * organización. Cuando llegue, se reemplaza aquí y se sube la versión.
 */

export interface Regla {
  titulo: string;
  detalle: string;
}

export interface Reglamento {
  /** Identifica el texto exacto; se guarda en cada reserva. */
  version: string;
  titulo: string;
  /** Fecha de la versión, para mostrarla junto al texto. */
  actualizado: string;
  reglas: Regla[];
}

export const REGLAMENTO: Reglamento = {
  version: 'reglas-2026-08',
  titulo: 'Reglas para expositores',
  actualizado: 'agosto de 2026',
  reglas: [
    {
      titulo: 'Edad mínima',
      detalle:
        'Para tener mesa hay que tener 17 años cumplidos. A los 17 y 18 hace falta el permiso de tu padre, madre o tutor legal, y el equipo puede pedirte el documento firmado antes del evento.',
    },
    {
      titulo: 'La mesa es tuya cuando el equipo confirma el pago',
      detalle:
        'Apartar una mesa no la reserva para siempre: tienes un plazo para transferir y declarar la referencia. Si vence sin pago confirmado, la mesa vuelve al mapa y la puede tomar otra persona.',
    },
    {
      titulo: 'Una mesa por expositor',
      detalle:
        'Cada perfil puede tener una sola mesa en la edición. No se revende, no se cede ni se cambia por otra sin pasar por la organización.',
    },
    {
      titulo: 'Compartir mesa',
      detalle:
        'Puedes sumar acompañantes hasta el cupo de tu mesa. Quien la apartó es responsable de quien la comparte y de lo que se venda desde ahí.',
    },
    {
      titulo: 'Lo que se vende',
      detalle:
        'Sólo lo que declaraste en tu perfil. Nada que la ley boliviana prohíba vender, y nada que copie el trabajo de otra persona sin su permiso.',
    },
    {
      titulo: 'Armado, horarios y desarme',
      detalle:
        'Hay que estar en el horario de armado que comunique la organización y no desarmar antes del cierre. La mesa se deja como se encontró.',
    },
    {
      titulo: 'Tus datos',
      detalle:
        'El nombre real, la fecha de nacimiento y el contacto sirven para identificarte y avisarte de tu pago; sólo los ve el equipo. Lo público es tu perfil de artista.',
    },
    {
      titulo: 'Devoluciones',
      detalle:
        'Si cancelas después de que el equipo confirmó tu pago, la devolución depende de la organización y del momento en que avises.',
    },
  ],
};

/**
 * ¿Es esta la versión que rige ahora?
 *
 * El formulario manda la versión que la persona tuvo delante. Si mientras leía
 * se publicó otra, hay que hacerle leer la nueva en vez de dar por buena una
 * aceptación de un texto que ya no existe.
 */
export function esVersionVigente(version: unknown): boolean {
  return version === REGLAMENTO.version;
}
