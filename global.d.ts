/**
 * Next declara tipos para `*.module.css`, pero no para hojas de estilo
 * globales importadas por efecto secundario (`import './globals.css'`).
 * Con `moduleResolution: bundler`, TypeScript exige esta declaración.
 */
declare module '*.css';
