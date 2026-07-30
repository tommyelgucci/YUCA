import { motion } from 'framer-motion';
import { CalendarDays, MapPin } from 'lucide-react';
import { getEventImage } from '../assets';
import { brand, pastEditions } from '../data/site';
import { useMotionPresets } from '../hooks/useMotionPresets';
import ImageFrame from './ImageFrame';
import Section, { SectionHeading } from './Section';

/** Grid de ediciones pasadas del festival. */
export default function Gallery() {
  const { fadeUp, stagger, hoverLift, viewport } = useMotionPresets();

  return (
    <Section id="ediciones" aria-labelledby="titulo-ediciones">
      <SectionHeading
        id="titulo-ediciones"
        eyebrow="Nuestra historia"
        title="Festivales pasados"
        description={`Un vistazo a las ediciones anteriores del ${brand.festival} y a los encuentros que armamos junto a la comunidad.`}
      />

      <motion.ul
        className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4"
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={viewport}
      >
        {pastEditions.map((edition) => (
          <motion.li key={edition.slug} variants={fadeUp}>
            <motion.article
              whileHover={hoverLift}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="group h-full overflow-hidden rounded-3xl bg-white shadow-soft ring-1 ring-yuca-green/10 transition-shadow duration-300 hover:shadow-card"
            >
              <ImageFrame
                src={getEventImage(edition.slug)}
                alt={edition.alt}
                ratio="3/4"
                tone={edition.tone}
                imgClassName="transition-transform duration-500 ease-yuca motion-safe:group-hover:scale-105"
              >
                {/* Degradado para que el título se lea sobre cualquier foto */}
                <div
                  className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-yuca-ink/80 via-yuca-ink/25 to-transparent"
                  aria-hidden="true"
                />
                <h3 className="absolute inset-x-4 bottom-4 font-display text-base leading-tight text-white drop-shadow-sm sm:text-lg">
                  {edition.name}
                </h3>
              </ImageFrame>

              <div className="flex flex-col gap-1.5 p-4 text-xs font-semibold text-yuca-ink-soft">
                <span className="flex items-center gap-2">
                  <CalendarDays size={14} className="shrink-0 text-yuca-green" aria-hidden="true" />
                  {edition.date}
                </span>
                <span className="flex items-center gap-2">
                  <MapPin size={14} className="shrink-0 text-yuca-green" aria-hidden="true" />
                  {edition.venue}
                </span>
              </div>
            </motion.article>
          </motion.li>
        ))}
      </motion.ul>
    </Section>
  );
}
