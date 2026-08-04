# Checkpoint — Proyecto Yuca

Estado vivo del proyecto. Actualizar al cerrar cada bloque de trabajo, no sólo
al final de una fase.

## Última actualización

**2026-08-04** — dos cosas que estaban esperando a que el almacenamiento
funcionara de verdad, más un fallo que tumbaba `/evento`.

### `/evento` estaba caída (arreglado)

`app/evento/page.tsx` corre en el servidor y montaba directamente
`FeriaContext.Provider`, reexportado desde un módulo `'use client'`. Al cruzar
esa frontera cada export se convierte en una referencia al cliente, y un
contexto no es un componente: la página moría con *"Element type is invalid.
Received a promise that resolves to: Context"*. Ahora el proveedor es una
función de verdad que envuelve al contexto.

**No lo pilló el build**: `/evento` es `force-dynamic`, así que `npm run build`
no la prerrenderiza y el fallo sólo aparecía al abrirla. Conviene tenerlo
presente con el resto de páginas dinámicas.

✅ **Comprobado el 2026-08-04**: la página abre y el mapa dibuja. Era también el
"no puedo entrar a evento" del día anterior, que quedó tapado cuando se arregló
el rol de staff de `/admin` — eran dos fallos distintos con el mismo síntoma.

### Dos fallos en las credenciales que se imprimen

Salieron mirando los `TODO` viejos del repo. Los dos estaban en
`filasDesdeBase`, el camino que se usa de verdad al exportar — que **no tenía
ninguna prueba**. Las que había cubren `filasDesdeMocks`, que es lo que alimenta
la vista previa, y por ahí se colaron los dos.

1. **`nombre_real` salía siempre vacío.** El TODO que lo justificaba
   (*"columna de datos privados, pendiente de definir"*) se escribió antes de
   que `full_name` existiera, y al añadirla el 2 de agosto nadie volvió aquí.
   Los gafetes se habrían impreso sin el nombre legal, que es justo lo que el
   pliego de la organización pedía. Sigue pudiendo venir vacía si la persona no
   lo cargó —`/admin` ya la marca en rojo—, pero ya no por olvido del código.
2. **El filtro de edición se perdía sin dar error.** Había un `&&` de JavaScript
   donde iba el `and()` de Drizzle. Como `eq()` devuelve un objeto —siempre
   verdadero—, `A && B` se evaluaba a B: la exportación traía **también las
   mesas de Druida**, la otra feria. Con dos ediciones sembradas desde el
   principio, esto habría aparecido recién al imprimir.

`filasDesdeBase` pasa a estar exportada y a recibir la edición, para poder
probarla. 4 pruebas nuevas contra PGlite (83 en total), y la del filtro se
comprobó revirtiendo el `&&` a mano: falla, como debe.

### Quien comparte mesa ya existe para la web pública

Estaba anotado desde el 2 de agosto como punto 3 de la referencia de Glitter, y
era un hueco de verdad: `stand_companions` se llenaba desde `/mi-cuenta`, el
acompañante tenía que estar **verificado** para poder sumarse, y su credencial
impresa salía completa desde el 3 de agosto… pero **en la web pública no existía**.
No salía en el mapa, ni en la lista de participantes, ni su
`/artistas/[slug]` decía dónde encontrarle. Sólo se publicaba a quien pagó.

- `expositoresDesdeBase` consulta ahora las dos tablas y devuelve **los
  titulares primero**. Ese orden es el contrato del que se cuelga todo lo demás:
  cada mesa queda encabezada por quien la reservó.
- `FeriaContext` pasa de un índice de uno a uno a **una lista por mesa**
  (`getExpositoresPorStand`). Mientras fue un `Map` de uno a uno, el segundo
  ocupante simplemente no cabía.
- La ficha del mapa enseña "Comparte la mesa con" con avatar y enlace al perfil.
  La etiqueta accesible de la mesa nombra a los dos, no sólo al primero.
- **Misma regla de siempre para la mesa**: no se anuncia hasta que el pago está
  confirmado. Se cae para los dos a la vez, así que no hacía falta una regla
  aparte. Y una reserva cancelada se lleva por delante también al acompañante.
- 3 pruebas nuevas (79 en total).

### "Olvidé mi contraseña" se quedaba cargando para siempre

Reportado al probarlo: llega el código al correo, se pone, parece que va a
entrar y se queda girando sin avanzar ni dejar cancelar.

