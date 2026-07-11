# Propuesta: página de Estadísticas (analítica histórica)

> Inspirada en la sección **Estadísticas** de mapasdeincendios.es. Da contexto
> histórico y de tendencia al dato en vivo, aporta material citable para prensa y
> alimenta el boletín semanal y las páginas de Territorio.

## Objetivo

Una página `/estadisticas` con analítica **honesta y trazable**: separar
claramente las tres naturalezas de dato para no confundir al público:

1. **EGIF / MITECO** — estadística administrativa oficial (consolidada
   2015-2021, provisional 2022-2026). Es la serie histórica "de verdad".
2. **EFFIS / Copernicus** — perímetros de área quemada observados por satélite.
3. **NASA FIRMS** — detecciones térmicas (≠ incendios confirmados).

> Regla de oro (igual que el proyecto de referencia): **no se fusionan fuentes**.
> Cada gráfico dice de dónde sale su dato.

## Gráficos propuestos

| Gráfico | Fuente | Tipo | Nota |
|---|---|---|---|
| Incendios por año | EGIF | Barras/línea temporal | Consolidado vs. provisional diferenciado |
| Superficie afectada por año (ha) | EGIF | Barras/línea | Idem |
| Top 10 CCAA por superficie quemada | EGIF/EFFIS | Barras horizontales | Ranking histórico |
| Top 10 provincias por superficie | EGIF/EFFIS | Barras horizontales | Ranking histórico |
| Detecciones FIRMS por día | FIRMS | Línea/área | Actividad reciente (30-90 d) |
| Incidentes por gravedad | Nacional | Barras apiladas | Niveles 0/1/2/3 |
| Áreas EFFIS por provincia (año actual) | EFFIS | Barras/mapa coroplético | Superficie del año |

Filtros transversales: **periodo** (año, últimos 30 d, 12 meses) y **territorio**
(nacional / CCAA / provincia — conecta con Territorios).

## Diseño de la visualización (OBLIGATORIO)

- **Antes de escribir una sola línea de gráfico**, cargar la skill **`dataviz`**
  (guía del sistema de visualización: paleta accesible, formas de marca, ejes,
  leyendas, tooltips en claro y oscuro).
- **El color codifica dato, nunca decora** (CLAUDE.md). Los niveles de gravedad
  reutilizan la paleta semántica existente (`state-activo`, etc.). Las series
  categóricas neutras usan la paleta de `dataviz`, no colores de estado.
- Cifras y ejes en **IBM Plex Mono**, miles con espacio (`formatNumber`).
- **Accesibilidad**: no depender solo del color (formas/etiquetas/patrones);
  tabla de datos equivalente descargable/lectura para lectores de pantalla;
  contraste WCAG AA en claro y oscuro.
- Estados: carga con skeleton (no spinner), vacío en tono neutro, error por
  fuente sin romper la página (patrón que ya usamos en Informe).

## Datos y stack

- **EGIF histórico**: no es tiempo real. Descargar/normalizar la serie
  (MITECO/EGIF, `servicio.mapa.gob.es/incendios`) a JSON en el repo
  (`src/content/estadisticas/*.json`) → build estático. Documentar corte y
  versión de los datos.
- **FIRMS por día / EFFIS por provincia**: derivar de la capa `src/lib/data`
  (agregación temporal/territorial), con caché/ISR.
- **Librería de gráficos**: preferir algo ligero y accesible que se integre con
  SSR/React (evaluar durante implementación; seguir recomendaciones de `dataviz`
  sobre marcas y color). Inline SVG para casos simples (sparklines en KPIs).

## Sinergias

- **Boletín semanal** (`03-...`): los KPIs y deltas semanales salen del mismo
  motor de agregación; el gráfico "FIRMS por día" se recorta a la semana.
- **Territorios** (`04-...`): cada página de territorio embebe un subconjunto de
  estos gráficos filtrado a su ámbito.
- **Incendios hoy**: el ranking provincial 24 h es una vista "en vivo" del mismo
  eje territorial.

## Fases

- **F1**: serie EGIF histórica (incendios/año, superficie/año) + rankings top-10.
  Estático, sin dependencias de tiempo real.
- **F2**: FIRMS por día + incidentes por gravedad (derivados de datos en vivo).
- **F3**: áreas EFFIS por provincia (coroplético) + filtro territorial completo.

## Verificación

- Contrastar totales con cifras publicadas por EGIF/EFFIS (sanity check).
- Comprobar frontera consolidado/provisional bien señalada (no mezclar).
- `typecheck` + `lint` + `build` en verde; captura `?e2e` en claro y oscuro.
