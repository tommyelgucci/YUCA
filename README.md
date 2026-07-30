# Proyecto Yuca — Landing

Landing page de **Proyecto Yuca** (proyecto_yuca.bo), comunidad y productora de
eventos artísticos en Bolivia, casa del **YukaWaii Fest**.

Stack: **Vite + React 18 + Tailwind CSS 3 + Framer Motion + Lucide Icons**.

## Arrancar

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # build de producción en dist/
npm run preview   # sirve el build ya generado
```

## Estructura

```
src/
├── App.jsx                  Composición de la página y estado del modal
├── index.css                Capas base/components de Tailwind y utilidades de marca
├── components/
│   ├── Header.jsx           Barra fija, navegación y accesos de cuenta
│   ├── MobileMenu.jsx       Panel lateral móvil (foco atrapado, Escape, click fuera)
│   ├── Hero.jsx             Portada con mascota
│   ├── FrutigerBanner.jsx   Banner Frutiger Aero / Y2K de la próxima edición
│   ├── Gallery.jsx          Grid de festivales pasados
│   ├── Categories.jsx       Categorías de arte navegables
│   ├── CommunityCTA.jsx     Bloque "Sé una YUQUITA más" (Discord)
│   ├── Footer.jsx           Enlaces, redes y créditos
│   ├── RegisterModal.jsx    Modal bienvenida / registro / inicio de sesión
│   ├── VineDivider.jsx      Motivo de vid entre secciones (firma visual)
│   ├── Mascot.jsx           Mascota: arte real o SVG placeholder
│   ├── ImageFrame.jsx       Contenedor de imagen con marcador de posición
│   ├── SocialLinks.jsx      Iconos de redes
│   └── Section.jsx          Ritmo vertical y cabeceras de sección
├── data/site.js             👈 TODO el contenido editable
├── assets/                  Imágenes (ver assets/README.md)
└── hooks/
    ├── useMotionPresets.js  Variantes de animación con prefers-reduced-motion
    ├── useFocusTrap.js      Foco atrapado + Escape + devolución del foco
    ├── useBodyScrollLock.js Bloqueo de scroll con capa modal abierta
    └── useScrollState.js    Header al hacer scroll + scroll-spy del menú
```

## Editar contenido

Textos, enlaces, ediciones del festival, categorías y redes viven en
[`src/data/site.js`](src/data/site.js). No hace falta tocar componentes.

## Sistema de diseño

Los colores de marca son **tokens reales de Tailwind** (definidos en
[`tailwind.config.js`](tailwind.config.js)), no variables CSS sueltas:

| Token             | Hex       | Uso                          |
| ----------------- | --------- | ---------------------------- |
| `yuca-green`      | `#6b8e23` | Primario (oliva)             |
| `yuca-green-deep` | `#4a5f26` | Titulares, footer            |
| `yuca-cream`      | `#f5e6ca` | Superficies suaves           |
| `yuca-mustard`    | `#e2b04c` | Acentos, vid                 |
| `yuca-coral`      | `#e05a47` | Llamadas a la acción         |
| `yuca-bg`         | `#faf8f5` | Fondo                        |
| `yuca-ink`        | `#3a3226` | Texto                        |
| `aero-*`          | —         | Sólo el banner Frutiger Aero |

Tipografías: **Baloo 2** (`font-display`) y **Nunito** (`font-body`), cargadas
desde Google Fonts en `index.html`.

Clases de apoyo en `src/index.css`: `.btn-primary`, `.btn-secondary`,
`.btn-outline`, `.btn-ghost` (+ `.btn-sm/md/lg`), `.card`, `.pill`, `.field`,
`.glass`, `.container-yuca`.

## Imágenes

Las fotos de eventos y el arte de la mascota se auto-descubren desde
`src/assets/`. Mientras no existan, se muestran marcadores de posición con el
color de cada edición. Instrucciones y nombres de archivo esperados en
[`src/assets/README.md`](src/assets/README.md).

## Accesibilidad

- Enlace "Saltar al contenido" y estructura de landmarks (`header`, `main`,
  `nav`, `footer`).
- Foco visible en todo elemento interactivo (`:focus-visible` global).
- Modal y menú móvil: `role="dialog"`, `aria-modal`, foco atrapado, cierre con
  Escape / click fuera, devolución del foco al disparador y bloqueo de scroll.
- Formulario con `aria-invalid`, `aria-describedby` y foco automático al primer
  campo con error.
- Todas las animaciones respetan `prefers-reduced-motion`, tanto en Framer
  Motion (`useMotionPresets`) como en CSS.
- Mobile-first, sin desbordamiento horizontal.

## Pendiente de contenido real

Marcado con `TODO` en `src/data/site.js`:

- Fecha y sede del próximo YukaWaii Fest, y de cada edición pasada.
- Enlace de invitación al Discord.
- URLs de Instagram, Facebook y TikTok.
- Correo o formulario de contacto.
- Fotos de eventos, arte de la mascota y `public/og-image.jpg`.
- `RegisterModal` valida en cliente y muestra confirmación; falta conectar
  `onSubmit` con el backend real.
