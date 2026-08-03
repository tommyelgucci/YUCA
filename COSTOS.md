# Cuánto cuesta tener esto en pie

Para poder poner precio a una membresía hace falta saber primero qué se paga
cada mes. Esto es esa cuenta.

**Precios de lista a agosto de 2026.** Hay que verificarlos al contratar: las
plataformas los cambian, y el dominio hay que cotizarlo.

## Los servicios

| Servicio     | Para qué                        | ¿Alcanza el plan gratis?                                  | Si toca pagar        |
| ------------ | ------------------------------- | --------------------------------------------------------- | -------------------- |
| **Vercel**   | Servir la web                   | Sí — **pero sólo para uso no comercial**                   | 20 USD/mes           |
| **Supabase** | Base de datos y fotos           | Sí, con dos peros: se pausa tras una semana sin uso, y 1 GB de archivos | 25 USD/mes |
| **Clerk**    | Cuentas e inicio de sesión      | Sí, hasta 10.000 usuarios activos al mes                   | 25 USD/mes           |
| **Resend**   | Correos (avisos de pedido, etc.) | Sí, 3.000 correos al mes                                  | 20 USD/mes           |
| **Dominio**  | `proyectoyuca.bo`               | No                                                         | Cotizar en `nic.bo`  |

### El detalle que puede pasar desapercibido

**El plan gratuito de Vercel es sólo para proyectos no comerciales.** En cuanto
se cobre una membresía, hay que pasar a Pro. No es opcional ni es algo que se
pueda estirar: está en sus condiciones de uso. Conviene contarlo con la cuenta
desde el principio en vez de descubrirlo después.

**El plan gratuito de Supabase pausa el proyecto tras una semana sin
actividad** — pero eso **ya está resuelto y gratis**, ver abajo.

## Lo que no hace falta pagar (revisión, 2026-08-03)

Se contrastó esta cuenta con otras alternativas. Tres correcciones que bajan el
costo real, y una advertencia sobre un cambio que sale mucho más caro de lo que
parece.

### 1. La pausa de Supabase no obliga a pagar: ya tenemos el remedio

El proyecto gratuito se pausa tras una semana **sin actividad**, y esta
plataforma tiene desde hace tiempo un cron que consulta la base:
`/api/cron/expirar-reservas`, que libera las mesas cuyo plazo venció. Tiene que
correr igual, por su propio motivo. Programado a diario, la base nunca pasa una
semana quieta y nunca se pausa.

O sea: **cero costo extra y cero servicios nuevos**. No hace falta contratar un
"ping" externo ni cambiar de proveedor por esto.

Entonces, ¿cuándo hace falta Supabase Pro de verdad? **Por el espacio de las
fotos**, no por la pausa: el plan gratuito da 1 GB de archivos. Con fotos de
producto comprimidas a ~200 KB eso son unas 5.000 imágenes, así que aguanta
bastante — pero es el límite que se va a tocar primero.

### 2. El dominio puede esperar

Hasta lanzar la marca en serio, sirve el subdominio gratuito del hosting
(`proyectoyuca.vercel.app` o equivalente). El `.bo` se compra cuando haya algo
que anunciar. Coste hasta entonces: **cero**.

Referencia que llegó de fuera: un `.bo` ronda los **200 Bs/año** (≈ 17 Bs/mes).
Hay que confirmarlo en `nic.bo`, pero es del orden esperable.

### 3. Cambiar Clerk por el login de Supabase no ahorra nada hoy

Es verdad que tener dos servicios donde podría haber uno es redundante. Pero
Clerk es gratis hasta 10.000 usuarios activos al mes, así que **hoy se paga 0
por él**: cambiarlo ahorraría cero y costaría re-mapear la identidad de cada
persona (`clerk_user_id` es clave única en `exhibitors` y aparece también en
inscripciones y reseñas). Es una simplificación que tiene sentido plantearse el
día que Clerk empiece a cobrar, no antes.

### 4. Lo que sí ahorra los 20 USD de Vercel: mover el hosting

Cloudflare Pages y Netlify permiten uso comercial en su plan gratuito, así que
mudarse ahorra los 20 USD/mes que Vercel cobrará en cuanto haya membresías.

No es cambiar un interruptor. Esta aplicación usa Next.js con Server Actions y
tres cosas que dependen de Node: `exceljs` para exportar las credenciales,
`Buffer` para procesar el comprobante subido, y una conexión TCP a Postgres.
Cloudflare corre sobre Workers, que no es Node, así que las tres hay que
revisarlas. Netlify está más cerca de funcionar tal cual.

