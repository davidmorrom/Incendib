# Reel de Instagram — «Lanzamiento»

Concepto, guion plano a plano, prompts para **Claude Design** (activos gráficos
estáticos) y notas de montaje del reel de **presentación** de Incendib (cuenta
recién creada, 0 publicaciones).

> **Cómo se hace el reel:** el **movimiento** sale de **grabación real de
> pantalla** del producto (mapa, ficha, informe) en modo oscuro. Claude Design
> **no** genera vídeo: produce solo la **portada** y los **gráficos estáticos**
> (tarjetas y *overlays*) que se superponen a la grabación en un editor de vídeo.
> El guion marca en cada plano qué es *screen recording* y qué es gráfico.

> Todos los valores (rutas, KPIs, marcadores, disclaimer, cobertura) están
> tomados del repo y verificados: `src/lib/design/tokens.ts`,
> `src/components/fires/ReportKpis.tsx`, `src/components/screens/InformeScreen.tsx`,
> `src/lib/legal.ts`, los diccionarios i18n (`src/lib/i18n/dictionaries/*.ts`),
> `src/lib/data/mock.ts` y el `README.md`. No hay datos inventados.

> **Grabaciones de pantalla listas:** los planos **[REC]** (mapa, ficha,
> informe) ya están grabados en modo oscuro/mock y reescalados a 1080×1920 en
> [`reel-grabacion/`](reel-grabacion/) (`rec-01-mapa`, `rec-02-ficha`,
> `rec-03-informe` + `reel-preview-bruto`). Falta solo la capa de Claude Design
> (§3), los subtítulos y el montaje (§4).

---

## 0. Datos reales del repo (referencia de verificación)

### Recorrido de grabación (rutas exactas, **modo oscuro**)

| Orden | Pantalla | Ruta | Qué se ve (verificado) |
|---|---|---|---|
| 1 | **Mapa** (home, 2a) | `/` | MapLibre con el mundo atenuado y ES+PT resaltados; marcadores por color+forma; focos satelitales; perímetros de área quemada; KPIs de cabecera (Activos · Ha afectadas · Focos 24 h). |
| 2 | **Ficha** de incendio (1c) | `/f/las-hurdes` | Estado, nivel, superficie, medios, **meteo local** (Open-Meteo), evolución/timeline con la nota «Detección satelital VIIRS … — no confirmada». |
| 3 | **Informe** (2b) | `/informe` | Rejilla de KPIs 2×2, chips por país (Todos/España/Portugal), tabla densa, pie con disclaimer 112. |

- **Tema:** grabar en **oscuro** («sala de control»). La web arranca en claro; hay
  que activar el tema oscuro antes de grabar (persiste entre visitas).
- **Slug recomendado para la ficha:** `las-hurdes` (en `mock`). Es el incendio más
  completo: nivel 2, meteo `38 °C · 14 % · NO 32 km/h`, FWI «Extremo», medios
  (incl. UME y ayuda internacional), evacuación y timeline con detección VIIRS.

### Conjunto de datos para grabar

- Recomendado: **`NEXT_PUBLIC_DATA_MODE=mock`** (arranca así por defecto, sin
  claves). El «ahora» de los mocks está fijado a **2026-07-10 14:32** y el mapa
  sale representativo y **estable** (Las Hurdes N2 en Cáceres, Tejeda en Canarias,
  Mação en Portugal…), reproducible en cada toma. Con `live` los números son
  reales pero variables y la cobertura satelital excluye las islas.
- **No rotular cifras a mano.** Los KPIs los calcula la app (`computeKpis`); usa
  siempre los números que muestre la grabación, no un valor fijo en un gráfico.

### KPIs del Informe (rejilla 2×2, `ReportKpis.tsx`)

| KPI (label i18n exacto) | Color del valor | Nota |
|---|---|---|
| **Incendios activos** | rojo `activo` + punto rojo | recuento |
| **Ha afectadas** | texto principal | miles con **espacio** (`formatNumber`: `3 241`) |
| **Focos 24 h** | naranja `foco` | detecciones FIRMS 24 h |
| **Nivel máximo** | naranja `controlado` | `N0`–`N3` o `—`, con nombre(s) del incendio |

