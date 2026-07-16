/**
 * Slugify compartido: normaliza un texto a `[a-z0-9-]` estable para URLs, claves
 * de lugar y comparaciones. Mismo criterio que el slugify privado de los
 * adaptadores de fuente (acentos fuera, minúsculas, guiones), pero reutilizable.
 */
export function slugify(s: string): string {
  return (s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // diacríticos combinantes
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}