**El cálculo honesto**: se ahorran ~140 Bs/mes a cambio de unos días de
migración y de fricción cada vez que se añada algo que asuma Node. Vale la pena
plantearlo **cuando el ahorro pese**, no antes de tener el primer vendedor.

### ⚠️ Lo que NO conviene: cambiar Supabase por Firebase

Suena parecido —los dos son "base de datos gratis con login y fotos"— pero para
este proyecto no lo es, y el motivo no es de precio.

**La regla más importante de toda la plataforma la impone Postgres, no el
código**: un índice único parcial sobre `reservations(stand_id)` hace
literalmente imposible que dos personas paguen por la misma mesa. Firestore no
tiene índices únicos. Esa garantía habría que reescribirla a mano con
transacciones y documentos centinela, quedaría más débil, y con pago manual y
días de espera es exactamente el error que no te puedes permitir.

Se perderían además las 61 pruebas, que corren contra Postgres de verdad (PGlite
en memoria) y por eso valen: prueban el mismo motor que va a estar en
producción.

No es cambiar de proveedor. Es rehacer los cimientos y quedarse con una versión
peor de la garantía que más importa. **La recomendación es quedarse en
Postgres.**

## Tres escenarios

Al cambio oficial (≈ 7 Bs por dólar). **Ojo con esto**: hay que pagarlo con
tarjeta internacional y en dólares, así que el costo real en bolivianos depende
de a cuánto se consigan — puede ser bastante más que la cuenta de abajo.

### A — Hoy: la feria y el marketplace en pruebas, sin cobrar

Todo en planes gratuitos, con el cron diario evitando la pausa de Supabase y el
subdominio gratuito del hosting.

**0 USD/mes.** No es un truco ni una fase de cortesía: mientras no se cobre nada
y las fotos no pasen de 1 GB, esto se sostiene indefinidamente en cero.

### B — Marketplace cobrando membresías

Aquí Vercel obliga a Pro (uso comercial) y Supabase Pro entra cuando las fotos
superen 1 GB. Clerk y Resend siguen gratis.

**45 USD/mes ≈ 315 Bs/mes** — o **25 USD ≈ 175 Bs** si para entonces se movió el
hosting a Cloudflare o Netlify.

### C — Creciendo: más de 10.000 usuarios activos o muchos correos

Los cuatro de pago.

**90 USD/mes ≈ 630 Bs/mes**

## Cuántos vendedores hacen falta

A **25 Bs por vendedor y mes**:

| Escenario                     | Costo mensual | Vendedores para cubrirlo |
| ----------------------------- | ------------- | ------------------------ |
| A (hoy)                       | 0 Bs          | **0**                    |
| B (cobrando, en Vercel)       | ~315 Bs       | **13**                   |
| B (cobrando, fuera de Vercel) | ~175 Bs       | **7**                    |
| C (creciendo)                 | ~630 Bs       | **26**                   |

Trece vendedores pagando 25 Bs sostienen la plataforma entera en el escenario
realista, y siete si para entonces se movió el hosting. Es un número alcanzable,
y es la respuesta a "¿cuánto cobramos?": los 25 Bs **funcionan**.

Y sobre todo: **hoy no hay que pagar nada**. La cuenta de arriba sólo empieza a
correr el día que se cobre la primera membresía, que es justo el día en que hay
con qué pagarla.

### No poner el precio justo en el punto de equilibrio

Si se necesitan trece y se consiguen trece, cualquiera que se dé de baja deja
un agujero. La regla sana es que **dos tercios de los vendedores esperados
cubran el costo**: si se esperan veinte, el precio debería salir de dividir el
costo entre trece. Con 315 Bs y trece pagando, 25 Bs es exactamente eso.

## Lo que esta cuenta no incluye

**El software es la parte barata.** Lo que de verdad cuesta es el tiempo de
quien verifica perfiles, responde mensajes, revisa comprobantes de pago y media
cuando un pedido sale mal. Hoy eso lo hace el equipo gratis, y está bien — pero
no es gratis, es no pagado, y si el marketplace crece va a ser el primer cuello
de botella, mucho antes que los 45 dólares.

Tampoco incluye comisiones de pasarela de pago, porque todavía no se decidió si
el dinero pasa por la plataforma (ver `CHECKPOINT.md`). Si pasa, hay que sumar
lo que cobre el proveedor por cada transacción.

## Cómo rehacer esta cuenta

```
costo mensual total ÷ (vendedores esperados × 2/3) = precio mínimo por vendedor
```

Cuando lleguen los precios reales del dominio y se sepa cuántos vendedores hay
de verdad, se vuelve a dividir y sale el número. Nada más.