> En la cabecera del **Mapa** los KPIs son «Activos · Ha afectadas · Focos 24 h»
> (`map.kpiActivos/kpiHa/kpiFocos`).

### Marcadores — **color + forma** (`tokens.ts` `markerShape` + `statePalette`)

Nunca solo color. Formas exactas del glifo (mapa y leyenda):

| Estado | Forma real | Color base (oscuro) | Etiqueta leyenda (i18n) |
|---|---|---|---|
| **Activo** | círculo con **halo/glow** (pulsa si nivel ≥ 2) | `#E5484D` | «Activo / em curso» |
| **Controlado** | **rombo** (cuadrado rotado 45°) | `#E8912D` | «Controlado» |
| **Estabilizado** | **cuadrado** | `#E5C337` | «Estabilizado» |
| **Extinguido** | **anillo** (círculo hueco) | `#6E7B87` | «Extinguido» |
| **Foco satelital** | **punto** relleno con glow | `#FF6A3D` | «Foco satelital (sin confirmar)» |

### Disclaimer 112 (literales exactos — usar tal cual)

- **Corto** (`disclaimer.short`, pie del informe/app):
  > No sustituye a los canales oficiales de emergencia. Emergencias: **112**
- **Largo** (`disclaimer.full`):
  > Incendib no es un canal oficial de emergencias. Ante peligro inmediato llama al **112**.
- **README (`> [!WARNING]`)**, para la tarjeta final si se quiere completo:
  > Incendib no es un canal oficial de emergencias. Los datos pueden tener latencia
  > y las detecciones satelitales no equivalen a incendios confirmados. Ante
  > peligro inmediato, llama al **112**.

> **Recomendado para el reel:** el **corto** en la tarjeta del 112 (cabe y se lee),
> y el matiz «detección satelital ≠ incendio confirmado» ya se muestra en la ficha
> durante la grabación. No dramatizar el 112: es informativo, no una alarma.

### Marca, cobertura y créditos (verificado)

- Cobertura (README): **España y Portugal** — Península, Canarias, Baleares,
  Azores, Madeira, Ceuta y Melilla. Tagline literal: «Incendios forestales
  activos · España y Portugal».
- Naturaleza: **público, sin ánimo de lucro**; **datos abiertos con atribución**
  (EFFIS/Copernicus · NASA FIRMS · fogos.pt/ICNF · INFORCYL · INFOCA · Bombers ·
  AEMET/IPMA · mapa © OpenStreetMap/OpenFreeMap).
- Créditos: **© 2026 David Moreno Romero**. Dominio: **incendib.es**.
- Sistema visual: fondo `#0C1117` (base) / `#06090D` (hundido), rojo `#E5484D`,
  acento foco `#FF6A3D`, texto `#E8EDF2` / secundario `#9AAAB8`. IBM Plex Sans
  (UI) + IBM Plex Mono (cifras, timestamps, coordenadas, etiquetas técnicas).

---

## 1. Concepto

**«Un mapa, no titulares.»** Sin gancho sensacionalista: el producto se explica
solo. Enseñamos el mapa vivo, entramos en un incendio real, rematamos con los KPIs
del informe y cerramos con el aviso del 112 y `incendib.es`. Ritmo tranquilo,
cortes secos, silencio o pista neutra. Estética de panel de sala de control
(oscuro), coherente con la web. **Duración objetivo: ~22 s** (rango 15–30 s).

Distinción de capas en todo el guion:
- **[REC]** = grabación de pantalla del producto (aporta el movimiento).
- **[DESIGN]** = gráfico estático de Claude Design superpuesto (§2).

---

## 2. Guion plano a plano

> Copy superpuesto = corto y real. Cifras que se citen deben coincidir con lo que
> muestre la grabación (mock 2026-07-10). Subtítulos incrustados en todos los planos.

### Plano 1 · Gancho sobrio — 0:00–0:03 (3 s)
- **[DESIGN]** Portada/primer frame (§3.1) en negro `#06090D`: título grande
  **«Incendios forestales, en un mapa.»** y, debajo en mono pequeño,
  «ESPAÑA · PORTUGAL · TIEMPO CASI REAL». Etiqueta de esquina «INCENDIB».
- **Movimiento:** estático o *fade-in* muy corto del texto (~150 ms). Sin zooms.
- Corte seco al mapa.

