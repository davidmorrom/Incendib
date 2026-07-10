# Changelog

Todas las novedades relevantes de este proyecto se documentan aquí.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es/1.1.0/) y el
proyecto se adhiere a [Versionado Semántico](https://semver.org/lang/es/).

## [0.3.4] - 2026-07-10

### Añadido

- **Estado de red global** (4d/5b): banda de "sin conexión" (datos en caché) y
  toast de reconexión, con `aria-live`. La caída de red no rompe la UI.

### Corregido

- El título "Incendio de …" ahora se localiza (ES/PT/EN) en la ficha y al
  compartir.

## [0.3.3] - 2026-07-10

### Añadido

- Pantalla **Noticias y directos** (3a): directo 24 h (embed YouTube nocookie
  con carga al pulsar y conmutador de canal), titulares filtrados por incendio,
  cámaras DGT cercanas y cuentas oficiales.
- Con esto se completan las **cinco pantallas principales** (Mapa, Informe,
  Fuentes, Ficha y Noticias).

## [0.3.2] - 2026-07-10

### Añadido

- Pantalla **Ficha de incendio** (1c), con URL propia y compartible (`/f/{slug}`):
  mapa enfocado (perímetro + marcador), badges de estado/nivel/FWI, estadísticas
  (superficie, inicio, medios, meteo), evolución (timeline) y acciones (seguir,
  compartir con Web Share / copiar enlace). Layout i18n propio para `/f`.
- Modelo enriquecido: meteorología local, índice FWI y `timeline` por incendio.

### Corregido

- Atribución del mapa reposicionada para no solaparse con los controles.

## [0.3.1] - 2026-07-10

### Añadido

- Pantalla **Fuentes y licencias** (3b): disclaimer 112 destacado, estado de
  cada fuente (OK / degradada / caída) con licencia y último dato, atribución
  completa y accesos a "Acerca" y "Metodología".

## [0.3.0] - 2026-07-10

### Añadido

- Pantalla **Informe de situación** (2b): KPIs 2×2 (activos, hectáreas, focos
  24 h, nivel máximo), filtros por país (Todos/España/Portugal) y **tabla
  ordenable** por columna. Accesible: `<table>` semántica con `aria-sort` y
  cabeceras que ordenan.
- Banner de **fuente degradada** (p. ej. fogos.pt) con hora del último dato.
- Formato de tiempo compacto ("6 min", "1 h 12") para columnas densas.
- Componentes reutilizables: `ScreenHeader`, `LangButton`.

## [0.2.2] - 2026-07-10

### Cambiado

- **Rebranding a Incendib** (dominio incendib.es): el nombre anterior era marca
  registrada en España. Se renombran la aplicación, el manifiesto PWA, los
  metadatos, el service worker y la interfaz. El identificador del repositorio
  se mantiene.
- URL canónica de producción para metadatos, imágenes OG y enlaces `/f/{slug}`,
  con respaldo automático al dominio de Vercel en despliegues de vista previa.

## [0.2.1] - 2026-07-10

### Añadido

- Capa de **perímetros de área quemada** (EFFIS) en el mapa: polígono con
  relleno traslúcido y borde definido, coloreado por estado, visible al ampliar.
  Se muestra solo cuando el dato está disponible ("metro a metro" con Sentinel-2
  en modo live). Alternable desde el control de capas.
- Entrada de perímetro en la leyenda del mapa.
- Hook de pruebas E2E del mapa (activado con `?e2e`) para verificación visual.

### Corregido

- Las marcas de tiempo con desfase de zona horaria dejan de mostrarse como
  futuras ("dentro de N min") y se normalizan a "ahora mismo".

## [0.2.0] - 2026-07-10

### Añadido

- Pantalla **Mapa** (home): mapa MapLibre GL con teselas OpenFreeMap sin API key.
- Máscara del mundo con España + Portugal recortados y halo sutil de contorno.
- Marcadores por **color + forma** según estado, con pulso para activos de
  nivel ≥ 2 (estático bajo `prefers-reduced-motion`).
- Tira de KPIs (activos, hectáreas, focos 24 h), leyenda plegable, controles de
  mapa e inset de territorios insulares (Canarias).
- Bottom sheet con recuento por gravedad, filtros rápidos y lista de incendios.
- Cabecera con buscador, selector de idioma (ES/PT/EN) y alternador de tema.
- Barra de navegación inferior común a todas las pestañas.
- Verificación visual automatizada (capturas headless en modo claro y oscuro).

### Cambiado

- Modo oscuro fijado **por defecto** (sala de control); el claro es opt-in.

### Corregido

- Los tiempos relativos ("hace 6 min") ahora se localizan en ES/PT/EN.
- El estado del incendio se expone en el nombre accesible de filas y marcadores
  (antes solo en el glifo `aria-hidden`).
- Disclaimer 112 localizado; `aria-pressed` en los chips de filtro.

## [0.1.0] - 2026-07-10

### Añadido

- Estructura del proyecto Next.js 15 + TypeScript + Tailwind CSS.
- Sistema de diseño: tokens semánticos sobre variables CSS y theming en runtime.
- Internacionalización ES/PT/EN con proveedor de diccionarios.
- Modelo de dominio, catálogo de fuentes y dataset de demostración.
- Andamiaje PWA: manifest, service worker (offline + Web Push) e iconos.
- Documentación de arquitectura y guía del proyecto.

[0.3.4]: https://github.com/davidmorrom/Incendib/releases/tag/v0.3.4
[0.3.3]: https://github.com/davidmorrom/Incendib/releases/tag/v0.3.3
[0.3.2]: https://github.com/davidmorrom/Incendib/releases/tag/v0.3.2
[0.3.1]: https://github.com/davidmorrom/Incendib/releases/tag/v0.3.1
[0.3.0]: https://github.com/davidmorrom/Incendib/releases/tag/v0.3.0
[0.2.2]: https://github.com/davidmorrom/Incendib/releases/tag/v0.2.2
[0.2.1]: https://github.com/davidmorrom/Incendib/releases/tag/v0.2.1
[0.2.0]: https://github.com/davidmorrom/Incendib/releases/tag/v0.2.0
[0.1.0]: https://github.com/davidmorrom/Incendib/releases/tag/v0.1.0
