/**
 * Contenido de la landing en un solo lugar.
 *
 * Todo lo editable (textos, enlaces, ediciones del festival, redes) vive aquí
 * para que actualizar la web no obligue a tocar componentes.
 *
 * ⚠️ Los valores marcados con TODO son marcadores de posición: no hay datos
 * reales confirmados todavía (fechas, sedes, URLs de redes). Reemplázalos antes
 * de publicar — la interfaz ya está preparada para mostrarlos.
 */

export const brand = {
  name: 'Proyecto Yuca',
  domain: 'proyecto_yuca.bo',
  tagline: 'Un mundo donde los artistas conviven',
  description:
    'Espacio para difundir, compartir y apoyar a ilustradores, comiqueros y creadores de Bolivia.',
  festival: 'YukaWaii Fest',
};

/** Enlaces del header, del menú móvil y del footer. */
export const navLinks = [
  { label: 'Inicio', href: '#inicio' },
  { label: 'Próximo evento', href: '#festival' },
  { label: 'Ediciones', href: '#ediciones' },
  { label: 'Categorías', href: '#categorias' },
  { label: 'Comunidad', href: '#comunidad' },
];

/** IDs observados para marcar el enlace activo del menú (scroll-spy). */
export const sectionIds = navLinks.map((link) => link.href.replace('#', ''));

/**
 * Categorías de arte navegables.
 * `icon` referencia un icono de lucide-react resuelto en Categories.jsx.
 */
export const categories = [
  {
    id: 'ilustracion',
    name: 'Ilustración',
    icon: 'PenTool',
    description: 'Arte original, prints y comisiones.',
    // TODO: apuntar al listado/filtro real cuando exista el catálogo
    href: '#categorias',
  },
  {
    id: 'comics',
    name: 'Cómics',
    icon: 'BookOpen',
    description: 'Historietas y novela gráfica boliviana.',
    href: '#categorias',
  },
  {
    id: 'pines',
    name: 'Pines',
    icon: 'Pin',
    description: 'Pines esmaltados y de acrílico.',
    href: '#categorias',
  },
  {
    id: 'stickers',
    name: 'Stickers',
    icon: 'Layers',
    description: 'Packs, holográficos y die-cut.',
    href: '#categorias',
  },
  {
    id: 'webcomics',
    name: 'Webcomics',
    icon: 'Tablet',
    description: 'Series digitales y publicación online.',
    href: '#categorias',
  },
];

/**
 * Ediciones pasadas del festival.
 *
 * - `slug`  → nombre del archivo en `src/assets/events/` (ver assets/README.md).
 * - `tone`  → color de marca usado mientras no haya foto.
 * - `date` / `venue` → TODO: completar con los datos reales de cada edición.
 */
export const pastEditions = [
  {
    slug: 'yukawaii-fest-1',
    name: 'YukaWaii Fest 1',
    tone: 'green',
    date: 'Fecha por confirmar', // TODO
    venue: 'Sede por confirmar', // TODO
    alt: 'Foto de la primera edición del YukaWaii Fest',
  },
  {
    slug: 'yukawaii-fest-2',
    name: 'YukaWaii Fest 2',
    tone: 'coral',
    date: 'Fecha por confirmar', // TODO
    venue: 'Sede por confirmar', // TODO
    alt: 'Foto de la segunda edición del YukaWaii Fest',
  },
  {
    slug: 'yukawaii-fest-3',
    name: 'YukaWaii Fest 3',
    tone: 'mustard',
    date: 'Fecha por confirmar', // TODO
    venue: 'Sede por confirmar', // TODO
    alt: 'Foto de la tercera edición del YukaWaii Fest',
  },
  {
    slug: 'san-valentin',
    name: 'San Valentín',
    tone: 'rose',
    date: 'Fecha por confirmar', // TODO
    venue: 'Sede por confirmar', // TODO
    alt: 'Foto de la edición especial de San Valentín',
  },
];

/** Banner Frutiger Aero / Y2K de la próxima edición. */
export const nextEdition = {
  badge: 'Edición especial',
  title: 'YukaWaii Fest — próxima edición',
  // TODO: reemplazar por la fecha y sede reales en cuanto se confirmen
  date: 'Fecha por anunciar',
  venue: 'Sede por anunciar',
  entry: 'Entrada libre',
  description:
    'Arte, ilustración, pasarela cosplay, trivias y sorpresas. Detalles de fecha y ubicación pronto en nuestras redes.',
  highlights: ['Feria de artistas', 'Pasarela cosplay', 'Trivias y premios'],
  cta: { label: 'Quiero que me avisen', href: '#comunidad' },
};

/** Bloque "Sé una YUQUITA más". */
export const community = {
  title: 'Sé una YUQUITA más',
  description:
    'Únete a nuestro Discord, comparte tu arte y entérate primero de cada convocatoria y festival.',
  cta: { label: 'Unirme al Discord', href: '#' }, // TODO: invitación real de Discord
};

/**
 * Redes sociales. `href: '#'` = pendiente de URL real.
 * TODO: completar con los perfiles oficiales.
 */
export const socials = [
  { id: 'instagram', label: 'Instagram', icon: 'Instagram', href: '#' },
  { id: 'facebook', label: 'Facebook', icon: 'Facebook', href: '#' },
  { id: 'tiktok', label: 'TikTok', icon: 'Music2', href: '#' },
  { id: 'discord', label: 'Discord', icon: 'MessageCircle', href: '#' },
];

/** Columna de enlaces "Participa" del footer. */
export const participateLinks = [
  { label: 'Ser expositor', href: '#comunidad' },
  { label: 'Ser voluntario', href: '#comunidad' },
  { label: 'Auspiciar el festival', href: '#comunidad' },
  { label: 'Contacto', href: '#comunidad' }, // TODO: correo o formulario real
];

/** Opciones del selector "¿Qué haces?" del formulario de registro. */
export const artistDisciplines = [
  'Ilustración',
  'Cómics',
  'Pines',
  'Stickers',
  'Webcomics',
  'Otro',
];
