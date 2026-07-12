import type { Fire, SeverityLevel, Country } from '@/types/fire';

/**
 * Fila del ranking territorial de "Incendios hoy": agrega los incendios por
 * provincia (o distrito en PT). El orden prioriza actividad real: primero por
 * incendios activos, luego por total, superficie y nombre.
 *
 * Nota de método: rankeamos **incidencias** con provincia conocida (fuentes
 * operativas), NO detecciones satelitales crudas por provincia — eso requeriría
 * asignar cada foco FIRMS a un polígono provincial (pendiente de la capa de
 * límites, ver docs/research/04). El recuento nacional de focos se muestra aparte.
 */
export interface ProvinceRankRow {
  province: string;
  region: string;
  country: Country;
  /** Total de incidencias en la provincia (dataset actual). */
  total: number;
  /** De ellas, en estado activo. */
  activos: number;
  /** Superficie sumada (ha). */
  hectares: number;
  /** true si alguna superficie sumada es estimación satélite (marcar «~»). */
  hectaresApprox: boolean;
  /** Nivel de gravedad máximo alcanzado en la provincia (ES); null si N/A. */
  maxLevel: SeverityLevel;
}

/** Agrega y ordena los incendios por provincia. Provincias sin nombre útil se
 * agrupan bajo su etiqueta tal cual la publica la fuente. */
export function rankByProvince(fires: Fire[]): ProvinceRankRow[] {
  const map = new Map<string, ProvinceRankRow>();
  for (const f of fires) {
    const key = `${f.country}|${f.region}|${f.province}`;
    let row = map.get(key);
    if (!row) {
      row = {
        province: f.province,
        region: f.region,
        country: f.country,
        total: 0,
        activos: 0,
        hectares: 0,
        hectaresApprox: false,
        maxLevel: null,
      };
      map.set(key, row);
    }
    row.total += 1;
    if (f.state === 'activo') row.activos += 1;
    if (typeof f.hectares === 'number' && Number.isFinite(f.hectares)) {
      row.hectares += f.hectares;
      if (f.hectaresApprox) row.hectaresApprox = true;
    }
    if (f.level != null && (row.maxLevel == null || f.level > row.maxLevel)) {
      row.maxLevel = f.level;
    }
  }
  return [...map.values()].sort(
    (a, b) =>
      b.activos - a.activos ||
      b.total - a.total ||
      b.hectares - a.hectares ||
      a.province.localeCompare(b.province, 'es'),
  );
}
