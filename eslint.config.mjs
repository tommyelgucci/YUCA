import next from 'eslint-config-next/core-web-vitals';

/**
 * Configuración de ESLint.
 *
 * No había ninguna. `npm run lint` llamaba a `next lint`, que al no encontrar
 * config abría un asistente interactivo y se quedaba esperando una respuesta —
 * o sea que el proyecto llevaba días **sin linter**, y los `eslint-disable` que
 * hay repartidos por el código no los comprobaba nadie.
 *
 * Además `next lint` está deprecado desde Next 15 y desaparece en la 16, así
 * que el script pasa a llamar a `eslint` directamente.
 *
 * `core-web-vitals` es el preset de Next con las reglas de rendimiento subidas
 * a error (imágenes sin optimizar, `<a>` en vez de `<Link>`…). Se elige el
 * estricto a propósito: las tres o cuatro excepciones reales del proyecto ya
 * están escritas una a una con su motivo al lado, que es justo lo que se
 * quiere — una excepción explicada y no una regla apagada para todos.
 */
export default [
  {
    ignores: ['.next/**', 'out/**', 'node_modules/**', 'next-env.d.ts'],
  },
  ...next,
  {
    rules: {
      /*
       * Avisa de cargar fuentes fuera de `pages/_document.js`. Este proyecto no
       * tiene carpeta `pages`: usa el App Router, donde las fuentes van en el
       * `<head>` de `app/layout.tsx` y se cargan una sola vez, que es
       * exactamente lo que la regla quiere. No hay forma de cumplirla.
       */
      '@next/next/no-page-custom-font': 'off',
    },
  },
  {
    /*
     * Next y PostCSS **exigen** que sus configuraciones exporten el objeto
     * directamente. Nombrar una variable antes sólo para satisfacer la regla no
     * mejora nada, así que se apaga en esos dos archivos y en ningún otro.
     */
    files: ['*.config.mjs', '*.config.js'],
    rules: { 'import/no-anonymous-default-export': 'off' },
  },
];
