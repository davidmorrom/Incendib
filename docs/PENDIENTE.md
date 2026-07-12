# Backlog / Pendiente — Incendib

> Estado a **v0.17.x** (jul 2026). Fuente única de tareas pendientes. Complementa
> `docs/notas-sesion-2026-07-12.md` (bitácora) y `COORDINACION.md` (multiagente).
> Leyenda: 🧑 = requiere acción del propietario · 🤖 = desarrollo de agente ·
> 🔒 = bloqueado (dato/decisión) · ✨ = pulido.

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
  - Sin fuente headless usable: Galicia, Aragón, Extremadura, Murcia, Asturias.
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
- **Histórico de campaña**: hoy ~68 áreas EFFIS (ventana 45 d, `count=80`).
  Posible dedup por (municipio+fecha) y/o ventana configurable.
- **A11y**: seguir el barrido (roles ARIA en más tablas, foco visible, navegación
  por teclado del sheet/filtros).
- **Verificación visual headless** (`?e2e`) de pantallas nuevas en claro/oscuro.

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
