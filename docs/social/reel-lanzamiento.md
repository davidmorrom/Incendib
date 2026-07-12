# Reel de Instagram — «Lanzamiento» · Brief para Claude Design

Este documento es el **encargo para Claude Design**. Se acompaña de los **vídeos
de grabación de pantalla** ya producidos (carpeta [`reel-grabacion/`](reel-grabacion/)).

> **Lee esto primero (reparto de trabajo):**
> - Los **MP4 que recibes son la base de movimiento** del reel (mapa, ficha,
>   informe grabados en vivo). **Ya tienen el movimiento**; no hay que animar nada.
> - **Tu tarea, Claude Design, es crear las IMÁGENES ESTÁTICAS** que se superponen
>   a esos vídeos: la **portada**, las **tarjetas de texto** y los **overlays**
>   (franja de contexto, tarjeta del 112, tarjeta final). **No generas vídeo.**
> - El **montaje final** (colocar tus gráficos sobre los vídeos, subtítulos,
>   música) se hace después en un editor. Este brief te dice **qué producir** y
>   **sobre qué vídeo y en qué momento** va cada pieza, para que encaje.
> - **Todo en vertical 1080×1920 (9:16).** Los vídeos ya están a esa resolución.

> Datos verificados contra el repo (`src/lib/design/tokens.ts`, `ReportKpis.tsx`,
> `legal.ts`, diccionarios i18n, `mock.ts`, `README.md`). No inventes cifras,
> textos ni funciones: usa los literales de §4.

---

## 1. Los vídeos que recibes (base [REC])

Grabados en **modo oscuro** con datos de demostración (mock, «ahora» = 2026-07-10
14:32). **1080×1920, 9:16, 30 fps, sin audio.** Timecodes verificados fotograma
a fotograma:

| Archivo | Dur. | Contenido y timecodes internos |
|---|---|---|
| **`rec-01-mapa.mp4`** | 11,0 s | Mapa en vivo. `0:00–0:06` península completa (marcadores por color+forma + clústeres de focos FIRMS). `0:06–0:08` zoom suave (*flyTo*) hacia Cáceres. `0:08–0:11` detalle: perímetro/foco y formas de marcador (círculo, rombo, cuadrado, anillo). |
| **`rec-02-ficha.mp4`** | 8,5 s | Ficha de Las Hurdes. `0:00–0:04` *hero*: mini-mapa con perímetro EFFIS + cabecera (Activo · Nivel 2 · FWI Extremo, superficie 3 241 ha, meteo 38 °C · 14 % · NO 32 km/h, medios). `0:04–0:08` scroll: desglose de medios, ayuda internacional y evolución con «detección satelital VIIRS — no confirmada». |
| **`rec-03-informe.mp4`** | 8,5 s | Informe de situación. `0:00–0:04` KPIs 2×2 + tabla «Todos (8)» + aviso de fuente degradada. `0:04–0:05` filtro «España (6)». `0:05–0:06` «Portugal (2)». `0:06–0:08` vuelve a «Todos (8)». |
| **`reel-preview-bruto.mp4`** | 28 s | Los tres anteriores concatenados con cortes secos (mapa → ficha → informe). Solo para previsualizar el flujo; **sin** gráficos ni subtítulos. |

> Las cifras que aparecen (4 activos · 7 754 ha · 193 focos · N2) las calcula la
> app. **No las rotules a mano** en tus gráficos: si necesitas citar un dato, usa
> §4; si no, deja que se lea del vídeo.

---

## 2. Qué tienes que producir (lista de activos)

Todos **1080×1920**. Distingo los que van **a pantalla completa** (fotogramas
propios, se intercalan) de los **overlays** (van ENCIMA del vídeo → **fondo
transparente, PNG con alfa**).

| # | Activo | Tipo | Va… |
|---|---|---|---|
| A | **Portada / primer frame** | pantalla completa | Antes de `rec-01-mapa` (plano de apertura). |
| B | **Tarjetas de texto** (×2) | pantalla completa | Opcional, entre planos. |
| C | **Franja de contexto** (×3 literales) | overlay transparente | Encima de cada uno de los 3 vídeos. |
| D | **Tarjeta del 112** | pantalla completa (o overlay) | Tras el informe. |
| E | **Tarjeta final / créditos** | pantalla completa | Cierre. |

