/**
 * Catálogo canónico de provincias (España) y distritos (Portugal). Datos de
 * referencia estables (no cambian con el dato en vivo): sirven para
 *   1) validar el slug de `/p/[provincia]` (un slug desconocido → 404),
 *   2) prerenderizar las páginas de provincia (generateStaticParams),
 *   3) mostrar nombre y región cuando la provincia no tiene incendios ahora.
 *
 * El nombre y la región REALES de una provincia con datos se toman de los propios
 * incendios (respetan la grafía de la fuente); este catálogo es el respaldo.
 * La región (CCAA en ES) usa la misma grafía que `src/lib/fires/labels.ts`.
 */

import { slugify } from '@/lib/utils/slug';
import type { Country } from '@/types/fire';

export interface ProvinceRef {
  /** Slug de URL (`avila`, `a-coruna`, `santarem`). */
  slug: string;
  /** Nombre de la provincia/distrito (grafía canónica). */
  name: string;
  country: Country;
  /** CCAA (ES) o región (PT); ausente si no aplica con confianza. */
  region?: string;
}

/** [nombre, región] por comunidad autónoma (ES). */
const ES_BY_REGION: Record<string, string[]> = {
  Andalucía: ['Almería', 'Cádiz', 'Córdoba', 'Granada', 'Huelva', 'Jaén', 'Málaga', 'Sevilla'],
  Aragón: ['Huesca', 'Teruel', 'Zaragoza'],
  Asturias: ['Asturias'],
  Baleares: ['Illes Balears'],
  Canarias: ['Las Palmas', 'Santa Cruz de Tenerife'],
  Cantabria: ['Cantabria'],
  'Castilla-La Mancha': ['Albacete', 'Ciudad Real', 'Cuenca', 'Guadalajara', 'Toledo'],
  'Castilla y León': [
    'Ávila',
    'Burgos',
    'León',
    'Palencia',
    'Salamanca',
    'Segovia',
    'Soria',
    'Valladolid',
    'Zamora',
  ],
  Cataluña: ['Barcelona', 'Girona', 'Lleida', 'Tarragona'],
  'Comunidad Valenciana': ['Alicante', 'Castellón', 'Valencia'],
  Extremadura: ['Badajoz', 'Cáceres'],
  Galicia: ['A Coruña', 'Lugo', 'Ourense', 'Pontevedra'],
  'La Rioja': ['La Rioja'],
  Madrid: ['Madrid'],
  Navarra: ['Navarra'],
  'País Vasco': ['Álava', 'Bizkaia', 'Gipuzkoa'],
  'Región de Murcia': ['Murcia'],
  Ceuta: ['Ceuta'],
  Melilla: ['Melilla'],
};

/** Distritos de Portugal continental (los focos de fogos.pt traen `district`). */
const PT_DISTRICTS = [
  'Aveiro',
  'Beja',
  'Braga',
  'Bragança',
  'Castelo Branco',
  'Coimbra',
  'Évora',
  'Faro',
  'Guarda',
  'Leiria',
  'Lisboa',
  'Portalegre',
  'Porto',
  'Santarém',
  'Setúbal',
  'Viana do Castelo',
  'Vila Real',
  'Viseu',
];

function buildCatalog(): ProvinceRef[] {
  const out: ProvinceRef[] = [];
  for (const [region, provinces] of Object.entries(ES_BY_REGION)) {
    for (const name of provinces) {
      out.push({ slug: slugify(name), name, country: 'ES', region });
    }
  }
  for (const name of PT_DISTRICTS) {
    out.push({ slug: slugify(name), name, country: 'PT' });
  }
  return out;
}

export const PROVINCES: ProvinceRef[] = buildCatalog();

const BY_SLUG = new Map(PROVINCES.map((p) => [p.slug, p]));

/** Referencia canónica de una provincia por slug, o null si no está en el catálogo. */
export function findProvince(slug: string): ProvinceRef | null {
  return BY_SLUG.get(slug) ?? null;
}
