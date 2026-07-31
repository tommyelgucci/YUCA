import type { Exhibitor } from '@/lib/types';

/**
 * Expositores de la edición vigente.
 *
 * ⚠️ Nombres, bios y redes son de demostración para poder desarrollar la vista.
 * En producción cada artista crea y edita su propio perfil al registrarse; el
 * staff sólo otorga la insignia de verificado y confirma el pago del stand.
 */
export const expositores: Exhibitor[] = [
  {
    id: 'lunaria',
    slug: 'estudio-lunaria',
    displayName: 'Estudio Lunaria',
    categories: ['Ilustración Digital'],
    verified: true,
    avatar: null,
    bio: 'Retratos y fanart con paleta nocturna. Prints, stickers holográficos y comisiones en vivo.',
    socials: { instagram: '#', tiktok: '#' },
    standId: 'A3',
  },
  {
    id: 'papaya',
    slug: 'papaya-comics',
    displayName: 'Papaya Cómics',
    categories: ['Cómics', 'Webcomics'],
    verified: true,
    avatar: null,
    bio: 'Historieta boliviana de humor cotidiano. Tomo 3 recién salido de imprenta.',
    socials: { instagram: '#', web: '#' },
    standId: 'A4',
  },
  {
    id: 'cactus',
    slug: 'cactus-morado',
    displayName: 'Cactus Morado',
    categories: ['Pines', 'Stickers'],
    verified: false,
    avatar: null,
    bio: 'Pines esmaltados de flora y fauna boliviana. Series limitadas de 50 piezas.',
    socials: { instagram: '#' },
    standId: 'B1',
  },
  {
    id: 'mishi',
    slug: 'mishi-draws',
    displayName: 'Mishi Draws',
    categories: ['Ilustración Digital', 'Stickers'],
    verified: true,
    avatar: null,
    bio: 'Gatos, plantas y personajes redonditos. Comisiones abiertas todo el festival.',
    socials: { instagram: '#', tiktok: '#', facebook: '#' },
    standId: 'B2',
  },
  {
    id: 'tinta-verde',
    slug: 'tinta-verde',
    displayName: 'Tinta Verde',
    categories: ['Ilustración Tradicional'],
    verified: true,
    avatar: null,
    bio: 'Acuarela botánica y paisajes del valle. Originales enmarcados y láminas A4.',
    socials: { instagram: '#' },
    standId: 'C1',
  },
  {
    id: 'colibri',
    slug: 'colibri-taller',
    displayName: 'Taller Colibrí',
    categories: ['Ilustración Tradicional', 'Pines'],
    verified: false,
    avatar: null,
    bio: 'Colectivo de tres ilustradoras cruceñas. Tinta, linograbado y mucho color.',
    socials: { instagram: '#', facebook: '#' },
    standId: 'C2',
  },
  {
    id: 'wawita',
    slug: 'wawita-studio',
    displayName: 'Wawita Studio',
    categories: ['Ilustración Digital', 'Webcomics'],
    verified: true,
    avatar: null,
    bio: 'Webcomic semanal sobre crecer en Bolivia. Más de 60 capítulos publicados.',
    socials: { instagram: '#', tiktok: '#', web: '#' },
    standId: 'C3',
  },
  {
    id: 'sirena',
    slug: 'sirena-del-pilcomayo',
    displayName: 'Sirena del Pilcomayo',
    categories: ['Ilustración Digital'],
    verified: false,
    avatar: null,
    bio: 'Mitología y leyendas locales reinterpretadas en clave fantasía.',
    socials: { instagram: '#' },
    standId: 'C7',
  },
  {
    id: 'chaco',
    slug: 'chaco-prints',
    displayName: 'Chaco Prints',
    categories: ['Stickers', 'Pines'],
    verified: false,
    avatar: null,
    bio: 'Stickers die-cut y packs temáticos. Tres por el precio de dos todo el día.',
    socials: { tiktok: '#' },
    standId: 'C8',
  },
  {
    id: 'nube',
    slug: 'nube-de-tinta',
    displayName: 'Nube de Tinta',
    categories: ['Cómics'],
    verified: true,
    avatar: null,
    bio: 'Novela gráfica autoconclusiva y fanzines cosidos a mano.',
    socials: { instagram: '#', web: '#' },
    standId: 'C13',
  },
  {
    id: 'pixel-yuca',
    slug: 'pixel-yuca',
    displayName: 'Pixel Yuca',
    categories: ['Ilustración Digital'],
    verified: false,
    avatar: null,
    bio: 'Pixel art y retratos estilo consola de 16 bits. Comisiones en vivo.',
    socials: { instagram: '#', tiktok: '#' },
    standId: 'C19',
  },
  {
    id: 'tornillo',
    slug: 'tornillo-suelto',
    displayName: 'Tornillo Suelto',
    categories: ['Cómics', 'Stickers'],
    verified: true,
    avatar: null,
    bio: 'Humor absurdo en viñetas. Fanzines, stickers y mucho contenido de gato.',
    socials: { instagram: '#', facebook: '#' },
    standId: 'C20',
  },
  {
    id: 'nogal',
    slug: 'nogal-ilustra',
    displayName: 'Nogal Ilustra',
    categories: ['Ilustración Tradicional'],
    verified: false,
    avatar: null,
    bio: 'Grafito y tinta china. Retratos por encargo durante todo el evento.',
    socials: { instagram: '#' },
    standId: 'D1',
  },
  {
    id: 'raiz',
    slug: 'raiz-collective',
    displayName: 'Raíz Collective',
    categories: ['Webcomics', 'Ilustración Digital'],
    verified: true,
    avatar: null,
    bio: 'Antología digital de autores emergentes. Lecturas y firmas en el teatro.',
    socials: { instagram: '#', web: '#', tiktok: '#' },
    standId: 'E1',
  },
];

export const expositoresPorId = new Map(expositores.map((e) => [e.id, e]));

export function getExpositor(id: string | null | undefined): Exhibitor | undefined {
  return id ? expositoresPorId.get(id) : undefined;
}

/** Expositor que ocupa un stand concreto (para la tarjeta del mapa). */
export function getExpositorPorStand(standId: string | null | undefined): Exhibitor | undefined {
  if (!standId) return undefined;
  return expositores.find((e) => e.standId === standId);
}
