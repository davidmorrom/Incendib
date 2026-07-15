# Changelog

Todas las novedades relevantes de este proyecto se documentan aquí.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es/1.1.0/) y el
proyecto se adhiere a [Versionado Semántico](https://semver.org/lang/es/).

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
