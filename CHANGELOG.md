# Changelog

Todas las novedades relevantes de este proyecto se documentan aquí.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es/1.1.0/) y el
proyecto se adhiere a [Versionado Semántico](https://semver.org/lang/es/).

## [0.45.0] - 2026-07-24

### Añadido

- **Distintivo «INTERÉS NACIONAL» en la ficha**, separado del nivel de gravedad.
  El Índice de Gravedad Potencial de un incendio solo llega a 0-2 (no existe «IGP
  3»); el «3» que se oye es la **Situación Operativa 3 / emergencia de interés
  nacional**, que declara el Ministro del Interior para un TERRITORIO, no para un
  incendio. Se muestra como etiqueta propia en los tres incendios de la
  declaración del 24 jul (Burgohondo, Almorox–Villa del Prado y San Martín de
  Valdeiglesias), sin falsear el nivel del incendio.
- **Fuente de los datos de medios, junto a los medios** en la ficha (bloque
  «Medios desplegados» y casilla «Medios» del resumen): p. ej. «Fuente: Castilla y
  León (JCyL)».

### Cambiado

- **Almorox se identifica también como «Villa del Prado».** Es el mismo incendio:
  se originó en Almorox (Toledo) y cruzó a Villa del Prado (Madrid), que el 112 de
  Madrid nombra por su municipio. Se renombra el registro para que no parezcan dos.
- **Datos de Burgohondo actualizados (24 jul).** Aviso de evacuaciones/
  confinamientos al día: incendio ACTIVO y sin controlar, interés nacional
  VIGENTE, ~1.500 evacuados sin levantar (La Atalaya de El Tiemblo, Valle de
  Iruelas, Puente Nueva/Matalaceña; residencia de El Tiemblo a Cebreros) y
  confinamiento por humo VIGENTE en El Tiemblo, Navaluenga y Burgohondo. Cronología
  ampliada (confinamiento ~18:23, La Atalaya, fase convectiva, interés nacional,
  parte de la mañana del 24). Superficie sin cifra oficial (el humo impide medir);
  se mantiene la estimación por focos FIRMS, marcada «~».

## [0.44.0] - 2026-07-24

### Añadido

- **Perímetro por focos FIRMS, autónomo y para TODOS los incendios**
  (`deriveFirmsPerimeters`). En vez de un casco acotado a 3 km por incendio, el
  sistema agrupa todos los focos FIRMS en **componentes conexas** (enlace ≤1,3 km)
  y adjudica cada una al incendio no extinguido **más cercano**; el perímetro de
  cada incendio es la envolvente cóncava de su componente. Así cada fuego —pequeño
  o mega-incendio— dibuja su extensión real, **se actualiza solo** conforme
  aparecen focos nuevos, y ningún incendio hereda el frente de un vecino (cada
  componente pertenece a un único incidente). Verificado el 24 jul: Burgohondo
  ~26 km, San Martín de Valdeiglesias ~8 km y Almorox ~3 km, cada uno con su propio
  cúmulo. Si hay perímetro EFFIS y el fuego ha crecido muy por encima, el cúmulo
  FIRMS (más actual) lo sustituye; si el EFFIS es representativo, se conserva. La
  superficie del cúmulo va a `hotspotHectares` (estimación por focos; no pisa una
  cifra oficial).

### Cambiado

- **La capa de focos (FIRMS) vuelve a estar ACTIVADA por defecto** al entrar en el
  visor.
- **Burgohondo deja de mostrar dos siluetas.** Antes coincidían el casco pequeño
  (3 km) de `deriveApproxPerimeters` y el cúmulo completo; ahora el cúmulo FIRMS es
  el único perímetro. La superficie estimada la fija el propio cúmulo, coherente
  con lo dibujado. La declaración de interés nacional y la cronología se mantienen.

## [0.43.0] - 2026-07-24

### Añadido

- **Perímetro por cúmulo de focos FIRMS para grandes incendios**
  (`upgradeExtraFromFirms`). `deriveApproxPerimeters` está acotado a fuegos
  pequeños (radio de 3 km); un mega-incendio lo desborda y, si ya tiene perímetro
  EFFIS, queda excluido. Ahora, para incidentes con extensión editorial, se
  calcula la envolvente (casco cóncavo + margen) del **cúmulo conexo** de focos
  FIRMS anclado en el incidente —crece por conectividad, así abarca todo el frente
  contiguo por largo que sea sin fundir un incendio vecino— y **sustituye** la
  extensión editorial por ese dato satelital **real y actual**. Si su área supera
  la superficie vigente, actualiza `hectares` (marcada `~`); nunca rebaja una
  cifra mayor. El perímetro EFFIS se conserva.

### Cambiado

- **Emergencia Burgohondo (24 jul):** tras arrasar gran parte del **Valle de
  Iruelas** y forzar el confinamiento de **El Tiemblo** (evacuación de La Atalaya)
  la noche del 23 al 24, la extensión pasa a dibujarse con los **focos FIRMS**
  (dato actual) y la superficie estimada sube en consecuencia (estimación
  satelital, sin cifra oficial: el humo impidió medir). Cronología ampliada con la
  fase convectiva, los nuevos desalojos (~1.500 en total) y la declaración de
  **emergencia de interés nacional (situación operativa 3)** para Madrid y la
  provincia de Ávila —primera vez en España por incendios—, añadida también a las
  fichas de Almorox/Villa del Prado y San Martín de Valdeiglesias. El incendio en
  sí se mantiene en **Nivel 2** de gravedad potencial (el IGP no tiene un «nivel
  3»: el 3 es la situación operativa estatal del territorio).

### Corregido

- **Ficha en móvil: «Medios desplegados» y «Evolución» ya no quedan en una ventana
  diminuta.** Solo el mapa, el aviso de evacuación y las acciones quedan fijos; el
  resto se desplaza, y esas secciones (más «Otros episodios») pasan a una barra de
  **pestañas** para acceder a cada una con toda la altura disponible.

## [0.42.0] - 2026-07-23

### Añadido

- **Banners de sitio múltiples (pila de avisos).** El banner global editorial que
  publica el panel privado deja de ser único: el visor lee una **lista**
  (`override:banners`) y **apila** los avisos activos ordenados por gravedad
  (crítico → aviso → info), cada uno como una banda propia. Sirve para mostrar a
  la vez, por ejemplo, un aviso **crítico** y otro **informativo**. Cada banda es
  **descartable por separado** (recordada en `localStorage` por `id`+`updatedAt`,
  de modo que un banner nuevo o editado reaparece sin afectar al descarte de los
  demás). El contenedor mantiene `role="status"`/`aria-live`; **nunca** sustituye
  ni oculta el disclaimer 112. Inerte por defecto: sin banners activos no
  renderiza nada.

### Compatibilidad

- **Migración transparente del banner heredado.** `getBanners()` lee
  `override:banners`; si aún no existe (el panel todavía no ha migrado), cae al
  banner único `override:banner` sintetizándole un `id`. Así el visor puede
  desplegarse **antes** que el panel sin que el sitio público se quede sin aviso.
  La caché sigue invalidándose por el mismo tag (`BANNER_TAG`) desde
  `POST /api/admin/revalidate`. Ver `Incendib-Panel/docs/INTEGRACION-INCENDIB.md`.

## [0.41.0] - 2026-07-23

### Añadido

- **Modo emergencia: capa de overrides editoriales para incendios en curso**
  (`src/lib/data/emergency.ts`). Permite reflejar en el visor información
  verificada en prensa que las fuentes automáticas aún no publican, **sin tocar
  los adaptadores**: si el incendio ya existe en una fuente en vivo se localiza
  por proximidad y se le **fusionan** campos (queda marcado «corregido a mano»);
  si no existe en ninguna fuente, se **añade** una ficha reconstruida a partir de
  prensa. Cada entrada caduca (`expiresAt`) como red de seguridad y cada hito de
  la cronología va **atribuido a su medio con enlace**; lo no confirmado de forma
  independiente se etiqueta como reportado, no como parte oficial.
- **Emergencia del 23-jul-2026 (Sierra de Gredos / Valle del Alberche):**
  - **Burgohondo (Ávila, Nivel 2):** se conserva su **perímetro satelital**
    (EFFIS) y su superficie, y se **añade** una **extensión provisional**
    (`perimeterExtra`, línea discontinua) hasta La Rinconada y el camping del
    Valle de Iruelas; evacuación de Puente Nueva/Matalaceña, confinamiento por
    humo (ES-Alert) y cronología con enlaces a Ávilared, COPE, eldiario.es, etc.
  - **Almorox (Toledo→Madrid)** y **San Martín de Valdeiglesias (Madrid,** coche
    en la M-501): superficie/estado/evacuaciones y cronología atribuida (San
    Martín, sin fuente autonómica, se añade reconstruido de prensa).
- **Campo `perimeterExtra`** en el modelo `Fire`: polígono de extensión
  provisional que se **suma** al perímetro satelital sin sustituirlo, dibujado con
  línea discontinua en el mapa y el minimapa de la ficha. Campo
  `perimeterProvisional` para perímetros principales provisionales.
- **Aviso de evacuaciones/confinamientos en la ficha** (`aria-live`), la
  información más urgente, arriba y en tono de alerta.
- El **minimapa de la ficha** ahora **encuadra el perímetro** (y su extensión)
  para que un frente alargado no quede recortado.

### Cambiado

- **El KPI de superficie total de la pantalla principal incluye ahora las
  estimaciones:** cuando un incendio activo no tiene cifra oficial ni EFFIS, se
  suma su estimación por focos (`hotspotHectares`) al recuento general, en vez de
  contar 0. Cada cifra individual se sigue comunicando como «~». Ranking y
  boletín no cambian.

## [0.40.4] - 2026-07-23

### Corregido

- **Un mismo incendio salía dos veces cuando dos sistemas de emergencia lo
  reportaban en apoyo mutuo con coordenadas dispares.** Caso real: Selas
  (Guadalajara), listado a la vez por INFORCYL (Castilla y León) e INFOCAM
  (Castilla-La Mancha) a 2,85 km entre sí — el mismo fuego, dos marcadores.
  `dedupeMutualAidFires` solo fundía partes de fuentes distintas a ≤1 km, y
  Selas quedaba fuera. Ahora también funde dos partes de fuentes distintas
  que comparten **municipio y provincia oficiales** dentro de un tope de
  distancia de seguridad (`MUTUAL_AID_SAME_PLACE_KM`, 12 km). El tope evita
  fusionar por error dos incendios realmente distintos que compartan un
  municipio grande (ocultar un fuego real sería peor que un duplicado);
  verificado contra el feed en vivo: de 55 incidentes, la regla nueva solo
  une el par de Selas. La fusión conserva el parte con perímetro propio, así
  que Selas queda como un único incidente con su perímetro y deja de depender
  del gate FIRMS para no parpadear. Ficheros:
  `src/lib/data/adapters/index.ts`,
  `src/lib/data/adapters/dedupe-mutual-aid.test.ts`.

## [0.40.3] - 2026-07-23

### Corregido

- **El mapa base "claro"/"oscuro" no seguía el tema de la UI tras elegirlo
  a mano.** Al abrir el selector de capas y fijar explícitamente "Claro" u
  "Oscuro" (`useUIStore.basemap`), el mapa quedaba fijo en esa opción para
  siempre, incluso al conmutar después el tema con el botón de cabecera —
  la superficie del mapa y la UI acababan en temas distintos. Ahora
  `setTheme` reconoce si el mapa base activo es el par claro/oscuro (no
  satélite/relieve, que son vistas propias sin par claro/oscuro y siguen
  independientes) y lo actualiza a la vez que el tema. `auto` (por defecto,
  sin tocar el selector) ya seguía el tema correctamente y no cambia.
  Fichero: `src/lib/store.ts`.

## [0.40.2] - 2026-07-23

### Cambiado

- **Los incendios del mapa tardaban demasiado zoom en dejar de agruparse.**
  El radio de cúmulo (`useFireClusters`) bajaba de 44 a 32 px — sigue por
  encima de los 28 px del marcador (`FireMarker`), así que los sueltos
  siguen sin solaparse, pero separan antes al acercar. Además, **sin la capa
  de focos satelitales (FIRMS) visible** (el estado por defecto del mapa) el
  agrupado se desactiva del todo: con muchos menos incidentes en pantalla,
  cada incendio aparece siempre individual, a cualquier zoom. La lista de
  incendios sigue siendo el equivalente accesible completo si dos marcadores
  llegaran a solaparse a zoom muy bajo. Ficheros: `src/lib/map/useFireClusters.ts`,
  `src/components/map/MapCanvas.tsx`.

## [0.40.1] - 2026-07-23

### Cambiado

- **La ficha seguía viéndose pequeña en móvil pese al «tap para expandir» de
  la v0.39.1** — el tirador seguía pareciendo un adorno (un puntito gris), sin
  ninguna pista de que fuera interactivo, así que nadie lo descubría y la
  vista por defecto seguía siendo la misma hoja apretada de siempre. Cambio de
  enfoque, más directo: el mapa pasa a una **franja fija y modesta (200px)**
  en vez de repartirse el alto con la hoja, y la hoja pasa a ocupar **todo el
  resto de la pantalla por defecto** (sin techo ni gesto que descubrir). Se
  retira el estado expandir/contraer — ya no hace falta: «Medios
  desplegados»/«Evolución» se ven enteros sin tocar nada. El mapa sigue dando
  contexto de ubicación (con sus controles — volver, buscador, chip de
  confirmación satelital — siempre visibles, ya no dependen de una franja que
  se encogía). Escritorio sin cambios (columna de mapa de alto completo).

## [0.40.0] - 2026-07-23

### Añadido

- **Castilla-La Mancha (INFOCAM) en vivo, con doble filtro de honestidad.**
  Hasta ahora los incendios de CLM (p. ej. Almorox, Toledo) no aparecían: es la
  única CCAA sin API fiable de incidentes activos. Su feed oficial (INFOCAM /
  `V_Incendio`) es un **log acumulativo** que nunca cierra incidentes —el mismo
  punto de Almorox figura tres veces (campañas de 2024, 2025 y 2026), todas
  «Activo» y sin fecha de fin—, así que volcarlo tal cual daría por activos
  incendios extinguidos hace años (verificado contra prensa: 0/11 reales). Ahora
  se integra tras **dos filtros**: (1) solo incidentes con inicio en los últimos
  7 días (`isInfocamRecentActive`), que descarta los «zombis» de campañas
  pasadas; y (2) un **gate por focos FIRMS** (`gateByHotspots`), que deja pasar
  solo los corroborados por una detección satelital cercana (≤5 km, <48 h) —lo
  que separa el incendio real y en curso del «reciente pero ya apagado». El resto
  de fuentes NO se filtran por satélite (ya marcan estado y recencia). Se añade
  su fila en «Fuentes y licencias».

## [0.39.1] - 2026-07-23

### Corregido

- **La hoja de detalle de la ficha (móvil) seguía viéndose pequeña** pese al
  carrusel de la v0.39.0: «Medios desplegados»/«Evolución» seguían apretados
  contra el «peek» fijo (496px/72dvh). Ahora el propio tirador (antes
  decorativo) **expande la hoja** a 92dvh al tocarlo, dejando ver ambas
  secciones con espacio sin perder el primer vistazo con mapa+contexto.
  Al expandir, los controles flotantes del mapa (volver, buscador, chip de
  confirmación satelital) se ocultan — su franja se reduce a un asomo y, con
  posición absoluta y desplazamientos fijos, se salían de ella y tapaban el
  tirador (bug real encontrado por Playwright: interceptaba el toque para
  volver a contraer). La navegación de vuelta no depende de esa franja: la
  hoja expandida muestra su propio botón «volver», siempre alcanzable.

## [0.39.0] - 2026-07-23

### Cambiado

- **Ficha del incendio: rediseño de «Medios desplegados» y «Evolución» +
  layout propio de escritorio.** Ambas secciones se veían apretadas (lista
  vertical dentro de una hoja de altura acotada). Ahora:
  - **Carrusel horizontal** (`ScrollCarousel`, nuevo — scroll-snap nativo,
    sin dependencia): cada medio y cada hito de la evolución es una tarjeta
    con espacio propio en vez de una línea apretada. Región accesible
    (`role="region"` + `tabIndex`): con foco, las flechas del teclado
    desplazan el contenido de forma nativa. Evolución mantiene el orden más
    reciente primero (visible sin desplazar).
  - **Layout de escritorio para `/f/[slug]`** (`lg:`, antes inexistente — la
    ficha solo tenía diseño móvil, estirado a pantalla completa con un mapa
    gigante casi vacío): panel de detalle a la izquierda (ancho fijo, alto
    completo, ya no acotado a 496 px) + mapa a la derecha. Sigue fuera del
    shell de pestañas (pantalla completa, compartible), sin tocar esa
    decisión de diseño.

### Añadido

- **Superficie estimada por focos, también en el listado principal del mapa.**
  El campo `hotspotHectares` (v0.37.0) pasa de calcularse bajo demanda solo en
  la ficha a formar parte del incidente ya en `getFires()` — pero como campo
  APARTE de `hectares`, nunca mezclado con él: sigue sin entrar en el KPI «HA
  AFECTADAS», rankings ni boletín (nada distinto lee `hectares` por su nombre,
  así que ningún agregado existente puede recogerlo). La fila del incidente en
  la lista del mapa (`FireRow`) muestra ahora «≈N ha» en vez de «sin dato»
  cuando no hay cifra oficial ni EFFIS — con el prefijo «≈» (no «~») para no
  leerse con la misma confianza que una estimación EFFIS, y un `title` con la
  nota completa al pasar el cursor.

## [0.37.0] - 2026-07-22

### Añadido

- **Extensión aproximada de incendios confirmados sin perímetro propio.**
  Cuando un incidente ya confirmado por una fuente oficial sigue activo pero
  EFFIS aún no ha mapeado su cicatriz, si hay ≥3 focos FIRMS cerca (≤3 km) se
  dibuja su casco convexo + margen como una extensión aproximada — nunca un
  incidente nuevo, solo rellena la forma de uno que ya existía. Se pinta con
  línea discontinua y relleno tenue (`src/lib/map/perimeter.ts`), siempre
  distinguible de un perímetro real, y la ficha muestra un aviso explícito
  («extensión aproximada por detección satelital... no es un perímetro
  oficial»). Deliberadamente **nunca** toca `hectares`/`hectaresApprox` del
  incidente ni ningún KPI/ranking/boletín — lección directa del incidente de
  `deriveSatelliteFires` (revertido en v0.33.0), donde un dato derivado de
  FIRMS acabó tratado como confirmado en todas partes.
- **Superficie estimada por focos, solo en la ficha del incendio.** Cuando no
  hay cifra oficial ni EFFIS, la ficha calcula el área del casco (vía
  `@turf/turf`) y la muestra como «~N ha · estimación muy aproximada (focos)»
  — deliberadamente más cauta que la nota «estimación satélite» de EFFIS (un
  casco de unos pocos focos térmicos sobrestima el área real; una
  clasificación de imagen EFFIS es una base bastante más sólida). Se calcula
  bajo demanda en `app/f/[slug]/page.tsx`, nunca se escribe en `Fire.hectares`:
  no entra en el KPI «HA AFECTADAS», rankings ni boletín.

### Corregido

- **`dedupeMutualAidFires` podía perder un perímetro real.** El desempate al
  fusionar el mismo incidente reportado por dos CCAA (v0.36.2) se basaba solo
  en qué gemelo declaraba más hectáreas — pero el gemelo con menos hectáreas
  podía ser el que ya tenía un perímetro EFFIS adjudicado. Ahora se prioriza
  conservar el que tiene forma propia; las hectáreas solo desempatan si
  ninguno de los dos tiene perímetro. Hallado en auditoría adversarial
  dedicada al feature de arriba.

- **Incendio de La Mierla (Guadalajara) contado dos veces.** Detectado por
  captura del propietario: el mapa mostraba un cúmulo «2» sobre esa zona que
  nunca se separaba en marcadores individuales al acercar. Causa: **INFORCYL
  (apoyo desde Castilla y León) e INFOCA (apoyo desde Andalucía) reportan el
  mismo incendio real cada uno en su propio sistema**, a ~120 m de diferencia
  entre sí — el código ya documentaba que INFOCA lista despliegues fuera de
  Andalucía, pero no que INFORCYL hace lo mismo para el mismo fuego. Esto
  inflaba el KPI «Activos» en 1 y el cúmulo del mapa quedaba permanentemente
  atascado (dos marcadores en la misma coordenada están siempre a <44 px, a
  cualquier zoom, así que `getClusterExpansionZoom` nunca lo resuelve).
- Nueva `dedupeMutualAidFires` (`src/lib/data/adapters/index.ts`): funde
  incidentes de **fuentes distintas** a ≤1 km (umbral con amplio margen: el
  siguiente par de fuentes distintas más próximo en producción está a >45 km),
  descartando el par si alguno ya está extinguido o si comparten fuente.
  Se conserva el más informativo (mayor superficie, ya adjudicada por
  `attachPerimeters`) y se anotan ambas fuentes (`sources`) para no ocultar que
  hay dos partes oficiales del mismo fuego. Aplicada en `getFires` tras la
  adjudicación de perímetros EFFIS. +5 tests.

## [0.36.1] - 2026-07-22

### Cambiado

- **El mapa abre limpio: los focos satelitales (FIRMS) ya no se muestran por
  defecto.** Aunque el rediseño en densidad suave (heatmap, v0.35.0) redujo el
  ruido visual, el propietario decidió que siga sin ser la vista de apertura
  deseada. El mapa arranca ahora mostrando solo **incendios confirmados**; los
  focos siguen disponibles como capa opcional desde «Capas del mapa», donde el
  usuario los activa manualmente (`hotspotsVisible` pasa a `false` por defecto
  en el store; controles y renderizado sin cambios).

## [0.36.0] - 2026-07-22

### Añadido

- **Agrupación (clustering) de los marcadores de incendios en el mapa.** A
  coordenadas geográficas reales, los pins de incendios próximos se solapaban; a
  zoom bajo se muestran ahora como una burbuja de recuento (borde = mayor
  gravedad del grupo) y, al ampliar (o pulsar la burbuja), como los marcadores
  individuales color+forma. Vía `supercluster`, determinista por viewport
  (`src/lib/map/useFireClusters.ts`, `FireClusterMarker`). La lista de incendios
  sigue siendo el equivalente accesible completo.

### Corregido

- **Accesibilidad `target-size` (WCAG 2.5.8):** el clustering elimina el solape de
  marcadores que dejaba el «espacio pulsable seguro» por debajo de 24 px.
- **Envoltorio a11y redundante de los marcadores.** MapLibre marca el `<div>`
  contenedor de cada marcador con `role="button"` + `aria-label="Map marker"` +
  `tabindex` genéricos (botón anidado sobre nuestro `<button>` real, que además
  disparaba `label-content-name-mismatch` con el texto de las burbujas).
  `useNeutralizedMarker` los retira (MutationObserver), dejando el botón interno
  como único control. Verificado: **Accessibility 100** en Lighthouse, sin fallos
  de accesibilidad.

## [0.35.0] - 2026-07-22

### Cambiado

- **Focos satélite (FIRMS) rediseñados para quitar ruido visual del mapa.** Con
  ~1000+ detecciones (muchas no son incendios: agrícolas, industria…), los puntos
  naranjas con halo y las burbujas de cúmulo saturaban el mapa. Ahora:
  - A poco zoom, una **capa de densidad suave** (heatmap de un solo tono cálido,
    muy tenue en densidad baja) que insinúa dónde hay actividad térmica sin
    emborronar; el foco visual queda en los incendios confirmados.
  - Al acercar (~z8+), la densidad da paso a **puntos pequeños y sobrios SIN halo**,
    con tamaño por FRP y atenuados por antigüedad.
  - Se retiran la capa de halo/glow y las burbujas de cúmulo con recuento. El
    recuento sigue disponible en el KPI «Focos 24 h» y cada foco se puede pulsar
    (sigue comunicando «detección satelital, no confirmada»). Leyenda sin halo.

## [0.34.1] - 2026-07-22

### Arreglado

- **Incendios «duplicados» por compartir el área quemada de EFFIS.**
  `attachPerimeters` adjudicaba un mismo polígono de EFFIS a VARIOS marcadores de
  incidente a la vez, duplicando superficie y forma en el mapa. Casos reales
  (verificados en producción): el megaincendio de La Mierla (35 268 ha) aparecía a
  la vez en Guadalajara (INFOCA) y en Retortillo de Soria (INFORCYL) —a 46 km, de
  fuentes distintas y siendo dos incendios físicos distintos—; y un incendio de
  Segovia (3 121 ha) en Brieva y Cantimpalos. En conjunto, ~38 000 ha se contaban
  por duplicado. El arreglo (validado con una revisión adversarial):
  - **Adjudicación 1:1**: cada área quemada se adjudica a un solo incidente y cada
    incidente recibe a lo sumo una (emparejamiento codicioso: primero los
    marcadores DENTRO del anillo y, dentro de cada grupo, por distancia al borde
    ascendente —geografía, no el orden de las fuentes).
  - **Pertenencia estrecha**: un incidente solo hereda un área si su marcador cae
    DENTRO del anillo o a ≤ 3 km de su borde (antes bastaban 12 km, lo que permitía
    que un incendio pequeño heredase la superficie enorme de la cicatriz de otro
    fuego cercano: dato falso, no aproximación).
  - El incidente que ya no hereda el área queda con superficie «sin dato» hasta que
    su fuente publique cifra oficial o EFFIS mapee su propia área; el polígono sigue
    viéndose en la capa de área quemada del mapa (`getBurnedAreas`).
- **Duplicado en `/p/[provincia]`**: el mismo incendio ya no aparece dos veces
  (como incidente en vivo con perímetro y como área quemada EFFIS independiente);
  el área ya absorbida por un incidente se excluye del listado (`perimeterSourceSlug`).

## [0.34.0] - 2026-07-22

Rendimiento y accesibilidad de la home a partir del análisis de
`docs/performance/` (que se reescribe como informe accionable, separando el
ruido de las extensiones del navegador del coste real del sitio).

### Añadido

- **Endpoint `GET /api/map-layers`** (ISR 5 min): sirve las capas satelitales del
  mapa (`{ hotspots, burnedAreas }`). El mapa las pide desde cliente al montar.
- **Test de regresión de contraste** (`src/lib/design/contrast.test.ts`):
  comprueba que cada token de texto de modo claro cumple WCAG AA (≥4.5:1) sobre
  blanco/base/sunken. La fórmula reproduce los ratios de Lighthouse.

### Cambiado

- **HTML de la home ~877 KB → 264 KB (−70 %, datos en vivo).** Los ~1100 focos
  FIRMS y los perímetros EFFIS dejan de serializarse en el HTML como props de la
  isla cliente (payload RSC inline de ~750 KB, el 87 % del documento) y pasan a
  cargarse desde `/api/map-layers` al montar el mapa. Solo los consume el mapa
  (`ssr:false`) y no hacen falta para el primer paint, así que ya no inflan la
  transferencia ni la deserialización de hidratación en el hilo principal. El KPI
  «Focos 24 h» se sigue calculando en servidor (solo el número).
- **`FireRow` memoizada** (`React.memo`): al hacer *hover* solo re-renderizan las
  filas cuyo resaltado cambia (~2), no las decenas de la lista.

### Corregido

- **Contraste WCAG 2.2 AA (modo claro):** oscurecidos los tokens de **texto**
  (marcadores `base` intactos, modo oscuro sin tocar): `--state-foco-text`
  `#d9531e`→`#b23f0e`, `--state-controlado-text` `#c4761b`→`#925609`,
  `--state-estabilizado-text` `#a98f12`→`#776608`, `--state-extinguido-text`
  `#6b7480`→`#5f6874`, `--ok-text` `#2c9a61`→`#1f7245`, `--warn`
  `#b5822f`→`#8a5a12`. Todos ≥4.5:1. Verificado: el audit `color-contrast` pasa.
- **Nombre accesible del selector de idioma (WCAG 2.5.3, Label in Name):** el
  `aria-label` incluye ahora el texto visible al inicio («ES · Cambiar idioma»),
  en `AppHeader` y `LangButton`. Verificado: `label-content-name-mismatch` pasa.

## [0.33.1] - 2026-07-22

### Arreglado

- **Superficie de grandes incendios (caso La Mierla/Guadalajara, ~35 000 ha):**
  `attachPerimeters` casaba incendio↔área quemada EFFIS por distancia al
  **centroide** (≤12 km), y en un gran incendio el centroide de la cicatriz queda
  a >20 km del punto de ignición donde la fuente oficial pone el marcador — el
  incendio de Guadalajara (35 268 ha en EFFIS) se mostraba «sin dato». Ahora se
  mide la distancia al **borde** del perímetro (0 si el marcador cae dentro),
  con descarte barato por bbox. Además se añade **coherencia temporal**: una
  cicatriz detectada por EFFIS >7 días antes del inicio oficial del incendio es
  de otro fuego anterior (reactivaciones tipo El Barraco) y ya no presta ni forma
  ni hectáreas.
- **Región incorrecta en despliegues de INFOCA fuera de Andalucía:** la capa de
  INFOCA también lista incidentes en los que Andalucía despliega apoyo (el de
  Guadalajara aparecía con región «Andalucía»). La CCAA se deriva ahora de la
  provincia con el catálogo (`Guadalajara` → «Castilla-La Mancha»).

## [0.33.0] - 2026-07-22

### Eliminado

- **Incendios derivados por satélite (revertido `b2bc140`).** Se retira
  `deriveSatelliteFires` y toda su integración: los focos FIRMS huérfanos en zonas
  sin fuente oficial dejan de promoverse a incidentes provisionales `activo` en el
  mapa, la lista, la ficha, los conteos, las alertas y el boletín. Motivo: el
  marcador del mapa era idéntico al de un incendio confirmado (incumplía «marcador
  = color + forma» y «detección satelital ≠ incendio confirmado»); el KPI de
  portada, el boletín y el push los contaban/anunciaban como confirmados; y la
  heurística podía fabricar un incidente grande a partir de un solo foco, heredando
  el área acumulada de una cicatriz EFFIS ya extinguida (hasta 45 días). En una
  herramienta de seguridad prima «sin dato» sobre «dato falso». La cobertura de
  zonas sin parte oficial podrá volver como una capa de «detección satelital»
  propia, visualmente inconfundible y nunca contada como confirmada.
- Eliminado el archivo permanente `src/content/archive/sat-effis-561620.json`, un
  incidente derivado que había quedado registrado en git.

### Corregido

- **Boletín semanal w29:** se retiran de la edición publicada las 14 detecciones
  satelitales provisionales que se colaban como incendios activos (la región
  «Detección satelital» figuraba como la nº 1 por superficie, 22 491 ha). KPIs
  recalculados (activos 57→43, superficie 23 375→884 ha, perímetros 10→9),
  eliminado el destacado `sat-effis-561620` y añadida una nota de corrección a la
  edición.

## [0.32.0] - 2026-07-22

### Añadido

- **Portugal: fuente OFICIAL de la ANEPC (FeatureServer del SGIFR) como fuente
  primaria**, facilitada por la AGIF y el ICNF en
  respuesta a la solicitud de Incendib. Es la misma fuente subyacente que fogos.pt
  (Sistema de Informação Operacional da ANEPC), pero desde el endpoint autoritativo
  y sin registro. Nuevo adaptador `fetchAnepcFires` (filtra incendios reales por
  `CodNatureza` 3101/3103/3105; estado operativo, medios, concelho/freguesia,
  coordenadas y tipo por naturaleza) y dispatcher `fetchPortugalFires` (ANEPC
  primaria → fogos.pt de respaldo, patrón INFORCYL→Opendatasoft). Atribución a
  **ANEPC (prociv.gov.pt)**; cacheado del lado servidor (la BD se actualiza ~cada
  10 min) por petición de la AGIF para no saturar el servicio en picos.
- **Distrito por concelho para Portugal** (`src/lib/geo/pt-concelhos.ts`): mapa
  concelho→distrito (CAOP/INE, 278 concelhos continentales) para asignar la
  «provincia» a los incendios de la ANEPC, cuyo feed publica concelho/região pero
  no distrito. Preserva las páginas `/p/[provincia]` y las facetas territoriales
  del informe para Portugal.

### Cambiado

- La fila de estado de Portugal en `/fuentes` identifica la fuente en uso (ANEPC
  o, si esta no responde, fogos.pt de respaldo). Atribución agregada actualizada
  con la ANEPC / Proteção Civil (SGIFR).

## [0.31.0] - 2026-07-20

### Añadido

- **Incendios derivados por satélite en zonas sin fuente oficial**: un gran
  incendio en una provincia sin API operativa en vivo (p. ej. Madrid o
  Castilla-La Mancha / Guadalajara) ya no se ve solo como focos sueltos en el
  mapa. `deriveSatelliteFires` agrupa los focos FIRMS activos en incidentes
  provisionales y los enriquece con el área quemada EFFIS más cercana (perímetro,
  superficie estimada «~» y municipio/provincia).
  - Se marcan `satelliteOnly` y se comunican **siempre** como detección
    satelital, **no** como parte oficial: chip en el mapa, aviso en la ficha,
    etiqueta en la lista y fuente real (NASA FIRMS · EFFIS). Sin EFFIS no se
    inventa superficie («sin dato»); un foco aislado no promueve (evita ruido de
    quemas agrícolas): hace falta respaldo EFFIS o un clúster de focos.

## [0.30.0] - 2026-07-17

### Añadido

- **Página de Estadísticas (`/estadisticas`, F1 del research)**: analítica
  histórica oficial del fuego forestal en España a partir de la **Estadística
  General de Incendios Forestales (EGIF · MITECO)**.
  - **Serie anual 2006-2024** de **nº de siniestros** y **superficie forestal
    quemada** (gráficos de columnas sobrios: un solo tono para la magnitud,
    rejilla hairline, y **trama diagonal** para los años en avance/provisional —
    nunca se depende solo del color). Cada año trae su carácter
    (definitivo/provisional) también en una **tabla de datos accesible**.
  - **Rankings territoriales** por superficie quemada (top-10 **comunidades** y
    **provincias**) del decenio consolidado 2006-2015.
  - **KPIs**: siniestros/año y superficie/año medios del periodo consolidado,
    **peor año** (2022, 265 078 ha) y **último año** (2024).
  - **Honestidad de dato (regla del proyecto)**: no se fusionan fuentes
    (EGIF ≠ EFFIS ≠ FIRMS); cada cifra procede de un documento oficial de MITECO
    citado; los cortes definitivo/provisional se marcan **por métrica** (superficie
    definitiva hasta 2019, siniestros hasta 2015); nada estimado ni interpolado.
    Verificación cruzada: la superficie 2006-2015 suma exactamente el total
    nacional del decenio (1 007 962 ha) que publica el ranking de CCAA.
  - Datos estáticos versionados en `src/content/estadisticas/egif.json` (build
    estático); i18n ES/PT/EN; enlazada desde Boletines y Fuentes; 5 tests nuevos.

## [0.29.0] - 2026-07-16

### Añadido

- **Panel de alertas avanzado (`/alertas`, pantalla 7a).** La pantalla pasa de una
  lista plana de preferencias a un panel completo que recupera el diseño canónico
  del handoff:
  - **Zonas vigiladas** múltiples: por **ubicación** (radio ajustable) o por
    **provincia/distrito** (buscador con el catálogo ES+PT). Cada zona se puede
    renombrar, ajustar, **pausar** o eliminar, y muestra un **conteo en vivo** de
    incendios activos en ella.
  - **Tipos de alerta** independientes en «Avisarme cuando»: nuevo incendio, subida
    de nivel operativo, **evacuaciones y cortes** (siempre activo) y **focos
    satelitales** (opt-in, con el aviso «detección sin confirmar»).
  - **Umbral de nivel** (0–3) y **horario de silencio** («No molestar»); la
    evacuación suena siempre, también en silencio.
  - **Incendios seguidos** integrados con las notificaciones: seguir un incendio en
    su ficha ahora puede avisar de cambios de estado/nivel (sincronización con el
    servidor cuando hay suscripción activa).
- **Modelo de preferencias v2** (`src/lib/alerts/prefs.ts`, `match.ts`, puros y
  testeados): matcher por zonas/tipos/silencio con una sola decisión por
  (incendio, suscriptor), coincidencia de provincia con alias bilingües
  (Orense↔Ourense, Lérida↔Lleida…), y horario de silencio evaluado en la zona
  horaria del suscriptor (con cruce de medianoche y *fail-open* ante tz inválida).

### Cambiado

- **Migración transparente de suscripciones antiguas (v1→v2)** en la ruta de
  lectura del almacén: los suscriptores existentes siguen funcionando sin
  re-suscribirse. Notificaciones push **localizadas** (ES/PT/EN). Minimización de
  datos: coordenadas redondeadas, zona horaria solo si hay silencio configurado.
  Endurecimiento del alta (validación de claves de la suscripción y tope de
  seguridad) manteniendo intacta la validación anti-SSRF existente.

## [0.28.0] - 2026-07-16

### Añadido

- **Informe de situación avanzado (`/informe`)**: de tabla con filtro por país a
  un panel analítico completo.
  - **Filtros** (barra lateral en desktop, bottom-sheet accesible en móvil):
    búsqueda por texto, estado operativo, país, **comunidad autónoma y provincia**
    (facetas con recuento y buscador; la provincia se acota a la CCAA elegida),
    **nivel de gravedad**, tipo, **medios** (con aéreos/terrestres/ayuda
    internacional/evacuación), efectivos mínimos, **«en expansión»** (Δ24 h > 0),
    superficie (rango mín/máx), periodo, confirmación satelital y fuente. Motor
    unificado `FireFilters`/`applyFilters` (compartido con el mapa).
  - **KPIs y gráficos recalculados sobre el conjunto filtrado**: activos,
    superficie, focos 24 h, nivel máx., con evacuación, medios aéreos, efectivos
    y crecimiento 24 h; indicador de **cobertura de dato** y distribución por
    estado y por comunidad (barras; el color codifica el dato).
  - **Tabla densa**: columnas configurables (provincia, CCAA, nivel, tipo, Δ24 h,
    medios, personal, fuente, inicio), orden por columna con los «sin dato» al
    final, **agrupación** por CCAA/provincia/estado con subtotales, densidad
    ajustable y «—» neutro para el dato ausente.
  - **Exportar / compartir**: descarga **CSV**, copiar tabla (TSV) y **enlace
    compartible** (el estado del panel viaja en la URL); **vistas rápidas**
    (activos, nivel ≥ 2, grandes, con evacuación, en expansión, Portugal).
  - «Sin dato» con dignidad, disclaimer 112 y «detección satelital ≠ incendio
    confirmado» presentes; accesibilidad WCAG 2.2 AA; i18n ES/PT/EN.

## [0.27.0] - 2026-07-16

### Añadido

- **Selector de mapa base en el visor.** Nuevo control «Mapa base» (arriba-dcha,
  junto a las capas) con cuatro opciones: **Claro** (por defecto), **Satélite**
  (imagen real de superficie), **Relieve** y **Oscuro**. El tema de la UI sigue
  siendo claro por defecto; el mapa base es una preferencia aparte que se
  **persiste** (`incendib-basemap`). Radiogroup accesible (flechas + Enter).
  - *Satélite*: mosaico **Sentinel-2 cloudless** (EOX, sin nubes, 10 m) con
    etiquetas OSM superpuestas. *Relieve*: **EOX Terrain Light**. Ambos sin clave
    de API. *Claro/Oscuro*: OpenFreeMap (positron/dark). Atribución dinámica
    según la base y licencias anotadas en `docs/DATA-SOURCES.md` (Sentinel-2
    cloudless es CC BY-NC-SA: uso no comercial, que es nuestro caso).

### Cambiado

- **Perímetros más legibles** (mapa y minimapa de la ficha). Nueva capa de
  *casing* (trazo neutro ancho y semitransparente) bajo la línea del estado, con
  grosor por zoom, para que el perímetro se lea con nitidez sobre cualquier base
  (imagen de satélite oscura o mapa claro). El frente activo va más grueso y
  opaco que el área ya quemada (distinción por color + grosor). Técnica inspirada
  en geamap/EFFIS y firemap.
- **Zoom máximo del mapa** de 12 a 14, para poder inspeccionar de cerca
  perímetros e imagen de satélite.
- **CSP**: `connect-src`/`img-src` permiten ahora las teselas de EOX
  (`tiles.maps.eox.at`) además de OpenFreeMap.

## [0.26.0] - 2026-07-16

### Añadido

- **Panel de noticias avanzado (`/noticias`)**: de lista plana de titulares a una
  consola de situación.
  - **Agrupado de historias**: los titulares casi idénticos del mismo suceso
    (varios medios) se colapsan en una sola tarjeta con «N medios» desplegable
    (todos los enlaces originales accesibles). La amplitud de cobertura como señal
    de relevancia, no de gravedad. Núcleo puro y testeado en `src/lib/news/`.
  - **Enlace titular ↔ incendio**: cada historia se cruza con los incendios que
    rastreamos (matcher conservador `keyToken`, palabra completa) y muestra un chip
    con el estado real (color + forma) que enlaza a `/f/{slug}`.
  - **Facetas y búsqueda en cliente**: país (ES/PT), zonas con recuento, «con
    evacuación/descontrol», «vinculados a incendio» y búsqueda por texto; recuento
    de resultados anunciado por `aria-live`.
  - **Bandas de recencia** (última hora / hoy / ayer / anteriores) y rail
    **«Incendios con cobertura»** (vista por incendio, seleccionar filtra el feed).

### Cambiado

- **Integridad del dato en noticias**: se retira la etiqueta «EFFIS FireNews» (no
  se consumía); los titulares sin fecha ya no fingen ser recientes («sin fecha»);
  la criticidad deja de teñir de rojo y pasa a un marcador etiquetado «menciona
  evacuación/descontrol · según el titular»; el color se reserva al estado real
  del incendio enlazado; cuota por país en el feed para no sesgar ES/PT.
- **Accesibilidad**: `lang` por titular (ES/PT), `<time datetime>` con hora
  absoluta en el tooltip, aviso de enlace externo, aviso 112 presente, y directo
  honesto (sin `autoplay`, sin badge «EN DIRECTO» animado ni sobrepromesa).

### Corregido

- **Bug latente de normalización de texto** (`norm`): las marcas diacríticas
  partían la palabra («Aragón» → «arago n»), lo que impedía emparejar topónimos
  acentuados. Ahora se eliminan; mejora también el emparejamiento de prensa de la
  ficha (`relatedNews`) y la detección de zona de las noticias.

## [0.25.0] - 2026-07-16

### Añadido

- **Marca «reconstruido de prensa» en la ficha.** Nuevo campo opcional
  `Fire.reconstructed`: cuando el registro oficial de un incendio ya no existe en
  ninguna fuente y se recompone a partir de noticias verificables, la ficha lo
  señala de forma visible (banner ámbar «Reconstruido a partir de prensa — no es
  un parte oficial») y la línea de fuente muestra «prensa» en vez de un organismo
  oficial. Cada hito del timeline va atribuido y enlazado a su medio. Preserva la
  honestidad de procedencia del proyecto (el dato reconstruido se declara, no se
  disfraza de oficial). i18n ES/PT/EN. Inerte por defecto (sin el campo, nada cambia).

## [0.24.1] - 2026-07-16

### Cambiado

- **Ruta `/p/[provincia]`**: normaliza el segmento a slug canónico (acentos y
  mayúsculas → `avila`), así una URL escrita a mano resuelve a los mismos datos;
  los enlaces internos ya usan el slug canónico. Se retira el `revalidate` fijo:
  la frescura la marcan los `fetch` de datos (~2 min, más fresco), como en
  `/f/[slug]`. Nota: bajo el shell `(app)` (streaming), una provincia inexistente
  responde con la página 404 (mismo comportamiento que `/boletin/[id]`).

## [0.24.0] - 2026-07-16

### Añadido

- **Reactivación de incendios enlazada.** Cuando un incendio se reactiva, la
  fuente abre un incidente nuevo (nuevo ID → nuevo slug → nueva ficha) y el
  anterior quedaba huérfano. Ahora ambas fichas se **conectan**: la histórica
  muestra «Este incendio se ha reactivado → Ver incidente actual» y la nueva,
  «Reactivación de un incendio anterior → Ver incendio anterior», con una lista
  de **«Otros episodios en este paraje»**. La conexión se deriva de una **clave
  de lugar estable** (`país:provincia:municipio`), independiente del ID de la
  fuente (`src/lib/fires/place.ts`, `reactivation.ts`, puros y testeados). El
  descubrimiento es determinista sobre el pool enumerable (vivo + archivo git +
  áreas EFFIS) y, en producción, se enriquece con un índice Redis por paraje.
- **Páginas de provincia `/p/[provincia]`.** Listado de los incendios que ha
  habido y está habiendo en una provincia (o distrito PT), **agrupados por
  paraje** para que las reactivaciones se vean juntas, con secciones «En curso»
  e «Histórico reciente». Reúne dato en vivo, archivo de fichas (git + Redis) y
  áreas quemadas por satélite (EFFIS). Catálogo canónico de provincias/distritos
  (`src/lib/geo/provinces.ts`) para validar el slug y prerenderizar. Enlaces
  añadidos desde «Incendios hoy» (cada provincia) y desde la ficha
  («Ver incendios de {provincia}»). Ruta en el sitemap. i18n ES/PT/EN.
- Índices Redis **best-effort** por provincia (`hist:prov:*`) y por paraje
  (`hist:place:*`), poblados por el cron al archivar, para que el archivo de
  ~1 año sea enumerable. Null-safe: sin Redis, todo es no-op.

## [0.23.1] - 2026-07-16

### Corregido

- **Filtros avanzados accesibles en móvil.** La barra de filtros (estado, país,
  nivel, periodo, superficie) era solo de escritorio; en móvil el chip «+ Filtros»
  del listado no hacía nada. Ahora abre esos filtros en un panel/modal, así que en
  móvil también se puede filtrar por más que los cuatro chips rápidos.
- **Retirados dos controles de búsqueda sin función**: el botón de lupa de la
  cabecera del mapa y la caja «Buscar lugar…» de la barra superior de escritorio
  no estaban conectados a ninguna búsqueda (no ocurría nada al usarlos). Se retiran
  hasta que exista una búsqueda real, para no prometer una acción inexistente.

## [0.23.0] - 2026-07-16

### Añadido

- **Corregir a mano incendios desde el panel** (tercer slice de la capa de overrides).
  `getFires()` aplica las correcciones por campo (`patches`) que el panel escribe en
  `override:state` (superficie, nombre…): fusiona el parche sobre el dato de la fuente
  y marca el incendio `edited` con `overriddenFields`. La ficha muestra un sello
  discreto **«✎ corregido a mano»** (i18n ES/PT/EN) por transparencia, coherente con
  la ética del proyecto (el dato tocado se declara, no se disimula). **Inerte por
  defecto**: sin `patches`, la salida es idéntica. Es reversible desde el panel.
  `applyPatches` es puro y testeado (identidad si vacío; parche vacío no marca edited).

## [0.22.0] - 2026-07-16

### Añadido

- **Páginas «Acerca del proyecto» (`/acerca`) y «Metodología» (`/metodologia`)**,
  antes eran botones sin efecto en Fuentes. Presentación visual y escaneable
  (intro destacada, secciones en tarjetas numeradas, aviso de proyecto en
  desarrollo continuo desde el 10/07/2026 y bloque de contacto destacado con enlace
  `mailto`). Contenido localizado ES/PT/EN; detallan qué es y qué NO es el proyecto,
  las fuentes, el tratamiento de la superficie, la detección satelital, el histórico
  y las limitaciones conocidas. Enlazadas desde Fuentes y añadidas al sitemap.
- **Coordenadas en los incendios destacados del boletín**: las ediciones nuevas
  guardan la posición del incendio, de modo que su ficha histórica podrá dibujar el
  mapa aunque el incendio ya no esté en las fuentes en vivo (las ediciones anteriores
  a este campo siguen mostrándose sin mapa).

## [0.21.0] - 2026-07-16

### Añadido

- **Ocultar incendios/focos desde el panel** (segundo slice de la capa de overrides).
  `getFires()`/`getHotspots()`/`getBurnedAreas()` aplican los ocultamientos que el
  panel escribe en `override:state` (Upstash), leídos con `unstable_cache` (tag
  `override:state`) y filtrados con helpers puros. **Inerte por defecto**: sin
  overrides, los datos salen exactamente igual (filtro identidad + lectura null-safe).
  `POST /api/admin/revalidate` invalida también este estado. Sirve para retirar una
  detección satelital errónea o un incidente mal geolocalizado sin desplegar. Las
  ediciones por campo y el sello «corregido a mano» llegan en un slice posterior.

## [0.20.1] - 2026-07-16

### Corregido

- **Ficha histórica sin ubicación**: los incendios destacados en un boletín
  anterior al archivo (extinguidos antes de que se guardara su ubicación) no
  tienen coordenadas recuperables. En lugar de un mapa vacío, la ficha muestra
  ahora un estado sobrio «Ubicación no disponible». Los incendios que se extingan
  de aquí en adelante conservan su mapa (el archivo guarda las coordenadas).

## [0.20.0] - 2026-07-16

### Añadido

- **Banner de aviso global** (consumo del panel privado). El panel escribe
  `override:banner` en el mismo Upstash; el visor lo LEE en el layout de la app
  (`src/lib/overrides/store.ts`, patrón null-safe como `history/store.ts`, lectura
  cacheada con `unstable_cache` + etiqueta) y lo pinta con `<SiteBanner/>`: banda en
  el flujo (no tapa el contenido), color por nivel (info/aviso/crítico), i18n con
  respaldo a ES, descartable (recordado por `updatedAt`) y con `aria-live`. Nunca
  sustituye el disclaimer 112; si no hay banner activo, no se muestra nada (inerte).
- **`POST /api/admin/revalidate`** (Bearer `PANEL_TOKEN`, fail-closed): el panel lo
  llama tras publicar para invalidar la caché del banner sin esperar al TTL (5 min).
  Es el primer slice de la capa de overrides (los overrides por incendio llegarán
  después). Ver `Incendib-Panel/docs/INTEGRACION-INCENDIB.md`.

## [0.19.1] - 2026-07-16

### Añadido

- **Archivo permanente de las fichas destacadas.** Complementa el histórico de
  fichas (v0.19.0): las instantáneas ricas (con mapa, timeline y medios) de los
  incendios destacados en un boletín se versionan en git (`src/content/archive/`)
  al publicar la edición, para que sus fichas conserven el detalle completo «años,
  no meses», más allá de la retención (~1 año) del archivo en Redis. Se rellenó el
  archivo de las ediciones ya publicadas (`scripts/snapshot-archive.mjs`); la
  resolución de la ficha añade este nivel entre el archivo en Redis y el dato slim
  del boletín.

## [0.19.0] - 2026-07-16

### Añadido

- **Histórico de fichas de incendio.** Las fichas `/f/[slug]` dejan de dar 404
  cuando el incendio se extingue y sale de las fuentes en vivo (rompía los enlaces
  a incendios destacados en el boletín). Ahora resuelven en cascada: dato **en
  vivo** → **archivo** (el cron guarda la última foto conocida de cada incendio,
  solo cuando cambia algo) → **destacado del boletín** (dato permanente en git) →
  404. Las fichas históricas se marcan con un banner sobrio («ya no figura en las
  fuentes en vivo»), con el chip de estado en neutro y sin las señales de actividad
  actual (meteo, confirmación satelital, avance 24 h, botón de seguimiento); la
  imagen para compartir estampa «Histórico». Los enlaces de incendios del boletín
  quedan indexables en el sitemap.

## [0.18.0] - 2026-07-14

### Añadido

- **`/api/health`** (`src/app/api/health/route.ts`): endpoint de salud para la sala
  de situación del panel privado. Reutiliza `getSourceStatus()` (ok/degraded/down +
  `lastUpdate` por fuente) y añade recuentos (incendios, focos 24 h, perímetros) y un
  chequeo de **presencia** de variables de entorno (nunca sus valores). Protegido por
  Bearer `PANEL_TOKEN` (fail-closed: sin token, 401). No altera el pipeline público
  ni el mapa. Ver `Incendib-Panel/docs/INTEGRACION-INCENDIB.md` (Cambio 4).

## [0.17.18] - 2026-07-14

### Corregido

- **Timeline de la ficha: fin del ruido de medios.** El seguimiento propio
  registraba un evento por cada mínima fluctuación de efectivos entre pasadas del
  cron (cada ~15 min), inundando la evolución con «Refuerzo/Retirada de medios»
  y expulsando lo importante (declaración, cambios de nivel). Ahora solo se anota
  una **escalada apreciable** de medios (umbrales por tipo: aéreos ≥3, terrestres
  ≥5, efectivos ≥25) y **no** las retiradas (la desescalada ya la marca el estado
  oficial estabilizado/controlado con su hora).

## [0.17.17] - 2026-07-13

### Accesibilidad

- **Enlace «saltar al contenido»** (WCAG 2.4.1, Bypass Blocks): primer elemento
  tabulable de la app, oculto salvo cuando recibe foco de teclado, que permite
  saltarse la navegación repetida e ir directo al contenido. El shell expone
  ahora un landmark `<main>` focusable (ES/PT/EN; la cadena ya existía en los
  diccionarios pero no estaba cableada).

## [0.17.16] - 2026-07-13

### Añadido

- **Incendios hoy** (`/incendios-hoy`): nueva pantalla con el ranking de la
  actividad por provincia (o distrito en PT) —incendios activos, total y
  superficie— más el recuento nacional de focos satelitales con su advertencia.
  Enlazada desde el Informe y en el sitemap. Inspirada en el proyecto hermano
  mapasdeincendios.es (ver `docs/research/`).
- **Política de seguridad**: `SECURITY.md` y `/.well-known/security.txt`
  (RFC 9116) para el reporte responsable de vulnerabilidades.

### Seguridad

- **Cabeceras HTTP** en todas las respuestas: Content-Security-Policy acotada
  (mapa OpenFreeMap + iframe YouTube-nocookie), `Strict-Transport-Security`,
  `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy` y
  `Permissions-Policy` (geolocalización propia permitida).
- **Endpoints de push**: validación del destino (anti-SSRF: solo `https` a hosts
  públicos), acotado de preferencias, límite de tamaño de cuerpo y
  rate-limiting por IP (fail-open con Upstash).
- **JSON-LD del boletín** y **service worker** endurecidos (escape de `<script>`;
  la notificación solo navega dentro del propio origen). Auditoría en
  `docs/security/AUDITORIA-2026-07-12.md`.

## [0.17.15] - 2026-07-12

### Añadido

- **Ficha · timeline**: los eventos deducidos por seguimiento propio (cambio de
  nivel, refuerzo/retirada de medios) se marcan como «seguimiento» y su hora es
  aproximada, para distinguirlos de los hitos oficiales y de la prensa.

### Corregido

- **Histórico de campaña**: se fusionan las áreas quemadas que EFFIS trocea en
  varios polígonos del mismo incendio (mismo municipio y fecha), sumando las
  hectáreas. El listado deja de repetir municipios (p. ej. Villablino, Barbate);
  el mapa mantiene todos los polígonos para dibujar las formas reales.

## [0.17.14] - 2026-07-12

### Corregido / Añadido

- **«Seguir este incendio» ahora funciona.** Antes era un botón sin efecto (solo
  cambiaba de color y perdía el estado al recargar, mostrando además un texto
  erróneo). Ahora mantiene una **lista de seguimiento** persistente (localStorage)
  y muestra la etiqueta correcta («Siguiendo»).
- **Sección «Incendios que sigues»** en Ajustes de alertas: lista los incendios
  que sigues, con enlace a su ficha y opción de dejar de seguirlos (ES/EN/PT).
  (Las notificaciones push por incendio llegarán con el backend de alertas.)

## [0.17.13] - 2026-07-12

### Corregido

- **Layout en móvil/PWA**: la barra de navegación inferior podía «bajarse» y
  quedar fuera de pantalla (había que hacer scroll para verla). Se bloquea el
  scroll del documento (`html, body` con altura fija y `overflow: hidden`;
  `overscroll-behavior: none`) para que el shell `h-dvh` no se desplace con la
  barra dinámica del navegador. La `BottomNav` respeta además la zona segura
  inferior (`env(safe-area-inset-bottom)`).

## [0.17.12] - 2026-07-12

### Cambiado

- **Boletín en desktop**: aprovecha mejor el ancho. Contenedor más amplio
  (`max-w-5xl`), franja de KPIs a 5 columnas y **ranking + destacados en dos
  columnas** en pantallas grandes. Móvil sin cambios.

## [0.17.11] - 2026-07-12

### Corregido

- **Accesibilidad** (WCAG 2.2): los botones «Compartir» y «Citar» del boletín
  anuncian con `aria-live` el cambio a «copiado», para lectores de pantalla.

## [0.17.10] - 2026-07-12

### Añadido

- **Navegación entre ediciones** del boletín (semana anterior / siguiente) al
  pie de cada edición, para recorrer el archivo. Se muestra según haya ediciones
  contiguas (ES/EN/PT).

## [0.17.9] - 2026-07-12

### Añadido

- **Botón «Citar»** en cada edición del boletín: copia al portapapeles una cita
  con edición, periodo y URL, para uso por prensa y ámbito académico
  (ES/EN/PT).

## [0.17.8] - 2026-07-12

### Añadido

- **Compartir y descargar en el boletín**: botón «Compartir» (Web Share API con
  fallback a copiar enlace) y enlace «Descargar datos (JSON)» en cada edición.
  Traducidos (ES/EN/PT).

## [0.17.7] - 2026-07-12

### Añadido

- **Datos crudos del boletín** en `/boletin/[id]/data.json`: cada edición
  expone su JSON íntegro para reutilización (periodismo de datos, verificación,
  citación), descubrible desde el `distribution` del JSON-LD.

## [0.17.6] - 2026-07-12

### Añadido

- **Metadatos sociales del boletín**: cada edición declara OpenGraph `article`
  (con fecha de publicación y URL canónica) y tarjeta de Twitter
  `summary_large_image`, para vistas previas ricas al compartir en redes.
- **Imagen OG del índice** `/boletines` (tarjeta con el número de ediciones y la
  más reciente).

## [0.17.5] - 2026-07-12

### Añadido

- **Feed RSS del boletín** (`/boletines/rss.xml`): sindicación de las ediciones
  semanales para prensa y ciudadanía, con enlace `alternate` desde `/boletines`.
- **Datos estructurados** (schema.org `Report`) en cada edición
  `/boletin/[id]`, para que buscadores y agregadores la traten como un informe
  fechado y citable.

## [0.17.4] - 2026-07-12

### Corregido

- **`/boletin/latest`** era dinámica y leía el sistema de ficheros en runtime
  (vacío en serverless), con riesgo de redirigir siempre al índice. Ahora es
  estática (se resuelve en build, como el resto de páginas del boletín) y
  redirige de forma fiable a la última edición.

## [0.17.3] - 2026-07-12

### Añadido

- **`/boletin/latest`**: redirección a la edición más reciente (o al índice si
  no hay ninguna). URL estable para enlazar "el último boletín" sin conocer la
  semana.

## [0.17.2] - 2026-07-12

### Añadido

- **Imagen para compartir del boletín** (`next/og`): cada edición
  `/boletin/[id]` genera una tarjeta 1200×630 con los KPIs de la semana, usada
  como vista previa en redes y como descarga PNG.
- **Automatización semanal del boletín** (GitHub Action): cada lunes genera la
  edición de la semana cerrada desde producción y la publica en el repo (Vercel
  despliega). Ejecutable también a mano (`workflow_dispatch`).
- Nota de método (F1) en **todas** las ediciones generadas por el agregador, no
  solo en la primera.

## [0.17.1] - 2026-07-12

### Corregido

- **Boletín: caracteres erróneos (mojibake)** en nombres con acentos
  (`AndalucÃ­a` → `Andalucía`, `LeÃ³n` → `León`…), visibles sobre todo al
  imprimir. Reparada la doble codificación del snapshot `2026-w27` sin alterar
  las cifras.
- **Boletín: impresión** («Guardar como PDF»). El marco de la app usa altura de
  viewport con overflow oculto, que recortaba la página al imprimir; ahora el
  contenido fluye en varias páginas, se oculta la navegación y se fuerza paleta
  clara (aunque el tema sea oscuro) con `@media print`.

## [0.17.0] - 2026-07-12

### Añadido

- **Histórico de campaña (10b)**: `/historico` deja de ser un placeholder y
  muestra el archivo real de áreas quemadas de EFFIS (municipio, provincia,
  país, fecha y hectáreas), ordenado por superficie. Enlazado desde Boletines.
- **Meteo local real en la ficha** (Open-Meteo, sin clave): temperatura,
  humedad y viento (rosa de 8 puntos) por coordenadas del incendio. Antes esta
  sección salía vacía con datos reales.

### Corregido

- **EFFIS recortado a España + Portugal**: el bbox incluye el sur de Francia,
  Andorra y mar; aparecían «áreas quemadas» francesas en el mapa y el histórico.
  Ahora se aplica el mismo recorte punto-en-polígono (`inEsPt`) que a FIRMS.
- **FIRMS**: ventana acotada a 5 días (máximo real de la API `area/csv`; pedir
  más fallaba en silencio) y `/fuentes` marca la fuente como caída si falta la
  clave `FIRMS_MAP_KEY`.

### Interno

- Pruebas unitarias del parser de noticias (Google News RSS) y de la rosa de
  viento; mejora en la detección de titulares críticos (capta «evacúan»).

## [0.16.1] - 2026-07-12

### Añadido

- **Primer boletín semanal publicado** (`2026-w27`): edición consolidada e
  inmutable con detecciones FIRMS, superficie afectada, perímetros EFFIS,
  ranking territorial e incendios destacados reales.
- Nota de método visible en la edición (`Boletin.note`), para dejar explícito el
  alcance de las cifras (F1: foto a fecha de cierre + ventana satelital de 5 días).

### Corregido

- **FIRMS en el boletín**: el agregador pedía a NASA FIRMS una ventana de 7 días,
  rechazada por la API (`Invalid day range. Expects [1..5]`), lo que dejaba las
  detecciones satelitales siempre a 0. Ajustado a 5 días.

## [0.16.0] - 2026-07-12

### Añadido

- **Boletín semanal (F1)**: snapshot consolidado e inmutable por semana ISO.
  Páginas `/boletines` (índice) y `/boletin/[id]` (edición) con KPIs, ranking
  territorial, incendios destacados y vista imprimible. Agregador desde la capa
  de datos y endpoint `/api/boletin/generar` (base del cron semanal F2).
- **Capa de área quemada en el mapa** (EFFIS): perímetros reales recientes,
  aparte de los marcadores de incidentes.
- **Noticias reales**: titulares vía RSS de Google News (ES+PT) con fuente,
  hora y enlace reales, sustituyendo el contenido de demostración.
- Superficie **estimada por satélite** (EFFIS) donde no hay cifra oficial,
  marcada con «~» y «estimación satélite»; «sin dato» cuando no hay ninguna.

### Corregido

- **EFFIS devolvía siempre vacío** (se pedía `application/json`, que el MapServer
  ignora respondiendo GML). Ahora GeoJSON + campaña reciente: vuelven perímetros
  y superficie de área quemada.
- **Hectáreas erróneas/ausentes**: se lee la superficie oficial de INFORCYL
  (`sup_arbolado + sup_pasto`) y EFFIS ya no sobrescribe con estimaciones bajas
  (El Barraco pasó de 15 ha falsas a 140 ha oficiales).
- **Notificaciones que no se podían reactivar**: el cliente registra el SW si
  falta, espera más al SW activo y re-suscribe en limpio; aviso de recuperación
  en la UI cuando el permiso está concedido pero falla la suscripción.
- Se retiran las **cámaras DGT de demostración** (sin fuente real todavía).

## [0.15.3] - 2026-07-12

### Añadido

- **Iconos PWA y de notificación** generados desde el logo de marca
  (`scripts/gen-icons.mjs`, `npm run icons:gen`): `icon-192`, `icon-512`,
  `maskable-512`, `badge-72` (monocromo para Android) y `apple-touch-icon`.
  Antes faltaban y devolvían 404, lo que impedía instalar la PWA correctamente
  (requisito para las notificaciones en iOS).

### Corregido

- **Service Worker resistente**: el manejador `push` ahora hace un parseo
  defensivo del payload y **siempre** muestra una notificación (con textos por
  defecto) aunque el mensaje llegue vacío o malformado. Caché a `incendib-v2`
  para forzar la recarga del SW y de los iconos en clientes existentes.
- Icono `apple-touch-icon` declarado en metadatos para «Añadir a inicio» en iOS.

## [0.15.2] - 2026-07-11

### Cambiado

- El endpoint `/api/push/cron` acepta también **POST** (además de GET), para que
  **Upstash QStash** pueda dispararlo con su método por defecto sin
  configuración extra (Vercel Cron sigue usando GET).

## [0.15.1] - 2026-07-11

### Corregido

- **Medios aéreos en incendios de Castilla y León (INFORCYL)**: no aparecían en
  el desglose de la ficha (INFORCYL no separa avión/helicóptero). Ahora se
  muestran como «Medios aéreos» con su recuento.
- **«Actualizado» erróneo** en fichas de INFORCYL e INFOCA: cuando los campos de
  fecha de control/estabilización venían vacíos, se caía a la fecha de inicio y
  mostraba «hace 1 día» pese a ser un dato fresco. Ahora refleja la frescura real
  del dato (que se refresca cada ~2 min), coherente con la pantalla «Fuentes».

## [0.15.0] - 2026-07-11

### Añadido

- **Noticias en desktop (6a)**: en pantallas grandes la pestaña Noticias pasa a
  un **panel de tres columnas** — **cronología en vivo** (mezcla, por hora, de los
  incendios reales de las cuatro regiones y los titulares), **directo 24 h +
  titulares**, y **cámaras DGT + cuentas oficiales**. En móvil se mantiene la
  pila (3a). Con esto, el Mapa y Noticias tienen ya su versión desktop dedicada.

## [0.14.0] - 2026-07-11

### Añadido

- **Backend de alertas automáticas Web Push** (listo para activar):
  - **Persistencia de suscripciones + preferencias** en Upstash Redis
    (`@upstash/redis`), *privacy-first*: solo la suscripción y preferencias
    mínimas; se **borran** al darse de baja y cuando el servicio de push las da
    por caducadas (410).
  - **Cron `/api/push/cron`** que detecta incendios **nuevos o agravados** (nuevo,
    sube de nivel o aparece evacuación) y envía avisos a cada suscriptor según
    sus preferencias (nivel mínimo, radio de zona); **las evacuaciones siempre
    suenan**. Protegible con `CRON_SECRET`.
  - La **baja** y los **cambios de preferencias** se sincronizan con el servidor.
  - Rutas de push en **región europea** (`fra1`) para tratar los datos en la UE.

### Notas / Activación

- Requiere provisionar **Upstash Redis** (panel de Vercel → Storage → Upstash,
  ~2 min), que fija `UPSTASH_REDIS_REST_URL`/`TOKEN` automáticamente. Sin
  credenciales, el sistema queda **inactivo sin romper nada** (el cron responde
  "no configurado").
- `vercel.json` incluye un cron **diario** (límite del plan Hobby); para tiempo
  casi real, disparar `/api/push/cron` cada ~15 min con **Upstash QStash** (free
  tier) o un cron externo.

## [0.13.0] - 2026-07-11

### Añadido

- **Aviso legal y política de privacidad** (`/legal`), en ES/PT/EN: responsable
  y contacto, datos que se tratan (notificaciones push, ubicación local,
  preferencias, datos técnicos), nota de cookies/almacenamiento (solo técnico,
  **sin banner** porque no hay rastreo ni analítica con cookies), encargados
  (Vercel, servicios de push), conservación, derechos (RGPD, AEPD/CNPD) y
  fuentes. Enlazado desde **Fuentes** y desde la pantalla de **Alertas**. Proyecto
  sin ánimo de lucro: no vende datos ni hace marketing.

## [0.12.0] - 2026-07-11

### Añadido

- **Web Push + Ajustes de alertas (7a)**. Nueva pantalla de alertas (icono de
  campana en la cabecera, móvil y desktop) con:
  - **permiso de notificaciones** con soft-ask propio antes del diálogo nativo,
  - **preferencias**: nivel mínimo de aviso, **radio de alerta** con "usar mi
    ubicación", y silenciar avisos no críticos (las **evacuaciones siempre
    suenan**),
  - **notificación de prueba** que confirma la entrega de extremo a extremo.
