# Backlog / Pendiente — Incendib

> Estado a **v0.30.x** (jul 2026). Fuente única de tareas pendientes. Complementa
> `docs/notas-sesion-2026-07-12.md` (bitácora) y `COORDINACION.md` (multiagente).
> Leyenda: 🧑 = requiere acción del propietario · 🤖 = desarrollo de agente ·
> 🔒 = bloqueado (dato/decisión) · ✨ = pulido.

## 0. Del research (mapasdeincendios) — estado

- ✅ **Informe/boletín semanal** (P0), **Noticias avanzado**, **Informe avanzado**,
  **Mapa: basemaps** (P2), **Alertas avanzado**, **`/incendios-hoy`** (P2),
  **Acerca/Metodología** (P3), **páginas por provincia** (`/p/[provincia]`).
- ✅ **Estadísticas F1** (P1, v0.30.0): serie histórica EGIF (siniestros +
  superficie 2006-2024) y rankings top-10 CCAA/provincias del decenio 2006-2015.
  Datos oficiales MITECO versionados, no fusiona fuentes. `/estadisticas`.
- ⏳ **Estadísticas F2/F3**: FIRMS/día + incidentes por gravedad (derivados del
  dato en vivo) y coroplético EFFIS por provincia + filtro territorial.
- ⏳ **Territorios por CCAA/municipio** (P1): solo existe `/p/[provincia]`.
- ⏳ **Selección de provincia en el mapa** (P2): falta capa de límites +
  interacción (doc `docs/research/04-...`).

## 1. Desbloqueantes (acción del propietario) 🧑

- **Ampliar CCAA en vivo (las que faltan)**: capturar el endpoint de un visor
  oficial (F12 → Network → Fetch/XHR → recargar → copiar la URL que devuelve
  incendios en `arcgis`/`FeatureServer`/`.json`). **Integradas: PT, CyL,
  Andalucía, Cataluña.**
  - **Castilla-La Mancha (INFOCAM)**: endpoint público encontrado
    (`services-eu1.arcgis.com/.../V_Incendio/FeatureServer/0`) pero es un **log
    acumulativo** que da por "Activo" incendios ya extinguidos (contrastado con
    prensa: **0 de 11 realmente activos**) → **NO integrado**. Re-alta solo con
    **validación por focos FIRMS** (mostrar únicamente los confirmados por
    satélite <48 h, <~4 km). Adaptador conservado en `fetchInfocamFires`.
  - **Comunitat Valenciana**: GeoServer localizado (`112cv.gva.es/geoserver/cv112`,
    capa `V_INCIDENTES_EN_CURSO`) pero **WMS/WFS deshabilitado** externamente.
    Reintentar con inspección de red desde IP española, o pedir acceso a
    `dadesobertes@gva.es`.
  - **Sin fuente headless usable (2 rondas de descubrimiento)**: Galicia, Aragón,
    Extremadura, Murcia, Navarra, Asturias, Cantabria, La Rioja. Detalle:
    - **Aragón** (IDEAragon GeoServer WFS `DAGMA_INCENDIOS`): la capa
      `INCENDIOS_ACTIVOS` da **0 features** hoy y las capas ricas de perímetros
      están **congeladas en 2020** (archivo); además `esactivo=1` en TODOS los
      registros (mismo problema que INFOCAM). No usable.
    - **Extremadura (INFOEX)**: la operativa en vivo está tras **login**; la IDE
      no expone capa de incidentes. Solo prevención/estadística.
    - **Galicia / Murcia / Navarra / Asturias / Cantabria / La Rioja**: sin
      endpoint público de activos (SPA con login o solo histórico/satélite).
  - **Techo real**: los agregadores de referencia (mapasdeincendios, etc.)
    integran las MISMAS fuentes que nosotros (JCyL, Bombers, INFOCA, INFOCAM,
    112CV). El resto de España se cubre con **FIRMS (satélite)**. Ampliar más
    requiere inspección de red en navegador (SPAs) o acceso concedido.
  - **Lección**: verificar SIEMPRE que la fuente da estado "activo" fiable
    (no un log acumulativo) antes de integrarla; cruzar con prensa/FIRMS.
