/**
 * Rutas de las imágenes locales.
 *
 * Todo lo que se sirve desde `public/` se referencia por ruta absoluta. Mientras
 * un archivo no exista, su constante vale `null` y el componente pinta su
 * marcador de posición — la web nunca se rompe por una imagen que falta.
 *
 * Para activar una imagen: sube el archivo a `public/…` y cambia el `null` por
 * su ruta. Ver `public/README-imagenes.md`.
 */

/** Arte oficial de Yuquita. Ej: '/mascota/yuquita.png' */
export const MASCOTA_SRC: string | null = null;

/** Miniatura para redes (1200×630). Ej: '/og-image.jpg' */
export const OG_IMAGE = '/og-image.jpg';