- Se **registra de verdad el service worker** (offline + push), que hasta ahora
  no se invocaba. Claves VAPID generadas y configuradas; envío en servidor con
  `web-push`.

### Notas

- Las **alertas automáticas por zona** (avisar cuando aparece un incendio cerca)
  necesitan un almacén persistente de suscripciones + un cron de comprobación;
  es el siguiente paso (requiere elegir almacenamiento). Ya funciona activar,
  configurar y probar las notificaciones.

## [0.11.0] - 2026-07-11

### Añadido

- **Cataluña en vivo (Bombers de la Generalitat)**. Incendios de vegetación
  (FeatureServer ArcGIS público, descubierto desde el visor oficial embebido en
  `interior.gencat.cat`) con **fase operativa** (activo/controlado/estabilizado),
  municipio, **tipo** (forestal/agrícola/urbano-forestal) y nº de vehículos.
  Cataluña se suma a Portugal, Castilla y León y Andalucía: **4 regiones con
  datos reales** de incidentes.

### Notas

- **Galicia**: la Xunta no expone una API pública de incendios activos en tiempo
  real (solo el índice de riesgo IRDI y estadística histórica), así que sigue
  cubierta únicamente por los focos satelitales de NASA FIRMS.

## [0.10.0] - 2026-07-11

