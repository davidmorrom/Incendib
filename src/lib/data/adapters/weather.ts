/**
 * Meteo local en el foco (Open-Meteo, sin clave). Rellena `Fire.weather` en la
 * ficha con temperatura, humedad y viento reales. Best-effort: undefined si falla
 * (la ficha oculta la sección). No es un dato del incendio, sino del punto.
 */

import type { Weather } from '@/types/fire';

const DIRS = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'] as const;

/** Grados (meteorológicos, de donde viene el viento) → rosa de 8 puntos. */
export function compass(deg: number): string {
  const i = Math.round((((deg % 360) + 360) % 360) / 45) % 8;
  return DIRS[i] ?? 'N';
}

export async function fetchWeather(
  lon: number,
  lat: number,
  signal?: AbortSignal,
): Promise<Weather | undefined> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(3)}&longitude=${lon.toFixed(3)}` +
    `&current=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m&wind_speed_unit=kmh`;
  try {
    const res = await fetch(url, {
      signal: signal ?? AbortSignal.timeout(6000),
      next: { revalidate: 1800 },
    });
    if (!res.ok) return undefined;
    const j = (await res.json()) as {
      current?: {
        temperature_2m?: number;
        relative_humidity_2m?: number;
        wind_speed_10m?: number;
        wind_direction_10m?: number;
      };
    };
    const c = j.current;
    if (!c || typeof c.temperature_2m !== 'number') return undefined;
    return {
      tempC: Math.round(c.temperature_2m),
      humidity: Math.round(c.relative_humidity_2m ?? 0),
      wind: `${compass(c.wind_direction_10m ?? 0)} ${Math.round(c.wind_speed_10m ?? 0)} km/h`,
    };
  } catch {
    return undefined;
  }
}
