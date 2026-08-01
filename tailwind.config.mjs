/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
    './lib/**/*.{js,jsx,ts,tsx}',
    './hooks/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      /**
       * Tokens de marca Proyecto Yuca.
       * Se exponen como colores reales de Tailwind (bg-yuca-green, text-yuca-ink-soft…)
       * para que el sistema de diseño viva en un solo lugar.
       */
      colors: {
        yuca: {
          bg: '#faf8f5',
          cream: {
            DEFAULT: '#f5e6ca',
            soft: '#fbf3e3',
            deep: '#ecd7ae',
          },
          green: {
            DEFAULT: '#6b8e23',
            soft: '#8fae4a',
            mist: '#eef3e2',
            deep: '#4a5f26',
            night: '#33421a',
          },
          mustard: {
            DEFAULT: '#e2b04c',
            deep: '#c8963a',
          },
          coral: {
            DEFAULT: '#e05a47',
            soft: '#f3b6a8',
            deep: '#c94734',
          },
          ink: {
            DEFAULT: '#3a3226',
            soft: '#6b6153',
          },
        },
        /**
         * Colores del plano impreso de la feria. No son de la identidad Yuca a
         * propósito: se respetan tal cual para que quien ya vio el mapa en
         * redes reconozca el mismo código de color en la web.
         */
        feria: {
          verde: { DEFAULT: '#4CE04C', deep: '#2FA82F' },
          morado: { DEFAULT: '#8B14C8', deep: '#5E0D89' },
          rosa: { DEFAULT: '#F04A80', deep: '#C22B5C' },
          celeste: { DEFAULT: '#7FA8F0', deep: '#4E77C4' },
        },
        // Paleta Frutiger Aero / Y2K, sólo para el banner de edición especial.
        aero: {
          foam: '#e9fbff',
          sky: '#7fd4ee',
          aqua: '#5ec9c1',
          lime: '#a8e063',
          deep: '#1f6f8b',
          ink: '#0d4a63', // texto sobre cristal: contraste AA
        },
      },
      fontFamily: {
        display: ['"Baloo 2"', 'ui-rounded', 'system-ui', 'sans-serif'],
        body: ['Nunito', 'system-ui', '-apple-system', 'sans-serif'],
        sans: ['Nunito', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      boxShadow: {
        soft: '0 2px 10px -2px rgba(58, 50, 38, 0.10)',
        lift: '0 18px 40px -18px rgba(74, 95, 38, 0.45)',
        card: '0 10px 30px -18px rgba(58, 50, 38, 0.35)',
        glass: '0 8px 32px -8px rgba(31, 111, 139, 0.35), inset 0 1px 0 rgba(255,255,255,0.6)',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        sway: {
          '0%, 100%': { transform: 'rotate(-2.5deg)' },
          '50%': { transform: 'rotate(2.5deg)' },
        },
        rise: {
          '0%': { transform: 'translateY(10%) scale(0.9)', opacity: '0' },
          '15%': { opacity: '0.9' },
          '100%': { transform: 'translateY(-160%) scale(1.1)', opacity: '0' },
        },
        shimmer: {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
      },
      animation: {
        float: 'float 6s ease-in-out infinite',
        sway: 'sway 7s ease-in-out infinite',
        rise: 'rise 12s linear infinite',
        shimmer: 'shimmer 14s ease-in-out infinite',
      },
      transitionTimingFunction: {
        yuca: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
  plugins: [],
};
