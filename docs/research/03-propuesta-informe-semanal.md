# Propuesta: Informe / boletín semanal

> Funcionalidad estrella solicitada por el propietario, inspirada en la sección
> **Prensa** de mapasdeincendios.es. Objetivo: publicar cada semana un boletín
> consolidado, consultable en web, **archivado** y **descargable**, que sirva a
> prensa y ciudadanía como foto fija y trazable de la situación de incendios en
> España y Portugal.

## Qué es (y qué NO es lo que ya tenemos)

- **`/informe` actual (2b)** = informe de situación **en vivo**: KPIs y tabla del
  momento. Cambia a cada refresco; no se archiva.
- **Boletín semanal (nuevo)** = **snapshot consolidado de una semana natural
  (lun-dom)**, con número de edición, fecha de cierre, cifras agregadas de la
  semana, ranking territorial, incendios destacados y descarga. **Inmutable** una
  vez publicado.

Ambos conviven. Para evitar confusión, propongo renombrar en la navegación:
- `/informe` → **"Situación" o "Ahora"** (en vivo).
- nueva sección **"Boletines" / "Prensa"** → índice de semanales.

## Estructura de contenido de una edición

Cada edición semanal (`/boletin/2026-w28`, por ejemplo) incluye:

1. **Cabecera**: nº de edición, periodo (`30 jun – 6 jul 2026`), fecha de
   publicación, sello "cerrado / provisional".
2. **KPIs de la semana** (cifras en IBM Plex Mono, miles con espacio):
   - Detecciones térmicas FIRMS de la semana.
   - Puntos en seguimiento (clusters activos estimados).
   - Perímetros EFFIS del año / nuevos en la semana.
   - Superficie afectada (ha) acumulada y nueva en la semana.
   - Nivel de gravedad máximo alcanzado y dónde.
   - **Variación vs. semana anterior** (▲/▼ con color semántico).
3. **Ranking territorial de la semana**: top provincias/CCAA por detecciones y
   por superficie (reutiliza el motor de "Incendios hoy" pero agregado a 7 días).
4. **Incendios destacados**: los N de mayor superficie/gravedad, con enlace a su
   **ficha** `/f/[slug]`.
5. **Contexto meteorológico**: resumen FWI/IPIF de la semana (zonas de mayor
   peligro), si hay dato.
6. **Mini-mapa estático** de la semana (imagen generada) para compartir/PDF.
7. **Notas y método**: fuentes, corte temporal, disclaimer "detección ≠ incendio
   confirmado" y **112**; atribución EFFIS/NASA/AEMET/fogos.pt.

## Archivo histórico

- `/boletines` (o `/prensa`): índice paginado de ediciones, más reciente arriba,
  con periodo + KPIs resumidos por tarjeta.
- URL estable por edición: `/boletin/{año}-w{semana ISO}` → indexable, citable,
  compartible. Redirección `/boletin/latest` a la última.

## Descarga / exportación

Opciones por complejidad creciente (elegir según esfuerzo disponible):

1. **Imprimir a PDF nativo** (barato): CSS `@media print` cuidado sobre la vista
   web de la edición → el usuario "Guardar como PDF". Cero infra.
2. **Imagen para redes** (medio): endpoint OG dinámico con
   `next/og` (`ImageResponse`) que renderiza una tarjeta resumen 1200×630 con los
   KPIs de la semana. Sirve como preview social **y** como descarga PNG.
3. **PDF servidor** (más caro): generación con `@react-pdf/renderer` o headless
   Chromium en una Function. Solo si se pide fidelidad tipográfica alta.

**Recomendación**: empezar por (1) + (2). El PDF "de verdad" (3) se añade después.

## Generación de datos (cómo se produce cada semana)

Reutilizamos la capa de datos existente (`src/lib/data`). Flujo:

1. **Cron semanal** (lunes 06:00 Europe/Madrid) — Vercel Cron
   (`vercel.ts` → `crons: [{ path: '/api/boletin/generar', schedule: '0 4 * * 1' }]`,
   en UTC). Ver skill `vercel:vercel-functions` para Cron Jobs.