**No era código nuestro, era configuración que faltaba.** Verificar ese código
**no termina de entrar**: deja la sesión en estado *pendiente*, con la tarea
`reset-password` —elegir contraseña nueva— sin resolver. Clerk lleva entonces a
esa persona a la dirección que se le indique en `taskUrls`; sin indicarle
ninguna, no tiene a dónde llevarla. Su propio código lo avisa por consola:
*"Session has pending tasks but no handling is configured […] users may get
stuck on incomplete flows"* (`@clerk/shared/…/sessionTasks.js`).

- `taskUrls` en `<ClerkProvider>` apunta esa tarea a `/nueva-contrasena`, una
  ruta comodín nueva que monta `<TaskResetPassword>`.
- **`redirectUrlComplete` es obligatorio** y va a `/mi-cuenta`: sin destino, la
  tarea se completa y nadie se mueve de la pantalla.
- **Esa ruta no se puede proteger con el middleware.** Una sesión pendiente
  cuenta como no identificada, así que `auth.protect()` la mandaría a iniciar
  sesión y Clerk la devolvería aquí: ese es el bucle. Tenerlo presente si algún
  día se amplía `rutasProtegidas`.

Encontrado leyendo el paquete instalado, **no reproducido**: desde el entorno de
Claude no hay claves de Clerk y las conexiones salientes están bloqueadas. Falta
confirmarlo rehaciendo el "olvidé mi contraseña".

### Foto de perfil (el último pendiente de la referencia de Glitter)

`avatar_url` existía en la tabla desde el principio y **nada la escribía**: todos
los perfiles salían con iniciales. Estaba bloqueado por la decisión de
almacenamiento, que ya está tomada y probada.

- Se sube desde `/mi-cuenta` con el botón de cámara sobre el avatar, y se guarda
  sola al elegir el archivo. No está dentro del formulario de perfil a propósito:
  ahí obligaría a subir la imagen antes de saber si el resto de campos valen.
- **`cambiarAvatar` devuelve la foto anterior** para poder borrarla del bucket.
  Sin eso, cambiar de foto cinco veces deja cuatro archivos que nadie va a mirar.
  La anterior se borra *después* de guardar la nueva; al revés, un fallo a medias
  dejaría el perfil sin foto.
- **Los avatares van al mismo bucket `productos`**, bajo `avatares/`. Dos buckets
  sería más ordenado de leer, pero obliga a alguien a entrar al panel de Supabase
  a crear el segundo, y hasta entonces el botón estaría en pantalla fallando.
- `subirImagen` pasa a recibir una `carpeta` en vez de un `productoId`, y
  `rutaDeUrl()` centraliza el camino de vuelta de URL pública a ruta del bucket
  (antes era un `split('/productos/')` suelto en una acción).
- 2 pruebas nuevas (76 en total).

### `npm run db:limpiar-demo`

Los 18 expositores sembrados llevaban desde el 3 de agosto anotados como
pendiente inmediato: ocupan mesas en el mapa y saldrían impresos en las
credenciales junto a los reales. `db:seed` no sirve para esto —vacía las tablas
enteras y ya se niega a correr—, así que hace falta algo quirúrgico.

- Se lleva sólo a quien tiene `clerk_user_id` empezando por `seed_`, que es la
  misma marca que usa el freno de mano de `db:seed`. Lo que cuelga de ellos
  —reservas, acompañantes, productos, fotos, reseñas— se va por la clave foránea.
- **Por defecto no borra**: enseña qué se llevaría. Hay que añadir `-- --si`.
  Se corre pegando un comando, muchas veces desde el teléfono.
- **Libera las mesas.** El estado de la mesa no lo mantiene la base sino
  `lib/reservas.ts`, así que la cascada borraba la reserva y dejaba la mesa
  marcada como ocupada **para siempre**, fuera del selector sin que nadie la
  tuviera. Sólo se liberan las que quedan sin ninguna reserva viva: una mesa que
  pasó por una reserva de mentira y ahora tiene una real no se toca.
- Salió del banco de pruebas, no de la lectura: probado contra PGlite con las dos
  situaciones mezcladas.

✅ **Corrido en vista previa contra Supabase el 2026-08-04**: lista los 18
sembrados y **no** al expositor real que ya existe, que es lo que había que
comprobar. **Decidido no borrarlos todavía**: hoy son lo único que hace que el
mapa y la lista de participantes tengan algo que dibujar, y la web aún no está
desplegada, así que no hay a quién confundir. El momento de correr `-- --si` es
justo antes de abrir la Fase 4 o de desplegar en Vercel, lo que pase primero.


**2026-08-03 (noche)** — **la base de datos existe y está viva.** Supabase
`yuca` (São Paulo, Data API apagada), 11 tablas, 6 de 6 migraciones aplicadas y
sembrada: 2 ediciones, 2 espacios, 54 mesas, 18 expositores de demostración, 18
reservas, 4 actividades. Clerk configurado con cuentas reales y el rol de staff
funcionando. **Con esto la etapa 0 de `PLAN.md` queda cerrada.**

