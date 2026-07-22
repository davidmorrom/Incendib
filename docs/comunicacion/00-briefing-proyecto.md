# Briefing de proyecto — Incendib

> **Para qué sirve este documento.** Es el **contexto maestro** que se pega en
> Claude (chat) para que redacte publicaciones y documentación sobre Incendib
> sin inventarse nada. Contiene qué es el proyecto, para quién, cómo funciona,
> de dónde salen los datos y qué se puede y no se puede decir. Todo lo que hay
> aquí está **verificado contra el repositorio** (código, `CHANGELOG.md`,
> `docs/DATA-SOURCES.md`, `docs/ARCHITECTURE.md`, `docs/HANDOFF.md`).
>
> Regla de oro para quien redacte: **mejor «sin dato» que una cifra falsa.** Si
> algo no está en este documento (o en el [banco de datos](04-banco-de-datos.md)),
> no se afirma.

---

## 1. Identidad

| Campo | Valor |
|---|---|
| **Nombre** | Incendib |
| **Web** | `incendib.es` |
| **Contacto** | `contacto@incendib.es` |
| **Autor y propietario** | David Moreno Romero |
| **Créditos** | © 2026 David Moreno Romero |
| **Naturaleza** | Proyecto web **público** y **sin ánimo de lucro** |
| **Ámbito** | Incendios forestales **activos** en **España y Portugal** (Península; las islas quedan por ahora fuera del área de cobertura satelital) |
| **Formato** | Aplicación web **PWA**, *mobile-first*. **No** se instala desde tiendas de apps |

**Una frase (elevator pitch):** Incendib es un visor web público y gratuito que
reúne en un solo mapa los incendios forestales activos de España y Portugal,
combinando datos oficiales y satelitales con una regla estricta: informar sin
alarmar.

> **Nota sobre el nombre.** El proyecto se llamó «Iberfuego» durante el diseño
> inicial; se renombró a **Incendib** porque el nombre anterior era una marca
> registrada en España. En comunicación se usa **siempre Incendib**. No hace
> falta contar el rebranding salvo que el ángulo lo pida.

---

## 2. Qué problema resuelve

Durante una campaña de incendios, la información está **fragmentada**: cada
comunidad autónoma, cada agencia y cada país publica por su lado, con formatos y
criterios distintos; los satélites detectan focos que no siempre son incendios;
y los medios generalistas mezclan titulares con datos. No existe una API
nacional española unificada de incendios activos.

Incendib **agrega** esas fuentes en un único mapa y las **presenta con honestidad**:
distingue lo confirmado de lo detectado, cita cada fuente, marca cuándo un dato
es una estimación y nunca sustituye a los canales oficiales de emergencia.

---

## 3. Principios innegociables (el alma del proyecto)

Estos principios son el mejor material narrativo. Son argumentos, no adornos.

1. **El color codifica un dato, nunca decora.** Los marcadores se distinguen por
   **color + forma** para que se lean con daltonismo y con poca luz.
2. **Detección satelital ≠ incendio confirmado.** Un foco térmico (NASA FIRMS) es
   una señal *por confirmar*, no un incendio. Se comunica **siempre**. *Nunca* se
   presenta un foco como incendio confirmado.
3. **Vacío = buena noticia.** Si no hay incendios, el mensaje es «Sin incendios
   activos en tu zona», nunca en tono de error o alarma.
4. **El 112 manda.** Disclaimer permanente y literal: *«No sustituye a los canales
   oficiales de emergencia. Emergencias: 112.»*
5. **Datos abiertos, con atribución.** Cada fuente se cita con su licencia. Si una
   fuente falla, se dice (estado de salud por fuente).
6. **Sobriedad.** Copy específico y útil, sin lenguaje comercial ni *hype*. Sin
   emojis en la interfaz. Diseño deliberadamente anti «AI slop».
7. **Mejor «sin dato» que una cifra falsa.** La superficie se muestra oficial
   donde la hay; si es una estimación satelital se marca con «~»; si no hay
   ninguna, «sin dato».

---

## 4. Cómo funciona (recorrido de producto)