### Añadido

- **Andalucía en vivo (INFOCA)**. Incendios del Plan INFOCA (FeatureServer ArcGIS
  público, descubierto desde el visor oficial) con estado operativo y **desglose
  real de medios** (medios aéreos, ACO de coordinación, BRICAS/brigadas,
  vehículos, técnicos). Andalucía se suma a Portugal y Castilla y León.
- **Focos FIRMS más robustos**: se añade **MODIS** a VIIRS y se amplía la ventana
  a **48 h**, de modo que las ventanas nocturnas ya no salen vacías. En el mapa,
  los focos se **atenúan por antigüedad** (los recientes, más intensos); el KPI
  "Focos 24 h" cuenta solo las últimas 24 h.
- **Estado real de las fuentes** en la pantalla "Fuentes": refleja las fuentes
  integradas (NASA FIRMS, fogos.pt, INFORCYL, INFOCA, EFFIS), su frescura y el
  recuento de incidentes por fuente, en vez de datos de demostración.

### Notas

- **Cataluña y Galicia** siguen pendientes: sus datos abiertos de incendios son
  agregados por municipio/comarca **sin geometría de punto**, así que no se
  pueden situar en el mapa sin geocodificar o localizar un visor con API propia.

## [0.9.0] - 2026-07-11

### Añadido / Cambiado

