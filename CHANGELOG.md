# Changelog

Todas las novedades relevantes de este proyecto se documentan aquí.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es/1.1.0/) y el
proyecto se adhiere a [Versionado Semántico](https://semver.org/lang/es/).

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

[0.2.0]: https://github.com/davidmorrom/Iberfuego/releases/tag/v0.2.0
[0.1.0]: https://github.com/davidmorrom/Iberfuego/releases/tag/v0.1.0
