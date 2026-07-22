# Publicaciones de LinkedIn — listas para publicar

> Seis publicaciones sobre Incendib, una por [pilar de contenido](02-linkedin-playbook.md#4-pilares-de-contenido-ángulos).
> Cada texto se ha **verificado contra el repositorio** (fuentes, licencias,
> funciones y fechas): sin cifras inventadas, sin presentar focos como incendios
> confirmados, con el disclaimer 112 donde corresponde.
>
> **Uso:** copia el bloque de texto tal cual. El enlace `incendib.es` va en el
> cuerpo; si prefieres cuidar el alcance, ponlo en el **primer comentario** y
> deja «enlace en comentarios» en el post. Firma: cuenta personal de David
> Moreno Romero.

## Orden de publicación recomendado

1. **Lanzamiento** — fija el marco (qué es, quién, para quién). El primero.
2. **Honestidad del dato** — el mensaje más diferenciador y protector de marca.
3. **Producto / cómo funciona** — convierte el interés en uso.
4. **Transparencia de datos** — profundiza para la audiencia de datos/GIS.
5. **Making-of** — credibilidad de ejecución, para la comunidad técnica.
6. **Misión / servicio público** — cierre cívico.

> Ritmo: 2-3 por semana, **nunca dos días seguidos**. Ver
> [calendario](02-linkedin-playbook.md#6-calendario-editorial-sugerido-2-semanas).
> **Pausa la cola si hay un incendio grave activo:** publicar en ese momento sería
> oportunista.

---

## 1 · Lanzamiento (fundador) ✅ verificado

**Gancho:** «He construido y lanzado Incendib…»
**Imagen sugerida:** captura del mapa en vivo (modo claro): la Península con la
máscara del mundo recortada sobre España y Portugal, marcadores por color y
forma (círculo activo, rombo controlado, cuadrado estabilizado, anillo
extinguido) y la leyenda visible. Sobrio, tipo panel; sin humo ni fuego de
*stock*. Alternativa: par claro/oscuro lado a lado.

```
He construido y lanzado Incendib: un mapa público de los incendios forestales activos en España y Portugal.

Lo empecé el 10 de julio. La idea era sencilla: reunir en un solo sitio lo que hoy está repartido entre muchas fuentes, y presentarlo de forma que se lea de un vistazo.

Incendib junta datos oficiales donde los hay (INFORCYL en Castilla y León, INFOCA en Andalucía, Bombers de la Generalitat en Cataluña, ANEPC/SGIFR en Portugal), perímetros de área quemada de EFFIS/Copernicus y focos térmicos de NASA FIRMS. Cada fuente lleva su atribución y su estado de salud; si una falla, el mapa sigue funcionando.

Dos principios que no negocio:

— El color siempre codifica un dato, nunca decora. Los marcadores se distinguen por color y forma, para que se lean también con daltonismo.

— Detección satelital no es incendio confirmado. Un foco de FIRMS es una señal por confirmar, y así se comunica siempre.

Es para cualquiera: quien vive cerca del monte, quien informa, quien trabaja en emergencias. Público y sin ánimo de lucro. Por eso es gratis.

Se puede probar en incendib.es. Funciona en el móvil, sin instalar nada.

No sustituye a los canales oficiales de emergencia. Emergencias: 112.

#IncendiosForestales #DatosAbiertos #Copernicus #TecnologíaCívica #ProtecciónCivil
```

---

## 2 · Honestidad del dato ✅ verificado

**Gancho:** «Un punto naranja en el mapa no es un incendio.»
**Imagen sugerida:** captura del estado vacío en modo claro con el mensaje «Sin
incendios activos en tu zona», junto a una mini-leyenda de marcadores (color +
forma) y la etiqueta «detección satelital ≠ incendio confirmado». Comunica los
tres principios sin dramatizar.

```
Un punto naranja en el mapa no es un incendio. Es una señal por confirmar.

En Incendib esa distinción es una regla, no un matiz. Un foco térmico de NASA FIRMS (VIIRS/MODIS) llega rápido, con unas tres horas de latencia, pero es una detección por verificar. Presentarlo como incendio confirmado sería mentir con la interfaz. Por eso lo decimos siempre: detección satelital ≠ incendio confirmado.

Tres decisiones sostienen ese principio:

— El color codifica un dato, nunca decora. Los marcadores se distinguen por color y forma, para que se lean también con daltonismo.

— Vacío = buena noticia. Si no hay incendios en tu zona, el mensaje es «Sin incendios activos en tu zona», no una pantalla de error.

— Mejor «sin dato» que una cifra falsa. La superficie es oficial donde la hay y una estimación marcada donde no; si una fuente falla, se dice y el mapa no se rompe.

Diseñar información en una emergencia es, sobre todo, no hacer daño: no alarmar, no inventar, no adornar.

Incendib es un proyecto público y sin ánimo de lucro. Puedes verlo en incendib.es.

No sustituye a los canales oficiales de emergencia. Emergencias: 112.

#DatosAbiertos #IncendiosForestales #TecnologíaCívica #DiseñoDeInformación #ProtecciónCivil
```

---

## 3 · Producto / cómo funciona ✅ verificado

**Gancho:** «En plena campaña de incendios, la información llega a trozos…»
**Imagen sugerida:** *collage* sobrio de 4 capturas reales en modo claro: (1) el
mapa con marcadores color+forma y el selector de mapa base; (2) una ficha
`/f/{slug}` con su bloque de meteo local y evolución; (3) el informe con la fila
de KPIs y la tabla ordenable; (4) la pantalla Fuentes con los puntos de estado
(OK/degradada/caída). Alternativa: una sola captura del mapa a pantalla completa
con la leyenda visible.

```
En plena campaña de incendios, la información llega a trozos: un titular aquí, un aviso allá.

Incendib la ordena en un solo sitio. Un recorrido rápido:

Mapa en vivo. Cada marcador es un incendio en España o Portugal, con el estado codificado por color y forma (legible también con daltonismo). Abre mostrando solo incendios confirmados; los focos térmicos de satélite (NASA FIRMS) son una capa opcional, siempre marcada como detección sin confirmar. Un foco no es un incendio.

Ficha por incendio. Cada uno tiene su URL compartible, con meteo local, medios desplegados y evolución. Envías el enlace y muestra el estado actual.

Informe de situación. KPIs —activos, hectáreas, focos 24 h y nivel máximo—, filtro por país y una tabla ordenable.

Alertas por zona. Avisos por Web Push según tu área, con silencio configurable; las de evacuación siempre suenan.

Fuentes. Cada origen muestra su estado —OK, degradada o caída— y la hora del último dato. Si una falla, el mapa no se rompe.

Público y sin ánimo de lucro: incendib.es

No sustituye a los canales oficiales de emergencia. Emergencias: 112.

#IncendiosForestales #DatosAbiertos #Copernicus #TecnologíaCívica #ProtecciónCivil
```

---

## 4 · Transparencia de datos ✅ verificado

**Gancho:** «Un foco térmico detectado por satélite no es un incendio confirmado.»
**Imagen sugerida:** diagrama sobrio de las tres capas apiladas (modo oscuro
«sala de control»): (1) punto naranja «foco satelital · sin confirmar», (2)
polígono de contorno traslúcido «perímetro EFFIS», (3) ficha de estado operativo.
Alternativa: captura real de la pantalla «Fuentes» con el estado de cada origen y
la fila de atribución al pie.

> ⚠ **Antes de publicar (precisión para audiencia GIS/Copernicus):** en la capa 3,
> la fuente **primaria** de estado operativo en Portugal es **ANEPC / SGIFR**;
> **ICNF** aporta sobre todo *áreas ardidas* (más cercano a la capa 2). Si quieres
> máxima exactitud, deja la capa 3 de Portugal solo con «ANEPC / SGIFR». El texto
> de abajo es correcto en conjunto, pero esta audiencia hila fino.

```
Un foco térmico detectado por satélite no es un incendio confirmado. Confundirlos es un problema de credibilidad, y de seguridad.

En Incendib lo resuelvo con tres capas de precisión creciente, y cada una cita su fuente:

1. Foco satelital — NASA FIRMS (VIIRS / MODIS). La señal más rápida (~3 h de latencia), pero imprecisa: un píxel térmico por confirmar. Dominio público. Nunca lo presento como incendio.

2. Perímetro de área quemada — EFFIS / Copernicus EMS. Geometría real, mapeada por analistas y refinada con Sentinel-2 (~20 m), hasta 8 actualizaciones al día. CC BY 4.0, © European Union.

3. Estado operativo oficial — el dato humano que ningún satélite da: ANEPC / SGIFR en Portugal; INFORCYL (Castilla y León), INFOCA (Andalucía) y Bombers de la Generalitat (Cataluña) en España.

Cartografía base © OpenStreetMap (ODbL) vía OpenFreeMap.

Transparencia hasta el final: la pantalla de Fuentes muestra el estado de cada origen (OK, degradada o caída) y la hora del último dato. Si una fuente falla, lo digo, y el mapa no se rompe.

Proyecto público y sin ánimo de lucro: incendib.es

No sustituye a los canales oficiales de emergencia. Emergencias: 112.

#DatosAbiertos #Copernicus #EFFIS #GIS #TecnologíaCívica #NASAFIRMS
```

---

## 5 · Making-of (developer) ✅ verificado

**Gancho:** «El color en Incendib nunca decora: siempre codifica un dato.»
**Imagen sugerida:** composición lado a lado del mapa en modo claro y oscuro
«sala de control» con la leyenda visible (color + forma de cada estado), junto a
una franja con el informe de Lighthouse marcando 100 en Accesibilidad.
Alternativa: captura limpia de la leyenda de marcadores.

```
El color en Incendib nunca decora: siempre codifica un dato.

Empecé este visor de incendios activos en España y Portugal el 10 de julio, en solitario, y esa regla marcó casi todo el diseño. Los marcadores se distinguen por color y forma (círculo, rombo, cuadrado, anillo), así que se leen también con daltonismo. Sobrio, tipo panel de control, deliberadamente lejos del "AI slop".

El stack: Next.js (App Router) + TypeScript, MapLibre GL JS para el mapa vectorial, Zustand para el estado, un Service Worker propio para offline y Web Push, y Upstash Redis + QStash para las alertas por zona. Desplegado en Vercel.

Lo que más cuidé no se ve en una captura: accesibilidad WCAG 2.2 AA (Lighthouse Accessibility 100), i18n en ES/PT/EN y 282 tests. Y un principio innegociable: una detección satelital no es un incendio confirmado, y la interfaz lo dice siempre.

Es público y sin ánimo de lucro. Se puede probar en incendib.es.

No sustituye a los canales oficiales de emergencia. Emergencias: 112.

#DesarrolloWeb #Accesibilidad #NextJs #MapLibre #DatosAbiertos #TecnologíaCívica
```

---

## 6 · Misión / servicio público ✅ verificado

**Gancho:** «En plena campaña de incendios, la información está dispersa…»
**Imagen sugerida:** captura del mapa en modo claro con España y Portugal
recortados sobre la máscara del mundo y marcadores por color y forma; o el panel
de Fuentes con el estado de salud de cada fuente y la hora del último dato.

```
En plena campaña de incendios, la información está dispersa: cada región publica por su lado y España y Portugal casi nunca caben en el mismo mapa.

Por eso he construido Incendib: un visor web público y sin ánimo de lucro de incendios forestales activos en España y Portugal. Gratuito y pensado para el móvil.

La regla es la transparencia. Cada fuente va citada y con su estado (al día, degradada o caída); si una falla, se dice, y el mapa sigue en pie. Los datos vienen de fuentes oficiales y satelitales: NASA FIRMS, EFFIS/Copernicus, ANEPC/SGIFR en Portugal, INFORCYL, INFOCA y Bombers de la Generalitat.

Un principio que no se negocia: una detección satelital no es un incendio confirmado. Se comunica siempre. Y si no hay incendios en tu zona, eso es una buena noticia, no un error.

Incendib es un complemento informativo. No sustituye a los canales oficiales de emergencia. Emergencias: 112.

Público, sin ánimo de lucro, con los datos citados uno a uno. En incendib.es

#IncendiosForestales #ServicioPúblico #DatosAbiertos #ProtecciónCivil #Copernicus #EspañaPortugal
```

---

## Riesgos a vigilar (del control de calidad)

- **Saturación:** seis posts muy próximos sobre el mismo proyecto se leen como
  autopromoción. Máximo 2-3/semana; nunca días consecutivos.
- **Solapamiento de mensaje:** «Lanzamiento», «Misión» y «Honestidad del dato»
  comparten mucho ADN. No publiques dos de esos tres la misma semana.
- **Cobertura:** ningún post debe insinuar cobertura oficial total de España
  (solo Castilla y León, Andalucía y Cataluña en vivo; el resto, solo FIRMS) ni
  mencionar islas (fuera del área satelital por ahora).
- **El 112 también en comentarios:** al responder en comentarios o DMs, mantén el
  reflejo — nunca des a entender que Incendib sustituye a emergencias.
- **Nada de métricas inventadas:** cuando llegue tráfico, no anuncies «X visitas»
  ni «Y incendios» sin un dato verificable y publicable.
- **Fecha «10 de julio»:** correcta ahora (2026). Añade el año si reciclas el
  texto meses después.
- **Base satélite EOX:** su licencia es CC BY-NC-SA (solo no comercial). Coherente
  con «sin ánimo de lucro», pero no la presentes como de libre uso comercial.