Costó una tarde entera, y no por el proyecto sino porque tres herramientas
fallan sin decir por qué. Los tres agujeros están tapados:

- `drizzle-kit` no lee `.env.local` (sólo `.env`) y devuelve código 1 sin
  imprimir nada. Se carga a mano en `drizzle.config.ts`, `check.ts` y `seed.ts`.
- Clerk **no mete `publicMetadata` en el token de sesión** salvo que se
  personalice el token en su panel. `getRol()` ahora pregunta al perfil si no
  lo encuentra en el token; sin eso, marcar a alguien como staff no servía de
  nada y no había ningún error que lo explicara.
- **`npm run db:check`** (nuevo) diagnostica el entorno y la conexión, y traduce
  los tres fallos habituales. Es lo que hay que correr cuando algo no conecta.

Además: `db:seed` **se niega a correr** si detecta expositores registrados de
verdad, porque vacía las tablas antes de escribir y ahora hay una base real que
podría borrar.

### La web pública ya lee la base (mismo día, después)

`lib/feria.ts` es el puente. El mapa, la lista de participantes y
`/artistas/[slug]` leen de ahí; `lib/data/` queda de respaldo para cuando no hay
base configurada. **Con esto la etapa 0 está completa**: lo que alguien hace en
`/mi-cuenta` se ve en la web.

- **La geometría del plano se queda en el código.** De la base sale lo que
  cambia solo —estado de la mesa y quién la ocupa—; el dibujo de las salas es
  del local, y rehacerlo es editar un archivo en vez de migrar cincuenta filas.
  Una mesa que la base tenga y el plano no, no se dibuja.
- **La mesa se anuncia sólo con el pago confirmado.** Con la reserva pendiente
  ya se figura como participante, pero la mesa puede caerse todavía.
- **`FeriaContext`**: los datos entran una vez desde el servidor y bajan por
  contexto. Son cuatro componentes a dos niveles; encadenar props obligaría a
  las pestañas —que no usan ni una mesa— a acarrearlos.
- 7 pruebas nuevas (69 en total), incluida una que serializa la lista pública y
  comprueba que no arrastra nombre real, teléfono ni fecha de nacimiento.

### Etapa 2: la tienda, ya visible (mismo día)

La interfaz del catálogo, encima del motor que ya estaba probado.

- **`/tienda`** — listado de tiendas abiertas. Sólo entran las que tienen algo
  publicado: una tienda vacía en el listado es una promesa incumplida, y en un
  catálogo nuevo son la mayoría.
- **`/tienda/[slug]`** — catálogo, estrellas, reseñas firmadas y formulario
  para dejar la tuya. Enlazada desde el perfil del artista **sólo si hay algo
  que ver**.
- **Panel del vendedor en `/mi-cuenta`** — abrir y cerrar la tienda, añadir
  productos, publicarlos u ocultarlos, borrarlos. Cerrar la tienda no borra
  nada.
- **Sin botón de "comprar".** No hay pedidos ni pagos todavía (eso es la etapa
  3): en su lugar se dice en voz alta que se escribe por redes, en vez de poner
  un botón que no lleva a ningún lado.
- **El nombre de la reseña sale de la cuenta, no del formulario.** Si lo
  escribiera el navegador, la firma sería adorno — y la firma es lo único que
  sostiene la confianza mientras no haya pedidos que verificar.
- 2 pruebas nuevas (71 en total).

**Fotos: código listo, falta encender el almacenamiento.** `lib/almacenamiento.ts`
sube a Supabase Storage por la API REST con `fetch`, sin añadir `supabase-js`:
el proyecto ya habla con Postgres por su cuenta y un SDK entero para dos
llamadas HTTP sería pagar mucho por poco. Límite 3 MB, sólo JPG/PNG/WEBP.

- Mientras falten `NEXT_PUBLIC_SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`,
  **la interfaz no ofrece subir**, igual que sin Clerk no ofrece cuentas.
  Prometer una subida que va a fallar es peor que no ofrecerla.
- Primero se sube el archivo y después se escribe la fila: al revés, un fallo
  dejaría una foto apuntando a una URL inexistente, y eso se ve en el catálogo
  mientras que un archivo huérfano no lo ve nadie. Si la fila se rechaza
  —producto ajeno— se borra el archivo recién subido.
- Borrar el producto se lleva sus fotos por la clave foránea, no por código.
- 3 pruebas nuevas (74 en total): la portada es la primera foto subida, nadie
  cuelga ni quita fotos en producto ajeno, y el borrado en cascada.

