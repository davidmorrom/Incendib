/**
 * Lector de ediciones del boletín semanal. Cada edición es un JSON inmutable
 * versionado en `src/content/boletines/` (opción A del research: repo + ISR,
 * cero coste, auditable en git). Se lee en el servidor durante el build/ISR.
 */

import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import type { Boletin } from '@/types/boletin';

const DIR = path.join(process.cwd(), 'src/content/boletines');

/** Todas las ediciones publicadas, de la más reciente a la más antigua. */
export function listBoletines(): Boletin[] {
  let files: string[];
  try {
    files = readdirSync(DIR).filter((f) => f.endsWith('.json'));
  } catch {
    return []; // carpeta aún sin ediciones
  }
  const items: Boletin[] = [];
  for (const f of files) {
    try {
      items.push(JSON.parse(readFileSync(path.join(DIR, f), 'utf8')) as Boletin);
    } catch {
      /* ignora un JSON corrupto en lugar de romper la página */
    }
  }
  // id "YYYY-wWW" ordena lexicográficamente igual que cronológicamente.
  return items.sort((a, b) => b.id.localeCompare(a.id));
}

export function getBoletin(id: string): Boletin | null {
  return listBoletines().find((b) => b.id === id) ?? null;
}

/** Edición más reciente (para `/boletin/latest` y enlaces destacados). */
export function latestBoletin(): Boletin | null {
  return listBoletines()[0] ?? null;
}
