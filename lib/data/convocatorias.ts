import type { Convocatoria } from '@/lib/types';
import { community, socials } from '@/lib/site';

/**
 * Convocatorias por fases.
 *
 * La Fase 3 ya cerró y la Fase 4 todavía no abre. Mientras dure ese hueco, la
 * web no debe enlazar los formularios de la fase cerrada: mandar a alguien a un
 * Google Form que ya no acepta respuestas es peor que no ofrecer nada. En su
 * lugar se le ofrece enterarse por el Discord.
 *
 * Para abrir la Fase 4: cambia `phaseLabel` a 'Fase 4', pon `estado: 'abierta'`
 * y sustituye `formUrl` por los formularios nuevos.
 */
export const convocatorias: Convocatoria[] = [
  {
    id: 'artistas',
    audience: 'artistas',
    title: 'Convocatoria de artistas',
    description:
      'Para ilustración, cómics, pines, stickers y webcomics. Postula con tu portafolio y te asignamos mesa en la feria.',
    formUrl:
      'https://docs.google.com/forms/d/e/1FAIpQLScRsufVA9XF5swA1E4vdjjJwQbfHvjoCj3kK6NIt688IOfT7w/viewform',
    phaseLabel: 'Fase 3',
    shortLabel: 'Ser expositor',
    estado: 'cerrada',
  },
  {
    id: 'comidas',
    audience: 'comidas',
    title: 'Convocatoria de comidas',
    description:
      'Para food trucks, repostería y puestos de comida que quieran un espacio dentro del evento.',
    formUrl:
      'https://docs.google.com/forms/d/e/1FAIpQLSd_0n2kDNjQ_AZUjNFNZz86zyre5lvsnQhmpeLyScfsdCGpYQ/viewform',
    phaseLabel: 'Fase 3',
    shortLabel: 'Vender comida',
    estado: 'cerrada',
  },
  {
    id: 'emprendimientos',
    audience: 'emprendimientos',
    title: 'Convocatoria de emprendimientos',
    description:
      'Para marcas y emprendimientos que quieran vender o mostrar su producto en la feria.',
    formUrl: 'https://forms.gle/5Tgg8g9o1Za4Am9j8',
    phaseLabel: 'Fase 3',
    shortLabel: 'Traer mi emprendimiento',
    estado: 'cerrada',
  },
];

/** La ronda que viene. TODO: fecha de apertura en cuanto se decida. */
export const proximaFase = {
  label: 'Fase 4',
  aviso: 'Las convocatorias de la Fase 4 abren pronto.',
};

export function getConvocatoria(id: Convocatoria['id']): Convocatoria | undefined {
  return convocatorias.find((c) => c.id === id);
}

export const convocatoriaArtistas = convocatorias[0];

/** `true` si hay al menos una convocatoria admitiendo postulaciones. */
export const hayConvocatoriaAbierta = convocatorias.some((c) => c.estado === 'abierta');

const discordUrl =
  community.cta.href !== '#'
    ? community.cta.href
    : (socials.find((red) => red.id === 'discord')?.href ?? '#');

/**
 * Destino de los botones de "quiero una mesa" repartidos por la web.
 *
 * Con la convocatoria abierta lleva al formulario; con la fase cerrada lleva al
 * Discord, que es donde se anuncia la siguiente. Un solo sitio decide esto para
 * que no queden botones apuntando a formularios muertos.
 */
export function ctaMesa(): { label: string; href: string; nota: string } {
  if (convocatoriaArtistas.estado === 'abierta') {
    return {
      label: 'Postular como artista',
      href: convocatoriaArtistas.formUrl,
      nota: `Convocatoria ${convocatoriaArtistas.phaseLabel} · pago por transferencia por QR`,
    };
  }

  return {
    label: `Avísame de la ${proximaFase.label}`,
    href: discordUrl,
    nota: `${convocatoriaArtistas.phaseLabel} cerrada. ${proximaFase.aviso}`,
  };
}