✅ **Probado contra Supabase el 2026-08-04**: bucket `productos` creado, las dos
variables puestas, y la primera foto subió a la primera. El código se había
escrito a ciegas —desde el entorno de Claude las conexiones salientes a Supabase
están bloqueadas— y aun así no hizo falta ninguna ronda de ajuste.

### Dos ajustes de `next.config.mjs` que estaban faltando

Salieron al probar el alta de perfil desde el Codespace:

- **`serverActions.allowedOrigins`** — Next.js rechaza una Server Action cuando
  el `Origin` no coincide con su `Host`. Detrás de un proxy (Codespaces, o
  cualquier túnel) nunca coinciden, y **todos los formularios morían** con
  `Invalid Server Actions request`. Se listan los dominios de confianza; en
  producción no hace falta añadir el propio, ahí sí coinciden.
- **`serverActions.bodySizeLimit`** — el tope por defecto es **1 MB**, y eso
  contradecía dos cosas ya construidas: el comprobante admite 4 MB y las fotos
  de producto 3. Subido a 5 MB. Nadie lo había notado porque hasta hoy nunca se
  subió un archivo de verdad.

### Deuda anotada: Clerk deprecó `createRouteMatcher`

Al arrancar, Clerk avisa de que `createRouteMatcher` —lo que usa
`middleware.ts` para exigir sesión en `/admin` y `/mi-cuenta`— desaparecerá en
su próxima versión mayor, y recomienda comprobar la sesión dentro de cada
página en vez de por coincidencia de rutas.

Funciona hoy y no corre prisa. Pero **hay que migrarlo antes de actualizar
Clerk**, o esas dos rutas se quedan sin protección sin que nada falle a la
vista. Nota aparte: cada Server Action ya comprueba la sesión por su cuenta, así
que el agujero sería de páginas, no de escrituras.

### Pendiente inmediato

- **Los 18 expositores sembrados son de mentira** (Estudio Lunaria, Papaya
  Comics…). Hay que borrarlos antes de abrir la convocatoria real, o se
  mezclarán con los de verdad en el mapa y en las credenciales. **Ya hay
  comando**: `npm run db:limpiar-demo` (ver arriba); falta correrlo.

**2026-08-03** — dos bloques: aceptación de las reglas antes de reservar, y el
acompañante como expositor verificado. Con eso quedan **cuatro** huecos del
pliego cerrados; los que faltan (QR de pago, instrucciones de ingreso,
colaboradores) necesitan datos de la organización. 50 pruebas en verde.

Se creó el proyecto de Supabase (`yuca`, São Paulo, Data API apagada) pero
**las migraciones siguen sin aplicarse**: el intento se hizo desde el teléfono
y se topó con dos cosas ya arregladas en el repo —drizzle-kit no leía
`.env.local`, y hacía falta separar la conexión de migrar de la de la app—.
Queda pendiente correr `npm run db:migrate` desde una computadora.

Llegó además una **propuesta nueva y grande** (marketplace de vendedores);
anotada más abajo, sin construir nada todavía.

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
   2026-08-02, ver la sección de arriba. ~~El avatar subido por la persona~~
   **hecho** el 2026-08-04, en cuanto se resolvió el almacenamiento. Queda sólo
   el botón de agregar/quitar redes de a una, que aquí es un campo fijo por red.
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
   ~~`StandDetail.tsx` sólo muestra al titular.~~ **Hecho** el 2026-08-04, ver
   arriba. De su versión queda sólo el agrupado por sectores, que aquí es un
   selector de sala.

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
- Las migraciones `0001`, `0002` y `0003` **no están aplicadas a ninguna base
  real** todavía: hace falta `DATABASE_URL` y `npm run db:migrate`.

## Hecho (aceptación de reglas antes de reservar — 2026-08-03)

Tercer hueco del pliego cerrado sin pedir nada. El audio pide aceptar términos,
condiciones y reglas antes de reservar, y poder decir después quién aceptó.

- **`lib/data/reglamento.ts`**: el texto con una `version`. Lo que se guarda en
  la reserva es esa versión, no un "sí" suelto: ante un reclamo hay que poder
  reconstruir qué decían las reglas ese día, no lo que dicen hoy. Cambiarlas =
  editar el texto y subir la versión; lo ya reservado conserva la vieja.
- **Migración `0003_brainy_karma.sql`**: `terms_version` y `terms_accepted_at`
  en `reservations`, `not null` **sin default**, de modo que no exista forma de
  insertar una reserva sin constancia. El SQL generado por drizzle-kit se
  reescribió a mano (añadir → rellenar → poner `not null`): tal cual salía
  reventaba en cualquier base con reservas ya sembradas.