- **Castilla y León en tiempo real (INFORCYL)**. La fuente principal de CyL pasa
  a ser el sistema operativo público de la JCyL (INFORCYL,
  `servicios.jcyl.es/incyl`), que se actualiza casi al instante y aporta:
  - **estado operativo** real (activo / controlado / estabilizado / extinguido),
  - **nivel InfoCal** de gravedad,
  - **desglose real de medios** (autobombas, cuadrillas de tierra, BRIF, ELIF,
    bulldozer, medios aéreos y personal),
  - filtrado de falsas alarmas.

  Da una lista de incendios actuales limpia (frente a los partes retardados de
  Opendatasoft, 2×/día, que quedan como **respaldo** si INFORCYL no responde).
- **Conversión UTM→WGS84** (husos 29/30, ETRS89) para las coordenadas de
  INFORCYL, con pruebas unitarias (punto conocido de Ávila) y del mapeo INFORCYL.

### Notas

- INFORCYL no publica la superficie (hectáreas) de los incendios en curso, así
  que el KPI "Ha afectadas" refleja solo lo disponible; la evolución de área es
  un dato posterior.

## [0.8.1] - 2026-07-11

### Corregido

- **El modo de datos en producción quedaba en `mock`**: la variable
  `NEXT_PUBLIC_DATA_MODE` estaba marcada como *Sensitive* en Vercel y las
  variables sensibles no se inyectan en la sustitución `NEXT_PUBLIC_` del build,
  así que `getDataMode()` la leía como `undefined` y servía datos de
  demostración. Se corrige la variable (no sensible) y, como refuerzo,
  `getDataMode()` ahora usa datos reales por defecto en Vercel
  (producción/preview) salvo que se fije explícitamente `mock`.

