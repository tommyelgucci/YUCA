/**
 * Registro de imágenes locales.
 *
 * En vez de importar archivo por archivo, se auto-descubren las imágenes que
 * dejes en las subcarpetas de `src/assets/`. Basta con soltar el archivo con el
 * nombre correcto y la web lo toma en el siguiente `npm run dev` / build:
 *
 *   src/assets/events/yukawaii-1.jpg   ->  getEventImage('yukawaii-1')
 *   src/assets/mascot/yuquita.png      ->  getMascotImage('yuquita')
 *
 * El `slug` es el nombre del archivo sin extensión, y es el mismo que se usa en
 * `src/data/site.js`. Si el archivo todavía no existe, la función devuelve
 * `null` y el componente muestra su marcador de posición.
 *
 * Formatos soportados: jpg, jpeg, png, webp, avif.
 */

// Vite exige que las opciones del glob sean un objeto literal en la llamada.
const eventModules = import.meta.glob('./events/*.{jpg,jpeg,png,webp,avif}', {
  eager: true,
  query: '?url',
  import: 'default',
});

const mascotModules = import.meta.glob('./mascot/*.{jpg,jpeg,png,webp,avif,svg}', {
  eager: true,
  query: '?url',
  import: 'default',
});

/** Convierte `{'./events/foo.jpg': '/assets/foo.hash.jpg'}` en `{foo: '/assets/…'}` */
function bySlug(modules) {
  return Object.fromEntries(
    Object.entries(modules).map(([path, url]) => [
      path.split('/').pop().replace(/\.[^.]+$/, ''),
      url,
    ]),
  );
}

export const eventImages = bySlug(eventModules);
export const mascotImages = bySlug(mascotModules);

/** URL de la foto de una edición, o `null` si aún no se subió. */
export function getEventImage(slug) {
  if (!slug) return null;
  return eventImages[slug] ?? null;
}

/**
 * URL del arte de la mascota. Si no se pasa `slug` toma `yuquita` y, si no
 * existe, cualquier imagen que haya en `src/assets/mascot/`.
 */
export function getMascotImage(slug = 'yuquita') {
  return mascotImages[slug] ?? Object.values(mascotImages)[0] ?? null;
}
