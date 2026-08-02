import ExcelJS from 'exceljs';
import { COLUMNAS, type FilaCredencial } from './credenciales';

/**
 * Serialización del listado de credenciales.
 *
 * Se ofrecen los dos formatos a propósito:
 * - **XLSX** para revisar y corregir a mano antes de imprimir.
 * - **CSV** porque es lo que de verdad tragan los scripts de Illustrator y el
 *   combinado de datos de InDesign; el XLSX hay que convertirlo igual.
 */

/** Un campo CSV se entrecomilla si trae coma, comilla o salto de línea. */
function campoCsv(valor: string): string {
  if (/[",\n\r]/.test(valor)) {
    return `"${valor.replace(/"/g, '""')}"`;
  }
  return valor;
}

/**
 * CSV con BOM UTF-8.
 *
 * El BOM no es un capricho: sin él, Excel en Windows abre el archivo en ANSI y
 * destroza cada tilde y cada ñ — justo lo que más aparece en estos nombres.
 */
export function aCsv(filas: FilaCredencial[]): string {
  const cabecera = COLUMNAS.map((columna) => columna.titulo).join(',');
  const cuerpo = filas.map((fila) =>
    COLUMNAS.map((columna) => campoCsv(fila[columna.clave] ?? '')).join(','),
  );

  return `﻿${[cabecera, ...cuerpo].join('\r\n')}\r\n`;
}

/** Libro de Excel con una hoja de credenciales, lista para revisar. */
export async function aXlsx(filas: FilaCredencial[]): Promise<Buffer> {
  const libro = new ExcelJS.Workbook();
  libro.creator = 'Proyecto Yuca';
  libro.created = new Date();

  const hoja = libro.addWorksheet('Credenciales', {
    views: [{ state: 'frozen', ySplit: 1 }], // la cabecera queda fija al hacer scroll
  });

  hoja.columns = COLUMNAS.map((columna) => ({
    header: columna.titulo,
    key: columna.clave,
    width: columna.ancho,
  }));

  hoja.getRow(1).font = { bold: true };
  hoja.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF5E6CA' }, // crema Yuca
  };

  filas.forEach((fila) => hoja.addRow(fila));

  // Filtros en la cabecera: la organización va a querer filtrar por espacio.
  hoja.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: COLUMNAS.length },
  };

  const buffer = await libro.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

/** Nombre del archivo con la fecha, para no pisar exportaciones anteriores. */
export function nombreArchivo(extension: 'xlsx' | 'csv', edicion: string): string {
  const fecha = new Date().toISOString().slice(0, 10);
  const limpio = edicion.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `credenciales-${limpio}-${fecha}.${extension}`;
}
