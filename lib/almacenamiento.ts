/**
 * Subida de imágenes a Supabase Storage.
 *
 * Es la primera vez que el proyecto guarda archivos fuera de la base. Hasta
 * ahora el único archivo era el comprobante de una transferencia, y se metió
 * como `data:` URL en su propia fila —un apaño aceptable para una captura al
 * mes—. Un catálogo no admite ese atajo: son muchas imágenes, grandes, y
 * cargarlas dentro de cada consulta engordaría todas las páginas de la tienda.
 *
 * Se habla con la API REST de Storage por `fetch`, sin añadir `supabase-js`.
 * El proyecto ya se conecta a Postgres con su propio cliente; sumar un SDK
 * entero para dos llamadas HTTP sería pagar mucho por muy poco.
 *
 * **La clave de servicio no sale nunca del servidor.** No lleva prefijo
 * `NEXT_PUBLIC_`, así que Next.js no la mete en el JavaScript del navegador, y
 * este módulo sólo se importa desde Server Actions.
 */

const URL_SUPABASE = process.env.NEXT_PUBLIC_SUPABASE_URL;
const CLAVE_SERVICIO = process.env.SUPABASE_SERVICE_ROLE_KEY;

/** Bucket público donde viven las fotos de producto. */
const BUCKET = 'productos';

/** 3 MB. Una foto de producto bien hecha pesa mucho menos. */
const MAX_BYTES = 3 * 1024 * 1024;

const TIPOS = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
]);

/**
 * ¿Se puede subir?
 *
 * Mientras esto sea falso la interfaz no ofrece el botón, igual que sin claves
 * de Clerk no ofrece cuentas. Prometer una subida que va a fallar es peor que
 * no ofrecerla.
 */
export const almacenamientoActivo = Boolean(URL_SUPABASE && CLAVE_SERVICIO);

export type ResultadoSubida =
  | { ok: true; url: string; ruta: string }
  | { ok: false; motivo: 'sin-configurar' | 'tipo' | 'peso' | 'fallo'; detalle?: string };

/**
 * Sube una imagen y devuelve su URL pública.
 *
 * La ruta lleva el id del producto y un sufijo al azar: dos fotos del mismo
 * producto no pueden pisarse, y el nombre original del archivo no se usa
 * porque suele traer tildes, espacios y a veces el nombre de quien la hizo.
 */
export async function subirImagen(
  archivo: File,
  params: { productoId: string },
): Promise<ResultadoSubida> {
  if (!URL_SUPABASE || !CLAVE_SERVICIO) return { ok: false, motivo: 'sin-configurar' };

  const extension = TIPOS.get(archivo.type);
  if (!extension) return { ok: false, motivo: 'tipo' };
  if (archivo.size > MAX_BYTES) return { ok: false, motivo: 'peso' };

  const ruta = `${params.productoId}/${crypto.randomUUID()}.${extension}`;

  const respuesta = await fetch(`${URL_SUPABASE}/storage/v1/object/${BUCKET}/${ruta}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${CLAVE_SERVICIO}`,
      'Content-Type': archivo.type,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
    body: await archivo.arrayBuffer(),
  });

  if (!respuesta.ok) {
    // El cuerpo de Storage explica si falta el bucket o si la clave no vale;
    // se arrastra hasta la interfaz porque es justo lo que hay que corregir.
    return { ok: false, motivo: 'fallo', detalle: await respuesta.text() };
  }

  return {
    ok: true,
    ruta,
    url: `${URL_SUPABASE}/storage/v1/object/public/${BUCKET}/${ruta}`,
  };
}

/**
 * Borra una imagen del bucket.
 *
 * Se llama al quitar la foto y al borrar el producto. Si falla no se avisa a
 * nadie: la fila ya no existe, y un archivo huérfano de 200 KB molesta mucho
 * menos que un error en la cara de quien sólo quería borrar una foto.
 */
export async function borrarImagen(ruta: string): Promise<void> {
  if (!URL_SUPABASE || !CLAVE_SERVICIO) return;

  await fetch(`${URL_SUPABASE}/storage/v1/object/${BUCKET}/${ruta}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${CLAVE_SERVICIO}` },
  }).catch(() => undefined);
}

/** Traduce el fallo a algo que se pueda leer sin saber qué es un bucket. */
export function explicarSubida(resultado: Extract<ResultadoSubida, { ok: false }>): string {
  switch (resultado.motivo) {
    case 'sin-configurar':
      return 'Todavía no está configurado el almacenamiento de imágenes.';
    case 'tipo':
      return 'La foto tiene que ser JPG, PNG o WEBP.';
    case 'peso':
      return 'La foto pesa más de 3 MB. Redúcela un poco y vuelve a intentarlo.';
    case 'fallo':
      return `No se pudo guardar la foto. ${resultado.detalle ?? ''}`.trim();
  }
}
