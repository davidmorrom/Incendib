/**
 * Punto de entrada de datos. En modo "mock" (por defecto) devuelve datos de
 * demostración; en modo "live" agregará y deduplicará las fuentes reales.
 *
 * La agregación live vive en el servidor (API routes) para cachear FIRMS y no
 * agotar su rate limit (5000 tx / 10 min) — ver docs/DATA-SOURCES.md §Recommendations.
 */

import type { Fire, Hotspot, SourceId, SourceStatus, Weather } from '@/types/fire';
import { MOCK_FIRES, MOCK_HOTSPOTS, MOCK_SOURCE_STATUS } from './mock';
import { MOCK_NEWS, type NewsItem } from './news';
import { fetchNews } from './adapters/news';
import { fetchWeather } from './adapters/weather';
import {
  fetchFirmsHotspots,
  fetchPortugalFires,
  fetchJcylFires,
  fetchInfocaFires,
  fetchCatalunyaFires,
  fetchInfocamFires,
  fetchEffisPerimeters,
  attachPerimeters,
  confirmWithHotspots,
  gateByHotspots,
  dedupeMutualAidFires,
  deriveApproxPerimeters,
} from './adapters';
import {
  getOverridesCached,
  filterOutSlugs,
  filterOutIds,
  applyPatches,
  EMPTY_STATE,
  type OverrideState,
} from '@/lib/overrides/store';

export type DataMode = 'mock' | 'live';

export function getDataMode(): DataMode {
  const explicit = process.env.NEXT_PUBLIC_DATA_MODE;
  if (explicit === 'live') return 'live';
  if (explicit === 'mock') return 'mock';
  // Sin señal explícita legible (p. ej. la env var pública no se inyectó en el
  // build): en Vercel (producción/preview) servimos datos reales; en local, mock.
  return process.env.VERCEL === '1' ? 'live' : 'mock';
}

/**
 * Incendios agregados y normalizados.
 *
 * En live combina las fuentes con datos reales usables: ANEPC (Portugal, feed
 * oficial; respaldo fogos.pt), Castilla y León (INFORCYL), Andalucía (INFOCA),
 * Cataluña (Bombers) y Castilla-La Mancha (INFOCAM, con gate por satélite; ver
 * abajo). El resto de España no tiene API de incendios activos en tiempo real,
 * así que ahí solo hay focos satelitales (getHotspots). Los perímetros de EFFIS
 * se adjuntan al incendio oficial más cercano. Nunca lanza: si todo falla,
 * devuelve [] (vacío = buena noticia).
 *
 * INFOCAM (Castilla-La Mancha) es un log acumulativo poco fiable: nunca cierra
 * incidentes (Estado siempre "Activo", Fecha_Fin nula), así que daría por activos
 * incendios ya extinguidos (verificado contra prensa: 0/11 reales). Por eso NO se
 * vuelca tal cual: `fetchInfocamFires` deja solo los de la última semana
 * (`isInfocamRecentActive`) y aquí, además, `gateByHotspots` deja pasar solo los
 * confirmados por un foco FIRMS cercano. El resto de fuentes NO se filtran por
 * satélite (ya marcan estado y filtran por recencia; ahí un fallo de detección de
 * FIRMS sería un falso negativo).
 */
export async function getFires(): Promise<Fire[]> {
  let fires: Fire[];
  if (getDataMode() === 'live') {
    const [pt, cyl, and, cat, clm, hotspots, perimeters] = await Promise.all([
      fetchPortugalFires(),
      fetchJcylFires(),
      fetchInfocaFires(),
      fetchCatalunyaFires(),
      fetchInfocamFires(),
      fetchFirmsHotspots({ days: 2 }),
      fetchEffisPerimeters(),
    ]);
    // INFOCAM es un log acumulativo poco fiable (ver docstring): solo dejamos
    // pasar los incidentes confirmados por un foco FIRMS cercano. Al resto de
    // fuentes NO se les aplica el gate.
    const clmGated = gateByHotspots(clm, hotspots);
    const withPerimeters = attachPerimeters(
      dedupeFires([...pt, ...cyl, ...and, ...cat, ...clmGated]),
      perimeters,
    );
    // Una misma CCAA vecina puede reportar un incendio ajeno donde despliega
    // apoyo mutuo (visto en La Mierla/Guadalajara: INFORCYL e INFOCA listan el
    // mismo fuego). Se fusiona tras adjudicar los perímetros, para preferir el
    // que ya quedó con la superficie oficial/estimada.
    const merged = dedupeMutualAidFires(withPerimeters);
    // Incidentes activos y confirmados que siguen sin forma propia: extensión
    // aproximada a partir de los focos FIRMS cercanos (nunca toca hectáreas).
    const withApprox = deriveApproxPerimeters(merged, hotspots);
    // Capa de calidad: confirma con focos FIRMS cercanos (señal positiva).
    fires = confirmWithHotspots(withApprox, hotspots);
  } else {
    fires = MOCK_FIRES;
  }
  // Overrides manuales del panel: ocultar incidentes y aplicar correcciones por
  // campo (marcadas `edited`). Inerte si no hay overrides.
  const state = await safeOverrides();
  return applyPatches(filterOutSlugs(fires, state.hidden), state.patches);
}

