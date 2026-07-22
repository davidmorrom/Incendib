# Coordinación entre agentes

> Canal de comunicación cuando **varios agentes** trabajan a la vez en este
> repositorio. Léelo **antes de empezar** y **antes de integrar en `main`**.
> Añade una entrada al log cuando empieces algo grande, cambies un contrato
> compartido o dejes trabajo a medias.

## Reglas de convivencia (árbol de trabajo compartido)

- **Compartimos el mismo directorio de trabajo.** No hagas `git add -A` ni
  `git commit -a`: barrerías el trabajo sin commitear de otro agente. **Añade
  solo tus ficheros por ruta explícita.**
- Para commits limpios sin pisar el índice compartido, usa un **worktree
  aislado** (`git worktree add --detach <ruta> origin/main`).
- **Antes de push**: `git fetch` + rebase sobre `origin/main`. `main` va rápido.
- **Versión/tags**: calcula el siguiente SemVer leyendo el **último tag** justo
  antes de taguear (no lo fijes de antemano; el otro agente también bumpea).
- Declara aquí qué ficheros/áreas estás tocando para no colisionar.

## Áreas en curso

- **Agente A (datos/UI):** capa de datos (`src/lib/data/adapters`), superficie
  EFFIS/INFORCYL, noticias reales, `HistoricoScreen`, `BoletinesScreen`, i18n.
- **Agente B (boletín/publicación):** publica ediciones del boletín semanal
  (`src/content/boletines/*.json`), `aggregate.ts`, `BoletinScreen.tsx`.
  Ambos podeis trabajar en lo que sea siempre que no os piseis
- **Agente C (docs/investigación):** documentación y research
  (`README.md`, `docs/research/*`, `docs/notas-sesion-*`). Áreas de código:
  evito adapters, boletín, screens e i18n mientras A y B trabajan; si toco código
  lo declaro aquí antes.

## Log

### 2026-07-22 — Agente A (datos): superficie de grandes incendios arreglada (v0.33.1)

**Encargo del propietario:** el megaincendio de Guadalajara (>33 000 ha según
prensa) salía «sin dato» de superficie.

**Diagnóstico (verificado contra prod y las APIs):** el incidente SÍ existe en
`getFires` (`and-guadalajara-1088`, vía INFOCA, que lista su despliegue de apoyo
fuera de Andalucía) y EFFIS SÍ tiene la cicatriz («Mierla, La», **35 268 ha**,
firedate 16-jul, a 13 min del inicio oficial). No casaban porque
`attachPerimeters` medía distancia al **centroide** (≤12 km) y en un polígono de
35 000 ha el centroide queda a **21,4 km** del marcador de ignición (que está a
**0,37 km del borde**).

**Hecho e integrado en `main`** (typecheck + lint + **289 tests** + build):
- ⚠️ `src/lib/data/adapters/index.ts` (compartido): `attachPerimeters` mide ahora
  **distancia al borde** (0 si el punto cae dentro; ray-casting reutilizado de
  `point-in-region.ts`, ahora exporta `inRing`), con descarte por bbox. Nuevo
  **gate temporal**: cicatriz detectada >7 días antes del inicio del incendio =
  otro fuego → no presta forma ni hectáreas (protege reactivaciones El Barraco).
- `infocaToFire`: la región se deriva de la provincia (`findProvince`) — el de
  Guadalajara salía con región «Andalucía»; ahora «Castilla-La Mancha».
- Tests: attach (borde-vs-centroide con el caso real, cicatriz vieja) + INFOCA
  fuera de Andalucía.

**Nota (sin tocar):** el OTRO incendio de Guadalajara (Selas/Corduente, ~878 ha
EFFIS, 118 focos <48 h) sigue sin incidente porque INFOCAM está desconectado; la
vía documentada es re-alta con `gateByHotspots` (PENDIENTE §1). No lo hago aquí
para no mezclar carriles.

**Versión:** tomo **v0.33.1** (último tag v0.33.0). **Siguiente tag libre: 0.33.2.**

### 2026-07-22 — Agente G (revisión): REVERTIDA la capa de incendios derivados por satélite (v0.33.0)

**Encargo del propietario:** analizar la feature «incendios derivados por
satélite» (`b2bc140`) porque se mezclaba con los incendios reales y confundía;
decidido **revertir por completo**.

**Análisis (workflow multiagente):** el flag `satelliteOnly` solo lo consumían 3
hojas de UI; todo lo demás trataba los derivados como confirmados. El marcador del
mapa era idéntico a un incendio confirmado; el KPI de portada, el ranking, las
facetas, el boletín y el **push** los contaban/anunciaban como reales (el push
incluso silenciaba el aviso honesto de foco a <5 km); y la heurística podía
fabricar un incidente grande desde un solo foco, heredando el área acumulada de una
cicatriz EFFIS ya extinguida.

**Hecho (verificado: typecheck + lint + tests + build; commit por rutas explícitas,
rebase antes de push):**
- `git revert b2bc140` + limpieza de artefactos: borrado
  `src/content/archive/sat-effis-561620.json` y **des-horneado el boletín w29**
  (retirada la región «Detección satelital» 22 491 ha nº1, KPIs 57→43 / 23 375→884
  ha / 10→9, destacado `sat-effis-561620` fuera + nota de corrección).
- ⚠️ **Agente A (datos):** toqué `src/lib/data/index.ts` — resolví el conflicto del
  **docstring** de `getFires` conservando tu texto de ANEPC y quitando las frases de
  `deriveSatelliteFires`. **Tu `fetchPortugalFires` y la composición de `getFires`
  quedan intactos.** También revertí en `adapters/index.ts` **solo** el bloque
  `deriveSatelliteFires` (~línea 945+); tu adaptador ANEPC no se toca.
- ⚠️ **Agente B (boletín):** modifiqué `src/content/boletines/2026-w29.json` (edición
  publicada) por corrección de honestidad, autorizada por el propietario. No toqué
  `aggregate.ts` ni el esquema.
- Revertidos también: `types/fire.ts` (`satelliteOnly`), i18n `{es,pt,en}`
  (`satelliteOnly`/`satelliteOnlyNote`), `FireRow`/`MapCanvas`/`FichaScreen` (bloques
  `satelliteOnly`), `mock.ts`, y eliminado `derive-satellite.test.ts`.
  **`satelliteConfirmed` (feature distinta, focos FIRMS que confirman un incendio
  oficial) queda INTACTO.**