- **Probar push en iPhone**: instalar la PWA desde **Safari → Compartir → Añadir a
  pantalla de inicio**, abrirla y activar notificaciones ahí (en iOS el push solo
  funciona como PWA instalada, no en pestaña). Verificar «Enviar prueba».
- **Confirmar `FIRMS_MAP_KEY` en Vercel** (prod ya muestra focos, parece OK; si
  algún día «Focos 24 h» = 0, revisar esta env var).

## 2. En desarrollo ahora 🤖

- **Descubrimiento + integración de nuevas CCAA** (Valencia, CLM, Galicia,
  Aragón, Extremadura, Murcia, Asturias): búsqueda paralela de endpoints públicos
  y consulta headless de sus FeatureServer. Integrar las que den incidentes reales.
- **Boletín semanal F2** (carril del agente de boletín): cron semanal que genere
  y publique la edición automáticamente. *Coordinar en `COORDINACION.md`.*

## 3. Bloqueado por falta de fuente o decisión 🔒

- **Evacuaciones / cortes de vía en vivo**: las APIs autonómicas no lo publican;
  hoy las alertas de evacuación no se disparan (pero nivel ≥2 ya cuenta como
  crítico y alerta). *Decisión:* ¿intentar cruzar titulares de prensa con
  incendios por cercanía/nombre? (match frágil → sería experimento, no dato fiable).
- **FWI / índice de peligro meteo**: *decisión del propietario.* Opción segura =
  **capa de mapa (heatmap EFFIS)**, no cifra por incendio (evita dato erróneo).
- **Cámaras DGT**: sin fuente pública fiable de imágenes geolocalizadas. Retiradas.
- **Islas (Canarias/Azores/Madeira)**: fuera del bbox de FIRMS/EFFIS y de la
  máscara `es-pt-land.json`. Requiere segundo bbox + regenerar máscara
  (`npm run geo:gen`) + render en el inset del mapa.
- **Superficie oficial de Portugal (fogos `icnf.burnArea`)**: unidad ambigua
  (posible ×100); no se usa hasta confirmarla. Hoy PT usa estimación EFFIS.

## 4. Para pulir ✨

- **Timeline de ficha**: Andalucía y Cataluña dan histórico corto (sus fuentes no
  publican fecha de cada cambio de estado). CyL es rico. Aceptable; mejorable si
  aparece más dato.
- **Histórico de campaña**: ✅ **dedup hecho** (v0.17.15): se fusionan los polígonos
  EFFIS del mismo incendio (municipio+fecha). Queda opcional: ventana configurable.
- **A11y**: ✅ enlace «saltar al contenido» + landmark `<main>` (v0.17.17); tablas
  ya semánticas con `aria-sort`/`caption`, foco visible global, chips con
  `aria-pressed`. Queda barrido menor (sheet/filtros por teclado) — bajo impacto.
- **Verificación visual headless** (`?e2e`) de pantallas nuevas en claro/oscuro.

### Hecho recientemente (carril A) — jul 2026

- ✅ **Ruido de medios en el timeline eliminado** (v0.17.18): el seguimiento propio
  anotaba un evento por cada fluctuación mínima de efectivos (cada ~15 min),
  inundando la evolución. Ahora solo escaladas apreciables (umbrales) y sin
  retiradas. Purgados los `hist:ev:*` ya acumulados en Redis (182 claves).
- ✅ **Marcador «seguimiento»** (hora aproximada) distinguido de hitos oficiales y
  prensa en el timeline.

## 5. Ideas / futuro 💡

- Cruce **prensa ↔ incendio** para enriquecer el timeline (evacuaciones, medios)
  como capa «no oficial» claramente etiquetada.
- **Web push de verdad automático** (cron QStash cada 15 min) verificado extremo
  a extremo con suscriptores reales.
- **Estadísticas / comparativa** interanual (idea del research, doc 05).

## 6. Estado por carril (agentes)

- **A — datos/UI:** auditoría de datos cerrada; ahora ampliación de fuentes.
- **B — boletín:** publicación/RSS/OG/citar/navegación hechos; falta F2 (cron).
- **C — seguridad:** auditoría hecha (CSP, anti-SSRF, rate-limit, SECURITY.md).
- **D — social:** copys de lanzamiento y destacadas.
