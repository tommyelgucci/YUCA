# Checkpoint — Proyecto Yuca

Estado vivo del proyecto. Actualizar al cerrar cada bloque de trabajo, no sólo
al final de una fase.

## Última actualización

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
