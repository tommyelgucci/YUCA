# CLAUDE.md

Guía para trabajar en este repo con Claude Code. El detalle de producto,
arquitectura y decisiones vive en [`README.md`](README.md) — este archivo es
sólo lo operativo que no cabe ahí.

## Comandos

```bash
npm ci               # instalar dependencias (lo normal — ver abajo)
npm install          # sólo para añadir o subir una dependencia a propósito
npm run dev          # http://localhost:3000
npm run build
npm start
npm test             # edad + reservas + perfiles + tienda + feria + actividades + credenciales (PGlite = Postgres real en WASM)
npm run lint

npm run db:generate   # SQL desde db/schema.ts
npm run db:check      # diagnostica la conexión: qué variables hay y qué tablas existen
npm run db:migrate    # aplica migraciones (necesita DIRECT_URL)
npm run db:seed       # siembra con lib/data/
npm run db:limpiar-demo  # borra sólo los expositores sembrados (sin --si no toca nada)
```

Arranca sin `.env.local`: sin `DATABASE_URL` usa los mocks de `lib/data/`, sin
claves de Clerk oculta cuentas y `/admin`. Copiar `.env.example` para
activarlos.

### Instalar dependencias: `npm ci`, no `npm install`

`npm ci` instala exactamente lo que fija `package-lock.json`. `npm install`
puede subir versiones dentro del rango de `package.json` sin que nadie lo pida,
y por ahí es por donde entra una versión recién publicada que todavía no ha
mirado nadie.

No es cautela de manual. El 11 de mayo de 2026 se publicaron 84 versiones
maliciosas en 42 paquetes `@tanstack/*` —de los que este repo arrastra uno,
`@tanstack/query-core`, por dentro de `@clerk/shared`— y en horas se propagó a
más de 160 paquetes. Entraron por el pipeline de release legítimo del proyecto
y los tarballs llevaban **procedencia SLSA válida**, así que comprobar la firma
no habría avisado de nada. Lo que sí funcionó fue el lockfile: quien instalaba
con `npm ci` no se bajó ninguna.

Por eso `npm install` se reserva para cuando la intención es justamente añadir
o actualizar algo — y ahí toca **revisar el diff del lockfile** antes de
comitearlo, que es el único momento en que se ve qué versiones nuevas entraron.

**Antes de dar por terminado cualquier cambio en `lib/reservas.ts`,
`lib/perfiles.ts`, `lib/edad.ts`, `lib/tienda.ts`, `lib/actividades.ts`,
`lib/feria.ts`, `lib/export/`, `db/schema.ts` o migraciones: correr
`npm test`.** Cubre reserva feliz, doble reserva, carrera simultánea, doble
mesa por expositor, confirmación, expiración, cancelación, mesas de
organización, acompañantes, alta de perfil, choque de slug, verificación de
staff, los tres tramos de edad, el permiso del tutor, la constancia de las
reglas aceptadas y las condiciones del acompañante de mesa.

## Convenciones de este repo

- **Todo en español**: nombres de tipos, campos de dominio, mensajes de
  commit, comentarios. El código de infraestructura (Drizzle, Next, React)
  usa la API tal cual es en inglés.
- **Comentarios sólo para el "por qué"**, nunca para el "qué". Ejemplo real en
  `lib/reservas.ts`: se explica por qué la unicidad se impone con un índice y
  no leyendo-antes-de-escribir (evita una condición de carrera), no qué hace
  cada función línea a línea.
- **La base impone las reglas de negocio críticas**, el código sólo traduce
  el error. No añadir comprobaciones "por si acaso" en la capa de aplicación
  para reglas que ya garantiza un índice único parcial.
- **Mensajes de commit**: una línea de resumen en modo imperativo/descriptivo
  seguida, si hace falta, de secciones con viñetas explicando el porqué de
  cada bloque de cambios (ver `git log` para el tono exacto).
- Sin abstracciones anticipadas: si algo se repite dos o tres veces está bien,
  no crear un helper hasta que haga falta de verdad.

## Dónde mirar según la tarea

| Vas a tocar…                          | Mira primero                                    |
| -------------------------------------- | ------------------------------------------------ |
| Reglas de reserva/expiración            | `lib/reservas.ts`, `db/reservas.test.ts`          |
| Perfil de expositor y verificación      | `lib/perfiles.ts`, `db/perfiles.test.ts`, `app/mi-cuenta/`, `app/admin/` |
| Edad mínima y permiso del tutor         | `lib/edad.ts`, `lib/edad.test.ts` |
| Reglas que se aceptan al reservar       | `lib/data/reglamento.ts` — al cambiar el texto, **subir `version`** |
| Catálogo, productos y reseñas           | `lib/tienda.ts`, `db/tienda.test.ts` |
| Inscripción a actividades y cupos       | `lib/actividades.ts`, `db/actividades.test.ts` |
| Fotos e imágenes subidas                | `lib/almacenamiento.ts` — bucket `productos`, con `avatares/` dentro |
| Excel de credenciales para Illustrator  | `lib/export/`, `db/credenciales.test.ts` (contra base) y `lib/export/credenciales.test.ts` (mocks) |
| Públicos (artistas/comidas/tiendas/…)   | `AUDIENCIAS` en `lib/types.ts` — un solo sitio |
| El mapa de stands                       | `lib/feria.ts` (lee la base), `lib/data/feria.ts` (geometría), `components/evento/StandMap.tsx` (render), `hooks/useStandSelection.ts` (estado) — ⛔ **congelado**, ver abajo |
| Roles y permisos                        | `lib/auth.ts` — cada página protegida llama a `exigirSesionOEntrar()` y cada Server Action comprueba la sesión por su cuenta. `middleware.ts` ya no decide quién entra a dónde |
| Contenido de la portada                 | `lib/site.js`                                     |
| Convocatorias / fases de inscripción     | `lib/data/convocatorias.ts`, función `ctaMesa()`  |
| Precios vigentes                        | `lib/data/preventas.ts`                           |
| Qué cuesta mantener la plataforma       | [`COSTOS.md`](COSTOS.md) — de ahí sale el precio de la membresía |
| Esquema de datos                        | `db/schema.ts` → `db:generate` → revisar el SQL antes de aplicar |

## ⛔ Congelado hasta que se mida la sede nueva (2026-08-04)

La feria se muda a un hotel y crecen las mesas. **No tocar** hasta tener la
medición: el plano (`lib/data/feria.ts`), los precios por fase
(`lib/data/preventas.ts`), los cupos por fase y la restricción de zonas por tipo
de mesa. Construir sobre los números de hoy es trabajo que hay que rehacer.

Lo que sí se puede avanzar, y el detalle de todo lo anterior, está en
[`CHECKPOINT.md`](CHECKPOINT.md) y [`PLAN.md`](PLAN.md).

## Estado del proyecto

- [`CHECKPOINT.md`](CHECKPOINT.md) — qué está hecho y qué falta. Actualizarlo al
  cerrar cada bloque de trabajo relevante.
- [`PLAN.md`](PLAN.md) — en qué orden se hace lo que falta y por qué.
- [`COSTOS.md`](COSTOS.md) — qué cuesta sostener esto; de ahí sale el precio de
  la membresía.
