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
npm test        # pruebas de reservas contra Postgres real (PGlite)
```

Arranca sin configurar nada: sin `DATABASE_URL` usa los datos de `lib/data/` y
sin claves de Clerk oculta las cuentas y el panel. Para activarlos, copia
`.env.example` a `.env.local`.

## Rutas

| Ruta                | Qué es                                                       |
| ------------------- | ------------------------------------------------------------ |
| `/`                 | Portada: comunidad, agenda, ediciones pasadas, categorías, Discord |
| `/evento`           | Vista del festival con pestañas Info · Participantes · Actividades |
| `/artistas/[slug]`  | Perfil público del expositor                                  |
| `/admin`            | Cola de pagos por revisar (sólo rol `staff`)                  |
| `/admin/exportar`   | Credenciales a Excel/CSV para Illustrator                     |
| `/iniciar-sesion`, `/crear-cuenta` | Clerk                                         |
| `/api/cron/expirar-reservas` | Libera mesas con la reserva vencida                  |

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

db/
├── schema.ts               Esquema Postgres (Drizzle)
├── index.ts                Conexión; devuelve null si no hay DATABASE_URL
├── seed.ts                 Siembra la base con los datos de lib/data/
├── migrations/             SQL generado por drizzle-kit
└── reservas.test.ts        Pruebas contra Postgres real (PGlite)

lib/
├── types.ts                👈 modelo de dominio (contrato UI ↔ datos)
├── reservas.ts             Reservar, confirmar, cancelar, expirar
├── auth.ts                 Roles de Clerk (authEnabled, esStaff)
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
- **Dos dimensiones por mesa, no una**: el *estado* dice si se puede pedir
  (`disponible`, `reservado`, `ocupado`) y el *tipo* dice para qué es
  (`arte`, `comida`, `emprendimiento`, `organizacion`). En el mapa el relleno
  es el estado y el borde el tipo, así una mesa de comida libre no se confunde
  con una de arte libre.
  `reservado` es imprescindible con pago manual — entre elegir la mesa y
  confirmar la transferencia pasan días, y en esa ventana la mesa no puede
  figurar ni libre ni ocupada, o dos personas pagan por la misma.
- **Comidas y emprendimientos no son `externo`**: pagan y ocupan mesa igual que
  un artista. `organizacion` sí es espacio del equipo (acreditación, merch) y
  nunca se pone a la venta.
- **Nada depende sólo del color**: el estado reservado lleva trama, la leyenda
  separa estado y zona, y el `aria-label` de cada stand lo dice en palabras.
- **Móvil primero**: la lista es la vía principal y el plano se explora con zoom
  y scroll dentro de su tarjeta, sin desbordar la página.

## Base de datos y reservas

Postgres con Drizzle. `db/schema.ts` produce las formas de `lib/types.ts`.

```bash
npm run db:generate   # SQL a partir del esquema
npm run db:migrate    # aplica migraciones (necesita DATABASE_URL)
npm run db:seed       # siembra con los datos de lib/data/
```

**La regla "una mesa, una reserva viva" la impone la base, no el código.** Un
índice único parcial sobre `reservations(stand_id) WHERE status IN
('pendiente','confirmada')` hace imposible la doble reserva: comprobarlo
leyendo antes de escribir dejaría una carrera entre la lectura y la inserción,
y con pago manual y días de espera esa carrera se pierde tarde o temprano.
`lib/reservas.ts` sólo traduce el error de unicidad a un mensaje.

Hay otro índice igual por expositor: nadie aparta dos mesas a la vez.

### Pruebas

`npm test` corre contra **PGlite** —Postgres compilado a WASM, en memoria, sin
servidor— así que se ejercita el mismo dialecto y las mismas restricciones que
en Supabase. Cubre: reserva feliz, doble reserva, carrera simultánea, doble
mesa por expositor, confirmación, expiración, cancelación, mesas de la
organización, y que la base rechaza la doble reserva **aunque el estado del
stand se desincronice**.

### Ciclo de vida de una mesa

`disponible` → (alguien la aparta) `reservado` / reserva `pendiente` →
(el staff valida la transferencia) `ocupado` / reserva `confirmada`.
Si vence el plazo (48 h por defecto, `reservationTtlMinutes`) el cron la
devuelve a `disponible`.

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

**Hecho (Fase 2, primera mitad)** — esquema de base con Drizzle, lógica de
reservas probada, Clerk con roles, panel de admin con la cola de pagos, y cron
de expiración.

**Falta (Fase 2, segunda mitad)** — registro de expositor que cree su perfil al
entrar con Clerk, pantalla "mi cuenta" para elegir mesa y declarar la
transferencia, subida de la captura del comprobante (necesita almacenamiento) y
la pantalla de verificación de perfiles.

**Fase 3** — inscripción a actividades con control de cupos y la Cacería de
Sellos con QR (necesita tolerar mala señal dentro del salón).

## Agenda

Los eventos próximos viven en [`lib/data/eventos.ts`](lib/data/eventos.ts):

| Evento          | Fecha                            | Feria con mapa |
| --------------- | -------------------------------- | -------------- |
| Druida          | 19 de septiembre de 2026          | sí, plano pendiente de sede |
| YukaWaii Fest 4 | Noviembre 2026, día por confirmar | sí             |

## Exportación de credenciales

`/admin/exportar` genera el listado para imprimir los gafetes con datos
variables de Illustrator. Descarga en **.xlsx** (para revisar) y **.csv** (el
que leen los scripts de datos variables y el combinado de InDesign).

Tres decisiones que lo hacen servible:

- **Una fila por persona, no por mesa.** Quien comparte mesa también lleva
  credencial, así que titular y acompañantes salen en filas propias. Exportar
  por reserva dejaría a la mitad de la gente sin gafete.
- **Cabeceras sin espacios ni tildes** (`nombre_artistico`, `mesa_codigo`…),
  porque cada una se convierte en el nombre de una variable en Illustrator.
- **Columna `foto_archivo`** con el nombre que debe tener cada imagen
  (`I20-1.png`): dejas las fotos en una carpeta con esos nombres y la variable
  de imagen las enlaza sola. `qr_texto` lleva el enlace al perfil público, para
  imprimir un QR en cada gafete.

El CSV sale con BOM UTF-8: sin él, Excel en Windows abre el archivo en ANSI y
destroza cada tilde y cada ñ — justo lo que más abunda en estos nombres.

Sin `DATABASE_URL` funciona igual con los datos de `lib/data/`, así se puede
ajustar la plantilla de Illustrator antes de tener la base montada.

## Convocatorias

Van por fases y hay **tres públicos**: artistas, comidas y emprendimientos.
Viven en [`lib/data/convocatorias.ts`](lib/data/convocatorias.ts).

**Estado actual: Fase 3 cerrada, Fase 4 por abrir.** Mientras dura ese hueco la
web no enlaza los formularios de la fase cerrada —mandar a alguien a un Google
Form que ya no acepta respuestas es peor que no ofrecer nada— y los botones de
mesa llevan al Discord, que es donde se anuncia la siguiente.

Ese destino lo decide `ctaMesa()` en un solo sitio, para que no queden botones
sueltos apuntando a formularios muertos.

**Para abrir la Fase 4**: en cada convocatoria pon `phaseLabel: 'Fase 4'`,
`estado: 'abierta'` y el `formUrl` nuevo. La web se reconfigura sola.

## Cuentas y roles

Clerk lleva la identidad; el rol vive en `publicMetadata.role` de cada usuario
(`asistente`, `expositor` o `staff`) y se asigna desde el panel de Clerk. El rol
sólo se lee en el servidor: el middleware exige sesión en `/admin` y `/mi-cuenta`,
y además **cada Server Action vuelve a comprobar que quien la llama es staff**,
porque una Server Action es un endpoint público al que se puede llamar directo.

## Pendiente de datos reales

Marcado con `TODO` en el código:

- Día exacto del YukaWaii Fest 4 (sólo está confirmado el mes).
- Sede, dirección y ciudad de ambos eventos.
- **El plano entero es provisional**: no hay sede confirmada, así que sectores y
  coordenadas de `lib/data/feria.ts` son una maqueta. Se sustituyen por los
  reales cuando se cierre el local; el resto de la web no se toca.
- Druida también lleva feria: cuando tenga sede, la vista de evento debe pasar a
  `/evento/[slug]` para servir los dos planos.
- Precio real de las mesas por sector y precio de entrada (hoy figura libre).
- `NEXT_PUBLIC_SITE_URL` con el dominio real (miniaturas de Open Graph).
- Fotos de eventos, arte de Yuquita y `public/og-image.jpg`.
- Los expositores y el plano de `lib/data/` son de demostración.
- Qué convocatorias siguen abiertas y hasta cuándo (las tres figuran abiertas).
- Qué significa "Fase 3" y si habrá fases siguientes.
- Si comidas y emprendimientos ocupan mesas del mismo plano y a qué precio.

Ya cargados: Instagram, TikTok, Facebook, Discord, WhatsApp y correo de
contacto (en [`lib/site.js`](lib/site.js)).
