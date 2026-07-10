/**
 * Genera las geometrías estáticas del mapa:
 *   public/geo/es-pt.geojson       → contorno de España + Portugal (para el halo)
 *   public/geo/es-pt-mask.geojson  → mundo con España+Portugal recortados (máscara oscura)
 *
 * Turf solo se usa aquí (devDependency); NO va al bundle de cliente. El mapa
 * carga los .geojson resultantes por URL vía <Source data="/geo/...">.
 *
 * Reproducir:  npm run geo:gen
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { featureCollection } from '@turf/helpers';
import simplify from '@turf/simplify';
import mask from '@turf/mask';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'geo');

const SOURCES = {
  spain: 'https://raw.githubusercontent.com/georgique/world-geojson/develop/countries/spain.json',
  portugal:
    'https://raw.githubusercontent.com/georgique/world-geojson/develop/countries/portugal.json',
};

async function fetchFC(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url} → HTTP ${r.status}`);
  return r.json();
}

const round = (obj, dp = 4) =>
  JSON.parse(JSON.stringify(obj), (_, v) =>
    typeof v === 'number' && !Number.isInteger(v) ? Number(v.toFixed(dp)) : v,
  );

async function main() {
  const [es, pt] = await Promise.all([fetchFC(SOURCES.spain), fetchFC(SOURCES.portugal)]);

  // Combinar todas las piezas (península + islas) y simplificar cada una.
  const pieces = [...es.features, ...pt.features].map((f) => {
    const s = simplify(f, { tolerance: 0.01, highQuality: false, mutate: false });
    s.properties = {};
    return s;
  });
  const esPt = featureCollection(pieces);

  // Máscara: mundo con España+Portugal como agujeros.
  const dim = mask(esPt);

  writeFileSync(join(OUT, 'es-pt.geojson'), JSON.stringify(round(esPt)));
  writeFileSync(join(OUT, 'es-pt-mask.geojson'), JSON.stringify(round(dim)));

  console.log('es-pt.geojson      ', JSON.stringify(round(esPt)).length, 'bytes');
  console.log('es-pt-mask.geojson ', JSON.stringify(round(dim)).length, 'bytes');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