## [0.8.0] - 2026-07-11

### Añadido

- **Incidentes en vivo (reales)**. En modo live `getFires()` deja de servir los
  incendios de demostración y agrega fuentes oficiales reales:
  - **fogos.pt / ANEPC (Portugal)**: incidentes activos con estado del SADO
    (em curso / em resolução / em conclusão / vigilância) y **desglose real de
    medios** (personal, medios aéreos por tipo, medios terrestres).
  - **Castilla y León (JCyL)**: incendios recientes no extinguidos (nivel de
    gravedad, superficie afectada, coordenadas), deduplicando por el parte más
    reciente de cada incendio.
  - **EFFIS**: perímetros de área quemada adjuntados al incidente oficial más
    cercano (best-effort; si el WFS no responde, no rompe nada).
- Pruebas unitarias de los adaptadores fogos.pt y JCyL (mapeo de estado, medios,
  nivel y superficie con decimales españoles).

### Notas

- **El resto de España** no tiene API nacional de incendios activos en tiempo
  real, así que fuera de Castilla y León se muestran solo **focos satelitales**
  (NASA FIRMS). Es una limitación de las fuentes, no de la app.
- **Cataluña** queda pendiente: el dataset abierto de actuaciones de Bombers no
  incluye coordenadas ni estado operativo en vivo, así que no es apto para el
  mapa; hay que localizar una fuente con geometría.
