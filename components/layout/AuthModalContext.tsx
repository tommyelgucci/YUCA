'use client';

import { createContext, useContext } from 'react';

export type AuthVariant = 'welcome' | 'signup' | 'login';
type OpenAuth = (variant?: AuthVariant) => void;

/**
 * Da acceso al modal de cuenta desde cualquier punto del árbol.
 *
 * El modal vive en `SiteChrome`, pero las páginas se le pasan como `children`
 * (no como props), así que no hay forma de bajarle un callback. El contexto
 * evita duplicar un modal por sección.
 */
const AuthModalContext = createContext<OpenAuth>(() => {});

export const AuthModalProvider = AuthModalContext.Provider;

export function useAuthModal(): OpenAuth {
  return useContext(AuthModalContext);
}