2. El endpoint **agrega** la semana cerrada anterior: cuenta hotspots FIRMS de
   lun-dom, agrupa por provincia, suma superficie EFFIS nueva, calcula deltas vs.
   semana previa y selecciona incendios destacados.
3. **Persiste un snapshot inmutable** de esa edición (ver almacenamiento abajo).
4. La web lee snapshots publicados; **nunca recalcula** una edición ya cerrada
   (garantiza que lo que citó la prensa siga igual).

### Almacenamiento del snapshot

- **Opción A (recomendada, cero coste extra)**: snapshot JSON versionado en el
  repo (`src/content/boletines/2026-w28.json`) → build estático + ISR. Simple,
  auditable en git, ideal para volumen bajo (52/año).
- **Opción B**: **Vercel Blob** (soporta público/privado) para los JSON + PNG/PDF
  generados. Útil si generamos activos binarios (imágenes/PDF).
- **Opción C**: Upstash Redis (ya previsto para alertas Push) si se quiere estado
  dinámico. Innecesario para contenido inmutable.

> Nota Vercel: Vercel Postgres/KV ya no existen; usar Marketplace (Neon/Upstash)
> o Blob. Para este caso, **repo + ISR (A)** es lo más sobrio.

## Modelo de datos (borrador)

```ts
// src/types/boletin.ts (propuesta)
export interface BoletinKpi {
  firmsWeek: number;          // detecciones FIRMS lun-dom
  tracking: number;           // puntos en seguimiento (clusters)
  effisPerimsYear: number;    // perímetros EFFIS del año
  effisPerimsWeek: number;    // nuevos en la semana
  hectaresYear: number;       // ha acumuladas año
  hectaresWeek: number;       // ha nuevas en la semana
  maxLevel: 0 | 1 | 2 | 3 | null;
  maxLevelWhere?: string;
}
export interface BoletinRankRow {
  province: string; region: string; country: 'ES' | 'PT';
  detections: number; tracking: number; hectares: number;
}
export interface Boletin {
  id: string;                 // "2026-w28"
  isoWeek: number; year: number;
  periodStart: string; periodEnd: string;  // ISO, lun-dom
  publishedAt: string;
  status: 'cerrado' | 'provisional';
  kpi: BoletinKpi;
  prevKpi?: BoletinKpi;       // para deltas
  ranking: BoletinRankRow[];
  highlights: string[];       // slugs de Fire destacados
  fwiSummary?: string;
  sources: string[];          // ids de fuente usadas
}
```

## Diseño (reutilizar sistema hifi, sin inventar estética)

- Reutilizar `ReportKpis`/`KpiStrip`, `ReportTable` y tokens existentes.
- **Deltas** con color semántico (▲ rojo = empeora, ▼ verde = mejora), nunca
  decorativo. Cifras en IBM Plex Mono, miles con espacio (`formatNumber`).
- Vacío = buena noticia: una semana sin actividad se comunica en tono neutro
  positivo ("Semana sin grandes incendios registrados"), nunca como error.
- Disclaimer 112 + "detección ≠ incendio confirmado" al pie.
- Vista imprimible (`@media print`) limpia, monocroma-friendly.

## Fases de implementación

- **F1 (MVP web)**: tipo `Boletin`, agregador semanal, 1 edición generada a mano
  para validar, página `/boletin/[id]` + índice `/boletines`, disclaimer y
  atribución. Sin automatización todavía.
- **F2 (automatización)**: Vercel Cron + persistencia de snapshot + `latest`.
- **F3 (compartir)**: OG image (`next/og`) + CSS print.
- **F4 (PDF fiel)**: solo si se demanda.

## Verificación

- Comprobar que una edición cerrada **no cambia** al refrescar datos en vivo.
- Semana ISO correcta en frontera de año (semana 1/52-53).
- `typecheck` + `lint` + `build` en verde antes de integrar en `main`.
- Captura headless `?e2e` en claro y oscuro (CLAUDE.md).
