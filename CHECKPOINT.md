# Checkpoint — Proyecto Yuca

Estado vivo del proyecto. Actualizar al cerrar cada bloque de trabajo, no sólo
al final de una fase.

## Última actualización

**2026-08-02** — segunda mitad de la Fase 2 en dos bloques: primero
`/mi-cuenta` y la cola de verificación, después la edición de perfil y la
separación público/personal. Fusionado `main` (PR #3: exportación de
credenciales y Clerk realineado), que había avanzado en paralelo. `npm test` en
verde: 30 pruebas (14 reservas + 7 perfiles + 9 credenciales).

Después se cerraron dos de los tres huecos del pliego: **control de edad** y el
público **tiendas**. Queda abierto el **QR de pago**, que necesita saber si el
QR es uno fijo de la organización o uno por reserva. 42 pruebas en verde.

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

## Hecho (edición de perfil y datos personales — 2026-08-02)

Construido a partir del punto 1 de la referencia de Glitter (ver abajo).

- **Migración `0001_magical_puma.sql`**: 6 columnas nulables nuevas en
  `exhibitors` (`full_name`, `birth_date`, `contact_email`, `phone`, `gender`,
  `department`). Sin reescritura de tabla; se aplica con `npm run db:migrate`
  cuando haya `DATABASE_URL`. **Todavía no aplicada a ninguna base real.**
- **`COLUMNAS_PUBLICAS`** en `lib/perfiles.ts`: la frontera entre lo que se
  publica y lo que no. Las consultas públicas seleccionan desde ahí, nunca
  `select()` entero, así que un dato personal nuevo no se filtra por olvido.
  Hay una prueba que lo comprueba campo por campo.
- **Edición**: `actualizarPerfilPublico` y `actualizarDatosPrivados`. El mismo
  `FormularioPerfil` sirve para alta y edición (mismos campos, distinta acción).
  El slug **no** se recalcula al renombrarse: es la URL que el artista ya
  compartió en redes.
- **UI**: `/mi-cuenta` pasa a tener dos tarjetas con su propio botón "Editar"
  —Perfil público e Información personal, esta con candado y la aclaración de
  que sólo la ve el equipo—. `/admin` muestra esos datos en cada fila de la
  cola, y marca en rojo a quien todavía no los cargó.
- **Género**: opcional, guardado como texto (no enum, para no migrar la base
  cada vez que cambie la lista) e incluye "No binario" y "Prefiero no decirlo".
- El alta sigue pidiendo sólo lo público: sumar seis campos personales al
  formulario de registro habría subido la fricción justo en el peor momento.
  Se cargan después, y el panel de staff avisa a quién le faltan.

3 pruebas nuevas (21 en total): editar no cambia el slug, los datos personales
no salen por la consulta pública, el staff sí los ve en su cola.

### Decisión abierta que dejé sin resolver

**Editar el perfil no revoca la insignia de verificado.** Alguien podría
verificarse con un perfil correcto y luego cambiarlo entero. Resetear
`verified` en cada edición sería hostil (perder la insignia por corregir una
falta de ortografía), así que no lo hice, pero el hueco existe. Opciones si
molesta: revocar sólo cuando cambie `displayName`, o marcar en `/admin` los
perfiles verificados editados después de verificarse. Es decisión de producto.

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

### Otro hallazgo — ya resuelto por el PR #3

El botón "Iniciar sesión" / "Crear cuenta" del `Header` abría un modal local
que no creaba cuenta real. Lo arregló el PR #3 con
`components/layout/AccountActions.tsx`: con Clerk configurado son enlaces
reales y `UserButton`; sin claves siguen cayendo al modal, que ahora sólo
explica que las cuentas no están activas todavía.

### Referencia de Glitter (otro festival), 2026-08-02

Se compartieron 3 grabaciones de pantalla de `glitter.com.bo` (otro festival
boliviano) como referencia de diseño, sin construir nada todavía a partir de
ellas — quedan anotadas para cuando se retomen:

1. ~~**Perfil con datos públicos y privados separados.**~~ **Hecho** el
   2026-08-02, ver la sección de arriba. Queda pendiente de su versión sólo el
   avatar subido por la persona (hoy `avatar_url` existe en la tabla pero nada
   lo escribe: necesita la misma decisión de almacenamiento que el
   comprobante) y el botón de agregar/quitar redes de a una, que aquí es un
   campo fijo por red.
2. **Cacería de Sellos, spec de referencia para la Fase 3.** Su versión: se
   compra un "Pasaporte" (Bs, en su stand), se junta un sello físico (propio,
   máximo 5 cm de diámetro) por cada stand visitado, tope de 50 inscritos a
   la actividad, hay que subir el diseño del sello al sitio antes de una
   fecha límite, y exige tener una reserva de entrada confirmada para poder
   inscribirse. Nuestra nota de "necesita tolerar mala señal" (abajo) sigue
   aplicando aparte de esto.
3. **Mapa público por sectores con multi-ocupante por mesa.** Su vista de
   participantes agrupa el plano en sectores (Galería, Teatro, Lobby) con
   leyenda Disponible/Ocupado/Externo, y una misma mesa puede mostrar más de
   un expositor a la vez (ej. "Shooter" y "Guamancita" comparten la C20).
   Nuestro modelo ya soporta varios expositores por mesa vía acompañantes,
   pero `StandDetail.tsx` hoy sólo muestra al titular, no a la lista completa.