- Cuelga de la **reserva**, no del perfil: lo que se acepta es participar en
  esta edición con este texto. Quien reserve otro año vuelve a leer.
- Se comprueba en **`reservarMesaAction`**, igual que la edad y por el mismo
  motivo, y se exige la versión **vigente**: la casilla del formulario no
  defiende nada por sí sola.
- `/mi-cuenta` muestra las reglas desplegables sobre el selector de mesas, con
  la casilla que habilita los botones. `/admin` muestra en cada fila qué
  versión aceptó y cuándo.
- 2 pruebas nuevas (44 en total): la reserva guarda versión y fecha, y **la
  base rechaza un `insert` a mano sin reglas aceptadas**.

### Pendiente

El texto de las reglas es **provisional**: sale de lo que la plataforma ya
impone (edad, plazo, una mesa por expositor, compartir mesa) y de lo que dijo
el audio. El reglamento oficial lo tiene que dar la organización; al
reemplazarlo hay que subir la `version`.

## Hecho (el acompañante es un expositor verificado — 2026-08-03)

Cuarto punto del pliego. El audio pedía que quien comparta mesa sea "un usuario
registrado y verificado de la plataforma"; hasta ahora `display_name` era texto
libre y `exhibitor_id` existía sin que nadie lo usara.

- **Migración `0004_hot_hulk.sql`**: `exhibitor_id` pasa a `not null`, y se van
  `instagram` y `contacto` — esos datos ahora salen del perfil del acompañante,
  y tenerlos copiados sólo servía para quedarse viejos.
- Se suma **por el slug del perfil** (acepta el enlace pegado entero). Se
  rechaza a quien no existe, no está verificado, es uno mismo, ya tiene mesa
  propia, o ya comparte otra.
- **La regla "nadie comparte dos mesas" cruza tablas** (acompañante ↔ estado de
  la reserva), así que no se puede imponer con un índice único parcial como las
  demás. Se resuelve bloqueando la fila del invitado (`for update`) dentro de la
  transacción: dos titulares invitando a la vez a la misma persona se serializan
  y sólo entra uno.
- Una reserva cancelada **no** ata a su acompañante: la fila queda de historial,
  pero esa persona puede compartir otra mesa. Hay prueba.
- **De paso, la credencial del acompañante deja de salir a medias**: ahora lleva
  sus categorías, sus redes y un QR a *su* perfil, no al de quien le invitó.
- 6 pruebas nuevas (50 en total).

### Efecto secundario que conviene tener presente

Ahora **el acompañante depende de que el staff le verifique**. Si la cola de
verificación se atrasa, bloquea a gente que ya pagó su mesa y sólo quiere sumar
a quien la comparte. Merece la pena vigilarlo cuando haya expositores reales; si
molesta, la salida no es quitar la regla sino agilizar la cola.

## Hecho (pantalla de confirmación — 2026-08-03)

Último hueco del pliego que no dependía de nadie. Al confirmarse el pago,
`/mi-cuenta` deja de mostrar un cartel de "Mesa confirmada" y muestra
`MesaConfirmada.tsx`: felicitación con el nombre, número de mesa en grande con
su sala, fecha y sede, cómo se entra y qué llevar.

- Es el único momento en que se tiene toda la atención de quien acaba de pagar,
  así que ahí van las instrucciones de ingreso. Si no están, se preguntan por
  Instagram de una en una.
- `lib/data/ingreso.ts` guarda esas instrucciones. Los horarios están en `null`
  porque dependen de la sede: **lo que no se sabe no se muestra**, en vez de
  inventar una hora que después haya que desmentir. Qué llevar no depende de la
  sede, así que ya se muestra.
- `reservaActivaDe` ahora trae también la sala: el número de mesa solo no sirve
  para encontrarla cuando el evento reparte dos salones. Hay prueba (23 en
  reservas, 62 en total).

## Propuesta nueva: marketplace de vendedores (2026-08-03)

Llegaron cuatro audios con una idea distinta de todo lo anterior: una sección
tipo *Pedidos Ya* dentro de Proyecto Yuca, donde cada vendedor tenga su catálogo
y su stock, reciba pedidos, cobre por QR o efectivo, y chatee con el comprador
para coordinar la entrega sin pasarle su WhatsApp. Se financia con una
**membresía** del vendedor, no con comisión por venta.

El detonante es que Glitter (otro festival) prohibió a terceros vender ciertos
productos, y la idea es acoger a esos vendedores.

**Todavía no se construyó nada.** Queda anotado con la lectura del caso:

- **No es una función, es un segundo producto.** La feria es una herramienta de
  evento, estacional; esto es una plataforma transaccional todo el año. Es más
  grande que todo lo que hay hecho hasta hoy, junto.
