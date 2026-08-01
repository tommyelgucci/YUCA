# Imágenes del proyecto

Las imágenes se auto-descubren: sueltas el archivo en la carpeta correcta con el
nombre indicado y la web lo usa sola. No hay que tocar código de componentes.

```
src/assets/
├── events/     fotos de las ediciones pasadas del festival
└── mascot/     arte oficial de la mascota (Yuquita)
```

## 1. Fotos de eventos (`events/`)

El nombre del archivo debe coincidir con el campo `slug` de cada edición en
[`src/data/site.js`](../data/site.js). Con los slugs actuales:

| Archivo esperado                  | Edición            |
| --------------------------------- | ------------------ |
| `events/yukawaii-fest-1.jpg`      | YukaWaii Fest 1    |
| `events/yukawaii-fest-2.jpg`      | YukaWaii Fest 2    |
| `events/yukawaii-fest-3.jpg`      | YukaWaii Fest 3    |
| `events/san-valentin.jpg`         | San Valentín       |

Formatos: `.jpg`, `.jpeg`, `.png`, `.webp`, `.avif`.
Recomendado: **webp**, proporción vertical **3:4** (ej. 900 × 1200 px), < 300 KB.

Mientras no exista el archivo, la tarjeta muestra un marcador de posición con el
color de la edición — la web nunca se rompe por una foto faltante.

## 2. Mascota (`mascot/`)

Coloca el arte real como `mascot/yuquita.png` (o `.webp` / `.svg`).
Ideal: PNG con **fondo transparente**, cuadrado, mínimo 800 × 800 px.

En cuanto exista ese archivo, el `<Mascot />` deja de dibujar el SVG
placeholder y pasa a mostrar el arte real en el hero, el header y el modal.

También puedes pasar una imagen puntual por props:

```jsx
<Mascot src="/ruta/a/otra-imagen.png" alt="Yuquita saludando" />
```

## 3. Imagen para redes sociales

La miniatura de Open Graph (WhatsApp, Discord, Facebook…) se sirve desde
`public/og-image.jpg`, **1200 × 630 px**. Está referenciada en `index.html`.

## Texto alternativo

Cada imagen necesita su `alt` descriptivo. Se define junto al contenido en
`src/data/site.js` (campos `alt`), no en los componentes.
