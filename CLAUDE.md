# CLAUDE.md

Guía para trabajar en este repo con Claude Code. El detalle de producto,
arquitectura y decisiones vive en [`README.md`](README.md) — este archivo es
sólo lo operativo que no cabe ahí.

## Comandos

```bash
npm install
npm run dev          # http://localhost:3000
npm run build
npm start
npm test             # edad + reservas + perfiles + credenciales (PGlite = Postgres real en WASM)
npm run lint

npm run db:generate   # SQL desde db/schema.ts
npm run db:migrate    # aplica migraciones (necesita DATABASE_URL)
npm run db:seed       # siembra con lib/data/
```

Arranca sin `.env.local`: sin `DATABASE_URL` usa los mocks de `lib/data/`, sin
claves de Clerk oculta cuentas y `/admin`. Copiar `.env.example` para
activarlos.

**Antes de dar por terminado cualquier cambio en `lib/reservas.ts`,
`lib/perfiles.ts`, `lib/edad.ts`, `db/schema.ts` o migraciones: correr
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
| Públicos (artistas/comidas/tiendas/…)   | `AUDIENCIAS` en `lib/types.ts` — un solo sitio |
| El mapa de stands                       | `lib/data/feria.ts` (datos), `components/evento/StandMap.tsx` (render), `hooks/useStandSelection.ts` (estado compartido) |
| Roles y permisos                        | `lib/auth.ts`, `middleware.ts` — y repetir el chequeo de staff en cada Server Action nueva |
| Contenido de la portada                 | `lib/site.js`                                     |
| Convocatorias / fases de inscripción     | `lib/data/convocatorias.ts`, función `ctaMesa()`  |
| Precios vigentes                        | `lib/data/preventas.ts`                           |
| Esquema de datos                        | `db/schema.ts` → `db:generate` → revisar el SQL antes de aplicar |

## Estado del proyecto

Ver [`CHECKPOINT.md`](CHECKPOINT.md) para qué está hecho, qué falta y el
rumbo inmediato — actualizarlo al cerrar cada bloque de trabajo relevante.
