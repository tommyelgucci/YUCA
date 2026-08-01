'use client';

import { motion } from 'framer-motion';
import { ArrowUpRight, BookOpen, Layers, PenTool, Pin, Tablet } from 'lucide-react';
import { categories } from '@/lib/site';
import { useMotionPresets } from '@/hooks/useMotionPresets';
import Section, { SectionHeading } from '@/components/ui/Section';

/** Nombre del icono en `src/data/site.js` -> componente de lucide-react. */
const ICONS = { PenTool, BookOpen, Pin, Layers, Tablet };

export default function Categories() {
  const { fadeUp, stagger, hoverPop, viewport } = useMotionPresets();

  return (
    <Section id="categorias" aria-labelledby="titulo-categorias">
      <SectionHeading
        id="titulo-categorias"
        eyebrow="Explora"
        title="Categorías de arte"
        description="Cinco disciplinas que conviven en cada feria. Elige la tuya para descubrir a quiénes las representan."
      />

      <motion.ul
        className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5"
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={viewport}
      >
        {categories.map((category) => {
          const Icon = ICONS[category.icon] ?? PenTool;

          return (
            <motion.li key={category.id} variants={fadeUp}>
              <motion.a
                href={category.href}
                whileHover={hoverPop}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                className="card group flex h-full flex-col items-start gap-3 p-5 transition-colors duration-300 hover:border-yuca-green/30 hover:bg-yuca-cream/25"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-yuca-cream transition-colors duration-300 group-hover:bg-white">
                  <Icon size={22} className="text-yuca-coral" aria-hidden="true" />
                </span>

                <span className="font-display text-lg leading-tight text-yuca-green-deep">
                  {category.name}
                </span>

                <span className="text-sm leading-snug text-yuca-ink-soft">
                  {category.description}
                </span>

                <ArrowUpRight
                  size={18}
                  aria-hidden="true"
                  className="mt-auto pt-1 text-yuca-green opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100"
                />
              </motion.a>
            </motion.li>
          );
        })}
      </motion.ul>
    </Section>
  );
}
