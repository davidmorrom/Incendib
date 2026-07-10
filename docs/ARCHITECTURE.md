# Arquitectura — Incendib

Visor web sin ánimo de lucro de incendios forestales activos en España y
Portugal. **Mobile-first**, modo claro por defecto (oscuro "sala de control"
opt-in), PWA (no instalable desde tiendas), con panel desktop. Este documento
describe la estructura del código;
el diseño hifi vive en `docs/HANDOFF.md` y el análisis de fuentes en
`docs/DATA-SOURCES.md`.

## Stack

- **Next.js (App Router) + TypeScript** — SSR de fichas compartibles, API
  routes para cachear fuentes, imágenes OG en servidor, ISR.
- **Tailwind CSS** — utilidades cableadas a variables CSS (theming en runtime).
- **MapLibre GL JS** (`maplibre-gl` + `react-map-gl`) — mapa vectorial sin API
  key; teselas de OpenFreeMap.
- **Zustand** — estado transversal ligero (`src/lib/store.ts`).
- **Service Worker** propio — caché offline + Web Push.

## Sistema de diseño (fuente única de verdad)

El color SIEMPRE codifica un dato; nunca es decorativo. Los marcadores se
distinguen por **color + forma** (WCAG 2.2 AA, daltonismo).

```
src/lib/design/tokens.ts   ← valores literales (JS: mapa, leyenda, OG)
src/app/globals.css        ← mismas paletas como variables CSS (theming)
tailwind.config.ts         ← utilidades que consumen esas variables
```

Regla: si cambia un color, se cambia en `tokens.ts` **y** en `globals.css` a la
vez. Tailwind no necesita tocarse (usa `var(--…)`).

- Tema claro por defecto (`:root`). Oscuro (sala de control) vía
  `[data-theme="dark"]`, opt-in del usuario. No se sigue `prefers-color-scheme`:
  el tema es una decisión explícita. El toggle escribe `localStorage` y un
  script inline en `layout.tsx` lo aplica antes del primer paint.
- Tipografía: IBM Plex Sans (UI) + IBM Plex Mono (cifras, timestamps,
  coordenadas) vía `next/font`. Miles separados por **espacio** (`formatNumber`).

## Estructura de carpetas

```
src/
├── app/
│   ├── layout.tsx              # shell raíz: fuentes, metadata PWA, theme init
│   ├── globals.css             # variables de tema + keyframes + overlays
│   ├── icon.svg                # favicon (logo de marca)
│   ├── not-found.tsx
│   ├── (app)/                  # grupo con shell móvil + barra inferior + i18n
│   │   ├── layout.tsx          # I18nProvider + BottomNav
│   │   ├── page.tsx            # Mapa (home, 2a)
│   │   ├── informe/            # Informe (2b)
│   │   ├── noticias/           # Noticias y directos (3a)
│   │   ├── fuentes/            # Fuentes y licencias (3b)
│   │   └── historico/          # Histórico (10a–10b)
│   ├── f/[slug]/               # ficha compartible (1c) + opengraph-image
│   └── api/fires/              # endpoint agregado (cachea FIRMS en live)
├── components/
│   ├── screens/                # MapaScreen (isla cliente de la home)
│   ├── map/                    # MapCanvas, FireMarker, MapLegend, MapControls…
│   ├── fires/                  # FireListSheet, FireRow
│   ├── layout/                 # AppHeader, BottomNav
│   ├── ui/                     # Logo, StateGlyph, LevelBadge, KpiStrip
│   └── i18n/                   # I18nProvider (useDict)
├── lib/
│   ├── design/                 # tokens.ts, color.ts (color-mix)
│   ├── map/config.ts           # estilo, encuadre, máscara/halo
│   ├── fires/                  # derive (orden/KPIs), style (clases de estado)
│   ├── hooks/useTheme.ts       # tema efectivo
│   ├── store.ts                # estado (tab, ficha, filtro, red, tema, idioma)
│   ├── time.ts                 # "ahora" determinista + timeAgo localizado
│   ├── i18n/                   # ES (base) / PT / EN
│   ├── data/                   # sources.ts, mock.ts, adapters/, index.ts
│   ├── pwa/register-sw.ts
│   └── utils/                  # cn, format
└── types/fire.ts               # modelo de dominio (Fire, Hotspot, ...)
public/
├── manifest.webmanifest
├── sw.js                       # service worker (offline + push)
├── geo/                        # máscara del mundo + contorno ES+PT (gen-mask)
└── icons/                      # PNG pendientes de generar (ver README ahí)
scripts/gen-mask.mjs            # genera las geometrías estáticas del mapa
```

## Datos

Precisión creciente por capas (docs/DATA-SOURCES.md §1):

1. **NASA FIRMS** — hotspots casi en tiempo real (detección térmica, NO
   incendio confirmado). Capa universal. Se cachea en backend por su rate limit
   (5000 tx / 10 min).
2. **EFFIS / Copernicus** — perímetros de área quemada (WFS→GeoJSON) y FWI (WMS
   raster). CC BY 4.0.
3. **Nacionales/autonómicas** — estado operativo y gravedad: fogos.pt/ICNF (PT),
   JCyL y Bombers de Catalunya (ES con API abierta).

`NEXT_PUBLIC_DATA_MODE=mock` (por defecto) sirve `src/lib/data/mock.ts`. En
`live`, `getFires()` agregará los adaptadores de `src/lib/data/adapters/`.

## Estados de red

Nunca se rompe el mapa por una fuente caída: la degradación se señaliza **por
fuente** (banner ámbar). Offline sirve caché con antigüedad visible. Estados en
`store.ts`: `loading | ok | error | offline | reconnecting`.

## Accesibilidad

WCAG 2.2 AA: foco visible 2px, skip-link, `aria-live` para evacuaciones/
reconexión, informe como `<table>` real, `lang` es/pt por bloque, reescalado
200 %, `prefers-reduced-motion` (el pulso pasa a anillo estático).

## Legal

Atribución por fuente en "Fuentes y licencias" (`src/lib/data/sources.ts`) y
disclaimer permanente: **"No sustituye a los canales oficiales de emergencia.
Emergencias: 112"**.

## Puesta en marcha

```bash
npm install
cp .env.example .env.local   # opcional; arranca en modo mock sin claves
npm run dev                  # http://localhost:3000
npm run build && npm start   # producción
npm run typecheck && npm run lint
```