## Hecho (control de edad y público "tiendas" — 2026-08-02)

Los dos primeros huecos del pliego que se podían cerrar sin pedir nada.

**Control de edad** (`lib/edad.ts`, migración `0002`)
- Tres tramos: menos de 17 no puede; 17 y 18 con permiso del tutor; más de 18
  libre. La regla vive en un módulo puro, sin base de datos, para poder
  probarla con fechas de borde.
- Se impone **en `reservarMesaAction`**, no en la interfaz: es el punto donde
  alguien pasa a ocupar una mesa, y una Server Action es un endpoint público.
  Sin fecha de nacimiento cargada tampoco se puede apartar mesa.
- Columnas nuevas: `guardian_name`, `guardian_contact`, `guardian_consent_at`.
  El timestamp del permiso **no llega del formulario**: lo pone `lib/perfiles.ts`
  sólo si vienen nombre y contacto del tutor con la casilla marcada, y lo borra
  si se retiran. Así la marca no puede existir sin lo que la respalda.
- La web guarda la **declaración**, no el papel firmado. `/admin` avisa en la
  ficha de cada menor de 19, con tutor y contacto a la vista, para que el
  equipo pida el documento antes de verificar.
- Al menor de 17 se le **guardan** los datos igual y se le explica; negarse a
  registrar la fecha dejaría a la organización sin saber que esa persona no
  puede tener mesa.
- 10 pruebas: los tres tramos en su borde exacto, el día antes de cumplir 17,
  el 29 de febrero en año no bisiesto, fechas imposibles y futuras.

**Público "tiendas"**
- Entró al enum `convocatoria_audience`. La migración usa
  `ALTER TYPE ... ADD VALUE`, y una prueba da de alta un perfil de ese público
  contra PGlite: si no corriera dentro de la transacción del migrador, fallaría
  ahí.
- De paso, los cuatro públicos se declaran una sola vez (`AUDIENCIAS` en
  `lib/types.ts`). Estaban repetidos en cinco archivos y sumar el cuarto
  obligaba a acertar en todos; ahora `Convocatorias.tsx` usa un `Record`
  exhaustivo, así que TypeScript avisa si algún día entra un quinto.

42 pruebas en verde (10 edad + 14 reservas + 9 perfiles + 9 credenciales).

### Pendiente de decidir

- **Datos personales de menores de 17.** Hoy se guardan igual (nombre,
  teléfono, correo) aunque esa persona no pueda participar. Guardar menos
  datos de menores sería lo prudente, pero borrarlos deja al equipo sin saber
  por qué alguien no puede reservar. No es decisión técnica.
- Las migraciones `0001` y `0002` **no están aplicadas a ninguna base real**
  todavía: hace falta `DATABASE_URL` y `npm run db:migrate`.

## Requisitos del audio de la organización (2026-07-31)

Transcritos y pasados a texto por quien lleva el proyecto. Es la primera vez
que hay un pliego de requisitos de la organización, así que manda sobre lo que
yo hubiera supuesto. Marcado contra lo que ya existe:

**Registro y perfiles**
- Nombre artístico ✅, nombre real ✅ (`full_name`), edad ✅ (`birth_date`).
  "Constancia" aparece en el audio y no quedó claro a qué se refiere —
  conviene confirmarlo antes de modelarlo.
- ✅ **Control de edad** — hecho el 2026-08-02, ver sección propia abajo.
- ✅ **Los cuatro tipos de perfil** — hecho: `tiendas` entró al enum
  `convocatoria_audience` (migración `0002`).
- ❌ Sección de colaboradores / patrocinadores destacados. No existe nada.

**Inscripción a la feria**
- ❌ Aceptación de términos, condiciones y reglas fijas antes de reservar. No
  existe; habría que registrar quién aceptó y cuándo.
- Mapa por bloques con libre / reservado / ocupado ✅.
- Compartir mesa ✅, pero con un matiz pendiente: el audio pide que el
  compañero sea **un usuario registrado y verificado** de la plataforma, y hoy
  `stand_companions.display_name` es texto libre (la columna `exhibitor_id`
  existe pero la interfaz no la usa).
- ❌ Instrucciones de ingreso (horarios, cómo entrar) en la confirmación.
- Plazo de 2–3 días esperando el pago ✅ (`reservationTtlMinutes`, hoy 48 h).
- ⚠️ **Pago por QR: falta el QR.** Hoy la persona declara la referencia de su
  transferencia, pero la plataforma no le muestra ningún código QR para pagar.
  Falta saber si el QR es fijo de la organización o uno por reserva.
- Pantalla final de confirmación ✅ parcial (el panel dice "Mesa confirmada",
  pero no es la pantalla de "¡Felicidades!" que describe el audio).

**Exportación**
- Excel con todos los datos ✅ y alimentar variables de Illustrator para
  imprimir credenciales ✅ — lo cubrió el PR #3 en `/admin/exportar`.

## Fase 3 (después de cerrar la 2)

- Inscripción a actividades con control de cupos real (hoy sólo se muestran).
- Cacería de Sellos con QR — debe tolerar mala señal dentro del salón (offline-
  first o cola de reintentos, a decidir). Ver referencia de Glitter arriba.

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