Prompts detallados en §6. Colocación exacta en §5.

---

## 3. Sistema visual (obligatorio)

Coherente con la web incendib.es (estética de panel de sala de control):

- **Fondos:** casi negro `#0C1117` (base) o `#06090D` (más hundido, para
  portada/cierre). Planos y mates. **Sin gradientes, sin texturas, sin viñeta.**
- **Rojo de marca:** `#E5484D` (acentos, palabra clave del título, «112»).
- **Acento foco satelital:** `#FF6A3D` (úsalo con cuentagotas).
- **Texto:** principal `#E8EDF2`; secundario `#9AAAB8`; apagado `#66727E`.
- **Tipografía:** **IBM Plex Sans** para títulos y cuerpo; **IBM Plex Mono** para
  cifras, timestamps, licencias y etiquetas técnicas (mayúsculas con tracking
  amplio ~0.12em).
- **Zonas seguras de Instagram:** nada crítico en los **~250 px superiores** ni
  en los **~320 px inferiores** (ahí caen la UI de IG y el pie del reel).
- **Prohibido (evitar «AI slop»):** gradientes morado/azul, destellos, luces de
  brillo, neón, 3D, ilustración abstracta, *stock* de incendios/humo/bomberos,
  mapas realistas de fondo, tipografías por defecto (Arial/Helvetica), emojis.
  Sobrio, técnico, alto contraste, legible en móvil.

---

## 4. Datos verificados (para rotular sin inventar)

### Disclaimer 112 (literal exacto)
- **Corto** (recomendado para la tarjeta D):
  > No sustituye a los canales oficiales de emergencia. Emergencias: **112**
- (El disclaimer del 112 **ya aparece** en el pie de cada pantalla grabada; la
  tarjeta D lo refuerza a pantalla completa.)

### KPIs del informe (los que se ven en `rec-03-informe`)
«Incendios activos» · «Ha afectadas» (miles con espacio: `7 754`) · «Focos 24 h»
· «Nivel máximo» (`N0`–`N3`). No los reescribas en gráficos.

### Marcadores — color + forma (por si haces una mini-leyenda)
Círculo con halo = **Activo** `#E5484D` · rombo = **Controlado** `#E8912D` ·
cuadrado = **Estabilizado** `#E5C337` · anillo = **Extinguido** `#6E7B87` · punto
naranja = **Foco satelital (sin confirmar)** `#FF6A3D`.

### Marca y créditos
Cobertura: **España y Portugal**. Proyecto **público, sin ánimo de lucro**, datos
abiertos con atribución (EFFIS/Copernicus · NASA FIRMS · fogos.pt/ICNF · INFORCYL
· INFOCA · Bombers · AEMET/IPMA · mapa © OpenStreetMap/OpenFreeMap). Créditos:
**© 2026 David Moreno Romero**. Dominio: **incendib.es**.

---

## 5. Guion de montaje: qué gráfico va sobre qué vídeo y cuándo

Duración objetivo del reel **~22 s** (15–30 s). Cortes secos. En el montaje, cada
tramo usa un vídeo como base y le superpone tu gráfico:

| Tramo | Base (vídeo · in→out aprox.) | Gráfico tuyo encima | Copy / subtítulo |
|---|---|---|---|
| 0:00–0:03 | **A** (portada, pantalla completa) | Portada A | «Incendios forestales, en un mapa.» |
| 0:03–0:09 | **`rec-01-mapa`** `0:03→0:11` (península → zoom) | Franja C-1 | «Cada marcador, un incendio real. El color codifica el estado; la forma lo confirma.» |
| 0:09–0:14 | **`rec-02-ficha`** `0:00→0:08` (hero → scroll) | Franja C-2 | «Entra en cualquier incendio: estado, medios, meteo local y evolución. Detección satelital ≠ incendio confirmado.» |
| 0:14–0:18 | **`rec-03-informe`** `0:00→0:06` (KPIs → filtros) | Franja C-3 | «Y una foto de conjunto: activos, hectáreas y focos de 24 h.» |
| 0:18–0:21 | **D** (tarjeta 112, o sobre un fotograma congelado del mapa) | Tarjeta D | (el propio texto de la tarjeta) |
| 0:21–0:23 | **E** (cierre, pantalla completa) | Tarjeta E | «incendib.es · enlace en la bio» |

