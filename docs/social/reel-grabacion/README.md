# Reel de lanzamiento — grabaciones de pantalla [REC]

Material **bruto de grabación de pantalla** para el reel de lanzamiento (ver el
guion en [`../reel-lanzamiento.md`](../reel-lanzamiento.md)). Es solo la capa de
movimiento **[REC]**: **sin** gráficos de Claude Design, **sin** subtítulos y
**sin** música. Esos elementos se superponen/montan encima en el editor.

Grabado con Playwright (Chromium) contra el servidor local en **modo oscuro** y
**datos mock** (el «ahora» mock es 2026-07-10 14:32, toma estable y
representativa), viewport móvil 720×1280 y reescalado a **1080×1920** (9:16,
H.264, 30 fps, sin audio).

## Archivos

| Archivo | Plano del guion | Duración | Qué muestra |
|---|---|---|---|
| `rec-01-mapa.mp4` | Plano 2 · Mapa en vivo | 11 s | Península completa → `flyTo` (zoom suave) hacia Las Hurdes / Cáceres. Marcadores por color + forma (círculo, rombo, cuadrado, anillo) y clústeres de focos FIRMS. |
| `rec-02-ficha.mp4` | Plano 3 · Abrir ficha | 8,5 s | `/f/las-hurdes`: Activo · Nivel 2 · FWI Extremo, superficie, meteo local (38 °C · 14 % · NO 32 km/h), medios, perímetro EFFIS y evolución con «detección satelital VIIRS — no confirmada». |
| `rec-03-informe.mp4` | Plano 4 · KPIs del informe | 8,5 s | `/informe`: rejilla KPIs 2×2 (Incendios activos · Ha afectadas · Focos 24 h · Nivel máximo) y tabla; alterna los chips Todos → España → Portugal. |
| `reel-preview-bruto.mp4` | Secuencia 2→3→4 | ~28 s | Los tres planos concatenados con cortes secos, para previsualizar el flujo (sin gráficos ni subtítulos). |

> Las cifras que aparecen (4 activos · 7 754 ha · 193 focos · N2) son las que
> calcula la app con los datos mock; **no** rotular cifras a mano en los gráficos.

## Montaje

Estos clips son la base. Sobre ellos, en el editor:
1. Añadir la **portada** (plano 1) y las tarjetas/overlays de Claude Design
   (barra inferior, tarjeta 112, cierre) según §2–§3 del guion.
2. Recortar cada plano a su duración objetivo (~6 / ~5 / ~4 s) y ajustar el
   ritmo. Cortes secos.
3. Incrustar **subtítulos** y, si acaso, una pista neutra a bajo volumen.

## Regenerar

Requiere el servidor local en mock y Playwright:

```bash
# 1) servidor en oscuro/mock, puerto aislado
NEXT_PUBLIC_DATA_MODE=mock npx next dev -p 3200

# 2) Playwright (aislado; los navegadores ya están en la caché de Playwright)
#    en un dir temporal: npm i playwright && npx playwright install chromium

# 3) grabar (genera .webm) y convertir a mp4 1080x1920 con ffmpeg
node grabar.mjs
```

`grabar.mjs` fuerza el tema con `localStorage['incendib-theme']='dark'`, usa el
hook `?e2e` para acceder a la instancia del mapa (`window.__ibermap`) y anima el
`flyTo`. Los `.webm` resultantes se recortan (para descartar la compilación
inicial del dev server) y se reescalan a 1080×1920 con:

```bash
ffmpeg -y -ss <inicio> -t <dur> -i clipN.webm \
  -vf "scale=1080:1920:flags=lanczos,fps=30,format=yuv420p" \
  -an -c:v libx264 -preset slow -crf 19 -movflags +faststart recN.mp4
```
