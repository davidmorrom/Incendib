/**
 * Escribe instantáneas ricas y PERMANENTES de los incendios DESTACADOS en los
 * boletines en `src/content/archive/<slug>.json`, para que sus fichas /f/[slug]
 * sobrevivan «años, no meses» aunque el archivo de Redis (~1 año) los desaloje.
 *
 * Uso:
 *   node scripts/snapshot-archive.mjs            # todos los boletines (backfill)
 *   node scripts/snapshot-archive.mjs 2026-w28   # solo esa edición (en la GH Action)
 *
 * Fuente del dato completo: el endpoint /api/fires (live). Un destacado que ya no
 * esté en vivo NO se puede archivar rico (queda en el dato slim del propio boletín,
 * que resolveFire ya sirve). NO commitea: eso lo hace el llamante por ruta explícita.
 * Nunca debe romper la publicación del boletín (el llamante lo trata como no-fatal).
 */

import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const BOLETINES = path.join(ROOT, 'src/content/boletines');
const ARCHIVE = path.join(ROOT, 'src/content/archive');
const BASE = process.env.INCENDIB_URL || 'https://incendib.es';

/** Quita las señales de «ahora» y capa el timeline (igual que slimForArchive del store). */
function slim(f) {
  // eslint-disable-next-line no-unused-vars
  const { weather, satelliteConfirmed, hotspotKm, delta24h, ...rest } = f;
  return { ...rest, timeline: Array.isArray(f.timeline) ? f.timeline.slice(-20) : f.timeline };
}

async function main() {
  const only = process.argv[2]; // opcional: id de edición (p. ej. 2026-w28)
  let files;
  try {
    files = readdirSync(BOLETINES).filter((f) => f.endsWith('.json') && (!only || f === `${only}.json`));
  } catch {
    console.log('Sin carpeta de boletines; nada que archivar.');
    return;
  }
  const slugs = new Set();
  for (const f of files) {
    try {
      const b = JSON.parse(readFileSync(path.join(BOLETINES, f), 'utf8'));
      for (const h of b.highlights ?? []) if (h?.slug) slugs.add(h.slug);
    } catch {
      /* ignora un JSON corrupto */
    }
  }
  if (!slugs.size) {
    console.log('Sin destacados que archivar.');
    return;
  }

  const res = await fetch(`${BASE}/api/fires`);
  if (!res.ok) throw new Error(`/api/fires devolvió ${res.status}`);
  const data = await res.json();
  const live = Array.isArray(data) ? data : (data.fires ?? []);
  const bySlug = new Map(live.map((f) => [f.slug, f]));

  mkdirSync(ARCHIVE, { recursive: true });
  let written = 0;
  let gone = 0;
  for (const slug of slugs) {
    const fire = bySlug.get(slug);
    if (!fire) {
      gone += 1;
      console.log(`· ${slug}: no está en vivo (su ficha usará el dato slim del boletín)`);
      continue;
    }
    writeFileSync(path.join(ARCHIVE, `${slug}.json`), JSON.stringify(slim(fire), null, 2) + '\n');
    written += 1;
  }
  console.log(`Archivadas ${written} fichas ricas · ${gone} ya no en vivo. Dir: src/content/archive/`);
}

main().catch((e) => {
  console.error('snapshot-archive falló:', e.message);
  process.exit(1);
});