- **Mapa en vivo (home).** MapLibre GL con teselas de OpenFreeMap (sin API key).
  El mundo aparece atenuado con España y Portugal recortados y con un halo de
  contorno. **Selector de mapa base** (claro / satélite / relieve / oscuro).
  **Agrupación (clustering)** de marcadores próximos. **Perímetros de área
  quemada** (EFFIS). Los **focos satelitales** son una **capa opcional** (densidad
  suave tipo *heatmap*): el mapa **abre mostrando solo incendios confirmados**.
- **Marcadores por color + forma:** activo = círculo con halo (pulsa si el nivel
  es ≥ 2); controlado = rombo; estabilizado = cuadrado; extinguido = anillo; foco
  satelital = punto naranja (sin confirmar).
- **Informe de situación.** KPIs (incendios activos, hectáreas afectadas, focos de
  24 h, nivel máximo), filtros por país (Todos / España / Portugal) y **tabla
  ordenable y accesible**.
- **Ficha por incendio.** URL propia y **compartible** (`/f/{slug}`) que muestra
  siempre el estado actual; imagen para redes (OG) generada en servidor con el
  estado y la hora estampados; **meteo local** por incendio (Open-Meteo), medios
  desplegados y evolución.
- **Noticias y directos.** Feed de RSS de Google News (ES + PT) filtrado.
- **Fuentes y licencias.** Cada fuente muestra su **estado de salud** (OK /
  degradada / caída) y la hora del último dato. **Una fuente caída no rompe el
  mapa.**
- **Alertas Web Push** por zona y tipo, con silencio configurable (las alertas de
  **evacuación siempre suenan**). Enfoque *privacy-first*.
- **Más pantallas:** histórico de campaña; boletines + boletín semanal;
  estadísticas (serie histórica oficial EGIF/MITECO); páginas por provincia;
  `/incendios-hoy`; Acerca / Metodología.
- **Transversal:** PWA (iconos, atajos, funcionamiento *offline* con caché y
  antigüedad visible), **i18n ES/PT/EN**, SEO (`sitemap.xml` + `robots.txt`),
  **282 tests**, accesibilidad **WCAG 2.2 AA** (Lighthouse Accessibility 100).

---

## 5. De dónde salen los datos (arquitectura de tres capas)

Incendib combina tres capas de **precisión creciente**. Este es el argumento
técnico más sólido del proyecto:

1. **Foco satelital (rápido, impreciso).** NASA FIRMS (sensores VIIRS/MODIS).
   Latencia ~3 h. Es una **detección térmica, no un incendio confirmado**.
2. **Perímetro de área quemada (geometría real, con retardo).** EFFIS/Copernicus,
   mapeado por analistas y refinado con Sentinel-2 (~20 m), hasta 8
   actualizaciones al día.
3. **Estado operativo oficial (el dato humano).** El estado (activo, controlado…),
   el nivel de gravedad y los medios desplegados que ningún satélite da.

**Fuentes y licencias exactas** (no cambiar los nombres ni las licencias):

| Fuente | Aporta | Licencia |
|---|---|---|
| **NASA FIRMS · VIIRS / MODIS** | focos térmicos satelitales (~3 h) | Dominio público (cita recomendada) |
| **EFFIS / Copernicus EMS** | perímetros de área quemada + FWI | **CC BY 4.0** · © European Union |
| **ANEPC / SGIFR** (PT, oficial) | estado operativo PT | Reutilización con atribución (prociv.gov.pt) |
| **fogos.pt** (VOST Portugal) | estado operativo PT (respaldo, refresco 2 min) | Código Apache 2.0; datos ICNF/IPMA |
| **ICNF** | áreas ardidas PT | Reutilización libre con atribución |
| **INFORCYL (JCyL, Castilla y León)** | estado operativo ES + superficie oficial | Reutilización libre (Ley 37/2007) |
| **INFOCA (Andalucía)** | estado operativo ES | Reutilización libre con mención |
| **Bombers de la Generalitat (Catalunya)** | estado operativo ES | Reutilización libre |
| **AEMET / IPMA** | meteorología y riesgo | Reutilización libre con atribución |
| **Open-Meteo** | meteo local por incendio | sin clave |
| **EGIF / MITECO** | estadística histórica oficial | Oficial (no en tiempo real) |
| **Cartografía base** | teselas del mapa | © OpenStreetMap (ODbL) / OpenFreeMap; satélite EOX Sentinel-2 cloudless (CC BY-NC-SA, solo no comercial); relieve EOX Terrain Light |

