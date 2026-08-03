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
actividad.** Para probar está bien; para una tienda abierta al público no,
porque significa que la web se cae sola en cuanto haya una semana floja.

## Tres escenarios

Al cambio oficial (≈ 7 Bs por dólar). **Ojo con esto**: hay que pagarlo con
tarjeta internacional y en dólares, así que el costo real en bolivianos depende
de a cuánto se consigan — puede ser bastante más que la cuenta de abajo.

### A — Hoy: sólo la feria, sin cobrar nada

Todo entra en los planes gratuitos.

**≈ 0 USD/mes**, más el dominio. Es donde estamos ahora y puede seguir así
meses.

### B — Marketplace en marcha, con vendedores pagando

Vercel Pro (obligatorio al cobrar) + Supabase Pro (para que no se pause y quepan
las fotos). Clerk y Resend siguen en gratis.

**45 USD/mes ≈ 315 Bs/mes**

### C — Creciendo: más de 10.000 usuarios activos o muchos correos

Los cuatro de pago.

**90 USD/mes ≈ 630 Bs/mes**

## Cuántos vendedores hacen falta

A **25 Bs por vendedor y mes**:

| Escenario | Costo mensual | Vendedores para cubrirlo |
| --------- | ------------- | ------------------------ |
| A         | ~0 Bs         | 0                        |
| B         | ~315 Bs       | **13**                   |
| C         | ~630 Bs       | **26**                   |

Trece vendedores pagando 25 Bs sostienen la plataforma entera en el escenario
realista. Es un número alcanzable, y es la respuesta a "¿cuánto cobramos?": los
25 Bs **funcionan**, siempre que haya trece personas dispuestas a pagarlos.

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
