# Informe técnico y prompt de diseño: web interactiva sin ánimo de lucro de incendios forestales activos en España y Portugal

## TL;DR
- La arquitectura óptima combina tres capas: **NASA FIRMS** (focos/hotspots casi en tiempo real, VIIRS 375 m), **EFFIS/Copernicus** (perímetros de área quemada y FWI, WMS/WFS estándar) y **fuentes nacionales/autonómicas** (estado operativo y nivel de gravedad: fogos.pt/ICNF para Portugal; JCyL y Bombers de Catalunya como únicas CCAA con API abierta real, más INFOCA/112 vía dashboard/scraping).
- Todas las fuentes centrales son **libremente reutilizables con atribución** (EFFIS = CC BY 4.0; NASA = dominio público con cita; fogos.pt = API pública en proceso de exigir registro). No hace falta pedir permiso formal a organismos españoles/portugueses para un proyecto sin ánimo de lucro; basta con atribución correcta y un disclaimer de "no sustituye al 112".
- El stack recomendado es **Next.js + MapLibre GL JS** con teselas gratuitas de **OpenFreeMap/Protomaps**, capas GeoJSON para perímetros, clustering de hotspots, y consumo de WMS (raster) / WFS (GeoJSON) de EFFIS. Al final del informe se incluye un **prompt de diseño listo para copiar** dirigido a Claude.

---

## Estado de implementación real (lo que hay en producción)

> El resto del documento es la **investigación previa**. Esta sección resume lo
> **realmente integrado** y sus particularidades (aprendidas en producción), que
> difieren en varios endpoints de lo propuesto arriba. Código: `src/lib/data/adapters`.

- **NASA FIRMS** (`fetchFirmsHotspots`): la API `area/csv` **solo admite 1–5 días**
  (pedir más → «Invalid day range»). Requiere `FIRMS_MAP_KEY`. VIIRS(SNPP+NOAA-20)+MODIS,
  recorte a tierra ES+PT con `inEsPt`.
- **EFFIS área quemada** (`fetchEffisPerimeters`, capa `ms:modis.ba.poly`): **pedir
  `outputFormat=geojson`** (con `application/json` el MapServer devuelve GML y falla
  el parseo → vacío). Capa **multi-anual** → filtrar `FIREDATE` a la campaña reciente
  y ordenar por `LASTUPDATE`; **recortar a ES+PT** (el bbox incluye Francia). Se pinta
  como capa propia del mapa (`getBurnedAreas`) y como archivo en `/historico`.
- **Superficie (hectáreas)**: prioridad a la cifra **oficial**. INFORCYL SÍ la publica
  (`sup_arbolado`+`sup_pasto`); INFOCA y Bombers **no**. Donde no hay oficial se rellena
  con estimación EFFIS cercana marcada `hectaresApprox` («~» + «estimación satélite»);
  si no hay nada, «sin dato». `attachPerimeters` **nunca** pisa la cifra oficial.
  `icnf.burnArea` de fogos **descartado** (unidad ambigua).
- **Castilla y León**: API en vivo de **INFORCYL** (`servicios.jcyl.es/incyl/json/emergencias`),
  no Opendatasoft (que queda de respaldo). Coordenadas UTM → `utmToLonLat`.
- **Andalucía (INFOCA)**: FeatureServer real `utility.arcgis.com/usrsvcs/servers/…/INFOCA/AN_INCIDENTES_PRO/FeatureServer/2`.
- **Cataluña (Bombers)**: FeatureServer `services7.arcgis.com/ZCqVt1fRXwwK6GF4/…/ACTUACIONS_URGENTS_online_PRO_AMB_FASE_VIEW/FeatureServer/0`.
- **Meteo local por incendio (ficha)**: Open-Meteo (`api.open-meteo.com`, sin clave).
- **Noticias**: RSS de **Google News** (ES+PT); NewsAPI no usado. Cámaras DGT retiradas (sin fuente fiable).
- **No integrado / bloqueado**: FWI (peligro), evacuaciones, más CCAA en vivo
  (Valencia/CLM/Galicia: visores SPA, requieren inspección de red del navegador),
  islas (fuera del bbox satelital y de la máscara).
