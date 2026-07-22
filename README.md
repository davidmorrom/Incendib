<div align="center">

# 🔥 Incendib

**Visor en tiempo real de incendios forestales activos en España y Portugal**

Herramienta pública y sin ánimo de lucro que agrega datos oficiales de focos
satelitales, perímetros de área quemada y estado operativo en un mapa claro,
serio y usable — pensada como panel de sala de emergencias, no como landing.

[![Next.js](https://img.shields.io/badge/Next.js-15-000000?logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![MapLibre](https://img.shields.io/badge/MapLibre-GL-295DAA?logo=maplibre&logoColor=white)](https://maplibre.org)
![Version](https://img.shields.io/badge/version-0.37.x-E5484D)

</div>

> [!WARNING]
> **Incendib no es un canal oficial de emergencias.** Los datos pueden tener
> latencia y las detecciones satelitales no equivalen a incendios confirmados.
> Ante peligro inmediato, llama al **112**.

---

## Vista previa

| Modo oscuro (por defecto, "sala de control") | Modo claro (exteriores) |
| :---: | :---: |
| ![Mapa en modo oscuro](docs/screenshots/mapa-oscuro.png) | ![Mapa en modo claro](docs/screenshots/mapa-claro.png) |

### Pantallas

| Informe | Ficha de incendio | Noticias | Fuentes |
| :---: | :---: | :---: | :---: |
| ![Informe](docs/screenshots/informe-dark.png) | ![Ficha](docs/screenshots/ficha-dark.png) | ![Noticias](docs/screenshots/noticias-dark.png) | ![Fuentes](docs/screenshots/fuentes-dark.png) |

## Qué es

Incendib es una **web app mobile-first** (PWA, no requiere tienda de apps) que
reúne información de incendios de la Península Ibérica, Canarias, Baleares,
Azores, Madeira, Ceuta y Melilla. Combina tres capas de precisión creciente:

1. **Focos satelitales** casi en tiempo real (NASA FIRMS · VIIRS/MODIS).
2. **Perímetros de área quemada y riesgo meteorológico** (EFFIS / Copernicus EMS).
3. **Estado operativo y nivel de gravedad** de fuentes nacionales y autonómicas
   (fogos.pt/ICNF en Portugal; JCyL y Bombers de Catalunya en España).

## Características

- 🗺️ **Mapa en vivo** (MapLibre GL) con el resto del mundo atenuado y España +
  Portugal resaltados con un halo sutil; focos, perímetros de área quemada y
  filtros por estado, nivel, superficie, sensor y riesgo.
- 🎨 **Marcadores por color _y_ forma** (activo, controlado, estabilizado,
  extinguido, foco satelital) — accesible para daltonismo, nunca solo color.
- 📊 **Informe de situación**: KPIs (activos, hectáreas, focos 24 h), tabla
  densa ordenable y aviso por fuente degradada.
- 🗞️ **Boletín semanal** archivable en `/boletines` y por edición
  (`/boletin/{año}-w{semana}`), con imagen Open Graph y vista imprimible.
- 🔔 **Alertas Web Push por zona** (suscripción por territorio/estado), con
  backend de detección de cambios.
- 🕰️ **Histórico de campaña** con el archivo real de áreas quemadas (EFFIS).
- 📰 **Noticias reales** agregadas (Google News RSS ES + PT).
- 🌗 **Tema oscuro por defecto** y claro para exteriores, con persistencia.
- 🌐 **Trilingüe** ES · PT · EN; el dato bilingüe (estados PT «em curso»…) se
  conserva en su idioma original.
- ♿ **Accesibilidad WCAG 2.2 AA**: foco visible, `prefers-reduced-motion`,
  nombres accesibles completos en marcadores y filas.
- 🔗 **Ficha por incendio** con URL propia y compartible (`/f/{slug}`), meteo
  local (Open-Meteo) e imagen Open Graph generada en servidor.
- 🔎 **SEO**: `sitemap.xml` dinámico (rutas, fichas y boletines) + `robots.txt`.
- 📶 **Resiliencia**: la caída de una fuente se señaliza por capa, nunca rompe
  el mapa; caché offline con antigüedad visible.

## Stack técnico

| Área | Tecnología |
| --- | --- |
| Framework | Next.js 15 (App Router) · React 19 · TypeScript |
| Estilos | Tailwind CSS con tokens sobre variables CSS (theming en runtime) |
| Mapa | MapLibre GL JS vía `react-map-gl` · teselas OpenFreeMap (sin API key) |
| Estado | Zustand |
| PWA | Service Worker propio (offline + Web Push) |
| Tipografía | IBM Plex Sans (UI) + IBM Plex Mono (cifras) |

## Puesta en marcha

Requisitos: **Node.js ≥ 20**.

```bash
# 1. Instalar dependencias
npm install

# 2. (Opcional) configurar variables de entorno
cp .env.example .env.local     # arranca en modo mock sin ninguna clave

# 3. Desarrollo
npm run dev                    # http://localhost:3000

# 4. Producción
npm run build && npm start
```

Sin claves, la app arranca en **modo demostración** (`NEXT_PUBLIC_DATA_MODE=mock`)
con un conjunto de incendios de ejemplo. **En producción funciona con datos en
vivo** (`live`): incidentes de fogos.pt (PT), INFORCYL (Castilla y León), INFOCA
(Andalucía) y Bombers (Cataluña); focos NASA FIRMS y perímetros/área quemada
EFFIS; meteo local vía Open-Meteo. Para el detalle de fuentes y claves, ver
[`docs/DATA-SOURCES.md`](docs/DATA-SOURCES.md).

### Scripts

| Script | Descripción |
| --- | --- |
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm start` | Servir el build |
| `npm run typecheck` | Comprobación de tipos (`tsc --noEmit`) |
| `npm run lint` | ESLint (config de Next) |
| `npm run geo:gen` | Regenera las geometrías del mapa (máscara ES+PT) |

## Estructura

```
src/
├── app/            # rutas (App Router): mapa, informe, noticias, fuentes, ficha,
│                   #   boletines, alertas, histórico, legal, API
├── content/        # contenido estático (ediciones del boletín semanal)
├── components/     # UI, mapa, layout, pantallas, i18n
├── lib/            # design tokens, datos, i18n, mapa, utilidades, store
└── types/          # modelo de dominio (Fire, Hotspot…)
public/geo/         # geometrías estáticas (máscara del mundo, contorno ES+PT)
docs/               # arquitectura, fuentes de datos, handoff de diseño, capturas
```

Detalle completo en [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Fuentes de datos y licencias

Todas las fuentes son de reutilización libre con atribución:

- **EFFIS / Copernicus EMS** — perímetros y FWI · © European Union (CC BY 4.0).
- **NASA FIRMS** (VIIRS/MODIS) — focos térmicos · dominio público.
- **fogos.pt / ANEPC**, **ICNF** — estado operativo en Portugal.
- **AEMET / IPMA** — meteorología y riesgo de incendio.
- **INFORCYL (JCyL)**, **INFOCA (Andalucía)**, **Bombers de la Generalitat**
  (Cataluña) — estado operativo autonómico en vivo.
- **Open-Meteo** — meteorología local por incendio (sin clave).
- Cartografía base © **OpenStreetMap** (ODbL) vía **OpenFreeMap**.

## Hoja de ruta

- [x] **v0.1** — Estructura, sistema de diseño, PWA, i18n, capa de datos.
- [x] **v0.2** — Pantalla **Mapa** (home) con MapLibre, máscara, marcadores, filtros
  y perímetros de área quemada (EFFIS).
- [x] **v0.3** — Pantallas **Informe**, **Fuentes**, **Ficha** y **Noticias**;
  estados de red (offline/reconexión), error y carga (skeleton).
- [x] **v0.4** — **Panel desktop** (1d): filtros, mapa y lista en tres columnas.
- [x] **v0.15–v0.16** — **Datos en vivo** (FIRMS, EFFIS, fogos.pt, INFORCYL,
  INFOCA, Bombers), hectáreas oficiales, noticias reales y meteo local.
- [x] **v0.16** — **Web Push** (alertas por zona) e **histórico** de campaña.
- [x] **v0.17** — **Boletín semanal** (F1: edición publicada; F2: automatización;
  F3: imagen OG) y **SEO** (`sitemap.xml` + `robots.txt`).
- [x] **v0.30** — **Estadísticas** (`/estadisticas`, serie histórica oficial
  EGIF/MITECO) y **páginas por provincia** (`/p/[provincia]`).
- [x] **v0.35–v0.37** — **Fuente oficial de Portugal** (ANEPC/SGIFR), **clustering
  de marcadores**, selector de mapa base y **extensión aproximada por focos** en la
  ficha (siempre marcada como aproximada, nunca en KPI ni boletín).
- [ ] **Próximo** — más regiones autonómicas en vivo, selección de provincia en el
  mapa y estadísticas F2/F3. Ver la investigación en
  [`docs/research/`](docs/research/00-INDICE.md).

> Pendientes bloqueados por falta de fuente o decisión (documentados en
> `docs/notas-sesion-*.md`): más regiones autonómicas en vivo, evacuación en
> vivo, FWI por incendio, cámaras DGT reales e islas (fuera del bbox satelital).

## Licencia

Código bajo licencia **[MIT](LICENSE)** © 2026 David Moreno Romero — libre uso,
modificación y distribución conservando el aviso de copyright, sin garantía.

Los **datos** mostrados pertenecen a sus fuentes y conservan sus propias licencias
de reutilización con atribución (ver «Fuentes de datos y licencias» más arriba). El
nombre y la marca «Incendib» no se licencian.