> **Nota de encuadre para el editor:** las grabaciones incluyen la barra de
> navegación propia de la app abajo. Si molesta con la franja C, **escala la
> grabación ~8–10 %** para sacarla de cuadro (el pie del 112 ya se refuerza con la
> tarjeta D). Alinea la franja C dentro de la zona segura inferior.

---

## 6. Prompts para Claude Design (uno por activo)

> Copia y pega en Claude Design. Cada uno indica dónde aterriza en el montaje.

### A · Portada / primer frame → abre el reel (antes de `rec-01-mapa`)

```
Diseña el primer fotograma vertical de un reel de Instagram, 1080×1920 px,
estética de panel de sala de control de emergencias (dark mode técnico),
coherente con incendib.es.

- Fondo: casi negro #06090D, plano y mate. Sin gradientes, sin texturas, sin viñeta.
- Composición editorial alineada a la izquierda, margen ~90 px. Zona segura:
  nada crítico en los 250 px superiores ni en los 320 px inferiores.
- Título grande IBM Plex Sans, peso 600–700, #E8EDF2, en dos líneas:
  «Incendios forestales, / en un mapa.»
- Debajo, una línea IBM Plex Mono pequeña, mayúsculas con tracking ~0.12em,
  #9AAAB8: «ESPAÑA · PORTUGAL · TIEMPO CASI REAL».
- Detalle de marca: etiqueta mono «INCENDIB» arriba a la izquierda (#9AAAB8) y una
  fina regla horizontal roja #E5484D de 2 px bajo el título. Un solo acento rojo.

Prohibido: gradientes morado/azul, destellos, luces de brillo, neón, 3D, stock de
incendios/humo, mapas realistas de fondo, tipografías por defecto. Sobrio, alto
contraste, legible en móvil.
```

### B · Tarjetas de texto (×2, pantalla completa) → opcionales entre planos

```
Diseña 2 tarjetas de texto a pantalla completa para un reel vertical, 1080×1920 px,
dark mode técnico coherente con incendib.es.

- Fondo casi negro #0C1117, plano y mate.
- Un título grande (IBM Plex Sans 600–700, #E8EDF2) y una frase de cuerpo debajo
  (IBM Plex Sans 400, #9AAAB8). Mucho aire, alineado a la izquierda, margen ~90 px.
  Respeta las zonas seguras (250 px arriba / 320 px abajo).
- La palabra clave del título puede ir en rojo #E5484D. Etiqueta mono de esquina
  «INCENDIB · LANZAMIENTO».
- Textos (una tarjeta cada uno):
  1. «Un mapa, no titulares.»
  2. «El color codifica el estado; la forma lo confirma.»

Prohibido: gradientes morado/azul, destellos, luces de brillo, neón, 3D, stock,
fondos abstractos, tipografías por defecto. Sobrio y de alto contraste.
```

### C · Franja de contexto (overlay) → ENCIMA de cada vídeo

```
Diseña un overlay de franja para superponer sobre vídeo, 1080×1920 px.

- FONDO TRANSPARENTE (PNG con canal alfa). Solo es visible una franja; el resto
  del lienzo, vacío/transparente.
- Franja horizontal delgada situada en el tercio inferior, con su borde inferior
  por encima de la zona segura (~360 px desde el borde inferior). Altura ~110 px,
  de borde a borde con margen lateral ~40 px.
- Estilo: panel semitransparente sobrio, fondo #0C1117 al ~72 % de opacidad, borde
  superior fino rgba(255,255,255,0.10). Sin sombras aparatosas.
- Contenido: a la izquierda un punto rojo #E5484D de 9 px y, al lado, una etiqueta
  IBM Plex Mono en mayúsculas con tracking amplio, #E8EDF2. A la derecha, en mono
  más pequeño #9AAAB8: «incendib.es».
- Genera TRES versiones cambiando solo la etiqueta (una por vídeo):
  · sobre rec-01-mapa:    «MAPA EN VIVO · MARCADOR = COLOR + FORMA»
  · sobre rec-02-ficha:   «FICHA · METEO LOCAL Y EVOLUCIÓN»
  · sobre rec-03-informe: «INFORME · KPIS Y TABLA»

Fallback si no exportas alfa: renderiza la franja sobre fondo verde croma #00FF00
para recortarla en el editor.

Prohibido: gradientes de color, destellos, luces de brillo, neón, 3D, iconografía
recargada. La franja NO debe tapar el mapa: fina, translúcida, sobria.
```