- **Técnica de descubrimiento headless de fuentes ArcGIS**: de un ítem/dashboard,
  `sharing/rest/content/items/{id}?f=json` da el `orgId`; luego
  `sharing/rest/search?q=orgid:{id} type:"Feature Service"` lista sus servicios.
  Los **incidentes activos** suelen estar en la agencia de **emergencias**, no en la de prevención.

---

## Key Findings

### 1. Fuentes de datos — comparativa y arquitectura recomendada

**NASA FIRMS (focos activos casi en tiempo real) — la base de la capa de hotspots.**
- API de área: `https://firms.modaps.eosdis.nasa.gov/api/area/csv/[MAP_KEY]/[SOURCE]/[BBOX]/[DAY_RANGE]`. Formato CSV (también endpoints por país y KML).
- MAP_KEY gratuito solicitando en `https://firms.modaps.eosdis.nasa.gov/api/map_key/`. Límite exacto (verbatim NASA FIRMS): *"MAP_KEY limit is 5000 transactions / 10-minute interval. Larger transactions may count as multiple requests (ex. requesting 7 days)."*
- Sensores: VIIRS (375 m, Suomi-NPP + NOAA-20 + NOAA-21), MODIS (1 km). Se recomienda usar "All VIIRS" para máxima cobertura.
- Latencia: NRT — según NASA Earthdata, *"FIRMS distributes near real-time active fire data acquired by MODIS and VIIRS instruments within three hours of a satellite observation"*; EOSDIS define RT como *"within 60 minutes of satellite overpass"* y URT como *"<60 seconds"*, esto último disponible sólo para EEUU/Canadá. Cada detección incluye FRP (potencia radiativa del fuego en MW) y nivel de confianza.
- Limitación: la localización es el centro de un píxel de 375 m (VIIRS) o 1 km (MODIS); no todos los hotspots son incendios (quemas agrícolas, industria).

**EFFIS / Copernicus EMS (perímetros de área quemada + FWI) — la capa de precisión "km2 a km2".**
- Servidor OWS estándar: `https://maps.effis.emergency.copernicus.eu/effis` (WMS 1.1.1/1.3.0 y WFS). Sin fees, sin registro, acceso anónimo.
- Perímetros de área quemada (Rapid Damage Assessment): capa confirmada `ms:modis.ba.poly`. Derivados de MODIS 250 m + Sentinel-2 20 m. Mapea incendios de ~30 ha o mayores (desde 2018, con Sentinel-2, también menores). Según el JRC (Copernicus EMS), *"the areas mapped in EFFIS represent about 95% of the total area that burns in the EU every year"*. Los perímetros son mapeados manualmente por analistas entrenados y refinados con imágenes de mayor resolución (Sentinel-2); el JRC precisa que *"these updates can take place up to 8 times per day"*.
- FWI (Fire Weather Index, peligro meteorológico): capa `ecmwf007.fwi`, servida como raster vía WMS GetMap. 5 clases (muy bajo a muy alto), resolución ~36 km (datos DWD) / variantes ECMWF.
- Hotspots MODIS/VIIRS: EFFIS redistribuye un subconjunto filtrado de FIRMS (descarta quemas agrícolas). typeName inferidos `ms:modis.hs` / `ms:viirs.hs` (a verificar vía GetCapabilities). Actualización 6 veces/día, latencia 2-3 h.
- Ejemplo WFS→GeoJSON: `https://maps.effis.emergency.copernicus.eu/effis?service=WFS&version=2.0.0&request=GetFeature&typeName=ms:modis.ba.poly&outputFormat=application/json&count=50`.
- Para perímetros crudos históricos hay que usar el DATA REQUEST FORM (`https://forest-fire.emergency.copernicus.eu/apps/data.request.form/`).

