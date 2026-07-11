# Análisis de mejoras: Incendib vs. mapasdeincendios.es

> Documento accionable. Compara función a función y prioriza qué merece la pena
> adoptar del proyecto de referencia. Espíritu: inspiración legítima entre
> proyectos hermanos sin ánimo de lucro (ver [`00-INDICE.md`](./00-INDICE.md)).

## Estado actual de Incendib (lo que ya tenemos)

| Pantalla | Ruta | Qué hace |
|---|---|---|
| **Mapa** (home, 2a) | `/` | MapLibre, máscara ES+PT, marcadores por estado+forma, clustering, hotspots, perímetros EFFIS, filtros (estado, país, nivel, periodo, superficie, sensor, FWI), leyenda, geolocalización, panel desktop 1d con sidebar de filtros + lista + KPIs. |
| **Informe** (2b) | `/informe` | Informe de situación **en vivo**: KPIs 2×2 (activos, ha, focos 24 h, nivel máx), filtros Todos/ES/PT, tabla densa, banner de fuente degradada. |
| **Noticias** (3a) | `/noticias` | Agregación + embeds en vivo, panel de 3 columnas en desktop. |
| **Fuentes** (3b) | `/fuentes` | Salud de fuentes + licencias + latencias. |
| **Alertas** (7a) | `/alertas` | Web Push + ajustes de alerta. |
| **Histórico** (10a) | `/historico` | Consulta histórica. |
| **Ficha** (1c) | `/f/[slug]` | Detalle de incendio: timeline, medios, meteo, minimapa de perímetro, fuentes. |
| **Legal** | `/legal` | Aviso legal + privacidad. |

Transversal: i18n ES/PT/EN, PWA instalable + offline, modo claro/oscuro,
sistema de diseño hifi, WCAG AA.

## Matriz de gaps

Leyenda de esfuerzo: **S** (≤1 día) · **M** (2-4 días) · **L** (semana+).

### P0 — Informe/boletín semanal ⭐

**Qué falta**: un boletín **semanal consolidado** (lun-dom), con vista web,
**archivo histórico** de ediciones anteriores y **descarga**. Nuestro `/informe`
es solo del momento (en vivo), no se archiva ni se descarga.

- **Valor**: alto. Genera recurrencia, material citable por prensa, URLs
  indexables por semana, y refuerza la misión de servicio público.
- **Esfuerzo**: **M-L**. Requiere: agregación semanal + almacenamiento de
  snapshots + página de índice + página por edición + export (PDF/imagen).
- **Detalle**: [`03-propuesta-informe-semanal.md`](./03-propuesta-informe-semanal.md).

### P1 — Territorios (páginas por CCAA / provincia / municipio)

**Qué falta**: páginas dedicadas por territorio con sus detecciones, incidentes,
riesgo y áreas quemadas. Es su mayor motor de descubribilidad (miles de URLs).

- **Valor**: alto (SEO + navegación intuitiva "¿qué pasa en mi provincia?").
- **Esfuerzo**: **L** (routing dinámico, geodatos por territorio, generación
  estática/ISR, sitemap). Se puede escalonar: CCAA → provincias → municipios.
- **Detalle**: [`04-propuesta-mapa-capas-territorios.md`](./04-propuesta-mapa-capas-territorios.md).

### P1 — Estadísticas (analítica histórica)

**Qué falta**: página con gráficos de tendencia anual (incendios/año,
superficie/año), rankings top-10 CCAA/provincias, FIRMS por día, incidentes por
gravedad y áreas EFFIS por provincia.

- **Valor**: medio-alto (contexto, material para prensa, transparencia).
- **Esfuerzo**: **M** (datos EGIF históricos + componente de gráficos accesible).
- **Detalle**: [`05-propuesta-estadisticas.md`](./05-propuesta-estadisticas.md).

### P2 — "Incendios hoy" (ranking provincial 24 h)

**Qué falta**: vista con **ranking por provincia** ordenado por detecciones 24 h,
con puntos en seguimiento y enlace directo al mapa filtrado.

- **Valor**: medio. Es un pivote territorial rápido del dato en vivo.
- **Esfuerzo**: **S**. Ya tenemos hotspots y fires; solo hay que agregarlos por
  provincia y renderizar tabla-ranking. Puede vivir como pestaña/vista del
  Informe o como página propia.

### P2 — Selección de provincia en el mapa (idea del propietario)

**Qué falta**: poder **clicar una provincia** en el mapa para filtrar/hacer zoom
a ella (y enlazar a su página de Territorio).

- **Valor**: medio. Interacción natural y elegante; conecta mapa ↔ territorios.
- **Esfuerzo**: **M** (capa de límites provinciales GeoJSON + interacción +
  estado de filtro territorial).
- **Detalle**: [`04-propuesta-mapa-capas-territorios.md`](./04-propuesta-mapa-capas-territorios.md).

### P2 — Modo alternativo de capas / basemaps (idea del propietario)

**Qué falta**: hoy `MapControls` solo conmuta hotspots/perímetros. Falta un
**control de capas más completo**: estilos de base (claro/oscuro/satélite/
relieve), overlay FWI activable con **opacidad ajustable**, y agrupación clara.

- **Valor**: medio. Mejora legibilidad según contexto (satélite ayuda a ubicar).
- **Esfuerzo**: **S-M**. MapLibre soporta cambio de estilo y overlays raster.
- **Detalle**: [`04-propuesta-mapa-capas-territorios.md`](./04-propuesta-mapa-capas-territorios.md).

### P3 — Páginas de confianza (Quiénes somos / Contacto / Metodología / Citar)

**Qué falta**: identidad y propósito, contacto, **metodología** consultable, y
**cómo citarnos**.

- **Valor**: bajo-medio (confianza, citabilidad por prensa/academia).
- **Esfuerzo**: **S** (contenido estático, reutiliza el sistema de diseño).

### P3 — Vinculación noticia ↔ incidente/territorio

**Qué falta**: enriquecer Noticias vinculando cada pieza a un incidente o
territorio (coincidencia territorial+temporal+temática) y etiquetar
confirmada/seguimiento/relacionada.

- **Valor**: bajo-medio (mejora una pantalla que ya tenemos).
- **Esfuerzo**: **M** (matching geográfico/temporal + UI de etiquetas).

## Orden de ejecución recomendado

1. **Informe semanal** (P0) — la joya que pidió el propietario; alto impacto.
2. **Incendios hoy** (P2, esfuerzo S) — victoria rápida que reutiliza datos.
3. **Estadísticas** (P1) — base analítica que alimenta también el informe semanal.
4. **Territorios** (P1) — gran motor SEO; se apoya en 2 y 3.
5. **Mapa: selección de provincia + capas** (P2) — conecta mapa ↔ territorios.
6. **Páginas de confianza** (P3) — cierre de credibilidad.

## Principios a respetar al adoptar cualquier función

- **El color codifica dato, nunca decora** (CLAUDE.md).
- **Detección satelital ≠ incendio confirmado**: comunicarlo siempre.
- **Disclaimer 112** donde corresponda; vacío = buena noticia, no error.
- **Atribución** correcta de fuentes (EFFIS CC BY 4.0, NASA dominio público,
  fogos.pt, AEMET/IPMA) y, por cortesía entre proyectos hermanos, considerar
  **reconocer a mapasdeincendios.es** si replicamos una idea muy suya.
- Cifras/timestamps en **IBM Plex Mono**, miles con espacio.
- WCAG 2.2 AA obligatorio.