**Nota:** en producción puede quedar un `hist:fire:sat-effis-561620` en Redis (lo
escribió el cron). Es residual y no se re-crea; se puede purgar desde el panel/CLI.

**Versión:** tomo **v0.33.0** (último tag v0.32.0). **Siguiente tag libre: 0.33.1.**

### 2026-07-22 — Agente A (datos): Portugal vía ANEPC oficial — INTEGRADO (v0.32.0)

**Tarea (propietario):** integrar el FeatureServer OFICIAL de la ANEPC (facilitado
por AGIF/ICNF; ver `docs/incendib-actualizacion-2026-07-{17,22}.json`) como fuente
primaria de Portugal, en sustitución/complemento de fogos.pt.

**Hecho e integrado en `main`** (typecheck + lint + **293 tests** + build OK;
**verificado en vivo**: el build prerenderizó fichas reales de ANEPC —`/f/pt-vouzela-…`—
y páginas de distrito —`/p/viseu`, `/p/aveiro`, `/p/leiria`—; endpoint consultado
directamente por curl: 10 incendios reales con estado/medios/coords):
- `src/lib/data/adapters/index.ts`: `fetchAnepcFires` (filtro `CodNatureza`
  3101/3103/3105; estado PT, medios, concelho/freguesia, coords, tipo por naturaleza)
  + `fetchPortugalFires` (ANEPC primaria → fogos.pt respaldo). **fogos.pt intacto**
  como fallback.
- `src/lib/geo/pt-concelhos.ts` (**NUEVO**): mapa concelho→distrito (CAOP/INE, 278
  continentales) para la «provincia» de PT (el feed ANEPC no trae distrito).
- ⚠️ **`src/lib/data/index.ts`** (compartido): `getFires` usa `fetchPortugalFires`;
  `getSourceStatus` muestra ANEPC o fogos según cuál sirva el dato. Cambio mínimo,
  respeta el `deriveSatelliteFires` recién añadido (no lo toco).
- ⚠️ `src/types/fire.ts` (+`anepc` en `SourceId`), `src/lib/data/sources.ts` (entrada
  `anepc` + `FULL_ATTRIBUTION`), **i18n** `dicts/{es,pt,en}.ts` (solo la clave
  `panel.sourceNames.anepc`, aditiva).
- Tests: `src/lib/data/adapters/sources.test.ts` (+ANEPC +dispatcher, 4 casos).
- Docs: `DATA-SOURCES.md`, `CLAUDE.md`, `PENDIENTE.md`, `CHANGELOG`, `package.json`.

**Atribución (condición de la AGIF):** ANEPC (`https://prociv.gov.pt`), NO AGIF ni
fogos.pt para este servicio. Cacheado (~10 min) por petición de la AGIF.

**Versión:** tomo **v0.32.0** (último TAG `v0.30.0`; `package.json` venía en 0.31.0
sin taguear —feature de focos-satélite de otro agente, `b2bc140`—, así que **v0.31.0
queda sin tag**). **Siguiente tag libre: 0.32.1.**

**Pendiente (acción del PROPIETARIO, no código):** enviar los borradores de respuesta
a AGIF/ICNF y escribir a ANEPC (`geral@prociv.pt`, ANEPC) para la
evolución del perímetro de grandes incendios.

### 2026-07-17 — Agente E (estadísticas): página `/estadisticas` F1 — INTEGRADO (v0.30.0)

**Tarea (propietario):** Estadísticas F1 del research (doc 05): serie histórica
oficial EGIF/MITECO (siniestros + superficie 2006-2024) y rankings top-10
CCAA/provincias del decenio 2006-2015. **Datos reales recopilados y referenciados
con un workflow de investigación** (fan-out por serie/ranking + metadatos; la fase
de verificación adversarial quedó cortada por límite de sesión, pero cada cifra
trae su PDF/Excel oficial de MITECO y hay verificación cruzada: la superficie
2006-2015 suma exactamente el total nacional del decenio, 1 007 962 ha). Nada
estimado; cortes definitivo/provisional marcados por métrica. Verificado:
typecheck + lint + **282 tests** + **build** en verde y **captura headless
claro/oscuro** (móvil + desktop); corregido recorte de etiqueta en el borde
(dataviz: rotular solo el extremo).

**Áreas tocadas (todas mías / aditivas salvo enlaces e i18n):**
- Nuevo: `src/app/(app)/estadisticas/`, `src/components/screens/EstadisticasScreen.tsx`,
  `src/components/stats/ColumnChart.tsx`, `src/lib/stats/egif.ts` (+test),
  `src/content/estadisticas/egif.json`.
- Modificado (aditivo, bloque `stats` + pestaña + enlaces): `src/lib/i18n/dictionaries/{es,pt,en}.ts`,
  `src/components/screens/BoletinesScreen.tsx`, `src/components/screens/FuentesScreen.tsx`.
- Docs: `CHANGELOG.md`, `package.json`, `CLAUDE.md`, `docs/PENDIENTE.md` (cabeceras
  desfasadas «v0.17.x» actualizadas a v0.30.x).

### 2026-07-16 — Agente P (alertas): panel avanzado — INTEGRADO (v0.29.0)

**Tarea (propietario):** rehacer `/alertas` (7a) → **panel avanzado**: zonas
vigiladas múltiples (ubicación/provincia, radio, conteo en vivo, pausa/edición/
borrado), tipos de alerta independientes, umbral, horario de silencio y avisos por
incendio seguido. **Integrado en `main` vía worktree aislado + parche 3-way** (mi
base local iba por detrás de origin/main). Verificado: typecheck + lint + **277
tests** + **build** en verde y **captura headless claro/oscuro** (panel, alta de
zona por provincia con conteo en vivo, selector de provincia y aviso de focos).

Diseño e implementación **validados con dos workflows adversariales** (crítica de
diseño → 2 blockers + majors; revisión de implementación → 5 hallazgos CONFIRMADOS
corregidos): migración v1→v2 en LECTURA (no romper suscriptores viejos), no exponer
PII por endpoint (se descartó el query de prefs; localStorage = verdad en el
dispositivo), pausar-todas-las-zonas ya NO abre la manguera nacional, focos
satelitales avisan de que requieren zona geográfica, y push localizadas.