**Portugal — fogos.pt + ICNF.**
- **fogos.pt** (proyecto open source de VOST Portugal, no oficial pero fiable, reempaqueta datos de ANEPC): API pública en `https://api.fogos.pt/`, documentada en `https://api.fogos.pt/docs/`. Endpoint clave confirmado: `https://api.fogos.pt/v2/incidents/active`. Según la ficha oficial de la app: *"Data is refreshed every 2 minutes, directly from Portugal's National Emergency and Civil Protection Authority (ANEPC)."* (Los datos meteorológicos se refrescan cada 30 min y el índice de riesgo cada 6 h.) Licencia del código Apache 2.0. IMPORTANTE: fogos.pt ha anunciado que restringirá el acceso a la API a usuarios autorizados/registrados por abuso de uso; hay que registrarse en `https://fogos.pt/pt/api`.
- **ICNF ArcGIS REST oficial** (áreas ardidas, perímetros Sentinel-2 >10 ha): `https://sigservices.icnf.pt/server/rest/services/BDG/areas_ardidas/MapServer/0`, soporta salida geoJSON: `.../0/query?where=1=1&outFields=*&f=geojson`.
- Datos base ANEPC/Prociv: el estado operativo (em curso, em resolução, em conclusão, vigilância, encerrada) viene del SADO de la ANEPC vía fogos.pt.

**España — fragmentación de fuentes en tiempo real.**
- **MITECO / EGIF (Estadística General de Incendios Forestales)**: fuente oficial y más completa (desde 1968, >150 campos por parte), pero es ESTADÍSTICA (datos definitivos hasta 2016, avances provisionales posteriores), NO tiempo real. Útil para históricos, no para el mapa en vivo. Buscador EGIF: `https://servicio.mapa.gob.es/incendios`.
- **Castilla y León (JCyL)** — la mejor API abierta autonómica: plataforma Opendatasoft, dataset `incendios-forestales`. API: `https://analisis.datosabiertos.jcyl.es/api/explore/v2.1/catalog/datasets/incendios-forestales/records`; export GeoJSON: `.../exports/geojson`. Incluye Índice de Gravedad (IGR). Actualización 2×/día en campaña. (Verificar si el dataset incluye geometría de perímetro o sólo puntos/atributos por municipio.)
- **Cataluña (Bombers de la Generalitat)** — Socrata: `https://analisi.transparenciacatalunya.cat/resource/g2ay-3vnj.json` (soporta `.geojson`, filtros SoQL `$where`/`$limit`). Datos oficiales de actuaciones (hay que filtrar por fecha/estado).
- **Andalucía (INFOCA / Agencia EMA)**: dashboard oficial ArcGIS `https://laagencia.maps.arcgis.com/apps/dashboards/87a5fe2d397e4140add84f50d8bdafd3`, pero la fuente de datos es la cuenta oficial X @Plan_INFOCA; el FeatureServer REST no está documentado públicamente. Perímetros históricos (>10 ha, 2008-2025) vía REDIAM WMS/WFS (`portalrediam.cica.es`).
- **Comunidad Valenciana (112 GVA)** y **Galicia (Xunta)**: sin endpoint machine-readable abierto de focos activos confirmado (Valencia sólo app oficial `112cv.gva.es/es/incidentes-en-curso`; Galicia sólo datos históricos CSV en `abertos.xunta.gal`).
- **AEMET**: riesgo meteorológico de incendios. El nuevo **IPIF (Índice de Peligro de Incendios Forestales)** está operativo desde el 27/05/2026 (presentado el 28/05/2026 por AEMET/MITECO): pasa de 5 a 6 niveles de peligro (añade "muy bajo") y de 5 km a 1 km de resolución, integrando humedad del suelo, estado de la vegetación (NDVI) y usos del suelo. Según Ramiro Romero, Jefe de Servicio de Aplicaciones Agrícolas e Hidrológicas de AEMET, el nuevo índice reduce los días con falsas alarmas del "26-27%" del FWI clásico al "18%". Datos abiertos: `https://www.aemet.es/es/datos_abiertos/estadisticas/riesgo_incendios`. Visor ALCIF `https://incendios.aemet.es/`. Actualización diaria, horizonte hasta 4 días.

