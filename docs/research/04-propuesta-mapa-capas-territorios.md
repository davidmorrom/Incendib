# Propuesta: capas del mapa, selección de provincia y Territorios

> Cubre las dos ideas explícitas del propietario (modo alternativo de capas y
> selección de provincias en el mapa) y la sección **Territorios** del proyecto
> de referencia, que las conecta.

---

## A. Modo alternativo de cambiar capas (idea del propietario)

### Situación actual

`src/components/map/MapControls.tsx` ofrece un botón que abre un panel con dos
conmutadores: **hotspots** y **perímetros**. Es funcional pero limitado: no
permite cambiar el **mapa base** ni gestionar el **overlay de riesgo FWI** con
opacidad.

### Propuesta

Ampliar el control de capas a un **panel de capas completo**, agrupado:

1. **Datos** (capas de dato, ya existen): Detecciones (hotspots) · Perímetros
   (EFFIS) · **Riesgo FWI/IPIF** (nuevo overlay raster con **slider de
   opacidad**).
2. **Mapa base** (nuevo): conmutar estilo entre
   - *Claro sobrio* (actual por defecto),
   - *Oscuro "sala de control"*,
   - *Satélite* (imágenes aéreas — ayuda a ubicar el terreno),
   - *Relieve* (terreno/hillshade, útil en zonas de montaña).
   MapLibre permite cambiar estilo con `map.setStyle()` conservando las capas de
   dato, o superponer un raster source.
3. Opcional: **modo "solo mapa"** (oculta paneles/leyenda para ver el mapa a
   pantalla completa) y control de leyenda.

### Consideraciones

- **Teselas gratuitas** (sin API key) según `DATA-SOURCES.md`: OpenFreeMap /
  Protomaps. Para satélite/relieve buscar fuente libre con atribución compatible
  (p. ej. teselas de relieve OSM-based); documentar licencia en `/fuentes`.
- El **cambio de estilo** no debe perder el estado de filtros ni las capas de
  dato: re-añadir sources/layers en el evento `style.load`.
- Respetar tokens: el color de la UI de control no compite con el dato.
- Persistir la preferencia (estilo base) en `useUIStore` como ya hacemos con
  tema y visibilidad de capas.
- Accesibilidad: los toggles ya usan `role="switch"`; el slider de opacidad debe
  ser accesible por teclado y con etiqueta.

### Esfuerzo

**S-M**. Ampliar `MapControls` + añadir estilos base + overlay FWI con opacidad.

---

## B. Selección de provincias en el mapa (idea del propietario)

### Objetivo

Permitir **clicar/tocar una provincia** en el mapa para:
- resaltarla y **hacer zoom** a su extensión,
- **filtrar** los datos a ese territorio,
- ofrecer un acceso directo a su **página de Territorio** (sección C).

### Implementación (MapLibre)

1. **Capa de límites**: añadir un source GeoJSON de **provincias ES + distritos
   PT** (fill transparente + line sutil). Fuentes candidatas: límites del IGN
   (España) y CAOP (Portugal); simplificar geometría (`mapshaper`) para peso web.
   Encaja con `npm run geo:gen`, que ya genera la máscara ES+PT.
2. **Interacción**: `map.on('click', 'provincias-fill', ...)` → leer
   `feature.properties` (código/nombre provincia), aplicar filtro territorial y
   `map.fitBounds(bbox)`.
3. **Hover/focus** (desktop): resaltar provincia bajo el cursor con
   `feature-state` (`setFeatureState`), sin recargar capas.
4. **Estado**: nuevo filtro `territory` en el store de filtros; la lista, KPIs y
   leyenda se recalculan filtrando por provincia/CCAA. Coherente con
   `FiltersSidebar`.
5. **Selector como alternativa accesible**: un `<select>`/combobox de
   CCAA→provincia (teclado, lectores de pantalla) equivalente al clic en el mapa
   (no depender solo de la interacción visual — WCAG).

### Detalle importante

- **Detección satelital ≠ incendio confirmado**: al filtrar por provincia, los
  contadores deben distinguir "detecciones" de "incendios en seguimiento".
- Nada de color decorativo: el resalte de provincia usa un tinte neutro de UI, no
  un color de estado (que codifica dato).

### Esfuerzo

**M**. Geodatos + interacción + estado de filtro territorial.

---

## C. Sección "Territorios" (páginas por CCAA / provincia / municipio)

Es la mayor ventaja de descubribilidad del proyecto de referencia: **miles de
páginas indexables** que responden a búsquedas como *"incendios en Cáceres"*.

### Estructura de rutas (propuesta)

- `/territorios` — índice: mapa-selector + listado de CCAA con nº de detecciones.
- `/territorios/[ccaa]` — p. ej. `/territorios/extremadura`.
- `/territorios/[ccaa]/[provincia]` — p. ej. `/territorios/extremadura/caceres`.
- (Fase posterior) `/territorios/[ccaa]/[provincia]/[municipio]` — solo
  municipios con actividad, como hacen ellos (no los 8.000 de España).

### Contenido por página de territorio

- Cabecera con nombre, jerarquía (migas) y **mini-mapa** centrado en el territorio.
- **KPIs del territorio**: detecciones 24 h/7 d, incidentes en seguimiento,
  superficie EFFIS, riesgo FWI actual.
- **Lista de incidentes/detecciones** del ámbito (reutiliza `ReportTable`).
- **Enlace al mapa** ya filtrado a ese territorio (conecta con B).
- **Histórico** breve del territorio (conecta con Estadísticas / `05-...`).
- Disclaimer 112 + atribución.

### Generación

- **SSG + ISR**: generar estáticamente CCAA y provincias (número acotado y
  estable); municipios bajo demanda (ISR) solo si tienen actividad.
- **`sitemap.xml`** dinámico con todas las páginas de territorio (clave SEO).
- Datos por territorio derivados de la misma capa `src/lib/data` filtrando por
  provincia/CCAA (bounding boxes o point-in-polygon con los límites de la
  sección B).

### Sinergia

Las secciones **A + B + C** se refuerzan: el usuario clica una provincia en el
mapa (B), salta a su página de Territorio (C), y desde ahí vuelve al mapa
filtrado con las capas que elija (A). Además, Territorios alimenta el **ranking**
de "Incendios hoy" y el **boletín semanal**.

### Esfuerzo

**L** (escalonable): CCAA (S-M) → provincias (M) → municipios (M) → sitemap (S).

---

## Orden sugerido dentro de este bloque

1. **A. Panel de capas ampliado** (victoria rápida, mejora percibida inmediata).
2. **B. Selección de provincia** (geodatos reutilizables por C).
3. **C. Territorios** (aprovecha los geodatos y filtros de B).