### Plano 2 · Mapa en vivo — 0:03–0:09 (6 s)
- **[REC]** `/` en oscuro. Se ve el mapa con ES+PT resaltados y los marcadores.
  Movimiento real: un **paneo/zoom suave** hacia la Península (p. ej. acercándose a
  Cáceres, donde está «Las Hurdes» N2). Que se aprecien marcadores de **distinta
  forma** (círculo con halo, rombo, cuadrado, anillo, punto naranja).
- **[DESIGN]** *Overlay* barra inferior (§3.3) semitransparente: mono
  «MAPA EN VIVO · MARCADOR = COLOR + FORMA».
- **Copy (subtítulo):** «Cada marcador, un incendio real. El color codifica el
  estado; la forma lo confirma.»

### Plano 3 · Abrir una ficha — 0:09–0:14 (5 s)
- **[REC]** Tocar el marcador de **Las Hurdes** → navega a `/f/las-hurdes`. Se ve
  entrar la ficha: estado **Activo · Nivel 2**, superficie, **meteo local**
  (`38 °C · 14 % · NO 32 km/h`), y al hacer scroll la línea de evolución con
  «Detección satelital VIIRS … — no confirmada».
- **[DESIGN]** *Overlay* barra inferior: mono «FICHA · METEO LOCAL Y EVOLUCIÓN».
- **Copy:** «Entra en cualquier incendio: estado, medios, meteo local y su
  evolución. Detección satelital no es incendio confirmado.»

### Plano 4 · KPIs del informe — 0:14–0:18 (4 s)
- **[REC]** `/informe` en oscuro. Rejilla **2×2** de KPIs (Incendios activos ·
  Ha afectadas · Focos 24 h · Nivel máximo) y, debajo, la tabla densa. Movimiento:
  pequeño scroll que revela la tabla; o cambio de chip **Todos → España → Portugal**.
- **[DESIGN]** *Overlay* barra inferior: mono «INFORME · KPIS Y TABLA ORDENABLE».
- **Copy:** «Y una foto de conjunto: activos, hectáreas y focos de las últimas 24 h.»

### Plano 5 · Disclaimer 112 — 0:18–0:21 (3 s)
- **[DESIGN]** Tarjeta del 112 (§3.4) sobre un fotograma **congelado y oscurecido**
  del mapa (o negro `#06090D`). Texto **corto** literal:
  «No sustituye a los canales oficiales de emergencia. Emergencias: **112**».
- **Movimiento:** entrada estática, sin dramatismo. `112` en mono, en rojo `#E5484D`.
- **Copy:** (el propio texto de la tarjeta; no añadir más).

### Plano 6 · Cierre — 0:21–0:23 (2 s)
- **[DESIGN]** Tarjeta final/créditos (§3.5): **incendib.es** grande,
  «Público · sin ánimo de lucro · datos abiertos con atribución» y, en mono
  pequeño, «© 2026 David Moreno Romero». CTA sobrio: «Enlace en la bio».
- Fin. Sin logotipo animado ni destello.

---

## 3. Prompts para Claude Design (activos estáticos, vertical 1080×1920)

> **Recordatorio:** Claude Design genera **imágenes fijas**. Los *overlays* (§3.3,
> §3.4) deben quedar sobre la grabación: pídelos con **fondo transparente** (PNG
> con alfa) y solo la barra/tarjeta visible. Si la herramienta no exporta alfa,
> usa el *fallback* indicado en cada bloque y recórtalo/mézclalo en el editor.

### 3.1 · PORTADA / primer frame (plano 1)