**Conclusión de arquitectura**: usar FIRMS como capa universal de hotspots (cobertura total: Península, Canarias, Baleares, Azores, Madeira, Ceuta y Melilla), EFFIS para perímetros de área quemada y FWI, fogos.pt+ICNF para Portugal (estado operativo real), y JCyL+Bombers Catalunya como capas de estado operativo español donde existen; para el resto de España, el estado operativo/nivel se rellena con FIRMS + (opcionalmente) scraping de dashboards oficiales.

### 2. Taxonomía operativa para los filtros

**España — niveles de gravedad potencial (Directriz Básica de Planificación de Protección Civil de Emergencia por Incendios Forestales, RD 893/2013):**
- **Nivel 0**: sólo bienes forestales, controlable con medios locales/autonómicos; sin riesgo para población.
- **Nivel 1**: puede afectar levemente a población/bienes no forestales; gestionado por medios autonómicos, posibles evacuaciones preventivas.
- **Nivel 2**: amenaza grave a población y bienes no forestales; requiere/puede requerir medios estatales extraordinarios (UME, BRIF del MITECO) a petición de la CA.
- **Nivel 3**: emergencia de interés nacional declarada por el Ministro del Interior; gestión bajo Plan Estatal de Protección Civil.
- **Estados operativos**: activo, controlado, estabilizado, extinguido.
- **IGR / Índice de Gravedad Potencial**: usado por CCAA (ej. INFOCAL de Castilla y León, INFOCA de Andalucía) para clasificar el incendio.

**Portugal — estados de ocorrência (Prociv/ANEPC, del SADO):**
- Despacho → Despacho de 1º Alerta → **Em Curso** → Chegada ao T.O. → **Em Resolução** → **Em Conclusão** → **Vigilância** → Encerrada.
- Equivalencias cromáticas de fogos.pt/mapafogos: Vermelho = incêndio ativo (Em Curso); Âmbar = Em Resolução; Azul = Concluído; Cinzento = falso alarme; Roxo = fogo controlado/queima. El tamaño del marcador indica la extensión del incendio.
- Índice RCM de riesgo (IPMA): 5 niveles (Reduzido 1, Moderado 2, Elevado 3, Muito Elevado 4, Máximo 5).

**Filtros propuestos para la UI:**
- Estado operativo (ES: activo/controlado/estabilizado/extinguido; PT: em curso/em resolução/em conclusão/vigilância).
- Nivel de gravedad (ES: 0/1/2/3).
- Superficie afectada (ha) — rango.
- Fecha de inicio — rango temporal (24 h / 48 h / 72 h / 7 d).
- Tipo (forestal / agrícola / urbano-forestal).
- Medios desplegados (aéreos / terrestres / bomberos / nº efectivos).
- Fuente/sensor (VIIRS / MODIS / EFFIS / nacional).
- Confianza del foco (baja / media / alta) y umbral FRP (MW) — para hotspots FIRMS.
- Riesgo meteorológico FWI/IPIF (muy bajo → extremo).
- Territorio (Península / Canarias / Baleares / Azores / Madeira / Ceuta / Melilla; y por CCAA/distrito).

### 3. Noticias y directos (segunda pestaña)
- **YouTube 24 h**: RTVE Canal 24 Horas (canal `UC7QZIf0dta-XPXsp9Hv4dTw`, con `/live`); RTP3/RTP Notícias (Portugal). YouTube permite embed vía iframe estándar salvo bloqueo del propietario; usar `youtube-nocookie.com` para privacidad.
- **RSS/noticias**: Google News RSS filtrado por "incendio forestal" / "fogo rural" y por CCAA; EFFIS FireNews (feed curado de RSS geolocalizado); NewsAPI (freemium) como alternativa.
- **Webcams de tráfico DGT**: el Punto de Acceso Nacional (NAP `https://nap.dgt.es/`) publica localizaciones de cámaras en DATEX2; las imágenes provienen de `infocar.dgt.es/etraffic`. No hay País Vasco ni Cataluña (gestión propia). Son imágenes estáticas refrescadas, no streams embebibles; hay que enlazar/refrescar la URL de imagen.
- **Cuentas oficiales para consulta/embed**: @UMEgob, @Plan_INFOCA, 112 de cada CCAA, @ProtecCivil (PT), @jrc_effis.

