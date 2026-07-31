# Proyecto Yuca

Web y plataforma de **Proyecto Yuca** (proyecto_yuca.bo), comunidad y productora
de eventos artísticos en Bolivia, casa del **YukaWaii Fest**.

Stack: **Next.js 15 (App Router) + TypeScript + Tailwind CSS + Framer Motion +
Radix UI + Lucide Icons**.

## Arrancar

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # build de producción
npm start       # sirve el build
```

## Rutas

| Ruta                | Qué es                                                       |
| ------------------- | ------------------------------------------------------------ |
| `/`                 | Portada: comunidad, agenda, ediciones pasadas, categorías, Discord |
| `/evento`           | Vista del festival con pestañas Info · Participantes · Actividades |
| `/artistas/[slug]`  | Perfil público del expositor                                  |

Enlaces profundos que funcionan y son compartibles:

- `/evento?tab=actividades`
- `/evento?stand=C20` — abre la pestaña del mapa con esa mesa resaltada

## Estructura

```
app/
├── layout.tsx              Shell, metadata y tipografías
├── page.tsx                Portada
├── evento/page.tsx         Vista del evento
└── artistas/[slug]/page.tsx Perfil de artista

components/
├── layout/                 Header, MobileMenu, Footer, Mascot, SiteChrome
├── landing/                Hero, Gallery, Categories, FrutigerBanner, CommunityCTA, RegisterModal
├── evento/                 EventHero, EventTabs, InfoPanel, ParticipantesPanel,
│                           StandMap, StandLegend, StandDetail, ActividadesPanel
└── ui/                     Section, VineDivider, ImageFrame, Badges

lib/
├── types.ts                👈 modelo de dominio (contrato UI ↔ datos)
├── site.js                 Contenido de la portada
├── data/                   Mocks: edición, feria, expositores, actividades
└── utils.ts                cn(), formato de bolivianos

hooks/
├── useMotionPresets.ts     Animaciones con prefers-reduced-motion
├── useStandSelection.ts    Stand seleccionado, sincronizado con la URL
├── useFocusTrap.js         Foco atrapado en capas modales
├── useBodyScrollLock.js    Bloqueo de scroll de fondo
├── useScrollState.js       Header al hacer scroll + scroll-spy
└── useNavLinks.js          Enlaces del menú según la ruta
```

## El mapa de stands

Es la pieza central, y estas son las decisiones que la sostienen:

- **SVG generado desde datos**, no dibujado a mano. Cambiar la distribución de
  una edición es editar `lib/data/feria.ts` (mañana, filas de la base de datos).
  Cada stand es un `<g id="stand-C20">`.
- **Interacción bidireccional** por un único estado compartido
  (`useStandSelection`): clic en el mapa resalta la tarjeta en la lista, clic en
  la tarjeta centra el mapa.
- **El id vive en la URL** (`?stand=C20`) para que un artista pueda publicar
  "estoy en la C20" con un enlace que abre el mapa ya centrado en su mesa.
- **Cuatro estados, no tres**: `disponible`, `reservado`, `ocupado`, `externo`.
  `reservado` es imprescindible con pago manual — entre elegir la mesa y
  confirmar la transferencia pasan días, y en esa ventana la mesa no puede
  figurar ni libre ni ocupada, o dos personas pagan por la misma.
- **El estado nunca depende sólo del color**: cada uno tiene su propia trama
  (rayas, puntos) y el `aria-label` de cada stand lo dice en palabras.
- **Móvil primero**: la lista es la vía principal y el plano se explora con zoom
  y scroll dentro de su tarjeta, sin desbordar la página.

## Modelo de datos

`lib/types.ts` es el contrato. Hoy lo alimentan los mocks de `lib/data/`;
cuando entre la base de datos, el esquema de Drizzle debe producir exactamente
esas formas y los componentes no se tocan.

Entidades: `Exhibitor`, `Sector`, `Stand`, `Reservation`, `Edition`, `Activity`.

El flujo de la mesa es: el artista crea cuenta → elige stand → transfiere por QR
→ sube comprobante → el staff confirma → el stand pasa a `ocupado` y su perfil
aparece en la lista de participantes. Si vence el plazo sin confirmar, la
reserva pasa a `expirada` y la mesa se libera.

**Pago: sólo transferencia por QR.**

## Sistema de diseño

Los colores de marca son tokens reales de Tailwind (`tailwind.config.mjs`):

| Token             | Hex       | Uso                          |
| ----------------- | --------- | ---------------------------- |
| `yuca-green`      | `#6b8e23` | Primario (oliva)             |
| `yuca-green-deep` | `#4a5f26` | Titulares, footer            |
| `yuca-cream`      | `#f5e6ca` | Superficies suaves           |
| `yuca-mustard`    | `#e2b04c` | Acentos, vid, reservado      |
| `yuca-coral`      | `#e05a47` | Llamadas a la acción         |
| `yuca-bg`         | `#faf8f5` | Fondo                        |
| `yuca-ink`        | `#3a3226` | Texto                        |
| `aero-*`          | —         | Sólo el banner Frutiger Aero |

