# Rendimiento y accesibilidad — Incendib

> Informe accionable. Sustituye como **fuente de verdad** a los dos volcados
> crudos del asistente de Chrome DevTools que había en esta carpeta
> (`devtools_*.md`), que se conservan como material de origen en el
> [anexo](#anexo-material-de-origen) con sus salvedades.
>
> Última revisión: **2026-07-22** · Aplicado en **v0.34.0**.

## TL;DR

- **El diagnóstico crudo exageraba el problema.** La traza original medía
  `LCP 1391 ms` con `render delay 1319 ms`; ~el 95 % de ese retardo era ruido de
  **extensiones del navegador del usuario** (Norton Password Manager ≈1130 ms,
  AdGuard, AdBlock), no código del sitio. Una traza limpia contra la misma
  producción da **LCP 271 ms, CLS 0, TTFB 41 ms**.
- **Sí había un problema real y grande del sitio**, que la traza no señalaba con
  claridad: el HTML de la home pesaba **~877 KB** y el **87 % (~750 KB) era un
  único payload RSC inline** con ~1100 focos FIRMS + perímetros EFFIS que solo
  consume el mapa (componente *client-only*) y **no hacen falta para el primer
  paint**. Penaliza a móvil y conexiones lentas — justo la audiencia de un visor
  de incendios.
- **Accesibilidad (WCAG 2.2 AA, obligatoria):** 3 fallos reales confirmados
  (contraste ×2 + nombre accesible del selector de idioma).

Todo lo anterior se ha corregido y **verificado** (ver
[Acciones aplicadas](#acciones-aplicadas-v0340)).

| Métrica (home, datos en vivo)         | Antes      | Después    |
| ------------------------------------- | ---------- | ---------- |
| HTML de la home (sin comprimir)       | ~877 KB    | **264 KB** (−70 %) |
| Payload RSC de focos/perímetros en HTML | ~750 KB  | **0 KB** (movido a `/api/map-layers`) |
| Lighthouse a11y · `color-contrast`    | ❌ falla   | ✅ pasa    |
| Lighthouse a11y · `label-content-name-mismatch` | ❌ falla | ✅ pasa |
| Lighthouse a11y · `target-size` (marcadores) | ❌ falla (solape) | ✅ pasa (clustering) |
| **Puntuación Accessibility (móvil)** | 96 | **100** |
| Re-render de la lista al hacer *hover* | 142 filas | ~2 filas (memo) |

---

## Metodología y salvedad de medición (léase primero)

Las trazas de rendimiento tomadas con Chrome DevTools **dentro del perfil real
del usuario** incluyen el trabajo de las extensiones instaladas. En la traza
original, el resumen de terceros lo deja claro:

- Norton Password Manager: **1130 ms** de hilo principal.
- AdGuard AdBlocker: 105 ms · AdBlock: 83 ms.
- **incendib.es (el sitio): 2263 ms** — pero mezclado con lo anterior en el hilo.

Por eso **`render delay` no es un buen proxy del coste del sitio** en ese
entorno. Para medir de verdad hay que:

1. **Aislar las extensiones** (perfil limpio / incógnito sin extensiones), o
2. medir señales que las extensiones **no** contaminan: **tamaño de HTML/bundle**,
   **auditoría de contraste** (determinista, se calcula de los colores
   renderizados) y **Lighthouse móvil con throttling** (dispositivo simulado).

Cifras de referencia:

- **Traza limpia** (producción, sin throttling): LCP **271 ms**, CLS **0**,
  TTFB **41 ms**. El elemento LCP es texto SSR (no hay recurso de red).
- **Lighthouse móvil** (throttling 4× CPU + red lenta): **Performance 58**,
  Accessibility 96, Best Practices 100, SEO 100. El 58 refleja un dispositivo
  lento y **sí** depende del bundle/JS del sitio → es el objetivo legítimo.

---

## Hallazgos verificados

### 1. Payload RSC gigante en el HTML de la home — ALTO (corregido)

`src/app/(app)/page.tsx` obtenía en el servidor `getFires()` + `getHotspots()`
(~1100 focos) + `getBurnedAreas()` (≤250 perímetros EFFIS) y pasaba **los focos y
los perímetros completos como props** a la isla cliente `MapaScreen`. Al ser
props de un componente cliente, Next los **serializa en el HTML** (script
`__next_f`). Medido: HTML de prod **877 KB**, de los que el mayor script inline
era **~750 KB** (el 87 %).

El único consumidor de esos datos es el mapa (`MapCanvas`), que ya se monta con
`next/dynamic` + `ssr:false` — o sea, **no existe hasta después de hidratar**.
Aun así el payload viajaba y se **deserializaba en la hidratación** (hilo
principal), difiriendo el primer paint. Los datos **no son necesarios para el
primer paint**.

### 2. Accesibilidad — WCAG 2.2 AA (corregido)

Auditoría autoritativa (`lighthouse_audit`, móvil) sobre la home:

- **Contraste** (`color-contrast`): el naranja `#d9531e` (`--state-foco-text`,
  cifra «FOCOS 24 H») sobre blanco daba **4.03:1**; el ámbar `#c4761b`
  (`--state-controlado`, badge de nivel) sobre `#f8efe4` daba **3.10:1**. Ambos
  < 4.5:1. Un escaneo del sistema de tokens destapó **fallos hermanos con la
  misma causa raíz**: varios tokens `-text` de modo claro (`ok-text`, `warn`,
  `estabilizado-text`, `extinguido-text`) se habían dejado iguales al color del
  marcador (`base`) sin oscurecer para uso como texto.
- **Nombre accesible** (`label-content-name-mismatch`): el botón de idioma mostraba
  «ES»/«PT»/«EN» pero su nombre accesible era `aria-label="Cambiar idioma"`, que
  no contiene el texto visible → incumple **WCAG 2.5.3 (Label in Name)**.
  Duplicado en `AppHeader.tsx` y `LangButton.tsx`.

### 3. JavaScript «legacy» (~14.4 kB) — es un artefacto de Next, NO se toca

El insight `LegacyJavaScript` NO viene de transpilar el código propio: SWC ya
emite salida moderna (verificado: **0 helpers de downlevel** en los chunks
servidos). Son el **`polyfills.js` fijo de Next 15** (core-js baseline), que **no
es eliminable con configuración soportada** en Next 15 estable y **no** es la
causa del retardo. Añadir un `browserslist` moderno **no** lo elimina (verificado)
y su impacto en bytes hoy es ≈0, así que se **evaluó y se descartó** para no meter
un cambio no-op disfrazado de mejora.

### 4. DOM grande y re-render de listas — MEDIO (parcialmente corregido)

- La home monta **las dos** listas de incendios a la vez: el sheet móvil
  (`lg:hidden`) y la lista desktop (`hidden lg:flex`), ambas iterando el mismo
  array. La oculta se esconde por CSS (`display:none`), no se desmonta → ~1000
  nodos «muertos» en el DOM en cualquier viewport.
- `FireRow` no estaba memoizada: como `hoveredSlug` cambia con **cada movimiento
  del puntero**, las ~142 filas se re-renderizaban en cada *hover* (coherente con
  el «Hit test 439 ms» de la traza).

### 5. Otros (bajos)

- **CSS render-blocking** único (~45 KB / ~9 KB gzip). Impacto estimado por el
  propio insight: FCP 0 ms, LCP 0 ms. No es prioritario.
- **Fuentes:** 4 pesos de IBM Plex Sans + 4 de Mono, 5 woff2 con `preload`.
  `display:swap` bien puesto (el texto LCP no se bloquea por fuentes).

---

## Acciones aplicadas (v0.34.0)

### Rendimiento

- **Focos y perímetros fuera del HTML.** Nuevo endpoint cacheado
  **`GET /api/map-layers`** (ISR 5 min) que devuelve `{ hotspots, burnedAreas }`.
  `MapCanvasClient` los pide **desde cliente al montar el mapa** y se los pasa a
  `MapCanvas` (que sigue intacto, recibe las capas por props). `page.tsx` ya solo
  serializa los incendios (pocos) y el número «Focos 24 h» del KPI (que se sigue
  calculando en servidor, sin enviar el array).
  - **Verificado con datos en vivo:** HTML de la home **877 KB → 264 KB (−70 %)**;
    el HTML ya no contiene ningún campo de foco (`acquiredAt`/`frp`); el payload
    movido son ~659 KB (1128 focos + 44 perímetros) que ahora viajan aparte,
    cacheados y fuera de la ruta crítica del paint. La petición
    `GET /api/map-layers` se confirma al cargar la home; el mapa y sus capas
    renderizan correctamente.
  - Se mantiene el cacheo ISR (respeta el rate-limit de NASA FIRMS): el endpoint
    **no** lee la petición (query/headers), que lo volvería dinámico.
  - Ficheros: `src/app/api/map-layers/route.ts` (nuevo),
    `src/components/map/MapCanvasClient.tsx`, `src/app/(app)/page.tsx`,
    `src/components/screens/MapaScreen.tsx`.

- **`FireRow` memoizada** (`React.memo`). Con props estables (`fire` mismo objeto,
  `onSelect`/`onHover` con `useCallback`, `highlighted` booleano), en cada *hover*
  solo re-renderizan las filas cuyo `highlighted` cambia (~2), no las ~142.
  Ficheros: `src/components/fires/FireRow.tsx`.

### Accesibilidad

- **Contraste (modo claro):** oscurecidos solo los tokens de **texto**, dejando
  los `base` (marcadores/gráficos) intactos, editando `tokens.ts` **y**
  `globals.css` (incluido `@media print`) juntos. Modo oscuro sin tocar.

  | Token (claro)            | Antes     | Después   | Ratio (blanco / base / sunken) |
  | ------------------------ | --------- | --------- | ------------------------------ |
  | `--state-foco-text`      | `#d9531e` | `#b23f0e` | 5.82 / 5.20 / 4.70 |
  | `--state-controlado-text`| `#c4761b` | `#925609` | 5.90 / 5.27 / 4.77 (badge 5.19) |
  | `--state-estabilizado-text` | `#a98f12` | `#776608` | 5.69 / 5.09 / 4.60 |
  | `--state-extinguido-text`| `#6b7480` | `#5f6874` | 5.65 / 5.04 / 4.56 |
  | `--ok-text`              | `#2c9a61` | `#1f7245` | 5.91 / 5.28 / 4.78 |
  | `--warn`                 | `#b5822f` | `#8a5a12` | 5.91 / 5.28 / 4.78 |

  Todos ≥ 4.5:1 sobre las tres superficies claras. **Verificado:** el audit
  `color-contrast` pasa (0 elementos). Precedente del proyecto: `text.secondary`
  ya se había oscurecido por AA (`#6b7480` → `#5c6470`).

- **Nombre accesible del selector de idioma:** el `aria-label` ahora incluye el
  texto visible al inicio (técnica WCAG G208): `«ES · Cambiar idioma»`. Aplicado
  en `AppHeader.tsx` y `LangButton.tsx`. **Verificado:**
  `label-content-name-mismatch` pasa.

- **Test de regresión de contraste:** `src/lib/design/contrast.test.ts` calcula el
  ratio WCAG de cada token `-text` de modo claro contra blanco/base/sunken (y de
  los `base` como marcadores). 14 aserciones; blinda contra regresiones. La
  fórmula reproduce exactamente los ratios de Lighthouse (autotest incluido).

- **`target-size` de los marcadores (WCAG 2.5.8):** los pins de incendios a
  coordenadas geográficas reales se solapaban a zoom bajo (espacio pulsable
  seguro < 24 px). Se **agrupan** ahora con `supercluster`: burbuja de recuento a
  zoom bajo (borde = mayor gravedad del grupo), marcadores individuales al
  ampliar. Además `useNeutralizedMarker` retira el envoltorio genérico
  `role="button"` + `aria-label="Map marker"` + `tabindex` que MapLibre añade a
  cada marcador (botón anidado redundante que también rompía
  `label-content-name-mismatch`). Ficheros: `src/lib/map/useFireClusters.ts`,
  `src/components/map/FireClusterMarker.tsx`, `src/lib/map/useNeutralizedMarker.ts`,
  `src/components/map/MapCanvas.tsx`. **Verificado: Accessibility 100, sin fallos
  de a11y.** La lista de incendios sigue siendo el equivalente accesible completo.

### Verificación

`npm run typecheck` ✅ · `npm run lint` ✅ · `npm test` ✅ (306 tests) ·
`npm run build` ✅. Medición runtime con el MCP de Chrome DevTools contra
`next start` (modo live, ~1128 focos): **Lighthouse Accessibility 100** (móvil),
sin auditorías de accesibilidad fallando.

---

## Pendiente / recomendado (no aplicado, con motivo)

| Ítem | Motivo de aplazarlo |
| ---- | ------------------- |
| **Una sola lista por viewport** (no montar sheet móvil + lista desktop a la vez) | Ahorra ~1000 nodos de DOM, pero gatear por `matchMedia` arriesga desajuste de hidratación / flash (CLS hoy = 0). Requiere cuidado; medir CLS antes/después. |
| **Virtualizar/acotar filas** (sheet e `/informe`) | Hoy hay decenas de incendios; escala mal en picos de verano (cientos). Windowing ligero manteniendo accesibilidad y foco de teclado. |
| **Desacoplar el reloj de 60 s de `FireRow`** | `FireRow` consume `useNow()` para `timeAgo`, así que el tic re-renderiza las filas pese al `memo`. Extraer el `timeAgo` a un subnodo lo evitaría; ganancia marginal (1×/min) frente al *hover*. |
| **`@next/bundle-analyzer`** | Herramienta de medición para inspeccionar el chunk `949` (~60 kB gzip en todas las páginas). Útil pero no imprescindible para este trabajo. |
| **Recortar `preload` de fuentes** | Menos competencia de ancho de banda al arranque, pero puede introducir un salto visual (CLS). Verificar. |

---

## Cómo re-medir

```bash
npm run build && npm run start   # sirve producción en :3000

# Tamaño del HTML de la home y comprobar que NO embebe focos:
curl -s http://localhost:3000/ | wc -c
curl -s http://localhost:3000/ | grep -c acquiredAt      # debe ser 0
curl -s http://localhost:3000/api/map-layers | wc -c     # payload movido

npx vitest run src/lib/design/contrast.test.ts           # contraste AA
```

Con el **MCP de Chrome DevTools**: `navigate_page` a la home →
`lighthouse_audit` (móvil) para accesibilidad/SEO/best-practices;
`performance_start_trace` para LCP/CLS/INP. **Importante:** para aislar el coste
del sitio, medir en un perfil **sin extensiones** (ver
[Metodología](#metodología-y-salvedad-de-medición-léase-primero)).

---

## Anexo: material de origen

Volcados crudos del asistente de IA de Chrome DevTools (conservados por
trazabilidad, **no** son la fuente de verdad):

- `devtools_what_performance_issues_exist_on_the_page.md` — traza de rendimiento.
  ⚠️ Grabada con las extensiones del usuario activas: sus cifras de `render delay`
  y de hilo principal están infladas (ver Metodología).
- `devtools_how_can_i_reduce_the_number_of_render_blocking_reque.md` — el
  asistente **se desvió del tema** (se preguntó por *render-blocking* y respondió
  como «experto en accesibilidad»), pero de rebote destapó los fallos de contraste
  reales, ya corregidos.
