/**
 * Datos mock derivados del prototipo (docs/design/Iberfuego-Prototipo.dc.html). Coordenadas
 * reales aproximadas de cada localidad para poder pintarlas en un mapa real.
 * Se sirven cuando NEXT_PUBLIC_DATA_MODE=mock (por defecto).
 */

import type { Fire, Hotspot, SourceStatus } from '@/types/fire';
import { generatePerimeter } from '@/lib/fires/perimeter';

/** "Ahora" de los mocks (idéntico a MOCK_NOW en src/lib/time.ts). Local para no
 * crear un ciclo de imports (time → data → mock). */
const MOCK_NOW = Date.parse('2026-07-10T14:32:00+02:00');

const RAW_FIRES: Fire[] = [
  {
    slug: 'las-hurdes',
    name: 'Las Hurdes',
    municipality: 'Caminomorisco',
    province: 'Cáceres',
    region: 'Extremadura',
    country: 'ES',
    state: 'activo',
    level: 2,
    type: 'forestal',
    hectares: 3241,
    delta24h: 340,
    coordinates: [-6.29, 40.36],
    startedAt: '2026-07-07T14:20:00+02:00',
    updatedAt: '2026-07-10T14:26:00+02:00',
    resources: { aerial: 14, ground: 42, personnel: 310, note: 'UME' },
    evacuation: 'Evacuación en Riomalo de Abajo y Las Mestas · EX-204 cortada',
    sources: ['nacional', 'effis'],
    fwi: 'Extremo',
    weather: { tempC: 38, humidity: 14, wind: 'NO 32 km/h' },
    timeline: [
      {
        at: '2026-07-10T09:12:00+02:00',
        label: 'Declarado nivel 2. Solicitada la intervención de la UME.',
        state: 'activo',
      },
      {
        at: '2026-07-09T18:40:00+02:00',
        label: 'El frente norte cruza la EX-204; nuevas evacuaciones preventivas.',
        state: 'activo',
      },
      {
        at: '2026-07-07T14:20:00+02:00',
        label: 'Primera detección satelital VIIRS · FRP 86 MW — no confirmada.',
      },
    ],
  },
  {
    slug: 'tejeda',
    name: 'Tejeda',
    municipality: 'Tejeda',
    province: 'Las Palmas',
    region: 'Canarias',
    country: 'ES',
    state: 'activo',
    level: 2,
    type: 'forestal',
    hectares: 1524,
    delta24h: 120,
    coordinates: [-15.61, 27.99],
    startedAt: '2026-07-08T11:05:00+01:00',
    updatedAt: '2026-07-10T14:21:00+01:00',
    resources: { aerial: 9, ground: 26 },
    evacuation: '900 evacuados en Tejeda y Artenara',
    sources: ['nacional', 'effis'],
  },
  {
    slug: 'macao',
    name: 'Mação',
    municipality: 'Mação',
    province: 'Santarém',
    region: 'Centro (PT)',
    country: 'PT',
    state: 'activo',
    ptState: 'em-curso',
    level: null,
    type: 'forestal',
    hectares: 640,
    delta24h: 95,
    coordinates: [-7.99, 39.55],
    startedAt: '2026-07-09T16:40:00+01:00',
    updatedAt: '2026-07-10T14:18:00+01:00',
    resources: { aerial: 6, ground: 18 },
    sources: ['fogos', 'effis'],
  },
  {
    slug: 'o-barco',
    name: 'O Barco',
    municipality: 'O Barco de Valdeorras',
    province: 'Ourense',
    region: 'Galicia',
    country: 'ES',
    state: 'activo',
    level: 1,
    type: 'forestal',
    hectares: 502,
    delta24h: 60,
    coordinates: [-6.98, 42.41],
    startedAt: '2026-07-09T20:15:00+02:00',
    updatedAt: '2026-07-10T14:23:00+02:00',
    resources: { aerial: 4, ground: 14 },
    sources: ['nacional', 'effis'],
  },
  {
    slug: 'odemira',
    name: 'Odemira',
    municipality: 'Odemira',
    province: 'Beja',
    region: 'Alentejo',
    country: 'PT',
    state: 'controlado',
    ptState: 'em-resolucao',
    level: null,
    type: 'forestal',
    hectares: 1102,
    delta24h: 0,
    coordinates: [-8.63, 37.6],
    startedAt: '2026-07-06T13:10:00+01:00',
    updatedAt: '2026-07-10T14:14:00+01:00',
    resources: { aerial: 3, personnel: 240 },
    sources: ['fogos'],
  },
  {
    slug: 'monfrague',
    name: 'Monfragüe',
    municipality: 'Torrejón el Rubio',
    province: 'Cáceres',
    region: 'Extremadura',
    country: 'ES',
    state: 'controlado',
    level: 0,
    type: 'forestal',
    hectares: 412,
    delta24h: 0,
    coordinates: [-6.05, 39.83],
    startedAt: '2026-07-08T17:30:00+02:00',
    updatedAt: '2026-07-10T13:50:00+02:00',
    resources: { aerial: 2, ground: 8 },
    sources: ['nacional'],
  },
  {
    slug: 'sierra-de-gata',
    name: 'Sierra de Gata',
    municipality: 'Gata',
    province: 'Cáceres',
    region: 'Extremadura',
    country: 'ES',
    state: 'estabilizado',
    level: 0,
    type: 'forestal',
    hectares: 238,
    delta24h: 0,
    coordinates: [-6.6, 40.24],
    startedAt: '2026-07-05T12:00:00+02:00',
    updatedAt: '2026-07-10T13:32:00+02:00',
    resources: { raw: 'vigilancia' },
    sources: ['nacional'],
  },
  {
    slug: 'bejar',
    name: 'Béjar',
    municipality: 'Béjar',
    province: 'Salamanca',
    region: 'Castilla y León',
    country: 'ES',
    state: 'extinguido',
    level: 0,
    type: 'forestal',
    hectares: 95,
    delta24h: 0,
    coordinates: [-5.76, 40.39],
    startedAt: '2026-07-03T09:20:00+02:00',
    updatedAt: '2026-07-10T11:32:00+02:00',
    resources: { raw: '—' },
    sources: ['jcyl'],
  },
];

