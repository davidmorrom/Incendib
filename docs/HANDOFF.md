# Handoff: Iberfuego — visor web de incendios ES · PT

## Overview
Iberfuego es una **app web pura para móvil** (no instalable, sin tiendas) que agrega datos de incendios forestales de España y Portugal: mapa en vivo, informe tabular, noticias/directos filtrados por incendio, fuentes/licencias, alertas Web Push, fichas por incendio con URL propia y compartible, histórico de campaña, y un panel desktop profesional. Mobile-first, modo oscuro por defecto (con modo claro para exteriores).

## Sobre los archivos de diseño
Los archivos de este paquete son **referencias de diseño creadas en HTML** — prototipos que muestran el aspecto y comportamiento previstos, **no código de producción para copiar tal cual**. La tarea es **recrear estos diseños en el entorno del codebase de destino** (React, Vue, Svelte…) usando sus patrones y librerías. Si aún no existe codebase, recomendación: SPA ligera (p. ej. React o Svelte) + mapa real (MapLibre GL) + service worker para Web Push y caché offline.

## Fidelidad
**Alta fidelidad (hifi).** Colores, tipografía, espaciados, copy y estados son finales. Recrear píxel a píxel. Los mapas de los mocks son placeholders — en producción son un mapa real (MapLibre/Leaflet) con la misma paleta oscura/clara.

## Archivos del paquete
- `Iberfuego.dc.html` — exploraciones estáticas, organizadas en turnos (1 abajo → 13 arriba). Las pantallas canónicas están marcadas abajo.
- `Iberfuego Prototipo.dc.html` — prototipo navegable con estado real (pestañas, filtros, ficha, compartir). Referencia de comportamiento.
- Ambos abren directamente en navegador.

## Pantallas canónicas (por id en Iberfuego.dc.html)
Móvil, 390×800. La barra inferior de 4–5 pestañas es común a todas.

| Id | Pantalla |
|----|----------|
| 2a | Mapa (home): KPI strip, mapa, leyenda plegable, tarjeta del incendio más cercano |
| 2b | Informe: KPIs 2×2, filtros Todos/España/Portugal, tabla densa ordenada por ha |
| 1c | Ficha de incendio: badges de estado/nivel, stats, evolución, compartir |
| 3a | Noticias y directos: directo 24h, feed filtrado, cámaras DGT, cuentas oficiales |
| 3b | Fuentes y licencias: estado por fuente, atribución, disclaimer 112 |
| 4a–4d | Estados: carga (skeleton+pulso), vacío (positivo), error (reintento+caché), offline (banda ámbar + datos caché en gris) |
| 5a | Informe con filtros sin resultados (CTA limpiar filtros) |
| 5b | Toast de reconexión (verde, "+N focos nuevos · Ver cambios") |
| 7a | Ajustes de alertas: zonas con radio, umbrales, silencio (evacuación siempre suena) |
| 7b | Push en pantalla de bloqueo (alerta crítica evacuación + acciones) |
| 7c | Modo claro exterior (paleta remedida, marcadores con borde blanco) |
| 8a–8c | Permisos web: soft-ask propio → diálogo nativo → fallback zona manual |
| 9a–9c | Compartir: llegada por enlace, hoja de compartir, unfurl OG en chat |
| 10a–10b | Histórico: ficha de extinguido (balance final) y archivo de campaña |
| 1d | Desktop 1380×860: filtros + mapa + lista + detalle |
| 6a | Desktop Noticias: cronología + directo/feed + cámaras/cuentas |

Especificaciones transversales: **5c** (design system), **11a–11b** (accesibilidad), **12a–12b** (logo e iconos). **13** documenta la decisión de marca (se mantiene 12a, gota única).

## Interacciones y comportamiento
Referencia ejecutable: `Iberfuego Prototipo.dc.html`.
- Barra inferior cambia de pestaña; pestaña activa = borde superior 2px #3D7DD8 + icono/label #7FA9E8.
- Tocar marcador del mapa o fila del informe → ficha del incendio (pantalla completa, botón atrás).
- Filtros del informe filtran y reordenan la tabla (orden por ha desc).
- Leyenda del mapa: botón plegado por defecto; panel flotante al tocar.
- Compartir desde la ficha: hoja inferior con enlace `iberfuego.com/f/{slug}` + copiar al portapapeles (feedback "✓ Copiado" 1.8s) + share nativo del navegador.
- Cada incendio tiene URL propia (`/f/{slug}`) que muestra SIEMPRE el estado actual; imagen OG generada en servidor con estado+hora estampados.
- Permisos: nunca disparar el diálogo nativo sin soft-ask previo aceptado. Denegar ⇒ fallback de zona manual, sin bloquear nada.
- Alertas de evacuación en zonas del usuario ignoran "No molestar".
- Animaciones: pulso de foco activo N2 (`scale 1→2.4, opacity .55→0, 1.8s ease-out infinite`), shimmer de skeleton (1.4–1.6s), spinner 0.8s linear. Todas se desactivan con `prefers-reduced-motion` (sustituir pulso por anillo estático).

