# Destacada de Instagram — «Cómo funciona»

Guion y prompts para la destacada (highlight) que explica **cómo leer el mapa**
de Incendib: qué capas hay y qué significa cada marcador por **color _y_ forma**.

> Todos los valores (estados, colores, formas, textos) están tomados del repo:
> `src/lib/design/tokens.ts`, `src/components/ui/StateGlyph.tsx`,
> `src/components/map/MapLegend.tsx`, `src/types/fire.ts` y los diccionarios
> i18n (`src/lib/i18n/dictionaries/*.ts`). No hay valores inventados.

---

## 0. Datos reales del repo (referencia de verificación)

**Estados canónicos** (`FireState` en `tokens.ts`) + foco satelital. Forma exacta
según el SVG de `StateGlyph.tsx` (el mismo glifo que usan el mapa y la leyenda):

| Estado | Etiqueta ES (i18n `states`) | Leyenda mapa (i18n `legend`) | PT (SADO/ANEPC, `fire.ts`) | Forma real | Color base (oscuro) | Color base (claro) |
|---|---|---|---|---|---|---|
| `activo` | Activo | Activo / em curso | em curso | círculo doble (anillo + punto) **con glow**; pulso si nivel ≥ 2 | `#E5484D` | `#C1272D` |
| `controlado` | Controlado | Controlado | em resolução | **rombo** (cuadrado rotado 45°) | `#E8912D` | `#C4761B` |
| `estabilizado` | Estabilizado | Estabilizado | vigilância | **cuadrado** | `#E5C337` | `#A98F12` |
| `extinguido` | Extinguido | Extinguido | encerrada | **anillo** (círculo hueco) | `#6E7B87` | `#6E7B87` |
| foco satelital | Foco satelital | Foco satelital (sin confirmar) | por confirmar | **punto** relleno **con glow** | `#FF6A3D` | `#D9531E` |

**Capas del mapa** (i18n `map`):
- **Focos satelitales** — NASA FIRMS (sensores VIIRS/MODIS). Etiqueta obligatoria:
  «Detección satelital — no confirmada». Un foco NO es un incendio confirmado.
- **Perímetros de área quemada** — EFFIS/Copernicus (Sentinel-2, ~20 m). Relleno
  translúcido rojo + borde (color del estado `activo`).
- **Marcadores de incendio** — color + forma según la tabla anterior.

**Marca:** rojo `#E5484D` (= `state.activo.base` en oscuro). Tipografía IBM Plex
Sans (UI) e IBM Plex Mono (cifras). Tema oscuro «sala de control» como estética
de la destacada.

---

## 1. Guion de diapositivas (5)

Texto sobrio, en español. Título + una frase por diapositiva. La destacada se lee
en vertical 1080×1920.

### Portada (icono de la destacada)
**Cómo funciona**
_(solo el glifo del pin de mapa + rótulo pequeño; ver prompt §2)_

### Diapositiva 1 — Qué ves
**Un mapa, no titulares.**
Cada marcador es un incendio real en España o Portugal, situado en su punto y
actualizado desde fuentes oficiales y satelitales.

### Diapositiva 2 — Color + forma
**El color codifica el dato; la forma lo confirma.**
Nunca distinguimos solo por color: cada estado tiene también su forma, para que
se lea con daltonismo y con poca luz.

### Diapositiva 3 — Leyenda (la clave)
**Cada estado, su símbolo.**
- ⬤ **Activo** — círculo con halo _(activo / em curso)_
- ◆ **Controlado** — rombo _(em resolução)_
- ◼ **Estabilizado** — cuadrado _(vigilância)_
- ◯ **Extinguido** — anillo _(encerrada)_
- • **Foco satelital** — punto naranja _(sin confirmar)_

### Diapositiva 4 — Capas
**Detección ≠ incendio confirmado.**
Los focos satelitales (NASA FIRMS) son detecciones térmicas por confirmar; los
perímetros de área quemada vienen de EFFIS/Copernicus. Ante una emergencia, 112.