### 4. Stack técnico de mapa
- **Librería: MapLibre GL JS** (fork MIT/BSD de Mapbox GL v1, sin API key para render, WebGL, vector tiles, clustering nativo, heatmap layer). Alternativa ligera: Leaflet (raster, más simple, ~28 KB, cero dependencias). Evitar Mapbox GL v2+ (licencia propietaria, requiere cuenta).
- **Teselas gratuitas**: OpenFreeMap (`https://tiles.openfreemap.org/styles/liberty`, sin API key, self-hostable) o Protomaps (.pmtiles, 1 archivo en almacenamiento estático; API demo con límite ~1M teselas/mes; commercial use requiere GitHub Sponsor). Ambas basadas en OpenStreetMap.
- **GeoJSON de perímetros**: `map.addSource({type:'geojson'})` + fill/line layers; para hotspots, source con `cluster:true` y circle layers, o heatmap layer con FRP como peso.
- **Consumo de EFFIS**: WMS como raster tile source (`type:'raster', tiles:[...GetMap...]`) para FWI y perímetros como imagen; o WFS `outputFormat=application/json` para cargar perímetros como GeoJSON vectorial e interactivo.
- **React**: usar `react-maplibre` (visgl) o `@vis.gl/react-maplibre`. Encaja de forma natural con Next.js (App Router, componentes cliente para el mapa, API routes/ISR para cachear FIRMS).

### 5. Aspectos legales / licencias
- **EFFIS/Copernicus**: contenido propiedad de la UE bajo **Creative Commons Attribution 4.0 International (CC BY 4.0)**; el texto oficial de la licencia establece: *"reuse is allowed, provided appropriate credit is given and changes are indicated"*. Copyright (C) European Union, 1995-2025. Cita sugerida: "European Forest Fire Information System – EFFIS (© European Union)".
- **NASA FIRMS**: dominio público, sin copyright; NASA pide reconocimiento como fuente (*"NASA supports an open data policy and we encourage the appropriate use of data and graphics from FIRMS"*). Cita recomendada de LANCE FIRMS.
- **datos.gob.es / datos autonómicos**: reutilización libre (Ley 37/2007 y RD 1495/2011) con atribución y sin desnaturalizar; REDIAM Andalucía = libre con mención de autores.
- **fogos.pt**: datos originales de ICNF/IPMA; API JSON para consulta; para uso comercial/redistribución hay que revisar términos de las fuentes originales; API en proceso de exigir registro.
- **Conclusión legal**: para un proyecto sin ánimo de lucro basta con atribución correcta de cada fuente en un pie/página "Fuentes y licencias"; no se requiere permiso formal previo. Añadir disclaimer: "no sustituye a canales oficiales de emergencia; en caso de emergencia llamar al 112".

---

## Details

La combinación de fuentes tiene una lógica de precisión creciente: los hotspots de FIRMS/VIIRS dan la señal más rápida (minutos-horas) pero imprecisa (píxel de 375 m, falsos positivos); los perímetros de EFFIS dan la geometría real del área quemada (validada por fotointérpretes, refinada con Sentinel-2 a 20 m, hasta 8 actualizaciones/día) pero con retardo respecto al frente activo; y las fuentes nacionales aportan el dato operativo humano (nivel de gravedad, medios, estado) que ningún satélite puede dar. Presentar las tres capas con simbología distinta y activables por separado es lo que convierte el visor en una herramienta seria y no en un simple mapa de puntos de calor.

El mayor reto de ingeniería en España es la ausencia de una API nacional unificada de incendios activos: MITECO sólo ofrece estadística consolidada con retardo, y sólo dos CCAA (Castilla y León y Cataluña) exponen APIs abiertas reales. Portugal, paradójicamente, está mejor servido gracias a fogos.pt (refresco cada 2 min desde ANEPC) y al ArcGIS REST del ICNF. Por ello la recomendación pragmática es: FIRMS como capa universal homogénea para toda la Península e islas, y superponer los datos operativos oficiales donde existan (PT completo, CyL y Catalunya en ES).

