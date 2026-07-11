# Radiografía de mapasdeincendios.es (proyecto de referencia)

> Proyecto hermano sin ánimo de lucro. Misión declarada: *"Facilitar el acceso a
> información pública sobre incendios forestales en España"*, consolidando
> detecciones satelitales, riesgo meteorológico, áreas quemadas e histórico en un
> único visor y explicando las limitaciones de cada fuente. Se declaran
> **independientes** (no afiliados a servicios de emergencia ni administraciones)
> y priorizan **transparencia y prudencia**: no publican conclusiones sin soporte
> y usan reglas técnicas trazables en lugar de declaraciones oficiales.

## Mapa de navegación

Menú principal: **Inicio · Mapa · Incendios hoy · Estadísticas · Territorios ·
Prensa · Noticias · Fuentes · Quiénes somos · Contacto**. Secundario: Privacidad,
Aviso Legal, Cookies, Citar, Metodología.

Comparten con nosotros las **mismas cuatro fuentes**: NASA FIRMS, AEMET,
Copernicus EFFIS y MITECO/EGIF. La diferencia está en **cómo empaquetan y
navegan** esos datos.

---

## 1. Mapa (visor cartográfico)

Cuatro capas presentadas **de forma independiente** (mismo principio de prudencia
que nosotros: no fusionar fuentes para "inventar" estados):

- **Detecciones satelitales (NASA FIRMS)** — puntos de calor recientes.
- **Riesgo meteorológico (AEMET)** — condiciones que favorecen incendios.
- **Áreas quemadas (Copernicus EFFIS)** — perímetros con superficie registrada.
- **Datos históricos (MITECO/EGIF)** — estadística administrativa por año/territorio.

Funcionalidades interactivas del visor:
- Selector territorial (comunidades y provincias) para saltar a un territorio.
- Enlaces a mapas específicos por incidente.
- Filtros temporales (24 h / 48 h).
- Comparativas históricas anuales.
- Búsqueda por localización geográfica.

> Nuestro mapa ya es **más rico** (filtros por estado operativo, nivel de
> gravedad, superficie, sensor, FWI; máscara ES+PT; clustering; leyenda hifi).
> Lo que ellos aportan de nuevo es la **navegación por territorio** integrada en
> el visor y los **saltos rápidos** a fichas de mapa por provincia.

## 2. Incendios hoy

Vista en tiempo casi real orientada a **ranking**:

- Cabecera con recuento: *"102 detecciones térmicas de las últimas 24 horas"* +
  nº de puntos en seguimiento (28).
- **Tabla-ranking provincial** ordenada por nº de detecciones FIRMS 24 h, con:
  provincia + comunidad, nº de detecciones, puntos en seguimiento asociados y
  **enlace directo al mapa** de cada localización. (Ej.: Almería 44, León 10,
  Cáceres 6.)
- Sección de **cobertura de noticias**: incidentes de las últimas 48 h con
  noticias vinculadas (por localidad).
- Disclaimer permanente: *"Las detecciones térmicas no equivalen a incendios
  confirmados"*.

> Nosotros tenemos una tabla densa en **Informe**, pero **ordenada por incendio**,
> no un **ranking por provincia**. Ese pivote territorial es lo interesante.

## 3. Estadísticas

Analítica histórica y de tendencia, con separación deliberada de fuentes
(EGIF consolidado vs. EFFIS perímetros vs. FIRMS detecciones):

- **Periodos**: histórico consolidado 2015-2021 (MITECO/EGIF) + avances
  provisionales 2022-2026; y observación reciente (24 h, 7 d, 30 d, 1 año).
- **Desglose geográfico**: 17 CCAA y 60+ provincias (ES y PT).
- **Gráficos**:
  1. *Incendios por año* y *Superficie afectada por año* (tendencia temporal).
  2. *Rankings*: top 10 CCAA y provincias por superficie quemada histórica.
  3. *Detecciones FIRMS por día* (actividad reciente).
  4. *Incidentes por gravedad* (clasificación por impacto).
  5. *Áreas EFFIS por provincia* (superficie quemada por Copernicus).

> Nosotros mostramos KPIs pero **no tenemos página de analítica con gráficos**.
> Ver [`05-propuesta-estadisticas.md`](./05-propuesta-estadisticas.md).

## 4. Territorios

Navegación jerárquica con **páginas dedicadas** (fuerte apuesta SEO):

- **17 comunidades autónomas** con página propia.
- **~70 provincias** con acceso individual.
- **~1.480 municipios** publicados (no todos los de España): solo los que
  cumplen criterio de *actividad FIRMS, incidentes, perímetros EFFIS o selección
  editorial inicial*.