- Los focos FIRMS dependen de las pasadas de satélite: en ventanas nocturnas o
  con poca actividad el recuento puede ser 0 y se repuebla solo (revalidación).

## [0.7.1] - 2026-07-11

### Corregido

Hallazgos de una revisión adversarial multidimensional del conjunto de cambios
anterior:

- **Recorte de focos a España + Portugal**: el filtro por bounding box dejaba
  dentro focos de Francia, Andorra y el golfo de Vizcaya. Ahora se recorta con
  un test punto-en-polígono contra el contorno real de ES+PT (excluye Francia,
  Andorra y mar sin recortar la costa ibérica). Con pruebas unitarias.
- **Parpadeo de tema** al cargar con el modo oscuro guardado: el efecto que
  aplica el tema se ejecutaba en el primer render (con el tema aún sin resolver)
  y quitaba `data-theme`, provocando un destello oscuro→claro→oscuro. El guard
  pasa a estado (re-render) y ya no toca el DOM hasta hidratar.
- **Popup de foco satelital**: quedaba flotando al apagar la capa o al vaciarse
  los datos (ahora se oculta con la capa) y exigía doble clic para saltar de un
  foco a otro (`closeOnClick` desactivado).
- **Contraste WCAG AA** del texto secundario/atenuado en tema claro (ahora por
  defecto): de #6B7480 (4.23:1) a #5C6470 (≥4.5:1 en todos los fondos claros).