Tipografías: **Baloo 2** (`font-display`) y **Nunito** (`font-body`).
Clases de apoyo en `app/globals.css`: `.btn-primary`, `.btn-secondary`,
`.btn-outline`, `.btn-ghost` (+ `.btn-sm/md/lg`), `.card`, `.pill`, `.field`,
`.glass`, `.container-yuca`.

## Accesibilidad

- Enlace "Saltar al contenido" y landmarks (`header`, `main`, `nav`, `footer`).
- Foco visible global (`:focus-visible`); los stands del mapa son enfocables y
  se activan con Enter o Espacio.
- Modal y menú móvil con foco atrapado, cierre con Escape o clic fuera y
  devolución del foco al disparador.
- Pestañas sobre Radix: roles ARIA y navegación con flechas de fábrica.
- Animaciones sujetas a `prefers-reduced-motion`.
- Sin desbordamiento horizontal en 390 px (verificado en todas las rutas).

## Imágenes

Se sirven desde `public/` y se referencian por ruta en los datos; mientras el
archivo no exista, el valor es `null` y se pinta un marcador de posición. Ver
[`public/README-imagenes.md`](public/README-imagenes.md).

## Estado y siguientes pasos

**Hecho (Fase 1)** — portada, vista de evento con las tres pestañas, mapa
interactivo, perfiles públicos de artista, actividades con cupos. Todo sobre
datos mock, sin escrituras.

**Falta (Fase 2)** — autenticación (Clerk), base de datos (Supabase + Drizzle),
registro de expositor, flujo de reserva con subida de comprobante, y **panel de
admin** para confirmar pagos, asignar stands y otorgar la insignia de
verificado.

**Fase 3** — inscripción a actividades con control de cupos y la Cacería de
Sellos con QR (necesita tolerar mala señal dentro del salón).

## Agenda

Los eventos próximos viven en [`lib/data/eventos.ts`](lib/data/eventos.ts):

| Evento          | Fecha                            | Feria con mapa |
| --------------- | -------------------------------- | -------------- |
| Druida          | 19 de septiembre de 2026          | por confirmar  |
| YukaWaii Fest 4 | Noviembre 2026, día por confirmar | sí             |

## Convocatorias

Hoy la postulación se hace con los formularios de Google que ya están
publicados en el Linktree, y la web enlaza a ellos: los CTA de mesa
("Quiero una mesa", "Quiero esta mesa") apuntan al formulario de artistas.
Viven en [`lib/data/convocatorias.ts`](lib/data/convocatorias.ts).

Hay **tres públicos distintos**, no sólo artistas: artistas, comidas y
emprendimientos. Comidas y emprendimientos también pagan y ocupan mesa, así que
no deben modelarse como `externo` (ese estado es sólo para espacios de la
organización).

Cuando entre la Fase 2, estos enlaces se sustituyen por el flujo interno de
cuenta + elección de mesa + pago.

## Pendiente de datos reales

Marcado con `TODO` en el código:

- **Año de Druida**: se asumió 2026 por ser el próximo 19 de septiembre. Confirmar.
- Día exacto del YukaWaii Fest 4 (sólo está confirmado el mes).
- Sede, dirección y ciudad de ambos eventos.
- Si Druida tendrá feria de artistas con mapa de stands.
- Precio real de las mesas por sector y precio de entrada (hoy figura libre).
- `NEXT_PUBLIC_SITE_URL` con el dominio real (miniaturas de Open Graph).
- Fotos de eventos, arte de Yuquita y `public/og-image.jpg`.
- Los expositores y el plano de `lib/data/` son de demostración.
- Qué convocatorias siguen abiertas y hasta cuándo (las tres figuran abiertas).
- Qué significa "Fase 3" y si habrá fases siguientes.
- Si comidas y emprendimientos ocupan mesas del mismo plano y a qué precio.

Ya cargados: Instagram, TikTok, Facebook, Discord, WhatsApp y correo de
contacto (en [`lib/site.js`](lib/site.js)).
