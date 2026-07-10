# Iconos PWA (pendientes de generar)

El `manifest.webmanifest` referencia estos PNG. El favicon vectorial ya existe
en `src/app/icon.svg` (Next lo usa automáticamente); estos rasterizados son
para instalación/notificaciones.

Por generar (a partir de `src/app/icon.svg`, zona segura maskable = 80 %):

- `icon-192.png` — 192×192
- `icon-512.png` — 512×512
- `maskable-512.png` — 512×512, `purpose: maskable`
- `badge-72.png` — 72×72 monocromo (badge de notificación push)

Especificación de marca (README del proyecto, 12a/12b): gota de retardante (no
llama) en negativo sobre cuadrado rojo `#E5484D`, radio 24 % del lado, gota al
40 % central. A 16 px la gota se simplifica sin cola.

Sugerencia de generación: `sharp` o `resvg` desde el SVG, o un script en
`scripts/gen-icons.mjs` (fase de assets).