- **Cursor** en focos/cúmulos del mapa (puntero al pasar por encima).
- **`theme-color`** del navegador y del manifiesto alineados con el tema activo
  (claro por defecto, oscuro al activarlo).
- Coherencia de datos mock (medios terrestres de Odemira) y limpieza de un
  export muerto (`MOCK_HOTSPOTS_24H`).

### Cambiado

- Los valores de entorno con URL usan `||` (no `??`) para que una variable vacía
  caiga a su valor por defecto en vez de romper el build o dejar el mapa sin
  estilo.
- `src/lib/time.ts` deja de importar la capa de datos: el reloj compartido ya no
  arrastra el dataset mock ni los adaptadores al bundle de cliente.

## [0.7.0] - 2026-07-10

### Añadido

- **Desglose de medios desplegados** en la ficha de incendio: medios **aéreos**
  por tipo (aviones anfibios, de carga, helicópteros, coordinación, drones),
  medios **terrestres** por tipo (brigadas, autobombas, maquinaria, UME, Guardia
  Civil) y **medios extranjeros** (ayuda internacional vía rescEU / Mecanismo de
  Protección Civil de la UE), cada uno con icono, etiqueta y recuento en cifras
  mono. Se muestra cuando la fuente aporta el detalle; si no, la ficha mantiene
  el resumen agregado. Copy en ES/PT/EN.
- Modelo de dominio ampliado (`ResourceUnit`, `AerialKind`, `GroundKind`,
  `ForeignAid`) y datos mock enriquecidos con el desglose por incendio.

## [0.6.0] - 2026-07-10

### Añadido

- **Datos en vivo: focos satelitales de NASA FIRMS.** Adaptador que consulta el
  CSV de FIRMS (VIIRS SNPP + NOAA-20, 375 m) para el ámbito España + Portugal,
  lo normaliza a `Hotspot[]` (coordenadas, FRP, confianza, sensor, hora de la
  pasada) y lo cachea en el servidor (revalidación 5 min) para respetar el rate
  limit de NASA (5000 tx / 10 min). Recorta la franja mediterránea hacia la
  costa argelina para ceñirse a ES+PT. Resiliente: ante cualquier fallo devuelve
  vacío y no rompe el mapa.
