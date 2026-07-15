/**
 * Archivo PERMANENTE de incendios en git (`src/content/archive/<slug>.json`).
 * Complementa al archivo best-effort de Redis (`hist:fire:<slug>`, ~1 año): estas
 * instantáneas ricas (con mapa, timeline y medios) de los incendios DESTACADOS en
 * un boletín se versionan en el repo al publicar la edición, así que sus fichas
 * sobreviven «años, no meses» aunque Redis las desaloje. Solo lectura en la app;
 * la escritura la hace `scripts/snapshot-archive.mjs` (build/publicación, no el
 * cron serverless, que no puede commitear). Acotado a destacados → crecimiento
 * pequeño (~6/semana). Ver `docs/PENDIENTE.md` y `resolveFire`.
 */

import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import type { Fire } from '@/types/fire';

const DIR = path.join(process.cwd(), 'src/content/archive');

/** Un slug solo puede ser [a-z0-9-] (evita path traversal desde el param de URL). */
function safeSlug(slug: string): boolean {
  return /^[a-z0-9-]+$/.test(slug);
}

/** Fire archivado en git por slug. null si no existe, slug inválido o JSON corrupto. */
export function readArchivedFireGit(slug: string): Fire | null {
  if (!safeSlug(slug)) return null;
  try {
    return JSON.parse(readFileSync(path.join(DIR, `${slug}.json`), 'utf8')) as Fire;
  } catch {
    return null;
  }
}

/** Slugs con instantánea permanente en git (para prerender). [] si no hay carpeta. */
export function listArchivedGitSlugs(): string[] {
  try {
    return readdirSync(DIR)
      .filter((f) => f.endsWith('.json'))
      .map((f) => f.replace(/\.json$/, ''));
  } catch {
    return [];
  }
}