> Resto de España en vivo: solo cobertura FIRMS (satelital). Las CCAA con API
> abierta integradas son Castilla y León, Andalucía y Cataluña.

---

## 6. Tecnología (para el ángulo *making-of*)

- **Next.js (App Router) + TypeScript**, desplegado en **Vercel**.
- **MapLibre GL JS** + `react-map-gl` (mapa vectorial sin API key).
- **Tailwind CSS** con tokens semánticos sobre variables CSS (theming en runtime).
- **Zustand** (estado), **Service Worker** propio (offline + Web Push),
  **web-push** (VAPID), **Upstash Redis** + QStash (alertas), **supercluster**
  (clustering del mapa).
- **i18n** ES/PT/EN con diccionarios propios.
- Diseño de sistema: el color siempre codifica dato; marcadores por color+forma;
  tipografía IBM Plex Sans (UI) e IBM Plex Mono (cifras, timestamps, coordenadas).

---

## 7. Hitos (fechas absolutas)

- **10 de julio de 2026** — arranca el desarrollo (v0.1.0: andamiaje Next.js,
  sistema de diseño, i18n, PWA).
- **10 de julio de 2026** — rebranding a **Incendib** (dominio `incendib.es`).
- **22 de julio de 2026** — versión **v0.36.1**: todas las pantallas
  implementadas, **datos en vivo en producción**, PWA, Web Push, i18n ES/PT/EN,
  282 tests, accesibilidad AA.

> **No inventar.** No hay métricas públicas de tráfico ni de usuarios. No se
> afirma número histórico de incendios detectados, ni cuota, ni comparativas con
> otros servicios. Si se necesita una cifra que no esté aquí, se omite.

---

## 8. Audiencias

- **Ciudadanía** en zonas de riesgo (uso práctico durante la campaña).
- **Periodistas y medios** (fuente rápida y citable, con atribución).
- **Profesionales** de emergencias, protección civil y gestión forestal.
- **Comunidad de datos abiertos, Copernicus y SIG/GIS**.
- **Desarrolladores y diseñadores** de producto (ángulo *making-of*).
- **ONG y administraciones**.

---

## 9. Qué **no** decir (líneas rojas)

- ❌ Presentar un foco satelital como «incendio confirmado».
- ❌ Sugerir que sustituye al 112 o a los canales oficiales.
- ❌ Inventar cifras (usuarios, tráfico, incendios detectados, plazos exagerados).
- ❌ Atribuir un dato a la fuente equivocada (p. ej. «FIRMS da perímetros» o
  «EFFIS da el estado operativo»).
- ❌ Citar mal una licencia (EFFIS = CC BY 4.0; FIRMS = dominio público; base =
  OpenStreetMap ODbL / OpenFreeMap).
- ❌ Decir que se instala desde una tienda de apps (es una PWA).
- ❌ Afirmar cobertura de islas (por ahora fuera del área satelital).
- ❌ Lenguaje comercial, *hype* o promesas («revolucionario», «el mejor»,
  «disruptivo»…).
- ❌ Ristras de emojis o tono de alarma.

---

## 10. Documentos hermanos de este kit

- [`01-guia-de-voz.md`](01-guia-de-voz.md) — tono, estilo y reglas de redacción.
- [`02-linkedin-playbook.md`](02-linkedin-playbook.md) — cómo publicar en LinkedIn
  (formatos, estructura, hashtags, plantillas, calendario).
- [`03-linkedin-publicaciones.md`](03-linkedin-publicaciones.md) — publicaciones
  listas para publicar (varios ángulos, verificadas).
- [`04-banco-de-datos.md`](04-banco-de-datos.md) — cifras, textos literales,
  glosario y FAQ para citar sin error.