- **Capa de focos en el mapa**: puntos naranja (#FF6A3D) con glow, tamaño por
  FRP y **clustering** con recuento a poco zoom. Al pulsar un foco, popup con
  sensor, FRP y el aviso **"detección satelital — no confirmada"**.
- **Panel de capas** en los controles del mapa: conmutadores independientes para
  focos satelitales y perímetros de área quemada.
- KPI "Focos 24 h" (mapa e informe) alimentado por el recuento real de focos.
- Focos mock deterministas para el modo demo; pruebas unitarias del parser CSV
  de FIRMS (confianza VIIRS l/n/h y MODIS 0–100, hora HHMM UTC, cuerpos no-CSV).
- `/api/fires` incluye ahora los focos satelitales además de los incendios.

## [0.5.0] - 2026-07-10

### Cambiado

- **Modo claro por defecto.** El tema claro pasa a ser el predeterminado; el
  oscuro "sala de control" queda como opt-in del usuario vía el toggle
  (`[data-theme="dark"]`). El tema sigue siendo una decisión explícita (no se
  sigue `prefers-color-scheme`) y persiste en `localStorage`. Se reestructuran
  las variables de tema (`globals.css`), el selector `darkMode` de Tailwind, el
  tema efectivo por defecto y el `theme-color` del navegador.

## [0.4.3] - 2026-07-10

### Corregido

- **Reloj determinista en modo live**: los tiempos relativos ("hace 6 min"), el
  reloj de cabecera ("Actualizado 14:32") y el filtro por periodo dejaban de
  coincidir entre el HTML del servidor y la hidratación del cliente, provocando
  un desajuste de hidratación (React #418) en el Mapa. Ahora el servidor calcula
  el "ahora" una sola vez y lo inyecta vía `NowProvider`; el cliente parte de ese
  mismo valor y lo refresca cada minuto. En modo mock sigue siendo un instante
  fijo (fidelidad de diseño y tests deterministas).

## [0.4.2] - 2026-07-10

### Cambiado

- Logotipo tipográfico **"Incend·IB"**: las dos últimas letras en el rojo de
  marca, como guiño a Iberia. El nombre accesible sigue siendo "Incendib".

## [0.4.1] - 2026-07-10

### Cambiado

- **Cohesión desktop** en Informe, Fuentes y Noticias: se oculta la cabecera de
  pantalla (redundante con la barra superior) y el contenido se centra en una
  columna cómoda en vez de estirarse a todo el ancho. "Actualizado" pasa a la
  barra superior.

## [0.4.0] - 2026-07-10

### Añadido

- **Panel desktop profesional (1d)**: en `lg:` el Mapa pasa a un layout de tres
  columnas — barra lateral de **filtros** (estado, país, nivel, periodo
  funcionales; superficie/sensor/FWI visuales), **mapa** compartido con tarjetas
  KPI superpuestas, y **lista** de incendios a la derecha.
- **Navegación desktop**: barra superior con marca, buscador, pestañas, idioma y
  tema; la barra inferior se oculta en `lg:`.
- **Modelo de filtros unificado** que comparten el sheet móvil y la barra desktop.

### Cambiado

- Atribución del mapa propia y responsive (móvil arriba-izq., desktop
  abajo-centro), sin solaparse con controles ni KPIs.

## [0.3.7] - 2026-07-10

### Añadido

- **Suite de pruebas** con Vitest (18 tests) para la lógica pura: formato de
  cifras/tiempos, orden por gravedad, KPIs, geometría de perímetros e
  interpolación i18n. Script `npm test`.

## [0.3.6] - 2026-07-10

### Añadido

- **Estado de carga con skeleton** (4a): `loading.tsx` con bloques shimmer
  mientras el servidor resuelve los datos (respeta `prefers-reduced-motion`).

## [0.3.5] - 2026-07-10

### Añadido

- **Estado de error con marca** (4c): boundary de Next para el shell que muestra
  un aviso con reintento en vez del error crudo del navegador.

## [0.3.4] - 2026-07-10

### Añadido

- **Estado de red global** (4d/5b): banda de "sin conexión" (datos en caché) y
  toast de reconexión, con `aria-live`. La caída de red no rompe la UI.

### Corregido

- El título "Incendio de …" ahora se localiza (ES/PT/EN) en la ficha y al
  compartir.

## [0.3.3] - 2026-07-10

### Añadido

- Pantalla **Noticias y directos** (3a): directo 24 h (embed YouTube nocookie
  con carga al pulsar y conmutador de canal), titulares filtrados por incendio,
  cámaras DGT cercanas y cuentas oficiales.
- Con esto se completan las **cinco pantallas principales** (Mapa, Informe,
  Fuentes, Ficha y Noticias).

## [0.3.2] - 2026-07-10

### Añadido

- Pantalla **Ficha de incendio** (1c), con URL propia y compartible (`/f/{slug}`):
  mapa enfocado (perímetro + marcador), badges de estado/nivel/FWI, estadísticas
  (superficie, inicio, medios, meteo), evolución (timeline) y acciones (seguir,
  compartir con Web Share / copiar enlace). Layout i18n propio para `/f`.
- Modelo enriquecido: meteorología local, índice FWI y `timeline` por incendio.

### Corregido

- Atribución del mapa reposicionada para no solaparse con los controles.

## [0.3.1] - 2026-07-10

### Añadido

- Pantalla **Fuentes y licencias** (3b): disclaimer 112 destacado, estado de
  cada fuente (OK / degradada / caída) con licencia y último dato, atribución
  completa y accesos a "Acerca" y "Metodología".

## [0.3.0] - 2026-07-10

### Añadido

- Pantalla **Informe de situación** (2b): KPIs 2×2 (activos, hectáreas, focos
  24 h, nivel máximo), filtros por país (Todos/España/Portugal) y **tabla
  ordenable** por columna. Accesible: `<table>` semántica con `aria-sort` y
  cabeceras que ordenan.
- Banner de **fuente degradada** (p. ej. fogos.pt) con hora del último dato.
- Formato de tiempo compacto ("6 min", "1 h 12") para columnas densas.
- Componentes reutilizables: `ScreenHeader`, `LangButton`.

## [0.2.2] - 2026-07-10

### Cambiado

- **Rebranding a Incendib** (dominio incendib.es): el nombre anterior era marca
  registrada en España. Se renombran la aplicación, el manifiesto PWA, los
  metadatos, el service worker y la interfaz. El identificador del repositorio
  se mantiene.
- URL canónica de producción para metadatos, imágenes OG y enlaces `/f/{slug}`,
  con respaldo automático al dominio de Vercel en despliegues de vista previa.

## [0.2.1] - 2026-07-10

### Añadido

- Capa de **perímetros de área quemada** (EFFIS) en el mapa: polígono con
  relleno traslúcido y borde definido, coloreado por estado, visible al ampliar.
  Se muestra solo cuando el dato está disponible ("metro a metro" con Sentinel-2
  en modo live). Alternable desde el control de capas.
- Entrada de perímetro en la leyenda del mapa.
- Hook de pruebas E2E del mapa (activado con `?e2e`) para verificación visual.

### Corregido

- Las marcas de tiempo con desfase de zona horaria dejan de mostrarse como
  futuras ("dentro de N min") y se normalizan a "ahora mismo".

## [0.2.0] - 2026-07-10

### Añadido

- Pantalla **Mapa** (home): mapa MapLibre GL con teselas OpenFreeMap sin API key.
- Máscara del mundo con España + Portugal recortados y halo sutil de contorno.
- Marcadores por **color + forma** según estado, con pulso para activos de
  nivel ≥ 2 (estático bajo `prefers-reduced-motion`).
- Tira de KPIs (activos, hectáreas, focos 24 h), leyenda plegable, controles de
  mapa e inset de territorios insulares (Canarias).
- Bottom sheet con recuento por gravedad, filtros rápidos y lista de incendios.
- Cabecera con buscador, selector de idioma (ES/PT/EN) y alternador de tema.
- Barra de navegación inferior común a todas las pestañas.
- Verificación visual automatizada (capturas headless en modo claro y oscuro).

### Cambiado

- Modo oscuro fijado **por defecto** (sala de control); el claro es opt-in.

### Corregido

- Los tiempos relativos ("hace 6 min") ahora se localizan en ES/PT/EN.
- El estado del incendio se expone en el nombre accesible de filas y marcadores
  (antes solo en el glifo `aria-hidden`).
- Disclaimer 112 localizado; `aria-pressed` en los chips de filtro.

## [0.1.0] - 2026-07-10

### Añadido

- Estructura del proyecto Next.js 15 + TypeScript + Tailwind CSS.
- Sistema de diseño: tokens semánticos sobre variables CSS y theming en runtime.
- Internacionalización ES/PT/EN con proveedor de diccionarios.
- Modelo de dominio, catálogo de fuentes y dataset de demostración.
- Andamiaje PWA: manifest, service worker (offline + Web Push) e iconos.
- Documentación de arquitectura y guía del proyecto.

[0.15.2]: https://github.com/davidmorrom/Incendib/releases/tag/v0.15.2
[0.15.1]: https://github.com/davidmorrom/Incendib/releases/tag/v0.15.1
[0.15.0]: https://github.com/davidmorrom/Incendib/releases/tag/v0.15.0
[0.14.0]: https://github.com/davidmorrom/Incendib/releases/tag/v0.14.0
[0.13.0]: https://github.com/davidmorrom/Incendib/releases/tag/v0.13.0
[0.12.0]: https://github.com/davidmorrom/Incendib/releases/tag/v0.12.0
[0.11.0]: https://github.com/davidmorrom/Incendib/releases/tag/v0.11.0
[0.10.0]: https://github.com/davidmorrom/Incendib/releases/tag/v0.10.0
[0.9.0]: https://github.com/davidmorrom/Incendib/releases/tag/v0.9.0
[0.8.1]: https://github.com/davidmorrom/Incendib/releases/tag/v0.8.1
[0.8.0]: https://github.com/davidmorrom/Incendib/releases/tag/v0.8.0
[0.7.1]: https://github.com/davidmorrom/Incendib/releases/tag/v0.7.1
[0.7.0]: https://github.com/davidmorrom/Incendib/releases/tag/v0.7.0
[0.6.0]: https://github.com/davidmorrom/Incendib/releases/tag/v0.6.0
[0.5.0]: https://github.com/davidmorrom/Incendib/releases/tag/v0.5.0
[0.4.3]: https://github.com/davidmorrom/Incendib/releases/tag/v0.4.3
[0.4.2]: https://github.com/davidmorrom/Incendib/releases/tag/v0.4.2
[0.4.1]: https://github.com/davidmorrom/Incendib/releases/tag/v0.4.1
[0.4.0]: https://github.com/davidmorrom/Incendib/releases/tag/v0.4.0
[0.3.7]: https://github.com/davidmorrom/Incendib/releases/tag/v0.3.7
[0.3.6]: https://github.com/davidmorrom/Incendib/releases/tag/v0.3.6
[0.3.5]: https://github.com/davidmorrom/Incendib/releases/tag/v0.3.5
[0.3.4]: https://github.com/davidmorrom/Incendib/releases/tag/v0.3.4
[0.3.3]: https://github.com/davidmorrom/Incendib/releases/tag/v0.3.3
[0.3.2]: https://github.com/davidmorrom/Incendib/releases/tag/v0.3.2
[0.3.1]: https://github.com/davidmorrom/Incendib/releases/tag/v0.3.1
[0.3.0]: https://github.com/davidmorrom/Incendib/releases/tag/v0.3.0
[0.2.2]: https://github.com/davidmorrom/Incendib/releases/tag/v0.2.2
[0.2.1]: https://github.com/davidmorrom/Incendib/releases/tag/v0.2.1
[0.2.0]: https://github.com/davidmorrom/Incendib/releases/tag/v0.2.0
[0.1.0]: https://github.com/davidmorrom/Incendib/releases/tag/v0.1.0