/**
 * Estado de overrides tolerante a contextos sin caché de Next. `getOverridesCached`
 * usa `unstable_cache`, que lanza fuera de un request/prerender (tests unitarios,
 * scripts). Aquí se degrada a `EMPTY_STATE` para preservar el contrato «nunca lanza»
 * de `getFires`/`getHotspots`/`getBurnedAreas` (sin overrides = datos tal cual).
 */
async function safeOverrides(): Promise<OverrideState> {
  try {
    return await getOverridesCached();
  } catch {
    return EMPTY_STATE;
  }
}

/** Dedup por slug (mismo id repetido dentro de una misma fuente). El solape
 * ENTRE fuentes distintas (apoyo mutuo entre CCAA) lo resuelve
 * `dedupeMutualAidFires`, por proximidad geográfica. */
function dedupeFires(fires: Fire[]): Fire[] {
  const seen = new Set<string>();
  const out: Fire[] = [];
  for (const f of fires) {
    if (seen.has(f.slug)) continue;
    seen.add(f.slug);
    out.push(f);
  }
  return out;
}

export async function getFire(slug: string): Promise<Fire | null> {
  const fires = await getFires();
  return fires.find((f) => f.slug === slug) ?? null;
}

/**
 * Focos satelitales (NASA FIRMS). Detección térmica, NO incendio confirmado.
 * En live consulta FIRMS (cacheado en el servidor por su rate limit); en mock
 * devuelve un cúmulo determinista. Nunca lanza: ante fallo devuelve [].
 */
export async function getHotspots(): Promise<Hotspot[]> {
  // 2 días: robusto ante ventanas VIIRS/NRT vacías (madrugada). El mapa los
  // atenúa por antigüedad y el KPI "Focos 24 h" cuenta solo las últimas 24 h.
  const hotspots = getDataMode() === 'live' ? await fetchFirmsHotspots({ days: 2 }) : MOCK_HOTSPOTS;
  return filterOutIds(hotspots, (await safeOverrides()).hiddenHotspots);
}

/**
 * Áreas quemadas recientes (EFFIS) para la capa de perímetros del mapa. Son
 * incendios pasados/mapeados por satélite (no incidentes activos): se dibujan
 * como perímetro real de área quemada, aparte de los marcadores de incidentes.
 * En mock ya vienen perímetros en los propios incendios, así que devuelve [].
 */
export async function getBurnedAreas(): Promise<Fire[]> {
  if (getDataMode() !== 'live') return [];
  const areas = await fetchEffisPerimeters();
  // Cap por higiene visual/perf; ya vienen ordenadas por actualización reciente.
  const capped = areas.slice(0, 250);
  return filterOutSlugs(capped, (await safeOverrides()).hiddenBurned);
}

/**
 * Titulares de prensa reales (Google News RSS, ES+PT) para la pantalla Noticias.
 * En mock, titulares de demostración. En live nunca lanza: si el RSS falla,
 * devuelve [] y la UI lo señaliza en tono neutro.
 */
export async function getNews(): Promise<NewsItem[]> {
  if (getDataMode() !== 'live') return MOCK_NEWS;
  return fetchNews();
}

/**
 * Meteo local (Open-Meteo, sin clave) para la ficha de un incendio. Es el tiempo
 * del punto, no un dato de la fuente del incendio. undefined si no hay dato.
 */
export async function getWeather(coordinates: [number, number]): Promise<Weather | undefined> {
  return fetchWeather(coordinates[0], coordinates[1]);
}

/** Recuento de focos de las últimas 24 h (KPI), relativo a `now` (ms). */
export function countHotspots24h(hotspots: Hotspot[], now: number): number {
  const cutoff = now - 24 * 3600e3;
  return hotspots.filter((h) => Date.parse(h.acquiredAt) >= cutoff).length;
}

