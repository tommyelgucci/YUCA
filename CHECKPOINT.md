# Checkpoint — Proyecto Yuca

Estado vivo del proyecto. Actualizar al cerrar cada bloque de trabajo, no sólo
al final de una fase.

## Última actualización

**2026-08-02** — construida la segunda mitad de la Fase 2 sobre `85b80f3`:
`/mi-cuenta` completo y `/admin` con cola de verificación de perfiles. Ver
detalle abajo. `npm test` en verde (18 pruebas: 14 de reservas + 4 de
perfiles).

## Hecho

**Fase 1** — portada, vista de evento (Info · Participantes · Actividades),
mapa interactivo de stands, perfiles públicos de artista, actividades con
cupos. Sobre datos mock, sin escrituras.

**Fase 2, primera mitad** — esquema Postgres con Drizzle, `lib/reservas.ts`
probado (14 pruebas contra PGlite), Clerk con roles (`asistente`/`expositor`/
`staff`), panel `/admin` con cola de pagos, cron de expiración de reservas.

**Fase 2, añadido después (PR #2, 1 ago 2026)**:
- Planos reales de Salón Lirio y Patio Orquídea (reemplazan el mock),
  respetando los colores del impreso oficial; selector de sala en el mapa.
- Cuarto tipo de mesa: Tiendas.
- Numeración por tipo con letra (I13, E7, C2, T1), visible sin letra en la
  mesa igual que en el impreso.
- Preventas: el precio lo pone la tanda vigente y se congela al reservar
  (tabla independiente de la mesa).
- Compañero de mesa: `stand_companions`, cupo por mesa, sólo el titular
  gestiona quién entra.

## Hecho (Fase 2, segunda mitad — 2026-08-02)

Los cuatro puntos que estaban en el rumbo inmediato ya están construidos:

1. **Registro de expositor** — `lib/perfiles.ts` (`crearPerfil`): perfil con
   nombre, público (artistas/comidas/emprendimientos), categorías de arte,
   bio y redes. Slug generado del nombre, con sufijo numérico si choca con
   otro. Un `clerkUserId` no puede tener dos perfiles (índice único).
2. **Pantalla "mi cuenta"** (`app/mi-cuenta/`) — según el estado de la
   persona muestra: formulario de alta, selector de mesas libres agrupadas
   por tipo con el precio de la preventa vigente, o el panel de la reserva
   activa (monto, plazo, comprobante, cancelar).
3. **Comprobante** — se declara la referencia y, opcionalmente, una imagen.
   Decisión: la imagen se guarda como `data:` URL en `reservations.proof_url`
   en vez de en un bucket externo, para no depender de credenciales de
   almacenamiento que nadie me había pasado. Límite 4 MB. Migrar a Supabase
   Storage más adelante sólo toca `declararComprobanteAction`.
4. **Verificación de perfiles** — segunda cola en `/admin`
   (`lib/perfiles.ts#perfilesPorVerificar` + `FilaPerfil.tsx`): el staff ve
   perfiles nuevos y los marca verificados con un botón.

De paso: acompañantes (`agregarCompanero`/`quitarCompanero`, ya existían en
`lib/reservas.ts` desde el PR #2) ahora tienen interfaz en "mi cuenta".

`db/perfiles.test.ts` (4 pruebas nuevas): alta genera slug, un `clerkUserId`
no puede repetirse, dos nombres iguales no chocan de slug, verificar saca el
perfil de la cola.

### Pendiente de conectar (importante, no soy yo quien lo puede decidir solo)

El mapa (`StandMap`), la lista de participantes y `/artistas/[slug]` **siguen
leyendo `lib/data/` (mocks)**, no la base. Un perfil o una reserva reales
creados desde `/mi-cuenta` no se van a ver todavía en la web pública ni el
botón "Ver perfil" del admin va a resolver: falta la migración que haga de la
base la fuente de verdad también en las páginas públicas. Tiene sentido
dejarla para cuando la Fase 4 abra con expositores reales que mostrar, pero
es una decisión de producto, no puramente técnica — conviene confirmarla
antes de tocar `StandMap.tsx` / `ParticipantesPanel.tsx`, que hoy están bien
probados visualmente contra los mocks.

### Otro hallazgo, sin tocar

El botón "Iniciar sesión" / "Crear cuenta" del `Header` abre `RegisterModal`
(un modal local que no llega a crear cuenta real) en vez de llevar a
`/iniciar-sesion` o `/crear-cuenta`, que sí son Clerk de verdad. Es
inconsistente pero no lo cambié: decidir si el modal se retira o se conecta al
Clerk real es una decisión de producto/UX, no algo para resolver de paso.

### Sin poder procesar

El audio compartido (`AUDIO20260731125818_2.m4a`) no se pudo transcribir con
las herramientas de esta sesión (sólo lee binarios de imagen/PDF/notebook). Si
tiene información relevante, conviene pasarla como texto.

## Fase 3 (después de cerrar la 2)

- Inscripción a actividades con control de cupos real (hoy sólo se muestran).
- Cacería de Sellos con QR — debe tolerar mala señal dentro del salón (offline-
  first o cola de reintentos, a decidir).

## Decisiones abiertas / pendientes de datos reales

(copiado y mantenido en sync con la sección homónima del README)

- Día exacto del YukaWaii Fest 4 (sólo confirmado el mes).
- Sede, dirección y ciudad de ambos eventos.
- El plano de `lib/data/feria.ts` sigue siendo provisional hasta que se
  confirme sede — ya con dos salas reales, pero la sede final puede cambiar
  ambas.
- Druida también lleva feria: cuando tenga sede, la vista de evento pasa a
  `/evento/[slug]` para servir dos planos.
- Precio real de entrada (hoy figura libre).
- `NEXT_PUBLIC_SITE_URL` con el dominio real.
- Fotos de eventos, arte de Yuquita, `public/og-image.jpg`.
- Expositores y plano de `lib/data/` siguen siendo de demostración salvo el
  trazado de las salas.
- Qué convocatorias siguen abiertas y hasta cuándo.
- Qué significa "Fase 3" de convocatorias y si habrá fases siguientes.
- Si comidas y emprendimientos comparten plano y precio con el resto.

## Convocatorias — estado en vivo

**Fase 3 cerrada, Fase 4 por abrir.** Los botones de mesa llevan al Discord
mientras dura el hueco (decidido en `ctaMesa()`, un solo punto de control).
Para abrir Fase 4: `phaseLabel: 'Fase 4'`, `estado: 'abierta'`, `formUrl`
nuevo en `lib/data/convocatorias.ts`.
