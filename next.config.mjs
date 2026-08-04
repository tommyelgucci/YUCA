/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  experimental: {
    serverActions: {
      /*
       * Next.js rechaza una Server Action cuando el `Origin` de la petición no
       * coincide con el `Host` que él cree tener. Es una defensa real contra
       * peticiones cruzadas, pero detrás de un proxy —GitHub Codespaces, o
       * cualquier túnel de desarrollo— los dos encabezados difieren siempre y
       * todo formulario muere con "Invalid Server Actions request".
       *
       * Se listan los dominios de confianza. El dominio propio en producción no
       * hace falta ponerlo: ahí `Origin` y `Host` coinciden.
       */
      allowedOrigins: ['localhost:3000', '*.app.github.dev', '*.github.dev'],

      /*
       * El tope por defecto es 1 MB, y eso rompe dos cosas ya construidas: el
       * comprobante de pago admite hasta 4 MB y las fotos de producto hasta 3.
       * Sin subirlo, la captura de pantalla de cualquier móvil moderno falla
       * con un error que no menciona el tamaño por ningún lado.
       */
      bodySizeLimit: '5mb',
    },
  },
};

export default nextConfig;