/** ISO más reciente de una lista, o `fallback` si está vacía. */
function latestIso(isos: string[], fallback: string): string {
  let max = 0;
  for (const s of isos) {
    const t = Date.parse(s);
    if (t > max) max = t;
  }
  return max ? new Date(max).toISOString() : fallback;
}

const plural = (n: number, s: string) => `${n} ${s}${n === 1 ? '' : 's'}`;

/**
 * Estado de las fuentes. En mock, datos de demostración; en live, refleja las
 * fuentes realmente integradas y la frescura de sus datos.
 */
export async function getSourceStatus(): Promise<SourceStatus[]> {
  if (getDataMode() !== 'live') return MOCK_SOURCE_STATUS;

  const [fires, hotspots, burned] = await Promise.all([getFires(), getHotspots(), getBurnedAreas()]);
  const now = new Date().toISOString();
  const bySrc = (id: SourceId) => fires.filter((f) => f.sources.includes(id));
  // Portugal: ANEPC (FeatureServer oficial) es la fuente primaria; fogos.pt queda
  // de respaldo. Se muestra una sola fila de PT, identificando la que sirve el dato.
  const ptAnepc = bySrc('anepc');
  const ptFogos = bySrc('fogos');
  const pt = [...ptAnepc, ...ptFogos];
  const ptUsesFogos = ptFogos.length > 0 && ptAnepc.length === 0;
  const cyl = bySrc('jcyl');
  const and = bySrc('infoca');
  const cat = bySrc('catalunya');
  const clm = bySrc('infocam');
  // EFFIS: nº de áreas quemadas recientes recuperadas (independiente de si se
  // adjuntan a un incidente), para reflejar fielmente si la fuente responde.
  const perims = burned.length;
  // FIRMS necesita clave (FIRMS_MAP_KEY); sin ella el adaptador devuelve [].
  const firmsKey = !!process.env.FIRMS_MAP_KEY;

  return [
    {
      id: 'firms',
      label: 'NASA FIRMS',
      description: 'focos VIIRS/MODIS',
      status: firmsKey ? 'ok' : 'down',
      note: !firmsKey
        ? 'clave FIRMS no configurada'
        : hotspots.length
          ? 'Dominio público · últimas 48 h'
          : 'Sin focos en la ventana actual',
      lastUpdate: latestIso(hotspots.map((h) => h.acquiredAt), now),
    },
    {
      id: ptUsesFogos ? 'fogos' : 'anepc',
      label: ptUsesFogos ? 'fogos.pt / ANEPC' : 'ANEPC · Proteção Civil',
      description: 'incidentes activos (PT)',
      status: 'ok',
      note: plural(pt.length, 'incidente activo'),
      lastUpdate: latestIso(pt.map((f) => f.updatedAt), now),
    },
    {
      id: 'jcyl',
      label: 'INFORCYL · JCyL',
      description: 'Castilla y León',
      status: 'ok',
      note: plural(cyl.length, 'incidente'),
      lastUpdate: latestIso(cyl.map((f) => f.updatedAt), now),
    },
    {
      id: 'infoca',
      label: 'INFOCA · Andalucía',
      description: 'Plan INFOCA',
      status: 'ok',
      note: plural(and.length, 'incidente'),
      lastUpdate: latestIso(and.map((f) => f.updatedAt), now),
    },
    {
      id: 'catalunya',
      label: 'Bombers · Catalunya',
      description: 'incendis de vegetació',
      status: 'ok',
      note: plural(cat.length, 'incidente'),
      lastUpdate: latestIso(cat.map((f) => f.updatedAt), now),
    },
    {
      id: 'infocam',
      label: 'INFOCAM · Castilla-La Mancha',
      description: 'confirmados por satélite',
      status: 'ok',
      note: plural(clm.length, 'incidente'),
      lastUpdate: latestIso(clm.map((f) => f.updatedAt), now),
    },
    {
      id: 'effis',
      label: 'EFFIS / Copernicus EMS',
      description: 'perímetros de área quemada',
      status: perims ? 'ok' : 'degraded',
      note: perims ? plural(perims, 'perímetro') : 'sin perímetros disponibles',
      lastUpdate: now,
    },
  ];
}

export { MOCK_FIRES, MOCK_HOTSPOTS, MOCK_SOURCE_STATUS };