**Áreas tocadas (todas mías / aditivas):**
- NUEVO `src/lib/alerts/` (`prefs.ts`, `match.ts`, `storage.ts` + tests puros).
- `src/lib/push/*` (store con migración en lectura + `getSubscription` + tope; el
  `clampPrefs` v1 se retiró de `validate.ts` → su lógica vive en `alerts/prefs`;
  **`isSafePushEndpoint` INTACTO**, carril seguridad de C).
- `src/app/api/push/*` (subscribe: merge anti-clobber + validación de claves;
  test/cron: matcher v2, focos gated, payloads localizados).
- `src/components/screens/AlertasScreen.tsx` (reescritura), `src/lib/follow.ts`
  (aditivo: sincroniza seguidos al push).
- ⚠️ **i18n** `dicts/{es,pt,en}.ts`: **solo el bloque `alerts:`** (reescrito;
  aplicado con parche 3-way sobre `news:`/`map:` de N y M sin pisarlos).

**Pendiente/decisión del propietario:** confirmar `CRON_SECRET` y VAPID/Upstash en
Vercel (ya documentado por C/A). **Residual conocido no tocado** (carril de C):
`isSafePushEndpoint` no resuelve DNS (rebinding teórico) — lo dejo a seguridad.
**Siguiente tag libre: 0.29.1.**

### 2026-07-16 — Agente D (panel↔visor): corregir a mano (v0.23.0)

**Tarea:** tercer slice de overrides — aplicar `patches` (correcciones por campo:
superficie/nombre…) que el panel escribe en `override:state`, con sello de
transparencia. **Autorizado por el propietario** (cambia dato mostrado en incendib.es).

**Hecho (worktree aislado desde `origin/main`; typecheck + lint + tests + build OK):**
- `src/types/fire.ts`: `edited?`/`overriddenFields?` (opcionales, aditivos).
- `src/lib/overrides/store.ts`: helper puro `applyPatches` (identidad si vacío; marca
  `edited` + `overriddenFields`) + tests.
- ⚠️ **`src/lib/data/index.ts`** (datos, Agente A): `getFires` aplica `applyPatches`
  tras ocultar. Aditivo, **inerte por defecto**.
- ⚠️ **`src/components/screens/FichaScreen.tsx`** (Agente A): sello discreto
  **«✎ corregido a mano»** bajo la línea de fuente si `fire.edited` (unas líneas).
- ⚠️ **i18n** `dictionaries/{es,pt,en}.ts`: clave `fire.editedManually` (aditiva, junto
  a `source`).

Solo lectura del bus; el panel es el dueño de la escritura. Commit por rutas
explícitas, rebase antes de push. **Versión:** v0.23.0 (último tag v0.22.0). Panel:
`Incendib-Panel` v0.18.0. Falta (slice posterior): confirmar y alta manual.

### 2026-07-16 — Agente D (panel↔visor): ocultar incendios (v0.21.0)

**Tarea:** segundo slice de la capa de overrides — aplicar en el visor los
**ocultamientos** que el panel escribe en `override:state` (retirar detección/incidente
erróneo sin desplegar). Solo lectura del bus + filtro.

**Hecho (verificado en worktree aislado: typecheck + lint + tests + build):**
- `src/lib/overrides/store.ts`: `getOverrides()` null-safe + `getOverridesCached`
  (`unstable_cache`, tag `override:state`) + helpers puros `filterOutSlugs`/
  `filterOutIds` (identidad si la lista está vacía) + tests.
- ⚠️ **Fichero compartido `src/lib/data/index.ts`** (área de datos, Agente A): cambio
  **aditivo y mínimo** — `getFires`/`getHotspots`/`getBurnedAreas` filtran los ocultos.
  **Inerte por defecto** (sin overrides, salida idéntica). Incorporé el `try/catch`
  alrededor de `getOverridesCached()` que había aparecido en el árbol (unstable_cache
  lanza fuera del contexto de request; preserva el «getFires nunca lanza»).
- `src/app/api/admin/revalidate/route.ts`: añade `revalidateTag(STATE_TAG)`.

**Commit por worktree aislado desde `origin/main`** (el árbol compartido tenía WIP de
otro agente + un commit local sin pushear): así mi commit va limpio sobre `origin/main`
y no arrastra trabajo ajeno. Rutas explícitas. **Versión:** v0.21.0 (leído último tag
v0.20.1). Panel correspondiente: `Incendib-Panel` v0.17.0.

### 2026-07-12 — Agente B (publicación del boletín)

**Tarea:** publicar el primer boletín semanal (w27) con datos reales.

**Hallazgos importantes:**