Existen ya varios visores de terceros de los que aprender (no como fuentes, sino como referencia de UX): fogos.pt/mapafogos.pt (Portugal, el más maduro), e `incendiohoy.es`, `incendiosespaña.es` o el visor de El Debate en España, que combinan exactamente FIRMS + EFFIS + capas autonómicas. Confirman que la arquitectura propuesta es la estándar de facto.

---

## Recommendations

**Fase 1 (MVP):** Mapa MapLibre + OpenFreeMap con vista mundial y zoom inicial a la Península Ibérica; capa de hotspots FIRMS VIIRS+MODIS (últimas 24-72 h) con clustering y color por antigüedad; capa de perímetros EFFIS (WFS GeoJSON); filtros básicos (periodo, sensor, confianza, territorio). Pie con atribución EFFIS/NASA y disclaimer 112. Backend Node/Next.js que cachea FIRMS con revalidación cada 5-10 min (ISR) para no agotar el rate limit.

**Fase 2:** Añadir estado operativo real: fogos.pt (`/v2/incidents/active`) para Portugal e ICNF áreas ardidas; JCyL y Bombers Catalunya para España. Filtros de estado operativo y nivel de gravedad. Capa FWI/IPIF de EFFIS/AEMET como overlay de riesgo activable con opacidad ajustable.

**Fase 3:** Segunda pestaña Noticias/Directos (embed YouTube 24 h RTVE/RTP, RSS filtrado, cámaras DGT, cuentas oficiales). Panel de detalle por incendio (timeline, medios, meteo).

**Umbrales que cambian decisiones:** si fogos.pt cierra la API sin registro viable, migrar a ICNF ArcGIS + scraping propio de Prociv. Si el rate limit de FIRMS (5000/10 min) se queda corto, reforzar el cacheo en backend. Si aparece una API nacional española unificada (p. ej. vía datos.gob.es o el nuevo sistema del MITECO), sustituir el mosaico autonómico. Antes de producción, **verificar los typeName de hotspots EFFIS vía GetCapabilities** y confirmar si el dataset JCyL trae geometría.

---

## Caveats
- Los typeName de hotspots de EFFIS (`ms:modis.hs`, `ms:viirs.hs`) están inferidos; el GetCapabilities devolvió errores intermitentes durante la investigación. Verificar antes de producción.
- La cobertura de estado operativo en España será parcial (sólo CyL y Catalunya con API abierta); el resto dependerá de FIRMS o scraping frágil de dashboards.
- fogos.pt está endureciendo el acceso a su API (registro obligatorio próximamente); planificar registro y fallback a ICNF.
- Las cámaras DGT no cubren País Vasco ni Cataluña y no son streams sino imágenes refrescadas.
- FIRMS/EFFIS detectan anomalías térmicas, no incendios confirmados: hay que comunicar claramente la diferencia en la UI para no alarmar.

---

## PROMPT DE DISEÑO PARA CLAUDE (listo para copiar)