- **Cobrar membresía y no comisión es la decisión más acertada de la propuesta**,
  y conviene defenderla: si la plataforma no toca el dinero, no hay que retener
  fondos, ni devolver, ni responder por una venta que salió mal, ni cumplir con
  lo que se le exige a quien intermedia pagos. Cambiar a comisión más adelante
  no es "subir un porcentaje": es volverse otra cosa.
- **El chat es la parte cara**, no el catálogo. Mensajería significa tiempo real,
  notificaciones, moderación, denuncias y guardar conversaciones que pueden
  acabar siendo prueba en una disputa. Un primer paso mucho más barato: pedidos
  con notas y estados, y que el contacto se revele sólo al confirmarse el pedido.
- **Obliga a resolver el almacenamiento de imágenes**, que se viene esquivando
  (`avatar_url` vacío, comprobantes como `data:` URL). Un catálogo con fotos ya
  no admite ese atajo: toca Supabase Storage o equivalente.
- **Lo que ya está hecho sirve**: perfiles con verificación, el patrón de
  estados de una reserva (que es casi el de un pedido) y el circuito de pago
  manual con confirmación del staff, que es exactamente lo que haría falta para
  cobrar la membresía.
- **Riesgo de fondo**: construir esto *porque* Glitter cerró la puerta ata el
  proyecto a una decisión ajena que puede revertirse el mes que viene. La razón
  que aguanta es que los emprendedores bolivianos necesitan dónde vender todo el
  año; si esa razón se sostiene sola, el proyecto tiene sentido aunque Glitter
  cambie de idea mañana.

### Segundo audio (mismo día): el modelo de cobro cambia

Llegó un quinto audio que **contradice al anterior** en lo económico. Ya no es
"membresía en vez de comisión", sino el modelo de Pedidos Ya entero:

- una **tarifa de servicio al comprador** (2–3 Bs por pedido),
- más un **porcentaje de cada venta**,
- y las membresías pasan a ser **beneficios** (avances, cupones, descuentos) en
  vez de ser la forma de financiar la plataforma.

Se suma también un **sistema de reputación**: estrellas y comentarios por
vendedor.

**Lo que hay que entender de ese cambio:** cobrar un porcentaje obliga a que el
dinero pase por la plataforma. No se puede quedar con el 5% de una transferencia
que va directo del comprador al vendedor. Y en cuanto el dinero pasa por aquí,
aparece todo lo demás: cobrar, retener, pagar a cada vendedor, devolver cuando
algo sale mal, cuadrar cuentas, facturar la comisión y responder ante quien
reclama. Eso ya no es una web, es una pasarela de pagos — con proveedor, con
contrato y con obligaciones fiscales.

Es exactamente la parte que el audio anterior evitaba sin querer, y por eso
merece decidirse a propósito y no de pasada.

**Los números, con supuestos explícitos.** Suponiendo 30 vendedores y 200
pedidos al mes de 60 Bs de media —optimista para un primer año—:

| Modelo                          | Ingreso mensual | Hay que manejar dinero |
| ------------------------------- | --------------- | ---------------------- |
| 2,5 Bs por pedido + 5% de venta | ≈ 1.100 Bs      | Sí                     |
| Membresía de 40 Bs por vendedor | ≈ 1.200 Bs      | No                     |

A la escala de Yuca los dos dan casi lo mismo, pero uno cuesta una pasarela de
pagos y el otro no. La comisión sólo gana con volumen grande, que es justo lo
que Pedidos Ya tiene y esto todavía no.

**Pero la objeción del audio 2 es real**: cobrar una suscripción por adelantado
a un artista es difícil, y la comisión es fácil de aceptar porque sale de dinero
ya ganado. La salida honesta a esa tensión no es elegir hoy, sino **empezar sin
cobrar nada**: es la manera más barata de averiguar si alguien lo usa. Con
pedidos reales encima de la mesa, cobrar membresía deja de ser una promesa.

### Conflicto de interés: el mismo que se le critica a Glitter

En el audio aparece, de pasada, que la organización también quiere vender lo
suyo ahí ("yo hago llaveros de acrílico"). Eso es **exactamente** lo que se le
reprocha a Glitter en el primer audio: ser dueño de la plaza y competir dentro
de ella.

No es un problema por sí solo —mucha feria vende su propio merch— pero se
vuelve uno en cuanto haya que decidir quién sale primero en el listado, quién
entra a una categoría o a quién se le aprueba una tienda. Si va a pasar, más
vale que las reglas sean las mismas para todos y estén escritas antes de que
haya un conflicto, no después. Es de las pocas cosas que salen gratis hoy y muy
caras dentro de un año.

