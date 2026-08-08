# Plan — de aquí a la feria y después

Escrito el 2026-08-03, con el YukaWaii Fest 4 en noviembre: quedan tres meses.

> **Revisión del 2026-08-04.** Llegaron requisitos nuevos de la organización y
> **cambió la sede** (a un hotel, con unas 50 mesas más). El detalle de cada uno
> está en [`CHECKPOINT.md`](CHECKPOINT.md); aquí sólo va el orden y por qué.
>
> **Lo que está congelado hasta que se mida el salón nuevo**: el plano, los
> precios por fase, los cupos por fase y la restricción de zonas. Construir eso
> con los números de hoy es trabajo que hay que rehacer.
>
> **Lo que sigue en pie**, porque no depende de la sede, en este orden:
>
> 1. **El ZIP de fotos para los carnets.** Es lo que la organización llama "lo
>    principal" y hoy no funciona: el Excel apunta a archivos que nadie genera.
>    Sin esto los carnets se imprimen sin cara.
> 2. **Congelar el plazo al declarar el comprobante.** Va *antes* de bajar el
>    plazo a 24 horas, no después: tal como está, quien paga un sábado por la
>    noche pierde la mesa el domingo. Arreglar esto después de haber devuelto
>    dinero cuesta mucho más que arreglarlo antes.
> 3. **Avisar al acompañante cuando lo suman.** Hoy alguien puede estar en una
>    mesa, salir en el mapa y en las credenciales, y no saberlo.
> 4. **Buscador de compañero por nombre**, y el aviso de que la verificación
>    tarda de 1 a 3 días.
>
> **Y una decisión que no es de código y conviene tomar ya**: escribir la regla
> sobre **IA y arte calcado**. El reglamento no la tiene, Glitter sí. Es de las
> que provocan peleas si no están escritas antes — y hay que asumir que
> aplicarla convierte la verificación en juzgar arte, que es mucho más trabajo
> para quien ya es el cuello de botella.

Tres criterios ordenan todo lo que sigue: **que no cueste dinero hasta que
genere dinero**, **que cada etapa sirva aunque la siguiente no llegue**, y
**que no cargue de trabajo manual al equipo**, que es el recurso más escaso
que hay aquí.

---

## La regla que ordena el resto

**La plataforma no toca el dinero.** Ni comisión, ni retención, ni cobro al
comprador por entrar.

No es timidez: es lo que separa una web de una pasarela de pagos. En cuanto el
dinero pasa por aquí aparecen retenciones, devoluciones, cuadres, facturación y
la obligación de responder cuando una venta sale mal — y todo eso lo paga en
horas la misma persona que ya verifica perfiles y revisa comprobantes.

El ingreso sale de **membresías de vendedor**, y sólo cuando la plataforma haya
demostrado que vende. Ver el final.

---

## Etapa 0 — Poner la feria en pie · agosto

Es lo más valioso que se puede hacer hoy, y es casi todo trabajo ya hecho: la
feria está construida al 95% y **no está viva**. La base nunca se migró y las
páginas públicas siguen leyendo datos de mentira.

- Aplicar las cinco migraciones (`npm run db:migrate`).
- Conectar el mapa, la lista de participantes y `/artistas/[slug]` a la base en
  vez de a `lib/data/`.
- Desplegar en Vercel con el subdominio gratuito.
- Invitar a tres o cuatro expositores de confianza a registrarse de verdad y
  apartar mesa.

**Cuesta 0 USD.** **Necesita de ustedes:** una computadora, una vez, para migrar.
Todo lo demás está esperando a eso.

Por qué primero: tiene fecha límite —noviembre no se mueve—, está casi
terminado, y produce justamente la gente que después va a poblar el
marketplace. Es el embudo.

## Etapa 1 — Llenar la feria · agosto–septiembre

Abrir la Fase 4 de convocatorias y que entren expositores reales. No hay casi
nada que construir; lo que falta son tres huecos del pliego:

- **QR de pago** — bloqueado: hace falta saber si es un QR fijo de la
  organización o uno por reserva.
- **Instrucciones de ingreso** en la confirmación — bloqueado por sede y
  horarios.
- **Pantalla de "¡Felicidades!"** al confirmarse el pago — se puede hacer ya.

**Cuesta 0 USD.** **Necesita de ustedes:** las respuestas de los dos bloqueos y
el reglamento oficial, que hoy está con un texto provisional.

Aquí es donde la plataforma se prueba de verdad: con gente que transfiere
dinero real por una mesa real.

## Etapa 2 — La tienda como vitrina, gratis · septiembre–octubre

El catálogo y las reseñas ya están construidos por dentro (`lib/tienda.ts`, 11
pruebas). Falta la cara visible:

- Panel del vendedor en `/mi-cuenta` para publicar productos.
- Página pública de tienda y ficha de producto.
- Estrellas y comentarios firmados.
- **Fotos**: subida a Supabase Storage. Es lo único de esta etapa que exige
  decidir algo técnico nuevo, y el plan gratuito da 1 GB (unas 5.000 fotos
  comprimidas), así que sigue sin costar nada.