```
Eres un diseñador de producto y UI senior especializado en herramientas de datos en tiempo real y dashboards de emergencias. Diseña la interfaz completa (no el código) de una web interactiva sin ánimo de lucro llamada [NOMBRE] para consultar incendios forestales activos en España y Portugal (Península Ibérica + Canarias, Baleares, Azores, Madeira, Ceuta y Melilla).

PRODUCTO
Herramienta pública, seria y gratuita que agrega datos de incendios de fuentes oficiales (NASA FIRMS para focos satelitales, EFFIS/Copernicus para perímetros de área quemada y riesgo meteorológico, fogos.pt/ICNF y servicios autonómicos para estado operativo). No es una app de marketing: es una herramienta de consulta de densidad informativa alta, tipo panel profesional de sala de emergencias, usable en desktop y móvil.

ESTRUCTURA DE PÁGINAS
1) Mapa principal (home): mapa a pantalla completa. Vista inicial = mundo con zoom automático centrado en la Península Ibérica, con España y Portugal (y sus islas) remarcados mediante un contorno/halo sutil y el resto del mundo atenuado (máscara oscura). Panel lateral izquierdo colapsable con filtros; panel derecho/inferior con lista de incendios y detalle al seleccionar uno. Barra superior con logo, buscador de lugar, selector de idioma (ES/PT/EN), toggle tema claro/oscuro y accesos a leyenda y "acerca de/fuentes".
2) Pestaña Noticias/Directos: rejilla con reproductor de canal 24 h en directo (embed YouTube RTVE Canal 24 Horas / RTP3), feed de noticias filtradas por incendios (tarjetas), acceso a cámaras de tráfico DGT y a cuentas oficiales (UME, 112, INFOCA, Proteção Civil).

FILTROS (panel lateral, agrupados y colapsables)
- Estado operativo: [España: Activo, Controlado, Estabilizado, Extinguido] [Portugal: Em Curso, Em Resolução, Em Conclusão, Vigilância].
- Nivel de gravedad (España): 0, 1, 2, 3.
- Superficie afectada (ha): control de rango con doble slider.
- Periodo: 24 h / 48 h / 72 h / 7 días + rango de fechas personalizado.
- Tipo: forestal / agrícola / urbano-forestal.
- Medios desplegados: aéreos / terrestres / bomberos.
- Fuente y sensor: NASA FIRMS (VIIRS / MODIS) / EFFIS / fuentes nacionales.
- Confianza del foco: baja / media / alta; y umbral FRP (MW).
- Riesgo meteorológico (FWI/IPIF): muy bajo → extremo.
- Territorio: Península / Canarias / Baleares / Azores / Madeira / Ceuta / Melilla; y por comunidad autónoma / distrito.

LEYENDA Y SIMBOLOGÍA DEL MAPA (debe ser explícita, siempre accesible)
- Incendio activo: marcador rojo saturado, sólido.
- Incendio controlado: marcador ámbar.
- Incendio estabilizado: marcador amarillo.
- Incendio extinguido: marcador gris/desaturado.
- Foco/hotspot satelital reciente: punto pequeño; codificar antigüedad (últimas 24 h más intenso, degradando con el tiempo) y tamaño según FRP. Diferenciar visualmente que es "detección satelital, no incendio confirmado".
- Perímetro de área quemada (EFFIS): polígono con relleno traslúcido y borde definido.
- Capa de riesgo FWI: overlay de coropletas en escala secuencial, activable, con opacidad ajustable.
- Clustering de focos a poco zoom, con recuento.

ESTADOS DE LA UI
Diseña: estado de carga (skeletons, no spinners genéricos), estado vacío (sin incendios en el filtro actual), estado de error de fuente (una fuente caída no debe romper el mapa: mostrar aviso discreto por capa), estado offline, panel de detalle de un incendio (nombre/municipio, estado, nivel, superficie, inicio, medios, meteo, fuente y timestamp de actualización, timeline de evolución), y tooltip al hover.

REQUISITOS DE DISEÑO (identidad propia, anti "AI slop") — OBLIGATORIO
- PROHIBIDO: gradientes púrpura/violeta genéricos, glow/luces de neón decorativas sin función, tipografía por defecto sin intención, ilustraciones abstractas 3D o "blobs", microcopy genérico tipo "Empower your data".
- Paleta con SIGNIFICADO SEMÁNTICO ligado a niveles de alerta y estados operativos (rojo=activo/peligro, ámbar=controlado, amarillo=estabilizado, gris=extinguido, azul/teal=informativo/UI neutra). El color nunca es decorativo: siempre codifica dato. Fondo de mapa oscuro y sobrio (modo por defecto oscuro, apto sala de control), con datos como elementos más brillantes.
- Tipografía funcional con jerarquía real: una familia sans humanista legible para UI (p. ej. Inter, IBM Plex Sans o similar) y cifras tabulares monoespaciadas para métricas (superficie, coordenadas, timestamps). Números grandes y legibles.
- Densidad de información tipo dashboard profesional: cabeceras con KPIs (nº de incendios activos, hectáreas totales, focos últimas 24 h), tablas ordenables, uso eficiente del espacio. Inspiración: consolas de meteorología/aviación, no landing de startup.
- Jerarquía visual clara: el mapa manda; los controles son cromáticamente contenidos para no competir con los datos. Contraste alto, cumplir WCAG AA. No depender sólo del color (añadir forma/icono/etiqueta para daltónicos).
- Microcopy específico, sobrio y útil, en español (con PT y EN): etiquetas precisas ("Actualizado hace 6 min", "Detección satelital VIIRS — no confirmada", "Fuente: EFFIS / Copernicus EMS"). Nada de lenguaje comercial.
- Iconografía consistente de una sola familia (line icons), coherente con contexto de emergencias.
- Pie o sección "Fuentes y licencias" con atribución a EFFIS (CC BY 4.0), NASA FIRMS (dominio público), fogos.pt, AEMET/IPMA, y disclaimer visible: "Esta web no sustituye a los canales oficiales de emergencia. En caso de emergencia, llame al 112."

ENTREGABLES DEL DISEÑO
1) Sistema de diseño: paleta con tokens y su significado semántico, escala tipográfica, spacing, componentes (botón, chip de filtro, tarjeta de incendio, marcador de mapa, leyenda, panel de detalle, KPI header).
2) Wireframes de: home/mapa (desktop y móvil), panel de filtros abierto, panel de detalle de incendio, pestaña noticias/directos, estados de carga/vacío/error.
3) Especificación de la leyenda y simbología del mapa.
4) Guía de microcopy con ejemplos reales en ES/PT/EN.
Entrega descripciones detalladas y, si puedes, mockups en HTML/CSS o Tailwind fieles a estas reglas. Prioriza claridad, seriedad y utilidad sobre espectáculo visual.
```

