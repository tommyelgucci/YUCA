/**
 * Instrucciones de ingreso para expositores con la mesa ya pagada.
 *
 * La organización las pidió dentro de la confirmación: quien acaba de pagar
 * quiere saber a qué hora entrar y qué llevar, y si no lo encuentra ahí lo va a
 * preguntar por Instagram uno por uno.
 *
 * ⚠️ **Casi todo esto depende de la sede, que todavía no está confirmada.** Por
 * eso cada dato es opcional: lo que valga `null` sencillamente no se muestra, en
 * vez de inventar un horario que después haya que desmentir. En cuanto se cierre
 * el local, se rellena aquí y aparece solo en la pantalla de confirmación.
 */

export interface InstruccionesIngreso {
  /** Cuándo se puede entrar a montar la mesa. */
  armado: string | null;
  /** Cuándo abre la feria al público. */
  apertura: string | null;
  /** Cuándo se cierra y se puede desarmar. */
  cierre: string | null;
  /** Por dónde entra el expositor, que no suele ser la puerta del público. */
  acceso: string | null;
  /** Cosas que hay que llevar sí o sí. */
  llevar: string[];
  /** Avisos sueltos que no encajan arriba. */
  notas: string[];
}

export const instruccionesIngreso: InstruccionesIngreso = {
  // TODO: los cuatro dependen de la sede.
  armado: null,
  apertura: null,
  cierre: null,
  acceso: null,

  // Esto no depende de la sede: vale igual en cualquier local.
  llevar: [
    'Tu documento de identidad, el mismo con el que te registraste.',
    'El comprobante de tu transferencia, por si hay que cotejarlo en la puerta.',
    'Mantel y todo lo de tu montaje: la mesa se entrega vacía.',
  ],

  notas: [],
};

/** ¿Hay algún horario que mostrar, o todavía está todo por confirmar? */
export function hayHorarios(datos: InstruccionesIngreso = instruccionesIngreso): boolean {
  return Boolean(datos.armado || datos.apertura || datos.cierre || datos.acceso);
}