```
Diseña el primer fotograma vertical de un reel de Instagram, 1080×1920 px, con
estética de panel de sala de control de emergencias (dark mode técnico),
coherente con la web incendib.es.

- Fondo: casi negro #06090D, plano y mate. Sin gradientes, sin texturas, sin viñeta.
- Composición editorial, alineada a la izquierda con margen amplio (~90 px). Zona
  segura vertical de Instagram: nada crítico en los 250 px superiores ni en los
  320 px inferiores.
- Título grande en IBM Plex Sans, peso 600–700, color #E8EDF2, en dos líneas:
  «Incendios forestales, / en un mapa.»
- Debajo, una línea en IBM Plex Mono, tamaño pequeño, mayúsculas con tracking
  amplio (~0.12em), color #9AAAB8: «ESPAÑA · PORTUGAL · TIEMPO CASI REAL».
- Detalle de marca discreto: una etiqueta mono en la esquina superior izquierda
  «INCENDIB» (#9AAAB8) y, opcional, una fina regla horizontal roja #E5484D de 2 px
  bajo el título. Un único acento rojo, nada más.

Prohibido (evitar "AI slop"): gradientes morado/azul, destellos o luces de brillo,
sombras suaves decorativas, neón, 3D, ilustración abstracta, fotos de
incendios/humo/bomberos de stock, mapas realistas de fondo, tipografías por
defecto (Arial/Helvetica). Sobrio, alto contraste, legible en móvil.
```

### 3.2 · Plantilla de tarjeta de texto (reutilizable)

```
Diseña una plantilla de tarjeta de texto a pantalla completa para un reel
vertical de Instagram, 1080×1920 px, dark mode técnico coherente con incendib.es.

- Fondo: casi negro #0C1117, plano y mate.
- Un título grande (IBM Plex Sans 600–700, #E8EDF2) arriba y una única frase de
  cuerpo debajo (IBM Plex Sans 400, #9AAAB8). Mucho aire, alineado a la izquierda,
  margen ~90 px. Respeta las zonas seguras (250 px arriba / 320 px abajo).
- Acento de marca: la palabra clave del título puede ir en rojo #E5484D; cifras o
  etiquetas técnicas SIEMPRE en IBM Plex Mono. Etiqueta mono de esquina
  «INCENDIB · LANZAMIENTO».
- Entrega variantes con estos textos (una tarjeta por variante):
  1. «Un mapa, no titulares.»
  2. «El color codifica el estado; la forma lo confirma.»

Prohibido (evitar "AI slop"): gradientes morado/azul, destellos, luces de brillo,
neón, 3D, stock, fondos abstractos, tipografías por defecto. Sobrio y de alto
contraste.
```

### 3.3 · *Overlay* — barra inferior (planos 2–4)

```
Diseña un overlay de barra inferior para superponer sobre un vídeo (grabación de
pantalla), formato 1080×1920 px.

- FONDO TRANSPARENTE (PNG con canal alfa). Solo es visible una barra en la parte
  inferior; el resto del lienzo, vacío/transparente.
- Barra inferior anclada por encima de la zona segura de Instagram (que su borde
  superior quede a ~330 px del borde inferior). Altura ~110 px, ancho completo con
  márgenes laterales de ~40 px o de borde a borde.
- Estilo de la barra: panel semitransparente muy sobrio, fondo #0C1117 al ~72 %
  de opacidad, borde superior fino rgba(255,255,255,0.10). Sin sombras aparatosas.
- Contenido: a la izquierda, un punto rojo #E5484D de 9 px; a su lado, una
  etiqueta en IBM Plex Mono, mayúsculas, tracking amplio, color #E8EDF2. Deja el
  texto como campo editable; genera tres versiones con estos literales:
    · «MAPA EN VIVO · MARCADOR = COLOR + FORMA»
    · «FICHA · METEO LOCAL Y EVOLUCIÓN»
    · «INFORME · KPIS Y TABLA ORDENABLE»
  A la derecha de la barra, en mono más pequeño y color #9AAAB8: «incendib.es».

Fallback si no hay exportación con alfa: renderiza la misma barra sobre un fondo
sólido #00FF00 (croma) para recortarlo en el editor.

Prohibido (evitar "AI slop"): gradientes de color, destellos, luces de brillo,
neón, 3D, iconografía recargada. La barra no debe tapar el mapa: fina, translúcida
y sobria.
```

### 3.4 · *Overlay* — tarjeta del 112 (plano 5)

