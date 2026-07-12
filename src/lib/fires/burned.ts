import type { Fire } from '@/types/fire';

/**
 * Fusiona áreas quemadas EFFIS del MISMO incendio (mismo municipio + misma fecha
 * de inicio), que la capa MODIS troceaba a veces en varios polígonos. Suma las
 * hectáreas de los trozos y conserva una sola entrada. Es para el LISTADO del
 * histórico (legibilidad); el mapa sigue dibujando todos los polígonos. Municipio
 * desconocido ("—") no se fusiona (clave única por slug) para no mezclar fuegos
 * distintos. No muta la entrada original. Preserva el orden.
 */
export function dedupeBurnedAreas(areas: Fire[]): Fire[] {
  const byKey = new Map<string, Fire>();
  for (const a of areas) {
    const key =
      a.municipality && a.municipality !== '—'
        ? `${a.municipality}|${a.startedAt.slice(0, 10)}`
        : `slug:${a.slug}`;
    const prev = byKey.get(key);
    if (prev) {
      prev.hectares += a.hectares;
    } else {
      byKey.set(key, { ...a });
    }
  }
  return [...byKey.values()];
}