---

### Anexo — tabla de endpoints clave

| Fuente | Endpoint | Formato | Fiabilidad |
|---|---|---|---|
| NASA FIRMS (focos NRT) | `firms.modaps.eosdis.nasa.gov/api/area/csv/[KEY]/[SOURCE]/[BBOX]/[DAYS]` | CSV/KML | Oficial (dominio público) |
| EFFIS burnt areas | `maps.effis.emergency.copernicus.eu/effis` · typeName `ms:modis.ba.poly` | WFS GeoJSON/SHP | Oficial (CC BY 4.0) |
| EFFIS FWI | mismo servidor · layer `ecmwf007.fwi` | WMS raster/TIFF | Oficial |
| EFFIS hotspots | `ms:modis.hs` / `ms:viirs.hs` (inferidos) | WFS | Oficial, verificar typeName |
| Portugal activos | `api.fogos.pt/v2/incidents/active` | JSON | No oficial (VOST, datos ANEPC, refresco 2 min) |
| ICNF áreas ardidas | `sigservices.icnf.pt/server/rest/services/BDG/areas_ardidas/MapServer/0/query?f=geojson` | GeoJSON/JSON/PBF | Oficial |
| Castilla y León | `analisis.datosabiertos.jcyl.es/api/explore/v2.1/catalog/datasets/incendios-forestales/records` | JSON/GeoJSON/CSV | Oficial |
| Cataluña Bombers | `analisi.transparenciacatalunya.cat/resource/g2ay-3vnj.json` | JSON/GeoJSON/CSV | Oficial |
| Andalucía EMA/INFOCA | dashboard `laagencia.maps.arcgis.com/apps/dashboards/87a5fe2d…` | Dashboard (fuente X @Plan_INFOCA) | Oficial, REST no documentado |
| AEMET riesgo | `aemet.es/es/datos_abiertos/estadisticas/riesgo_incendios` · ALCIF `incendios.aemet.es` | GeoTIFF/CSV | Oficial |
| MITECO EGIF (histórico) | `servicio.mapa.gob.es/incendios` | XML/Excel | Oficial (estadística, no tiempo real) |