> **Nota de leyenda para la diapositiva 3 (valores reales, por si se rotula a mano):**
> los cinco símbolos son exactamente los de `StateGlyph.tsx`. En modo oscuro los
> colores son `#E5484D` (activo), `#E8912D` (controlado), `#E5C337` (estabilizado),
> `#6E7B87` (extinguido) y `#FF6A3D` (foco). El único con halo/pulso es el activo.

---

## 2. Prompt para Claude Design — PORTADA (icono de destacada)

> Copiar y pegar en Claude Design.

```
Diseña el icono circular de una destacada de Instagram (highlight cover),
1080×1920 px con el motivo centrado en un círculo seguro de ~320 px (se verá a
~60–70 px de diámetro).

Estilo: icono de dashboard técnico / panel de sala de emergencias. NO landing,
NO ilustración.

- Fondo: negro puro #000000, plano, sin gradientes ni texturas ni viñeta.
- Motivo: UN ÚNICO glifo — un pin de mapa (marcador de ubicación tipo "gota")
  dibujado a LÍNEA, trazo fino y uniforme (~6–8 px), esquinas limpias, sin
  relleno. Color del trazo: rojo #E5484D. Nada más dentro del pin.
- Composición: el glifo perfectamente centrado, aire generoso alrededor,
  legible como silueta a tamaño de icono pequeño.

Prohibido (evitar "AI slop"): gradientes morados/azules, destellos o luces de
brillo, sombras suaves decorativas, degradados de neón, 3D, varios elementos,
escenas, mapas de fondo, tipografía. Un solo trazo rojo sobre negro.
```

**Variante alternativa** (si el pin queda genérico): mismo prompt cambiando el
motivo por «un rombo a línea fina (◆) con un punto central», que evoca el
marcador de estado propio de Incendib. Mantener trazo rojo `#E5484D` sobre negro.

---

## 3. Prompt para Claude Design — DIAPOSITIVAS (plantilla común)

> Opcional. Da coherencia visual a las 4 diapositivas + portada.

```
Diseña una plantilla de diapositiva vertical para Instagram Stories, 1080×1920 px,
con estética de panel de sala de control de emergencias (dark mode técnico).

Sistema visual (coherente con la web incendib.es):
- Fondo: casi negro #0C1117, plano y mate. Sin gradientes, sin texturas.
- Rojo de marca para acentos y títulos clave: #E5484D.
- Texto principal claro #E8EDF2; texto secundario #9AAAB8.
- Tipografía: IBM Plex Sans para títulos y cuerpo; IBM Plex Mono SOLO para
  cifras, etiquetas técnicas y microcopy en mayúsculas con tracking amplio.
- Retícula sobria: margen lateral generoso, un título grande arriba y una única
  frase de cuerpo debajo. Mucho aire. Nada centrado a la fuerza.
- Detalle de marca opcional: una fina línea/regla superior o una etiqueta mono
  en la esquina ("INCENDIB · CÓMO FUNCIONA").

Para la diapositiva de LEYENDA, incluir una lista de 5 filas, cada una con su
símbolo geométrico a línea/relleno según se indica, alineados a la izquierda:
  1. Círculo con halo — rojo #E5484D — "Activo / em curso"
  2. Rombo (◆) relleno — naranja #E8912D — "Controlado"
  3. Cuadrado (◼) relleno — amarillo #E5C337 — "Estabilizado"
  4. Anillo (círculo hueco) — gris #6E7B87 — "Extinguido"
  5. Punto con halo — naranja #FF6A3D — "Foco satelital (sin confirmar)"
Los símbolos deben ser geométricos simples y uniformes, tamaño consistente, sin
sombras decorativas.

Prohibido (evitar "AI slop"): gradientes morado/azul, destellos, luces de brillo,
neón, 3D, stock, tipografías por defecto (Arial/Helvetica), fondos abstractos.
Sobrio, técnico, alto contraste, legible en móvil.
```

---

## Notas de uso

- La estética de la destacada es **oscura** (sala de control), aunque la web
  arranca en claro. Es una decisión de marca deliberada para Instagram.
- Los símbolos de la diapositiva 3 son los de `StateGlyph`; el **único** con
  halo/glow es el activo (y pulsa en el mapa si el incendio es de nivel ≥ 2).
- Mantener siempre el disclaimer: detección satelital ≠ incendio confirmado, y la
  referencia al **112** ante emergencia.