/**
 * Adjunta un perímetro (mock) a los incendios con superficie relevante
 * (≥ 300 ha). Los pequeños se dejan sin perímetro para reflejar el caso "dato
 * no disponible". En live esto lo sustituye el WFS de EFFIS.
 */
export const MOCK_FIRES: Fire[] = RAW_FIRES.map((f) =>
  f.hectares >= 300
    ? { ...f, perimeter: generatePerimeter(f.slug, f.coordinates, f.hectares) }
    : f,
);

// ── Focos satelitales mock (FIRMS) ───────────────────────────────────────────
// Deterministas (sin Math.random): mismo resultado en server y cliente. En live
// los sustituye el recuento real de fetchFirmsHotspots (VIIRS/MODIS).

/** PRNG determinista (LCG) sembrado por cadena, para jitter reproducible. */
function seeded(seedStr: string): () => number {
  let s = 2166136261 >>> 0;
  for (let i = 0; i < seedStr.length; i++) {
    s ^= seedStr.charCodeAt(i);
    s = Math.imul(s, 16777619);
  }
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

/** Genera un cúmulo de focos alrededor de un incendio, según su superficie. */
function clusterFor(fire: Fire): Hotspot[] {
  const rng = seeded(fire.slug);
  const count = Math.min(70, Math.max(5, Math.round(fire.hectares / 50)));
  const spread = 0.02 + Math.sqrt(fire.hectares) / 1400; // grados ~ tamaño del frente
  const [lon, lat] = fire.coordinates;
  const out: Hotspot[] = [];
  for (let i = 0; i < count; i++) {
    const ageMs = rng() * 24 * 3600e3; // últimas 24 h
    const frp = Math.round((2 + rng() * rng() * 120) * 10) / 10; // sesgado a valores bajos
    const conf = rng();
    out.push({
      id: `mock-${fire.slug}-${i}`,
      coordinates: [
        lon + (rng() - 0.5) * spread * 2,
        lat + (rng() - 0.5) * spread * 2,
      ],
      frp,
      confidence: conf > 0.75 ? 'high' : conf > 0.25 ? 'nominal' : 'low',
      sensor: rng() > 0.85 ? 'MODIS' : 'VIIRS',
      acquiredAt: new Date(MOCK_NOW - ageMs).toISOString(),
    });
  }
  return out;
}

/** Focos de fondo repartidos por la península (quemas agrícolas, industria…). */
const BACKGROUND_HOTSPOTS: [number, number][] = [
  [-3.7, 40.4], [-5.9, 37.4], [-4.4, 41.6], [-2.9, 39.5], [-0.9, 41.6],
  [-7.6, 42.3], [-8.4, 43.2], [-1.6, 42.8], [1.1, 41.3], [-6.3, 38.9],
  [-4.7, 36.9], [-3.6, 37.2], [-8.6, 40.0], [-7.9, 38.6], [-9.1, 38.7],
  [-2.5, 40.9], [0.6, 40.6], [-5.5, 42.6], [-3.0, 42.3], [-6.9, 37.9],
];

function backgroundHotspots(): Hotspot[] {
  const rng = seeded('incendib-bg');
  return BACKGROUND_HOTSPOTS.flatMap(([lon, lat], gi) => {
    const n = 1 + Math.floor(rng() * 3);
    return Array.from({ length: n }, (_, i) => {
      const ageMs = rng() * 24 * 3600e3;
      return {
        id: `mock-bg-${gi}-${i}`,
        coordinates: [lon + (rng() - 0.5) * 0.3, lat + (rng() - 0.5) * 0.3] as [number, number],
        frp: Math.round((1 + rng() * rng() * 40) * 10) / 10,
        confidence: (rng() > 0.6 ? 'nominal' : 'low') as Hotspot['confidence'],
        sensor: (rng() > 0.8 ? 'MODIS' : 'VIIRS') as Hotspot['sensor'],
        acquiredAt: new Date(MOCK_NOW - ageMs).toISOString(),
      };
    });
  });
}

/** Focos satelitales mock (detección térmica, NO incendio confirmado). */
export const MOCK_HOTSPOTS: Hotspot[] = [
  ...RAW_FIRES.filter((f) => f.state === 'activo' || f.state === 'controlado').flatMap(clusterFor),
  ...backgroundHotspots(),
];

/** Recuento de focos detectados en 24 h (KPI). En live = hotspots.length real. */
export const MOCK_HOTSPOTS_24H = MOCK_HOTSPOTS.length;

/** Estado de fuentes mock (pantalla Fuentes 3b). */
export const MOCK_SOURCE_STATUS: SourceStatus[] = [
  {
    id: 'firms',
    label: 'NASA FIRMS',
    description: 'focos VIIRS/MODIS',
    note: 'Dominio público · latencia ~3 h',
    status: 'ok',
    lastUpdate: '2026-07-10T14:20:00+02:00',
  },
  {
    id: 'effis',
    label: 'EFFIS / Copernicus EMS',
    description: 'perímetros + FWI',
    note: 'CC BY 4.0 · © European Union',
    status: 'ok',
    lastUpdate: '2026-07-10T13:51:00+02:00',
  },
  {
    id: 'fogos',
    label: 'fogos.pt',
    description: 'estado PT (ANEPC)',
    note: 'Sin respuesta · último dato 10:41',
    status: 'degraded',
    lastUpdate: '2026-07-10T09:41:00+01:00',
  },
  {
    id: 'icnf',
    label: 'ICNF',
    description: 'áreas ardidas PT',
    note: 'ArcGIS REST oficial',
    status: 'ok',
    lastUpdate: '2026-07-10T13:32:00+02:00',
  },
  {
    id: 'jcyl',
    label: 'JCyL · Bombers CAT',
    description: 'estado ES',
    note: 'Datos abiertos · 2×/día',
    status: 'ok',
    lastUpdate: '2026-07-10T11:32:00+02:00',
  },
  {
    id: 'aemet',
    label: 'AEMET · IPMA',
    description: 'riesgo IPIF/RCM',
    note: 'Actualización diaria',
    status: 'ok',
    lastUpdate: '2026-07-10T08:00:00+02:00',
  },
];
