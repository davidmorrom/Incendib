import type { Config } from 'tailwindcss';

/*
 * Tailwind consume las variables CSS de globals.css (que reflejan
 * src/lib/design/tokens.ts). Así el theming claro/oscuro ocurre en runtime
 * sin recompilar y sin duplicar valores.
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx,mdx}'],
  darkMode: ['selector', ':root[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        bg: {
          base: 'var(--bg-base)',
          raised: 'var(--bg-raised)',
          sunken: 'var(--bg-sunken)',
          card: 'var(--bg-card)',
          map: 'var(--bg-map)',
        },
        fg: {
          DEFAULT: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          mute: 'var(--text-mute)',
          body: 'var(--text-body)',
        },
        state: {
          activo: 'var(--state-activo)',
          'activo-text': 'var(--state-activo-text)',
          controlado: 'var(--state-controlado)',
          'controlado-text': 'var(--state-controlado-text)',
          estabilizado: 'var(--state-estabilizado)',
          'estabilizado-text': 'var(--state-estabilizado-text)',
          extinguido: 'var(--state-extinguido)',
          'extinguido-text': 'var(--state-extinguido-text)',
          foco: 'var(--state-foco)',
          'foco-text': 'var(--state-foco-text)',
        },
        action: {
          DEFAULT: 'var(--action)',
          text: 'var(--action-text)',
        },
        ok: {
          DEFAULT: 'var(--ok)',
          text: 'var(--ok-text)',
        },
        'error-text': 'var(--error-text)',
        warn: 'var(--warn)',
      },
      borderColor: {
        subtle: 'var(--border-subtle)',
        DEFAULT: 'var(--border-default)',
        strong: 'var(--border-strong)',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        // Escala del handoff (README §Design tokens · Tipografía)
        meta: ['10px', { lineHeight: '1.4' }],
        label: ['9.5px', { lineHeight: '1.2', letterSpacing: '0.12em' }],
        row: ['12.5px', { lineHeight: '1.3' }],
        body: ['12.5px', { lineHeight: '1.5' }],
        title: ['16px', { lineHeight: '1.25' }],
        kpi: ['28px', { lineHeight: '1' }],
      },
      spacing: {
        screen: '14px', // padding de pantalla
        hit: '44px', // mínimo táctil
      },
      borderRadius: {
        chip: '4px',
        card: '8px',
        btn: '8px',
      },
      animation: {
        firepulse: 'ifPulse 1.8s ease-out infinite',
        shimmer: 'ifShimmer 1.5s ease-in-out infinite',
        spin: 'ifSpin 0.8s linear infinite',
      },
      keyframes: {
        ifPulse: {
          '0%': { transform: 'scale(1)', opacity: '0.55' },
          '70%': { transform: 'scale(2.4)', opacity: '0' },
          '100%': { opacity: '0' },
        },
        ifShimmer: {
          '0%': { opacity: '0.45' },
          '50%': { opacity: '0.9' },
          '100%': { opacity: '0.45' },
        },
        ifSpin: { to: { transform: 'rotate(360deg)' } },
      },
    },
  },
  plugins: [],
};

export default config;