- URLs tipo `/incendios/comunidad/[nombre]` y `/provincia/[nombre]`.
- Cada territorio muestra: **detecciones térmicas, incidentes en seguimiento,
  riesgo meteorológico y áreas quemadas** de ese ámbito.

> Es su mayor ventaja de **descubribilidad**: miles de páginas indexables que
> capturan búsquedas tipo *"incendios en [provincia]"*. Nosotros no tenemos
> páginas por territorio. Ver
> [`04-propuesta-mapa-capas-territorios.md`](./04-propuesta-mapa-capas-territorios.md).

## 5. Prensa (informe semanal) ⭐

La sección que más interesa al propietario. Publican un **informe semanal** de
incendios en España compilando las cuatro fuentes:

- **Periodo de análisis**: semana natural (lunes a domingo).
- **Datos principales del último informe**: detecciones FIRMS (1.991), puntos en
  seguimiento calculado (591), perímetros EFFIS 2026 (1.548), superficie afectada
  (63.410 ha).
- **Acceso**: **PDF descargable** de cada informe + visualización web directa +
  integración con el mapa interactivo.
- **Archivo histórico**: registros semanales anteriores con fecha de publicación y
  periodo analizado.
- Disclaimer: carácter informativo, no sustituye comunicados oficiales; 112.

> Nuestro "Informe" (2b) es un **informe de situación EN VIVO** (KPIs +
> tabla del momento), **no** un boletín semanal consolidado, archivable y
> descargable. Es una función nueva. Ver
> [`03-propuesta-informe-semanal.md`](./03-propuesta-informe-semanal.md).

## 6. Noticias

Agregación automática. Regla declarada: *"Las noticias se vinculan
automáticamente por coincidencia territorial, temporal y temática"*. Clasificación
por estado:

- **Confirmadas** (incendios verificados),
- **En seguimiento** (probables),
- **Relacionadas** (vinculadas territorialmente).

> Nosotros ya tenemos Noticias (3a) con embeds en vivo y panel de 3 columnas en
> desktop. Su aportación conceptual: **vincular cada noticia a un
> incidente/territorio** (coincidencia territorial+temporal+temática) y
> etiquetar por estado confirmado/seguimiento/relacionada.

## 7. Metodología

Página pública que explica el tratamiento de datos (transparencia):

- **Detección térmica**: FIRMS de la NASA, evaluando **FRP** (potencia radiativa)
  y **niveles de confianza**.
- **Contexto**: AEMET (meteo) y EFFIS (superficie), aclarando que *"son capas
  distintas y no se fusionan para inventar estados"*.
- **Priorización**: el visor ordena evidencias por *número y recencia de
  hotspots, FRP, confianza, presencia y superficie EFFIS y disponibilidad
  AEMET*.
- **Principio de prudencia**: *"Un hotspot aislado permanece como detección
  térmica sin confirmar. Solo una fuente autorizada podría marcar un incendio
  activo como confirmado."*
- No publican algoritmos concretos de clustering ni de estimación de área.

> Nosotros aplicamos el mismo principio en la UI, pero **no tenemos una página de
> metodología** que lo explique de forma consultable. Es barato y aumenta
> confianza/citabilidad.

## 8. Quiénes somos / Contacto / Citar

- **Quiénes somos**: misión, independencia, modelo sin ánimo de lucro, enfoque de
  prudencia y verificación de fuentes.
- **Contacto**: canal de contacto.
- **Citar**: instrucciones para citar la web (útil para prensa y académicos).

> Nosotros tenemos `/legal` (aviso legal + privacidad) pero no una página de
> **identidad/propósito** ni de **cómo citarnos**. Aporta confianza y facilita que
> medios nos referencien.

---

## Qué NO tienen (y nosotros sí)

- **Alertas Web Push** con ajustes por territorio/estado.
- **Estado operativo real multi-fuente** en España (JCyL, Bombers Catalunya,
  INFOCA) además de PT (fogos.pt/ICNF): ellos son predominantemente
  satélite+EFFIS+AEMET.
- **Ficha de incendio** rica (timeline de evolución, medios desglosados, meteo
  local, minimapa de perímetro).
- **PWA instalable + modo offline**.
- **Sistema de diseño hifi** con modo claro/oscuro "sala de control", tipografía
  mono para cifras, accesibilidad WCAG AA.

Conclusión: los dos proyectos son **complementarios**. Ellos brillan en
**cobertura editorial y navegación territorial** (informe semanal, territorios,
estadística histórica, SEO); nosotros en **tiempo real operativo, profundidad por
incidente, alertas y experiencia de producto**. Tomar prestadas sus mejores
piezas nos completa sin renunciar a nuestras fortalezas.
