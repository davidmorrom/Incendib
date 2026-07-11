/**
 * Genera los iconos PNG de la PWA y del badge de notificación a partir del logo
 * de marca (gota de retardante en negativo sobre cuadrado rojo #E5484D).
 *   node scripts/gen-icons.mjs
 * Requiere `sharp` (viene con Next). Los PNG resultantes se versionan en
 * public/icons/ y los referencian manifest.webmanifest y sw.js.
 */
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons');
mkdirSync(OUT, { recursive: true });

const DROP = 'M256 150 C 316 232, 344 284, 344 328 A 88 88 0 1 1 168 328 C 168 284, 196 232, 256 150 Z';

// Icono normal: cuadrado rojo redondeado + gota oscura (como el favicon).
const icon = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><rect width="512" height="512" rx="123" ry="123" fill="#E5484D"/><path d="${DROP}" fill="#0C1117"/></svg>`;
// Maskable: a sangre (sin esquinas transparentes), gota dentro de la zona segura.
const maskable = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><rect width="512" height="512" fill="#E5484D"/><path d="${DROP}" fill="#0C1117"/></svg>`;
// Badge de notificación (Android): monocromo, gota blanca sobre transparente.
const badge = `<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="96 120 320 320"><path d="${DROP}" fill="#FFFFFF"/></svg>`;

async function render(svg, size, file) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(join(OUT, file));
  console.log('  ✓', file);
}

console.log('Generando iconos en public/icons/…');
await render(icon, 192, 'icon-192.png');
await render(icon, 512, 'icon-512.png');
await render(maskable, 512, 'maskable-512.png');
await render(badge, 72, 'badge-72.png');
// Apple touch icon (iOS "Añadir a inicio"): opaco, sin esquinas transparentes.
await render(maskable, 180, 'apple-touch-icon.png');
console.log('Listo.');