**Cuesta 0 USD.** **Gratis para todos, sin excepción.** Nadie paga por publicar
ni por mirar.

Por qué aquí: los expositores de la feria ya tienen perfil verificado, o sea que
la tienda no arranca vacía. Y **la feria de noviembre es el mejor lanzamiento
posible**: toda la comunidad junta en un salón, con motivo para entrar a la web.
Llegar a noviembre con catálogo es mucho mejor que empezarlo en diciembre.

## Etapa 3 — Pedidos, todavía sin dinero · noviembre–diciembre

Después de la feria, con gente ya usando el catálogo:

- Pedido con estados, reusando el patrón de las reservas —que ya está probado y
  es casi el mismo problema.
- **El contacto se revela al confirmarse el pedido.** Eso resuelve lo que de
  verdad molestaba —no repartir el WhatsApp a desconocidos— sin construir un
  chat, que es la parte cara de toda la propuesta (tiempo real,
  notificaciones, moderación, denuncias, conversaciones que pueden acabar
  siendo prueba en una disputa).
- El pago se coordina fuera: QR directo al vendedor o efectivo en la entrega.
- La plataforma **registra el valor de cada pedido** aunque no lo cobre. Ese
  dato es el que responde después "¿cuánto podemos cobrar?" con hechos.

**Cuesta 0 USD.** El chat completo queda para más adelante, si los pedidos
demuestran que hace falta.

### Nota sobre las membresías (revisión del 2026-08-04)

La propuesta que llegó de la organización **mejoró en lo que importaba**: ya no
cobra por ver el catálogo. Los beneficios pasaron a ser adelantos, sugerir
temáticas y saber de otras ferias, que es exactamente el "club de apoyo" que se
recomienda más abajo en vez de una puerta.

Lo que sigue mal, con el detalle en `CHECKPOINT.md`: el **10% de descuento en la
mesa vale dinero negativo** para quien lo compra (35 Bs de cuota contra 30–35 de
ahorro) y conviene cambiarlo por **elegir mesa antes que el resto**, que no
cuesta nada; el **cobro mensual** sigue siendo inviable a mano y tiene que ser
anual o por ciclo de feria; y el beneficio principal es **contenido que alguien
tiene que escribir cada mes**, no una función que se programa una vez.

## Etapa 4 — Cobrar · 2027, con datos delante

Recién aquí, y sólo si las etapas anteriores funcionaron:

- **Membresía de vendedor, 25 Bs/mes de referencia**, que es lo que sale de
  dividir el costo real entre los vendedores esperados (ver `COSTOS.md`).
- **Gratis hasta la primera venta hecha por la plataforma.** Convierte la cuota
  en consecuencia de un resultado en vez de en una apuesta, y es un argumento
  de venta por sí solo.
- **Cobro anual o por ciclo de feria, no mensual.** No hay débito automático al
  alcance: serían decenas de QR chicos que alguien tendría que cuadrar a mano
  cada mes, y esa hora de trabajo vale más que los 10 Bs que recauda.
- **El comprador nunca paga por entrar.** Si se quiere algo para los fans, que
  sea un club de apoyo opcional —adelantos, insignia, algo físico en la feria—
  y jamás una puerta.
- Aquí también toca decidir si conviene mover el hosting fuera de Vercel para
  ahorrar sus 20 USD de uso comercial. Con siete vendedores en vez de trece se
  cubre todo.

---

## Lo que deliberadamente no se hace

- **Comisión por venta.** Obliga a que el dinero pase por la plataforma y
  multiplica el trabajo y la responsabilidad. A esta escala recauda casi lo
  mismo que una membresía.
- **Suscripción de comprador con niveles.** Cobrar por mirar mata un
  marketplace nuevo, y tres niveles son tres veces el trabajo de decidir y
  hacer cumplir beneficios.
- **Chat en tiempo real.** Se sustituye por revelar el contacto al confirmar.
- **Cambiar de base de datos.** Ver `COSTOS.md`: la garantía de que dos personas
  no paguen por la misma mesa la impone Postgres, y no se regala.

## El riesgo que no es técnico

El cuello de botella no van a ser los 45 dólares ni el código: va a ser **la
persona que verifica perfiles, revisa comprobantes, responde mensajes y media
cuando un pedido sale mal**. Hoy ese trabajo es gratis porque no se paga, no
porque no exista.

Por eso, entre dos funciones parecidas, aquí se elige siempre la que **no**
suma trabajo manual. Y por eso importa la cola de verificación: ya es requisito
para tener mesa, para sumar acompañante y para vender. Si se atasca, se atasca
todo.

## Lo único que bloquea hoy

**Migrar la base desde una computadora.** Un comando. Todo lo demás espera a eso.