### Lo barato y valioso: la reputación

Estrellas y comentarios es, con diferencia, la parte con mejor relación entre lo
que cuesta y lo que aporta. Lo que de verdad vende la plataforma es la confianza
—saber que quien te va a mandar el llavero cumple— y eso no lo da ni el catálogo
ni el chat. Además encaja con lo que ya existe: la verificación del staff.

### Tercer audio: niveles de suscripción (Semilla / Brote / Planta / Flor)

La propuesta se concreta en dos suscripciones: los **vendedores** pagan una
mensual tras verificarse, y los **compradores** tienen tres niveles temáticos de
10, 20–25 y 30 Bs. Se pidió cobrar al menos 25 Bs.

**Los nombres son buenos** —encajan con la identidad de fauna y flora y se
entienden solos—. Lo que hay que revisar es a quién se le cobra y cada cuánto.

**1. Cobrarle al comprador por entrar es lo único que puede matar esto.** En el
esquema, el nivel Semilla incluye "catálogo completo y compras": eso es un peaje
para mirar. El problema de cualquier marketplace nuevo no es que sobren
vendedores, es que faltan compradores, y aquí la competencia es Instagram, que
es gratis y donde esa gente ya está. Un comprador que compra dos llaveros al año
no paga 120 Bs anuales por el derecho a comprarlos. Y sin compradores, el
vendedor tampoco tiene por qué pagar.

Comprar y mirar, gratis siempre. La intuición de fondo —que hay fans que
quieren apoyar a Yuca y recibir algo a cambio— sí sirve, pero como **club de
apoyo opcional**: adelantos de la feria, insignia en el perfil, algo físico en
el evento. Nunca como puerta.

**2. Cobrar 10 Bs al mes a mano cuesta más de lo que recauda.** No hay cobro
recurrente con tarjeta al alcance aquí: sería un QR por persona y por mes, y
alguien del equipo cuadrando decenas de pagos chicos. Cincuenta personas a 10 Bs
son 500 Bs al mes y varias horas de trabajo administrativo. Si se cobra, que sea
**anual o por ciclo de feria**, y a pocos.

**3. Los 25 Bs del vendedor están bien como precio.** Regla razonable: la cuota
debería rondar la décima parte de lo que la plataforma le hace ganar. 25 Bs al
mes se sostiene si le genera unas 250 Bs mensuales en ventas que no habría
tenido — para quien vende llaveros de 25–40 Bs, son siete u ocho ventas extra.
Creíble cuando haya tráfico; imposible de justificar el primer día.

**3 bis. Los números de costo están en [`COSTOS.md`](COSTOS.md).** Resumen: con
la feria sola y sin cobrar, 0 USD al mes; con el marketplace cobrando, 45 USD
(≈ 315 Bs) porque Vercel obliga a plan de pago en cuanto hay uso comercial y
Supabase gratis pausa el proyecto tras una semana sin actividad. **Trece
vendedores a 25 Bs cubren todo.** Los 25 Bs funcionan.

**4. Por eso: gratis hasta la primera venta hecha por la plataforma.** Resuelve
de una vez el "no sabemos cuánto cobrar", es fácil de explicar, y convierte la
cuota en consecuencia de un resultado en vez de en una apuesta. Los vendedores
que vienen de Glitter acaban de perder un canal: pedirles que paguen por entrar
a un sitio todavía vacío es el peor momento posible.

**5. Tres niveles son mucho para empezar.** Cada nivel es trabajo perpetuo:
decidir qué cupón toca a quién y hacerlo cumplir. Uno basta. Semilla, Brote y
Planta encajan mejor como niveles del **vendedor** —o como reconocimiento por
antigüedad y reputación— que como tarifas del comprador.

## Hecho (base de la tienda — 2026-08-03)

Construida la primera etapa, la que no depende de ninguna decisión de cobro:

- **Migración `0005`**: `productos`, `producto_fotos`, `resenas` y
  `exhibitors.tienda_abierta`.
- **La tienda no es una tabla**: es el perfil de expositor que ya existe con
  productos colgando. Crear `tiendas(exhibitor_id, nombre, bio…)` habría sido
  copiar el perfil para no añadir nada.
- **Vender exige perfil verificado y tienda abierta**, las dos cosas. Abrir
  tienda es opt-in: no todo expositor de feria quiere catálogo todo el año.
  Si el staff retira la verificación, el catálogo desaparece de la web sin
  tocar producto por producto. Hay prueba.
- **La reseña es del vendedor, no del producto** (con catálogos de diez cosas,
  repartirlas por producto hace que ninguna signifique nada) y **va firmada**:
  no se ofrece anónima. Mientras no haya pedidos no se puede comprobar que
  quien opina compró; que se vea quién lo dice es lo que sostiene la confianza
  mientras tanto. Una por persona y vendedor, impuesta por índice único, y las
  estrellas de 1 a 5 con un `check` en la base.