## Estado
- `tab` (mapa|informe|noticias|fuentes|histórico), `selectedFire` (slug|null), `filter` (todos|es|pt), `legendOpen`, `shareOpen`, `copied`.
- Estados de red: cargando / ok / error (con reintentos y timestamp) / offline (servir caché con antigüedad visible) / reconexión (toast).
- Datos: polling o SSE; timestamp "actualizado hace N min" siempre visible; fuentes degradadas se señalizan por fuente (banner ámbar), no como fallo global.

## Design tokens
### Color (modo oscuro, base)
- Fondos: `#0C1117` base · `#0F151C` raised · `#0A0F14` sunken · `#121922` ficha
- Texto: `#E8EDF2` principal · `#9AAAB8` secundario · `#66727E` mute (solo ≥12px) · `#C7D0D9` cuerpo claro
- Estados de incendio: activo `#E5484D` (texto: `#FF8B8E`) · controlado `#E8912D` (`#F0B269`) · estabilizado `#E5C337` · extinguido `#6E7B87` · foco satelital `#FF6A3D` (`#FFB59A`)
- UI: acción/enlace `#3D7DD8` (texto `#7FA9E8`) · ok `#3DBE7A` (`#5FD494`) · error texto `#F09197` · aviso `#E8B36B`
- Bordes: `rgba(255,255,255,.07–.14)`
### Modo claro (7c)
- Fondos `#F4F2EC` / `#FFFFFF` / mapa `#EAE7DD` · texto `#1C222A` / `#6B7480`
- Estados oscurecidos para contraste: activo `#C1272D` · controlado `#C4761B` · estabilizado `#A98F12` · acción `#2A5FA8` · marcadores con borde blanco 1.5px
### Tipografía
- UI: IBM Plex Sans (400/500/600/700). Datos/cifras/timestamps/coordenadas: IBM Plex Mono.
- Escala: kpi 28 mono 600 · título 15–17 sans 700 · fila 12.5 sans 600 · cuerpo 12–12.5 · label sección 9.5 mono 600 tracking .12em MAYÚS · meta 10 mono 500
- Cifras con miles separados por **espacio** (3 241, 12 512), no punto.
### Espaciado y forma
- Base 4px · padding de pantalla 14px · radios: 4 chips · 6–9 tarjetas/toasts · 8 botones · hit target mínimo 44×44px
- Marcadores: color+forma (círculo doble/rombo/cuadrado/anillo/punto glow) — nunca solo color.

## Accesibilidad (WCAG 2.2 AA — ver 11a/11b)
- Contrastes verificados (tabla en 11a). Rojo puro nunca como texto pequeño.
- Foco visible: outline 2px `#7FA9E8` offset 2px en todo lo enfocable. Skip-link. Diálogos con foco atrapado + Esc.
- `aria-live` para evacuaciones/reconexión; marcadores con label completo ("Las Hurdes, activo, nivel 2, 3 241 hectáreas"); informe como `<table>` real; `lang` es/pt por bloque; texto reescalable 200%, zoom 400% sin scroll horizontal.

## Marca y assets (12a/12b)
- Logo: gota (retardante, no llama) en negativo sobre cuadrado rojo `#E5484D`, radio 24% del lado, gota al 40% central. Variantes oscuro/claro/mono. Favicon SVG + PNG 16/32/180/512 + maskable (zona segura 80%); a 16px la gota se simplifica sin cola.
- Iconos: línea 1.3px @16 (1.5 @22), rejilla 16, remate recto, `currentColor`, sin relleno. Los glifos de estado son formas RELLENAS (no línea). Todos los SVG están inline en los HTML de referencia — extraer de ahí.
- Emoji: no se usan en UI (solo en el resumen de texto compartible, 9b).

## Copys clave
- Disclaimer permanente: "No sustituye a los canales oficiales de emergencia. Emergencias: 112".
- Vacío = buena noticia ("Sin incendios activos en tu zona"), nunca tono de error.
- Bilingüe donde el dato lo es: estados PT ("em curso", "em resolução", "em conclusão").
