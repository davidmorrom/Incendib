/**
 * Agregador del boletín semanal. Consolida la capa de datos existente
 * (`src/lib/data`) en un snapshot `Boletin`. Reutiliza el motor de derivación
 * (gravedad) para elegir destacados y no inventa métricas que no podamos
 * respaldar con dato real.
 *
 * Nota de método (F1): FIRMS aporta la ventana de 7 días; los incendios en
 * seguimiento y sus perímetros son la foto al cierre. Cuando exista histórico
 * persistido (fase posterior) las cifras se acotarán a la semana natural exacta.
 */

import type { Fire } from '@/types/fire';
import type { Boletin, BoletinHighlight, BoletinKpi, BoletinRankRow } from '@/types/boletin';
import { getFires } from '@/lib/data';
import { fetchFirmsHotspots } from '@/lib/data/adapters';
import { sortByGravity } from '@/lib/fires/derive';
import { boletinId, isoWeekPeriod, lastClosedWeek } from './week';

function computeKpi(fires: Fire[], firmsWeek: number): BoletinKpi {
  const tracked = fires.filter((f) => f.state !== 'extinguido');
  const hectares = tracked.reduce((s, f) => s + (f.hectares || 0), 0);
  const perimeters = fires.filter((f) => f.perimeter && f.perimeter.length > 0).length;

  let maxLevel: BoletinKpi['maxLevel'] = null;
  let maxLevelWhere: string | undefined;
  for (const f of fires) {
    if (f.level != null && (maxLevel == null || f.level > maxLevel)) {
      maxLevel = f.level;
      maxLevelWhere = [f.name, f.region].filter(Boolean).join(' · ');
    }
  }
  return { firmsWeek, activeFires: tracked.length, hectares, perimeters, maxLevel, maxLevelWhere };
}

function computeRanking(fires: Fire[]): BoletinRankRow[] {
  const byRegion = new Map<string, BoletinRankRow>();
  for (const f of fires) {
    if (f.state === 'extinguido') continue;
    const key = `${f.country}|${f.region}`;
    const row = byRegion.get(key) ?? { region: f.region, country: f.country, fires: 0, hectares: 0 };
    row.fires += 1;
    row.hectares += f.hectares || 0;
    byRegion.set(key, row);
  }
  return [...byRegion.values()]
    .sort((a, b) => b.hectares - a.hectares || b.fires - a.fires)
    .slice(0, 8);
}

function toHighlight(f: Fire): BoletinHighlight {
  return {
    slug: f.slug,
    name: f.name,
    region: f.region,
    country: f.country,
    hectares: f.hectares,
    level: f.level,
    state: f.state,
    coordinates: f.coordinates,
  };
}

/**
 * Construye la edición correspondiente a la última semana ISO **cerrada**
 * respecto a `now`. `prev` (opcional) son los KPIs de la edición anterior, para
 * las variaciones (▲/▼). No lanza: ante fallo de una fuente, cuenta lo que haya.
 */
export async function buildBoletin(now: Date, prev?: BoletinKpi): Promise<Boletin> {
  const { year, week } = lastClosedWeek(now);
  const { start, end } = isoWeekPeriod(year, week);

  const [fires, hotspots] = await Promise.all([
    getFires(),
    // La API area/csv de FIRMS solo admite un rango de 1 a 5 días
    // ("Invalid day range. Expects [1..5]"); pedir 7 devolvía siempre vacío y
    // dejaba firmsWeek a 0. 5 días es la ventana máxima disponible en F1.
    fetchFirmsHotspots({ days: 5 }).catch(() => []),
  ]);

  const kpi = computeKpi(fires, hotspots.length);
  const ranking = computeRanking(fires);
  const highlights = sortByGravity(fires)
    .filter((f) => f.state !== 'extinguido')
    .slice(0, 6)
    .map(toHighlight);

  const sourceSet = new Set(fires.flatMap((f) => f.sources));
  sourceSet.add('firms');
  if (kpi.perimeters > 0) sourceSet.add('effis');

  return {
    id: boletinId(year, week),
    isoWeek: week,
    year,
    periodStart: start,
    periodEnd: end,
    publishedAt: now.toISOString(),
    status: 'cerrado',
    kpi,
    prevKpi: prev,
    ranking,
    highlights,
    sources: [...sourceSet],
    note: F1_NOTE,
  };
}

/**
 * Nota de método (F1) que acompaña a cada edición: las cifras son la foto a
 * fecha de cierre + ventana satelital de 5 días, no reconstruidas para la
 * semana natural exacta. Se hace explícito para no dar una falsa precisión.
 */
const F1_NOTE =
  'Las cifras reflejan la situación consolidada a fecha de cierre y una ventana ' +
  'móvil de detección satelital de 5 días (límite de la API de NASA FIRMS); el ' +
  'acotado exacto a la semana natural llegará cuando exista histórico persistido.';