### D · Tarjeta del 112 → tras el informe (0:18–0:21)

```
Diseña una tarjeta de aviso a pantalla completa para un reel vertical, 1080×1920 px,
dark mode técnico coherente con incendib.es.

- Fondo casi negro #06090D, plano y mate (pensada también para ir sobre un
  fotograma del mapa oscurecido).
- Centrada verticalmente dentro de la zona segura. Alineación izquierda, margen ~90 px.
- Texto principal IBM Plex Sans, #E8EDF2, tamaño medio-grande, LITERAL EXACTO:
  «No sustituye a los canales oficiales de emergencia.»
- Debajo, en línea propia: «Emergencias:» (IBM Plex Sans #E8EDF2) seguido de «112»
  en IBM Plex Mono, peso 600, rojo #E5484D, notablemente más grande.
- Tono INFORMATIVO, no de alarma: sin iconos de sirena, sin triángulos rojos, sin
  fondo rojo. Único acento de color en el «112». Fina regla superior
  rgba(255,255,255,0.10) y etiqueta mono de esquina «INCENDIB».

Prohibido: gradientes, destellos, luces de brillo, neón, 3D, stock de emergencias,
dramatización, fondos rojos saturados, tipografías por defecto. Sobrio y respetuoso.
```

### E · Tarjeta final / créditos → cierre (0:21–0:23)

```
Diseña la tarjeta final (end card) de un reel vertical, 1080×1920 px, dark mode
técnico coherente con incendib.es.

- Fondo casi negro #06090D, plano y mate.
- Protagonista: «incendib.es» en grande, IBM Plex Sans peso 700, #E8EDF2, con un
  único punto/acento en rojo #E5484D si ayuda a la marca (sin recargar). Alineado a
  la izquierda con margen ~90 px, dentro de la zona segura.
- Debajo, IBM Plex Sans #9AAAB8: «Público · sin ánimo de lucro · datos abiertos con
  atribución».
- Más abajo, IBM Plex Mono pequeño #66727E: «EFFIS · NASA FIRMS · fogos.pt ·
  INFORCYL · INFOCA · Bombers · AEMET/IPMA» y, en línea aparte,
  «© 2026 David Moreno Romero».
- CTA sobrio en mono #9AAAB8: «Enlace en la bio».

Prohibido: gradientes morado/azul, destellos, logotipos animados, neón, 3D, stock,
iconos de redes recargados, tipografías por defecto. Sobrio, limpio, alto contraste.
```

---

## 7. Notas de montaje / entrega

- **Formato:** vertical **9:16**, 1080×1920, 30 fps. Duración **~22 s** (15–30 s).
- **Transiciones:** cortes secos. Como mucho un *fade* de texto ≤150 ms en la
  portada y un *fade to black* ≤200 ms antes de la tarjeta 112. Sin efectos.
- **Movimiento:** todo el movimiento sale de los MP4. Tus gráficos aparecen de
  forma simple (estáticos o *fade* corto); no los animes con recorridos.
- **Subtítulos:** incrustados (*burn-in*) en todos los tramos con copy — IBM Plex
  Sans, alto contraste, caja translúcida `#0C1117` si el fondo lo pide. Copia el
  texto también en la descripción/CC del reel.
- **Música:** silencio o pista neutra y discreta a bajo volumen. **Nunca** épica
  ni percusión de tensión ni sirenas/fuego.
- **Orden de entrega de Design:** A portada · B tarjetas (×2) · C franja (×3
  literales) · D tarjeta 112 · E tarjeta final.
- **Exporta los overlays (C) con transparencia** (PNG/ProRes 4444 o similar). Las
  piezas a pantalla completa (A, B, D, E) pueden ser PNG opacos 1080×1920.