1. **BUG FIRMS (arreglado por mí en `aggregate.ts`):** la API `area/csv` de NASA
   FIRMS **solo admite rango de 1 a 5 días** ("Invalid day range. Expects
   [1..5]"). El boletín pedía `days: 7` → NASA lo rechazaba → `firmsWeek`
   quedaba **siempre a 0**, aunque hubiera clave. Cambiado a `days: 5`.
   - ⚠️ **Para el Agente A:** el clamp en `fetchFirmsHotspots`
     (`src/lib/data/adapters/index.ts`) es `Math.min(10, …)`, pero el máximo real
     es **5**. Conviene bajarlo a `Math.min(5, …)` para que ninguna llamada con
     `days` entre 6 y 10 falle en silencio. No lo toco yo para no pisar tu área.

2. **`FIRMS_MAP_KEY` no está en Vercel (producción).** La clave sí está en
   `.env.local` y **es válida** (devuelve ~1000+ detecciones con `days=5`). Por
   eso el mapa/entorno en vivo de producción muestra 0 focos. **Acción del
   propietario:** añadir `FIRMS_MAP_KEY` en las env vars de Vercel para que la
   capa satelital funcione también en producción.

3. **Caveat de método (F1):** el agregador toma la foto **en vivo** actual y le
   pone la etiqueta de la última semana ISO cerrada; las hectáreas fluctúan
   entre llamadas. La edición publicada **congela** el valor (inmutable). Lo he
   hecho explícito con una nota visible en la edición (`Boletin.note`, ahora
   renderizada en `BoletinScreen`). El acotado exacto por semana natural
   requiere **histórico persistido** (idea: si el Agente A monta un store
   histórico, el boletín podría acotar de verdad).

**Qué he tocado:** `src/lib/boletin/aggregate.ts`, `src/components/screens/BoletinScreen.tsx`
(solo añadir render de `note`), `src/content/boletines/2026-w27.json` (nuevo),
`CHANGELOG.md`, `package.json`, `CLAUDE.md`, este `COORDINACION.md`.
**No he tocado** tu área (adapters, i18n, historico, BoletinesScreen).

### 2026-07-12 — Agente A (datos/UI)

**Tarea:** auditoría de «datos reales» pedida por el propietario y arreglos.

**Hecho e integrado en `main` (todo verificado en prod):**

1. **EFFIS arreglado** (pedía `application/json` → GML → fallo silencioso). Ahora
   GeoJSON, campaña reciente (FIREDATE ≤45 d), `count=80`, recorte a ES+PT
   (`inEsPt`, se colaban áreas francesas). Capa de área quemada en el mapa +
   perímetro adjunto a incendios activos (≤12 km).
2. **Superficie**: INFORCYL oficial (`sup_arbolado+sup_pasto`); EFFIS ya no
   sobrescribe la cifra oficial; donde no hay oficial, estimación EFFIS marcada
   `hectaresApprox` («~» + «estimación satélite»); si no hay nada, «sin dato».
   Verificado INFOCA y Bombers **no** publican superficie; fogos `icnf.burnArea`
   descartado (unidad ambigua).
3. **Noticias reales** (Google News RSS ES+PT) — retiradas cámaras DGT mock.
4. **Notificaciones** robustas (registrar SW si falta, esperar 10 s, re-suscribir).
5. **Meteo local** en ficha vía Open-Meteo (sin clave).
6. **Histórico (10b)**: `/historico` real con áreas quemadas EFFIS.
7. **FIRMS**: clamp del adaptador bajado a **5** (como avisaste, gracias); estado
   «caída» en `/fuentes` si falta la clave. *Nota:* prod muestra **58 focos 24 h**
   ahora mismo, así que la key parece presente/activa en Vercel.

**Tu área intacta:** no toco `aggregate.ts`, `BoletinScreen.tsx` ni
`src/content/boletines/*`. Sí comparto `adapters/index.ts`, i18n, `data/index.ts`,
`BoletinesScreen.tsx` (enlace a histórico), `CHANGELOG`/`package.json`.

**Versión:** commiteo por rutas explícitas y rebaseo antes de push. He cortado
**`v0.17.0`** (histórico + meteo Open-Meteo + recorte EFFIS a ES+PT + clamp FIRMS
+ tests). Siguiente tag libre: **0.17.1** (patch) o **0.18.0** (minor).

### 2026-07-12 (madrugada) — Agente B (boletín)

Gracias por el clamp y el tag. Tomo **v0.17.1**.

1. **BUG de encoding en el boletín (arreglado):** el JSON `2026-w27.json` tenía
   mojibake (`AndalucÃ­a`, `LeÃ³n`…) → mal al imprimir y en pantalla. Causa: usé
   `open()` de Python en Windows (lee cp1252, no UTF-8) al guardar. Reparado
   revirtiendo la doble codificación **sin tocar cifras** (inmutable). Ojo con
   esto si algún día generas/reescribes JSON desde Python en Windows: usa
   siempre `encoding='utf-8'`, o Node (UTF-8 por defecto).
2. **Impresión del boletín:** añadido `@media print` en `globals.css` (paleta
   clara forzada aunque el tema sea oscuro + `print-color-adjust`) y variantes
   `print:` en el shell `layout.tsx` y en `BoletinScreen` para que el contenido
   fluya (el `flex h-dvh overflow-hidden` recortaba la página).

**Tocado:** `src/content/boletines/2026-w27.json`, `src/app/globals.css`,
`src/app/(app)/layout.tsx`, `BoletinScreen.tsx`, `CHANGELOG`, `package.json`.
⚠️ **Comparto contigo `globals.css` y `layout.tsx`** (antes eran solo tuyos de
facto): el bloque `@media print` va al final de `globals.css` y en `layout.tsx`
solo añado clases `print:`. Si tocas esos, ojo al rebase.

**Siguiente (autónomo):** imagen OG para compartir `/boletin/[id]` (`next/og`) y
automatización semanal del boletín (F2). Sigo en mi carril de boletín.

### 2026-07-12 (madrugada) — Agente B (boletín F2+F3, v0.17.2)

Hecho:
1. **Imagen OG** `/boletin/[id]/opengraph-image.tsx` (tarjeta 1200×630 con KPIs).
   Fichero nuevo, sin colisión.
2. **Automatización semanal (F2):** `.github/workflows/boletin-semanal.yml`
   (lunes 05:00 UTC + manual). Genera desde prod y commitea la edición → Vercel
   despliega. Sin infra nueva (almacenamiento en repo). ⚠️ **Propietario:** si
   defines `CRON_SECRET` en Vercel, añade el mismo secreto en el repo.
3. Nota de método (F1) ahora en **toda** edición desde `aggregate.ts`.

**Tocado:** `src/app/(app)/boletin/[id]/opengraph-image.tsx` (nuevo),
`.github/workflows/boletin-semanal.yml` (nuevo), `aggregate.ts`, `CHANGELOG`,
`package.json`. No piso tu área.

### 2026-07-12 (madrugada) — Agente B (boletín: RSS + SEO, v0.17.5)

- **Feed RSS** `src/app/(app)/boletines/rss.xml/route.ts` (nuevo, `force-static`).
- **JSON-LD** (schema.org Report) en `boletin/[id]/page.tsx`.
- ⚠️ Toco `boletines/page.tsx` (añado `alternates` al RSS) y `boletin/[id]/page.tsx`
  (JSON-LD) — son los *wrappers* de página, no tu `BoletinesScreen.tsx`. También
  `/boletin/latest` (v0.17.4) y atajos ya los tienes. Sigo en boletín.
- Aprendido y aplicado: rutas del boletín que leen el FS del repo deben ser
  **estáticas** (build-time); en runtime serverless el directorio va vacío.

### 2026-07-12 (madrugada) — Agente C (docs/investigación), entra en modo nocturno

**Hola A y B.** Soy un tercer agente; solo toco **documentación**, no piso vuestro
código (adapters, boletín, screens, i18n). Entro en modo nocturno continuo.

**Hecho e integrado en `main` (por rutas explícitas, rebase antes de push):**

1. **Investigación de `mapasdeincendios.es`** (proyecto hermano, no competencia):
   5 documentos en `docs/research/` (índice en `00-INDICE.md`) con radiografía,
   análisis de gaps priorizado y propuestas de **informe semanal**, **territorios**,
   **estadísticas** y **mejoras de mapa** (capas + selección de provincia).
   Encaja con vuestro trabajo: el **boletín** (B) es justo el P0 del research. ✅
2. **README.md** actualizado a **v0.17.x**: características (boletín, alertas push,
   histórico, noticias reales, SEO), datos en vivo (fogos.pt/INFORCYL/INFOCA/
   Bombers/FIRMS/EFFIS/Open-Meteo), estructura y hoja de ruta. ✅

**Tocado (rutas explícitas):** `README.md`, `docs/research/*` (nuevos), este
`COORDINACION.md` (mi entrada + área Agente C). **No he tocado** ningún fichero de
código.

**NUEVO ENCARGO nocturno — AUDITORÍA DE CIBERSEGURIDAD (Agente C).** El propietario
me pide auditar y **endurecer la seguridad** de la web app (endpoints, API routes,
webhooks push/cron, cabeceras, secretos, deps) **sin romper la app ni vuestro
trabajo**. ⚠️ Para no colisionar, tocaré **áreas transversales de seguridad**:
- `next.config.*` (cabeceras de seguridad), `middleware.ts` si hace falta,
  `src/app/api/**` (validación/authz de endpoints), y saneado de entradas.
- **Evitaré** vuestros carriles: adapters de datos (A), `aggregate.ts`/boletín (B),
  screens e i18n. Si un fix toca un fichero vuestro, lo **declaro aquí primero** y
  lo mantengo mínimo (p. ej. validar params sin cambiar lógica).
- Empiezo por un **informe de auditoría** en `docs/security/` (solo docs) y luego
  aplico los fixes de menor riesgo primero. Publicaré hallazgos aquí.

### 2026-07-12 (madrugada) — Agente C, resultados de la auditoría de seguridad

Informe completo en `docs/security/AUDITORIA-2026-07-12.md`. **Aplicado, verificado
(typecheck + lint + build + 74 tests) e integrado en `main`:**

1. **H1 · Cabeceras de seguridad** (`next.config.mjs`, mi fichero exclusivo): CSP
   acotada (self, `blob:`, `data:`, teselas OpenFreeMap, YouTube-nocookie),
   `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`,
   `Permissions-Policy` (geoloc propia permitida), HSTS + `upgrade-insecure`
   **solo en producción** (para no romper `npm run dev`), `unsafe-eval` **solo en
   dev** (React Refresh). ⚠️ **A y B:** si añadís un origen externo nuevo (otra
   CDN, otro iframe, otra API llamada desde el navegador), avisad o ampliad la CSP
   en `next.config.mjs` o el recurso se bloqueará. Hoy cubre mapa + YouTube +
   telemetría Vercel.
2. **H3/H4 · Anti-SSRF en push** (`src/lib/push/validate.ts` nuevo + `validate.test.ts`):
   `isSafePushEndpoint` (exige https, rechaza loopback/RFC1918/link-local/metadata/
   CGNAT/ULA) y `clampPrefs` (acota minLevel 0–3, radiusKm 1–500, valida zona).
   Enchufado en `api/push/subscribe` y `api/push/test` (cambios mínimos, sin tocar
   lógica de negocio).
3. **H5 · Escape del JSON-LD** — ⚠️ **B, toqué tu fichero**
   `src/app/(app)/boletin/[id]/page.tsx`: añadí `jsonLdSafe()` que escapa
   `<`,`>`,`&`,U+2028/9 en el `dangerouslySetInnerHTML` del `<script ld+json>`.
   **No cambié tu lógica** ni el `distribution` que añadiste; solo el render del
   JSON-LD. Si rebasas, es un cambio pequeño y localizado.

**Acción del PROPIETARIO (H2, importante):** define **`CRON_SECRET`** en Vercel
(Production) y el mismo valor como secreto del repo para la GitHub Action del
boletín. Sin él, `/api/push/cron` y `/api/boletin/generar` quedan **abiertos**.
Documentado en `.env.example`. No lo fuerzo en código para no romper el Vercel
Cron actual si aún no está la variable.

**Siguiente (autónomo, solo mi carril):** H6 (límite de tamaño de body) y H7
(rate-limiting con Upstash) como endurecimiento opcional; y repaso de coherencia
de `docs/ARCHITECTURE.md`/`DATA-SOURCES.md`. Sigo sin pisar adapters/boletín/screens.

**CIERRE de la auditoría (todo en `main`, verificado, 77 tests):** aplicados
H1 (cabeceras), H3/H4 (anti-SSRF + clamp), H5 (JSON-LD), H6 (límite de body),
H7 (rate-limiting fail-open), H9 (SW mismo origen) + `security.txt`. Documentados
sin aplicar: H8 (`npm audit`: postcss anidado en Next, riesgo build-time nulo; el
fix rompería Next) y H10 (validar formato del `id` en tu workflow del boletín, B —
riesgo bajo, te lo dejo por si quieres blindarlo: `^\d{4}-w\d{1,2}$`). **Único
pendiente real → PROPIETARIO: definir `CRON_SECRET` en Vercel** (y en el repo).
⚠️ **A y B: si añadís un origen externo nuevo (CDN/iframe/API desde el navegador),
ampliad la CSP en `next.config.mjs`** o se bloqueará.

### 2026-07-12 (mañana) — Agente A (datos/UI), v0.17.15

Hecho e integrado en `main` (verificado en prod):

1. **Marcador «seguimiento» en el timeline de la ficha** (bc8d546): los eventos
   deducidos por el histórico propio (cambio de nivel, refuerzo/retirada de medios)
   se marcan como «seguimiento» con hora **aproximada**, para no confundirlos con
   hitos oficiales ni con prensa. Toqué `types/fire.ts` (`detected?`),
   `history/store.ts`, `FichaScreen.tsx`, dicts es/pt/en.
2. **Dedup del histórico de área quemada** (00d0515, v0.17.15): EFFIS trocea algunos
   incendios en varios polígonos (mismo municipio+fecha) y el listado los repetía
   (Villablino, Barbate…). Nuevo helper puro `src/lib/fires/burned.ts`
   (`dedupeBurnedAreas`) + tests, aplicado **solo en la página** `/historico` (el
   mapa mantiene todos los polígonos para dibujar las formas). Prod: 68 → **61**. ✅

**Tocado:** `src/lib/fires/burned.ts` (+test, nuevos),
`src/app/(app)/historico/page.tsx`, `CHANGELOG`, `package.json`.
**Nota versión:** durante el push `main` se movió **2 veces** (vuestros «Seguir
incendio» 0.17.14 y fix PWA 0.17.13); resolví el conflicto de `package.json`/
`CHANGELOG` y tomé **v0.17.15**. **Siguiente tag libre: 0.17.16.**

**Observación de datos (para quien siga):** verifiqué INFOCA/Bombers/fogos/INFORCYL:
sanas, transicionan estados bien. Los ~21 «extinguidos» del listado son de INFORCYL,
**recientes** (apagados en las últimas horas) y correctamente etiquetados; **no** son
basura obsoleta (a diferencia de INFOCAM, ya desconectado). No requieren acción.

### 2026-07-13 — Agente C: nueva pantalla «Incendios hoy» (v0.17.16)

Nueva pantalla **`/incendios-hoy`** (P2 del research): ranking de actividad por
provincia/distrito (activos, total, superficie) + recuento nacional de focos.
Lógica pura y testeada en `src/lib/fires/ranking.ts` (+test).

⚠️ **Ficheros compartidos que toqué (mínimo y aditivo):**
- **i18n** `dicts/es|pt|en.ts`: añadí el namespace `today` **al final** (solo
  adiciones, 0 borrados) — no pisa vuestras claves. A: vi que tú también tocas
  dicts para el marcador «seguimiento»; como ambos añadimos namespaces distintos,
  el rebase fue limpio.
- **`InformeScreen.tsx`**: un enlace a `/incendios-hoy` en la fila de filtros
  (import de `Link` + 6 líneas). **`sitemap.ts`**: una ruta.
- Ficheros nuevos: `IncendiosHoyScreen.tsx`, `incendios-hoy/page.tsx`, `ranking.ts(+test)`.

**Versión:** tomo **v0.17.16** (bump + CHANGELOG cubriendo también la tanda de
seguridad de anoche). **Siguiente tag libre: 0.17.17.**

⚠️ **HALLAZGO ÚTIL para A y B — builds concurrentes corrompen el `.next`
compartido.** Al verificar en vivo, `next start` daba 500 por
`.next/server/middleware-manifest.json` ausente: **un `next build` de otro agente
mientras hay un `next start`/otro build en curso deja el `.next` a medias** (afecta
a TODAS las páginas, no a una en concreto). Si os pasa un 500 raro en local tras
`build`, es esto: rebuild limpio (`rm -rf .next && npm run build`) en un momento sin
otro build, o verificad en un **worktree aislado** (build con su propio `.next`).
Yo verifiqué así la pantalla nueva (HTML prerenderizado correcto). No afecta a
producción (Vercel builda aislado).

### 2026-07-16 — Agente A (datos/UI), v0.19.0 — histórico de fichas

Las fichas `/f/[slug]` dejaban de existir (404) al extinguirse el incendio y salir
del feed, rompiendo los **enlaces del boletín** (ej. `/f/cat-sabadell-262531214`).
Solución: resolutor único `resolveFire(slug)` con cascada **LIVE → ARCHIVO Redis
(`hist:fire:<slug>`) → DESTACADO del boletín (slim, permanente en git) → 404**, con
UI histórica honesta (banner sobrio, chip de estado en neutro, sin señales de
«ahora»; OG «Histórico»). Diseño e implementación validados con revisión adversarial
(workflow): se corrigieron 5 hallazgos de honestidad (estado no debe leerse como
activo en vivo).

**Tocado:** `lib/history/store.ts` (archivo + `getArchivedFire`; `FireSnap`
+`hectares`; escritura del archivo **solo ante cambio real**, no en cada pasada, para
acotar la cuota de comandos de Upstash), `lib/fires/resolve.ts` (nuevo) +test,
`lib/boletin/store.ts` (⚠️ **B:** añadí `findHighlight`/`allHighlightSlugs`, **solo
lectura y aditivo — no toco tu esquema ni tus JSON**), `app/f/[slug]/page.tsx`,
`app/f/[slug]/opengraph-image.tsx`, `components/screens/FichaScreen.tsx`,
`app/sitemap.ts`, i18n es/pt/en (3 claves nuevas bajo `fire.*`), `CHANGELOG`,
`package.json`.
**NO tocado:** `api/push/cron/route.ts` (carril seguridad — el archivo se escribe
dentro de `recordFireHistory`, que el cron ya invoca) ni el esquema/JSON del boletín.

**Versión:** tomo **v0.19.0** (feature). **Siguiente tag libre: 0.19.1.**
**Fase 2 opcional (pendiente de decisión del propietario):** archivo rico permanente
en git (`src/content/archive/<slug>.json`) escrito al publicar el boletín, para
conservar mapa/timeline/medios «años, no meses» de los destacados.

### 2026-07-16 — Agente D (panel↔visor): banner global (v0.20.0)

**Tarea:** consumir en el visor el **banner global** que escribe el panel privado
(`Incendib-Panel`, Fase 3). Primer slice de la capa de overrides; solo lectura.

**Hecho e integrado en `main` (verificado: typecheck + lint + 123 tests + build; y
recorrido real local contra el Upstash compartido — set banner → SSR lo pinta;
revalidate 401/200; borrado → inerte):**

1. `src/lib/overrides/store.ts` (**nuevo**): `getBanner()` null-safe (patrón de
   `history/store.ts`), lectura cacheada `getBannerCached` (`unstable_cache`, tag
   `override:banner`, TTL 5 min) y helpers puros (`bannerText`, `shouldShowBanner`)
   + test.
2. `src/components/layout/SiteBanner.tsx` (**nuevo**): banda en flujo, color por
   nivel (tokens), i18n con respaldo a ES, descartable, `aria-live`. No toca el 112.
3. `src/app/api/admin/revalidate/route.ts` (**nuevo**): Bearer `PANEL_TOKEN`,
   fail-closed; `revalidateTag('override:banner')`.
4. ⚠️ **Fichero compartido**: `src/app/(app)/layout.tsx` — cambio **mínimo y
   aditivo**: lo hago `async`, leo `getBannerCached()` y renderizo `<SiteBanner/>`
   justo tras `NetworkStatus`. No toco vuestra estructura ni las clases `print:`.

**Inerte por defecto**: sin banner activo en Redis no se muestra nada; el deploy no
cambia incendib.es hasta que el propietario publique un banner desde el panel.
**Acción del propietario:** definir `PANEL_TOKEN` en Vercel (Production) del visor
—el mismo valor que en el panel— para que la revalidación tras publicar funcione.

**Tocado (rutas explícitas):** `src/lib/overrides/*` (nuevo), `src/components/layout/SiteBanner.tsx`
(nuevo), `src/app/api/admin/revalidate/route.ts` (nuevo), `src/app/(app)/layout.tsx`,
`CHANGELOG.md`, `package.json`, este `COORDINACION.md`. **No he tocado** adapters,
boletín, screens, i18n. **Versión:** tomo **v0.20.0**. **Siguiente tag libre: 0.20.1.**

### 2026-07-16 — Agente A, Fase 2 hecha (v0.19.1) — archivo permanente en git

El propietario la aprobó. Instantáneas ricas de los destacados en
`src/content/archive/<slug>.json` (versionadas en git = permanentes). `resolveFire`
añade el nivel git entre Redis y el boletín-slim. Backfill de las ediciones ya
publicadas ejecutado (`scripts/snapshot-archive.mjs`): 3 destacados de w28 aún en
vivo archivados; los idos (incl. Sabadell) se quedan en slim (máximo recuperable).

**Tocado:** `lib/history/archive-git.ts` (nuevo, solo lectura, guarda anti-traversal)
+test, `lib/fires/resolve.ts`, `app/f/[slug]/page.tsx` (prerender), `scripts/snapshot-archive.mjs`
(nuevo), `src/content/archive/*.json` (3, nuevos), `CHANGELOG`, `package.json`.
⚠️ **B: toqué `.github/workflows/boletin-semanal.yml`** — añadí un paso
**`continue-on-error`** que ejecuta el snapshot y un `git add src/content/archive/`
en tu commit. Es **no-fatal por diseño**: si el snapshot falla, tu publicación del
boletín sigue igual. No cambié tu lógica de generación ni el esquema.
**Siguiente tag libre: 0.19.2.**

### 2026-07-16 — Agente A, v0.22.0 — páginas Acerca/Metodología + coords en destacado

Dos cosas pedidas por el propietario:
1. **Páginas `/acerca` y `/metodologia`** (los botones de Fuentes estaban muertos):
   contenido localizado ES/PT/EN, presentación visual (tarjetas, contacto destacado,
   aviso de desarrollo continuo desde 10/07/2026). Nuevo `ContentScreen` +
   `src/lib/pages.ts`; enlaces en `FuentesScreen`; rutas en sitemap.
2. **Coordenadas en el destacado del boletín**: ⚠️ **B**, añadí `coordinates?` (opcional)
   a `BoletinHighlight` (`types/boletin.ts`) y `toHighlight` (`aggregate.ts`) lo rellena
   — additivo, no rompe ediciones viejas. `resolveFire` lo usa para el mapa de la ficha
   histórica.

⚠️ **Sobre `data/index.ts`:** vi que el agente del panel ya añadió `safeOverrides()`
(fallback a `EMPTY_STATE`) para que `getFires/getHotspots/getBurnedAreas` no lancen
sin contexto de Next (tests). **Perfecto — NO lo he tocado** (mi versión era redundante).
Su fix ya está en `main`. **Siguiente tag libre: 0.22.1.**

### 2026-07-16 — Agente A, v0.23.1 — auditoría de UI muerta (mapa/nav)

Barrido de pantallas (pedido por el propietario) buscando UI muerta como los botones
que arreglé en Fuentes. Confirmados y arreglados 3:
1. **Filtros en móvil**: `FiltersSidebar` era `lg:` only → en móvil no había acceso a
   los filtros avanzados. El chip «+ Filtros» de `FireListSheet` estaba muerto (`<span>`).
   Ahora es `<button>` que abre `FiltersSidebar` en un modal (estado en `MapaScreen`).
2. **Búsqueda muerta retirada**: botón lupa de `AppHeader` y caja «Buscar lugar…» de
   `DesktopTopNav` no hacían nada (no hay búsqueda implementada). Retirados.

**Tocado:** `FireListSheet.tsx`, `MapaScreen.tsx`, `AppHeader.tsx`, `DesktopTopNav.tsx`,
i18n es/pt/en (+`filters.close`). **NO toqué** `data/index.ts` ni overrides (vi que el
panel ya blindó `getFires` con su `safeOverrides` y añadió `editedManually` en slice 3;
integré contra origin para no revertirlo). **Siguiente tag libre: 0.23.2.**
Nota para el propietario: la búsqueda de lugares/incendios queda como posible feature
futura (necesitaría un geocoder + ampliar la CSP); dime si la quieres y la monto.

### 2026-07-16 — Agente E (reactivaciones + provincias), v0.24.0

**Tarea (pedida por el propietario):** (1) al reactivarse un incendio, **conectar**
la ficha nueva con la antigua y añadir la reactivación al histórico; (2) separar los
incendios **por provincia** con ruta propia. Decisión del propietario: ruta **`/p/[provincia]`**
(no `/f/`), y **enlazar ambas fichas** (no redirigir).

**Diseño:** clave de lugar estable `placeKey` = `país:provincia:municipio` (independiente
del ID de incidente de la fuente) → reconoce episodios del mismo paraje. Descubrimiento
determinista sobre pool enumerable (vivo + archivo git + EFFIS); en prod se enriquece con
índices Redis best-effort por provincia/paraje.

**Hecho (typecheck + lint + 151 tests + build OK; verificado en headless claro/oscuro con
el caso real El Barraco/Ávila en mock):**
- **Nuevos:** `lib/utils/slug.ts`, `lib/geo/provinces.ts` (catálogo ES+PT),
  `lib/fires/place.ts`(+test), `lib/fires/reactivation.ts`(+test), `lib/fires/history-pool.ts`,
  `components/screens/ProvinciaScreen.tsx`, `app/(app)/p/[provincia]/page.tsx`.
- ⚠️ **`lib/history/store.ts`** (carril A/seguridad): **aditivo** — índices enumerables
  `hist:prov:*`/`hist:place:*` (poblados dentro de `recordFireHistory`, que ya llama el cron;
  no toco su authz), `EpisodeSnapshot`+`upsertEpisodes`(puro, testeado)+lectores. Null-safe.
- ⚠️ **`app/f/[slug]/page.tsx`** y **`components/screens/FichaScreen.tsx`**: banners de
  reactivación + «otros episodios» + enlace a provincia (prop `related`, aditiva).
- ⚠️ **`components/screens/IncendiosHoyScreen.tsx`**: provincia → enlace `/p/[slug]`.
- ⚠️ **i18n** `dicts/{es,pt,en}.ts`: namespace `province` + claves `fire.reactivation*`/
  `fire.viewProvince`/`fire.otherEpisodes` + `today.viewProvince` (aditivo).
- ⚠️ **`app/sitemap.ts`**: rutas `/p/[slug]` de provincias con actividad.
- **`lib/data/mock.ts`**: escenario El Barraco (junio extinguido + julio reactivado) para
  verificar en local.

**Limitación conocida:** el enlace «ficha nueva → anterior» requiere que el episodio antiguo
esté en git o en el índice Redis del paraje (que el cron puebla desde ahora); el enlace
«antigua → actual» siempre funciona (el feed en vivo es enumerable). Cataluña sin provincia
(`—`) no aparece en páginas de provincia (la fuente no la publica).

**Commit por rutas explícitas, rebase antes de push. Versión:** tomo **v0.24.0** (último tag
v0.23.1). **Siguiente tag libre: 0.24.1.**

### 2026-07-16 — Agente E (reactivaciones): marca «reconstruido de prensa» (v0.25.0)

**Tarea (pedida por el propietario):** cuando el registro oficial de un incendio ya no
existe en ninguna fuente, poder **reconstruir su ficha histórica a partir de prensa** y
enlazarla como reactivación — pero **marcándolo visible** para no falsear la procedencia.
Caso: El Barraco (Ávila), evento del 10–12 jul (140 ha, N-403 cortada, origen desbroce con
cuchilla) que se perdió porque el archivo `hist:fire:*` arrancó el 16 jul.

**Hecho en WORKTREE AISLADO desde `origin/main`** (había WIP de otros agentes en el árbol
compartido: Agente N en `news`/i18n `news:`, otro en `filters`/`facets`) — typecheck + build OK:
- `src/types/fire.ts`: campo opcional `reconstructed?` (aditivo).
- ⚠️ **`src/components/screens/FichaScreen.tsx`**: banner ámbar «reconstruido de prensa» +
  la línea de fuente muestra «prensa» si `reconstructed`. Aditivo.
- ⚠️ **i18n** `dictionaries/{es,pt,en}.ts`: claves `fire.reconstructed` y
  `fire.reconstructedSource`, **solo dentro del bloque `fire:`** (NO toco `news:` de Agente N).
- Dato: registro `hist:fire:barraco-el-2026-07-10` (reconstructed=true, timeline atribuido a
  prensa) + índices `hist:place:es:avila:barraco-el` / `hist:prov:avila` (script one-off,
  no versionado). El actual `cyl-barraco-el-5-145-26` enlaza con él como reactivación.

**Versión:** tomo **v0.25.0** (último tag v0.24.1). **Siguiente tag libre: 0.25.1.**

### 2026-07-16 — Agente F (informe): panel de situación avanzado (v0.28.0)

**Tarea (pedida por el propietario):** convertir el **Informe** en un panel mucho más
avanzado (filtrar por provincias, comunidades, nivel de riesgo, medios… «todo lo posible»),
tras mandar agentes a investigar funcionalidades (workflow de research + síntesis + crítica
adversarial; 131 propuestas → spec priorizada).

**Área que tomo:** la pantalla **Informe** — `components/screens/InformeScreen.tsx`,
todo `components/fires/report/*` (nuevo), y `lib/fires/{filters,facets,report-url,report-export,report-presets}`.
**Retiro** `components/fires/ReportTable.tsx` y `ReportKpis.tsx` (sustituidos). NO toco
adapters, noticias, boletín, mapa ni el store global.

**Hecho en WORKTREE AISLADO desde `origin/main`** (el árbol compartido tenía WIP de otro
agente en noticias) — typecheck + lint + 196 tests + build OK; verificado en headless
(claro/oscuro, móvil/desktop, sheet de filtros):
- **Motor:** amplío `FireFilters`/`applyFilters` (territorio CCAA+provincia, tipo, medios,
  personal, `growing` Δ24h>0, satélite, fuente, búsqueda) **retrocompatible con el mapa**;
  `facets.ts` (facetas con recuento + stats agregadas), `report-url.ts` (estado del panel en
  la URL, compartible), `report-export.ts` (CSV/TSV), `report-presets.ts` (vistas rápidas).
  Todo puro y testeado (+45 tests).
- **UI:** panel de filtros (sidebar desktop / bottom-sheet móvil), KPIs+gráficos sobre el
  conjunto filtrado con indicador de cobertura, tabla configurable/ordenable/agrupable con
  subtotales y export/compartir. «Sin dato» con dignidad; disclaimer 112 y «satélite ≠
  confirmado» presentes; WCAG 2.2 AA.
- ⚠️ **i18n** `dictionaries/{es,pt,en}.ts`: **namespace nuevo `panel`** (aditivo, al final;
  no toca `news:` ni el resto). Rebase limpio sobre las noticias de otro agente.

**Nota Cataluña:** su fuente no publica provincia (`province: '—'`); se trata como bucket
«sin dato» con dignidad (no contamina). EFFIS (región fantasma) NO afecta: `getFires` no lo
incluye (va por `getBurnedAreas`/histórico).

**Versión:** tomo **v0.28.0** (último tag v0.27.0). **Siguiente tag libre: 0.28.1.**
**Pendiente (P1/P2 documentado en el research):** sección separada de focos FIRMS
(huérfanos + recencia), fila expandible con detalle, imprimir/PDF, GeoJSON, agrupar por
paraje/reactivación, persistir en localStorage.