- Sin reseñas el promedio es `null`, no `0`: "nadie opinó todavía" y "todos le
  pusieron cero" no son lo mismo.
- **`lib/tienda.ts` no toca dinero.** Catálogo y reputación funcionan igual con
  o sin pagos, y dejarlo así permite decidir el cobro más tarde sin bloquear
  nada.
- 11 pruebas nuevas (61 en total).

**Falta**: la interfaz (panel del vendedor y páginas públicas de tienda) y las
fotos, que siguen bloqueadas por la decisión de almacenamiento — `producto_fotos`
existe pero nadie escribe todavía en ella. El truco del comprobante (`data:` URL
en la fila) no vale aquí: son muchas imágenes y grandes.

### Lo que hay que decidir antes de escribir una línea

1. **¿El dinero pasa por la plataforma o no?** Es la decisión que parte el
   proyecto en dos y de la que cuelgan todas las demás. Con comisión: sí, y hay
   que buscar pasarela. Sin comisión: no, y el catálogo se puede empezar ya.
2. ¿La feria de noviembre sale primero, sí o no? Hoy la base ni siquiera está
   migrada y las páginas públicas leen mocks. Los vendedores del marketplace
   saldrían justamente de los expositores de la feria.
3. ¿Cuánto cuesta la membresía y qué pasa si alguien deja de pagarla — se le
   oculta el catálogo o se le borra?
4. ¿Qué responde Proyecto Yuca si un pedido no llega? (Aunque no toque el
   dinero, va a recibir el reclamo igual.)
5. ¿Entrega sólo en persona y coordinada, o hay envíos?
6. Si la organización vende ahí dentro, ¿bajo qué reglas — las mismas que
   todos, y quién lo arbitra?

### El plan acordado está en `PLAN.md`

Se pidió planificar el camino completo priorizando rentabilidad y accesibilidad;
el resultado vive en [`PLAN.md`](PLAN.md). Resumen: la feria primero (agosto),
tienda como vitrina gratuita antes de noviembre, pedidos sin dinero después de
la feria, y cobrar recién en 2027 con datos delante. La plataforma no toca el
dinero en ninguna etapa.

### Por dónde empezaría, si se decide hacerlo

Tres etapas, cada una útil por sí sola aunque la siguiente no llegue nunca:

1. **Catálogo con reputación, sin pagos.** Tienda por vendedor, productos con
   foto y precio, estrellas y comentarios. El contacto se revela al confirmarse
   el pedido, que resuelve lo del WhatsApp sin construir un chat. Gratis para
   todos. Sirve para averiguar si esto le interesa a alguien.
2. **Pedidos con estados**, reusando el patrón de las reservas —que ya está
   probado— y el cobro manual por QR que ya existe.
3. **Cobro**, y sólo aquí se decide comisión o membresía, con datos reales
   delante en vez de con suposiciones.

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
- ✅ **Aceptación de términos, condiciones y reglas antes de reservar** — hecho
  el 2026-08-03, ver sección propia. Falta el texto oficial de la organización.
- Mapa por bloques con libre / reservado / ocupado ✅.
- ✅ **Compartir mesa con un usuario registrado y verificado** — hecho el
  2026-08-03, ver sección propia.
- ⚠️ **Instrucciones de ingreso** — la pantalla ya las muestra
  (`lib/data/ingreso.ts`), pero los horarios están en `null` porque dependen de
  la sede. Lo que falta no se muestra en vez de inventarse; qué llevar sí se
  muestra ya. Cuando haya sede, se rellena ese archivo y aparece solo.
- Plazo de 2–3 días esperando el pago ✅ (`reservationTtlMinutes`, hoy 48 h).
- ⚠️ **Pago por QR: falta el QR.** Hoy la persona declara la referencia de su
  transferencia, pero la plataforma no le muestra ningún código QR para pagar.
  Falta saber si el QR es fijo de la organización o uno por reserva.
- ✅ **Pantalla de "¡Felicidades!"** — hecha el 2026-08-03
  (`app/mi-cuenta/MesaConfirmada.tsx`): número de mesa grande, sala, fecha y
  sede, instrucciones de ingreso y qué llevar.

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
- ~~`NEXT_PUBLIC_SITE_URL` con el dominio real.~~ **Confirmado el 2026-08-03: es
  `proyectoyuca.com`**, no un `.bo` — en redes el usuario es `@proyecto_yuca.bo` y
  se confunde. Queda apuntarlo al despliegue.
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