```
Diseña una tarjeta de aviso a pantalla completa para un reel vertical de
Instagram, 1080×1920 px, dark mode técnico coherente con incendib.es.

- Fondo: casi negro #06090D, plano y mate (pensado para ir sobre un fotograma del
  mapa oscurecido; también funciona como fondo sólido).
- Centrada verticalmente, dentro de la zona segura. Alineación izquierda, margen
  ~90 px.
- Texto principal en IBM Plex Sans, #E8EDF2, tamaño medio-grande, LITERAL EXACTO:
  «No sustituye a los canales oficiales de emergencia.»
- Debajo, en línea propia: «Emergencias:» (IBM Plex Sans, #E8EDF2) seguido de
  «112» en IBM Plex Mono, peso 600, color rojo #E5484D, notablemente más grande.
- Tono informativo, NO de alarma: sin iconos de sirena, sin triángulos rojos
  parpadeantes, sin fondo rojo. Un único acento de color en el «112».
- Detalle: fina regla superior rgba(255,255,255,0.10) y etiqueta mono de esquina
  «INCENDIB».

Prohibido (evitar "AI slop"): gradientes, destellos, luces de brillo, neón, 3D,
stock de emergencias, dramatización, fondos rojos saturados, tipografías por
defecto. Sobrio, alto contraste, respetuoso.
```

### 3.5 · Tarjeta final / créditos (plano 6)

```
Diseña la tarjeta final (end card) de un reel vertical de Instagram, 1080×1920 px,
dark mode técnico coherente con incendib.es.

- Fondo: casi negro #06090D, plano y mate.
- Protagonista: el dominio «incendib.es» en grande, IBM Plex Sans peso 700,
  #E8EDF2, con «incend» y «.es» en #E8EDF2 y una única letra o punto de acento en
  rojo #E5484D si ayuda a la marca (sin recargar). Centrado o alineado a izquierda
  con margen ~90 px, dentro de la zona segura.
- Debajo, una línea en IBM Plex Sans, #9AAAB8: «Público · sin ánimo de lucro ·
  datos abiertos con atribución».
- Más abajo, en IBM Plex Mono pequeño, #66727E: «EFFIS · NASA FIRMS · fogos.pt ·
  INFORCYL · INFOCA · Bombers · AEMET/IPMA» y, en línea aparte,
  «© 2026 David Moreno Romero».
- CTA sobrio en mono, #9AAAB8: «Enlace en la bio».

Prohibido (evitar "AI slop"): gradientes morado/azul, destellos, logotipos
animados sugeridos, neón, 3D, stock, iconos de redes recargados, tipografías por
defecto. Sobrio, limpio, alto contraste.
```

---

## 4. Notas de montaje

- **Formato:** vertical **9:16**, 1080×1920, 30 fps. Duración objetivo **~22 s**
  (aceptable 15–30 s). Respeta las zonas seguras de Instagram (evita texto crítico
  en los ~250 px superiores y ~320 px inferiores, donde caen UI y descripción).
- **Transiciones:** **cortes secos** entre planos. Como mucho, un *fade* de
  texto ≤150 ms en el plano 1 y un *fade to black* de ≤200 ms antes de la tarjeta
  112. Nada de *swipes*, *glitch*, zooms bruscos ni efectos aparatosos.
- **Movimiento:** procede solo de la grabación (paneo/zoom suave del mapa, scroll
  natural de ficha e informe). No animar los gráficos de Design más allá de una
  aparición simple.
- **Ritmo:** pausado; deja respirar cada pantalla ~1 s antes de introducir copy.
- **Subtítulos:** incrustados (*burn-in*) en todos los planos con copy, para
  accesibilidad y visionado sin sonido — IBM Plex Sans, alto contraste, con caja
  translúcida `#0C1117` si el fondo lo pide. Añadir también el texto de subtítulos
  en la descripción/CC del reel.
- **Música:** silencio o pista **neutra y discreta** (ambient sobrio, volumen
  bajo). **Nunca** música épica, percusión de tensión ni *stock* dramático. Sin
  efectos de sonido de sirenas/fuego.
- **Grabación:** modo **oscuro** activado; datos en **mock** (2026-07-10) para una
  toma estable y representativa; oculta barras del navegador/OS y graba solo el
  viewport móvil (p. ej. 390×844 @2x) para que se vea como PWA.
- **Coherencia de marca:** un único rojo `#E5484D` como acento; cifras y etiquetas
  técnicas siempre en IBM Plex Mono; nada de emojis en los gráficos.
- **Orden de exportación de Design:** 3.1 portada · 3.2 tarjetas de texto (×2) ·
  3.3 barra inferior (×3 literales) · 3.4 tarjeta 112 · 3.5 tarjeta final.
