# Destacada de Instagram — «Fuentes de datos»

Guion y prompts para la destacada (highlight) que da a conocer y **acredita las
fuentes oficiales** de Incendib, y explica la lógica de **tres capas de precisión
creciente**: foco satelital → perímetro de área quemada → estado operativo oficial.

> Todos los nombres de fuente, licencias y frecuencias están tomados del repo:
> `src/lib/data/sources.ts` (catálogo canónico), `docs/DATA-SOURCES.md`,
> la sección «Fuentes de datos y licencias» del `README.md`, y los estados por
> fuente de `src/lib/data/index.ts` / `mock.ts`. No hay atribuciones inventadas.

---

## 0. Datos reales del repo (referencia de verificación)

### Las tres capas (lógica de precisión creciente — `DATA-SOURCES.md` §Details)

1. **Foco satelital** (NASA FIRMS · VIIRS/MODIS): la señal más **rápida** pero
   imprecisa (píxel de 375 m/1 km, falsos positivos). Latencia ~3 h. Detección
   térmica, **no** incendio confirmado.
2. **Perímetro de área quemada** (EFFIS/Copernicus): la **geometría real** del
   área quemada, mapeada por fotointérpretes y refinada con Sentinel-2 (~20 m),
   hasta 8 actualizaciones/día. Va con retardo respecto al frente activo.
3. **Estado operativo oficial** (fuentes nacionales/autonómicas): el dato humano
   que ningún satélite da — estado (activo/controlado/…), nivel de gravedad,
   medios desplegados.

### Catálogo de fuentes (exacto, de `sources.ts` + `README.md`)

| Fuente (label real) | Qué aporta | Licencia (exacta) | Frecuencia |
|---|---|---|---|
| **NASA FIRMS · VIIRS / MODIS** | focos térmicos satelitales | Dominio público (cita recomendada) | latencia ~3 h |
| **EFFIS / Copernicus EMS** | perímetros de área quemada + FWI | **CC BY 4.0** · © European Union | hasta 8×/día |
| **fogos.pt / ANEPC** (VOST Portugal) | estado operativo PT | Código Apache 2.0; datos ICNF/IPMA | refresco 2 min |
| **ICNF — áreas ardidas** | áreas ardidas PT (Sentinel-2 >10 ha) | Reutilización libre con atribución | — |
| **Castilla y León (JCyL / INFORCYL)** | estado operativo ES | Reutilización libre (Ley 37/2007) | 2×/día en campaña |
| **Bombers de la Generalitat (Catalunya)** | estado operativo ES | Reutilización libre | — |
| **INFOCA (Andalucía)** | estado operativo ES (Plan INFOCA) | Reutilización libre con mención | — |
| **AEMET / IPMA** | meteorología y riesgo (FWI/IPIF) | Reutilización libre con atribución | diaria |
| **Open-Meteo** | meteo local por incendio | sin clave | por ficha |
| **Cartografía base** | teselas del mapa | © **OpenStreetMap (ODbL)** vía **OpenFreeMap** | — |

**Texto de atribución agregada** (literal `FULL_ATTRIBUTION`, nombres propios, no
se traduce):
> European Forest Fire Information System — EFFIS (© European Union, 1995–2026),
> CC BY 4.0 · LANCE FIRMS, NASA EOSDIS (dominio público) · fogos.pt / VOST
> Portugal · ICNF · AEMET · IPMA · Cartografía base © OpenStreetMap (ODbL) /
> OpenFreeMap

### Transparencia en la app (pantalla Fuentes, `FuentesScreen.tsx`)

Cada fuente muestra su **estado de salud** con un punto de color + etiqueta:
- **OK** (punto verde `ok`) → hora del último dato.
- **degradada** (punto ámbar `state-controlado`) → aviso: p. ej. «Sin respuesta ·
  último dato 10:41».
- **caída** (punto gris `state-extinguido`) → etiqueta «caída».

Una fuente caída **no rompe el mapa**: se avisa de forma discreta por capa. Es un
argumento de la destacada (seriedad/transparencia).

**Disclaimer permanente** (nunca se oculta, `DISCLAIMER_112`):
> No sustituye a los canales oficiales de emergencia. Emergencias: **112**

**Marca:** rojo `#E5484D`, IBM Plex Sans (UI) / IBM Plex Mono (cifras y nombres
técnicos), tema oscuro «sala de control».

---

## 1. Guion de diapositivas (6)

Texto sobrio, en español. Vertical 1080×1920. Nombres de fuente y licencias
**exactos** como arriba.

### Portada (icono de la destacada)
**Fuentes de datos**
_(solo el glifo de satélite a línea fina; ver prompt §2)_

### Diapositiva 1 — La lógica de tres capas
**Tres capas, precisión creciente.**
Un foco satelital avisa rápido; un perímetro dibuja lo quemado; el estado oficial
confirma qué pasa sobre el terreno. Incendib las combina y las cita todas.

### Diapositiva 2 — Capa 1 · Satélite
**Focos térmicos: NASA FIRMS.**
Detección VIIRS/MODIS casi en tiempo real (~3 h). Es una señal térmica, **no un
incendio confirmado**. Dominio público.

### Diapositiva 3 — Capa 2 · Perímetros
**Área quemada: EFFIS / Copernicus.**
Perímetros mapeados por analistas y refinados con Sentinel-2 (~20 m), hasta 8
veces al día. © European Union — CC BY 4.0.

### Diapositiva 4 — Capa 3 · Estado operativo
**El dato oficial sobre el terreno.**
Portugal: fogos.pt / ANEPC e ICNF. España: INFORCYL (Castilla y León), INFOCA
(Andalucía) y Bombers de la Generalitat (Cataluña). Meteo: AEMET / IPMA.

### Diapositiva 5 — Transparencia
**Si una fuente falla, lo decimos.**
La pantalla «Fuentes» muestra el estado de cada origen —OK, degradada o caída— y
la hora del último dato. Una fuente caída nunca rompe el mapa.

### Diapositiva 6 — Créditos y aviso
**Datos abiertos, con atribución.**
EFFIS (© European Union, CC BY 4.0) · NASA FIRMS (dominio público) · fogos.pt /
ICNF · AEMET / IPMA · mapa © OpenStreetMap (ODbL) / OpenFreeMap.
_No sustituye a los canales oficiales. Emergencias: **112**._

> **Nota para rotular a mano (valores literales):** usa los `label` de `sources.ts`
> tal cual (p. ej. «NASA FIRMS · VIIRS / MODIS», «EFFIS / Copernicus EMS»,
> «fogos.pt / ANEPC», «Bombers de la Generalitat (Catalunya)»). No abrevies
> «Copernicus» ni cambies «CC BY 4.0» por otra cosa.

---

## 2. Prompt para Claude Design — PORTADA (icono de destacada)

> Copiar y pegar en Claude Design. **Mismo grosor de trazo que el resto del set
> de destacadas** (p. ej. la portada «Cómo funciona»), para consistencia.

```
Diseña el icono circular de una destacada de Instagram (highlight cover),
1080×1920 px con el motivo centrado en un círculo seguro de ~320 px (se verá a
~60–70 px de diámetro).

Estilo: icono de dashboard técnico / panel de sala de emergencias. NO landing,
NO ilustración.

- Fondo: negro puro #000000, plano, sin gradientes ni texturas ni viñeta.
- Motivo: UN ÚNICO glifo — un satélite visto de perfil, dibujado a LÍNEA: un
  cuerpo central pequeño con dos paneles solares rectangulares a los lados.
  Trazo fino y uniforme (~6–8 px, EL MISMO grosor que las demás portadas del
  set), esquinas limpias, sin relleno, sin sombras. Color del trazo: rojo
  #E5484D. Nada más dentro del glifo.
- Composición: el glifo perfectamente centrado, aire generoso alrededor,
  legible como silueta a tamaño de icono pequeño.

Prohibido (evitar "AI slop"): gradientes morados/azules, destellos, órbitas o
líneas de señal decorativas, luces de brillo, 3D, planetas o estrellas de fondo,
varios elementos, tipografía. Un solo trazo rojo sobre negro.
```

**Variante alternativa** (si el satélite queda recargado): mismo prompt cambiando
el motivo por **una antena parabólica a línea fina** (plato + soporte + punto
receptor), trazo rojo `#E5484D` sobre negro. Elegir la que quede más limpia a
~60 px.

---

## 3. Prompt para Claude Design — DIAPOSITIVAS (plantilla común)

> Opcional. Coherente con la web y con la destacada «Cómo funciona».

```
Diseña una plantilla de diapositiva vertical para Instagram Stories, 1080×1920 px,
con estética de panel de sala de control de emergencias (dark mode técnico),
coherente con incendib.es.

Sistema visual:
- Fondo: casi negro #0C1117, plano y mate. Sin gradientes, sin texturas.
- Rojo de marca para títulos y acentos: #E5484D.
- Texto principal claro #E8EDF2; secundario #9AAAB8; microcopy técnico mono.
- Tipografía: IBM Plex Sans para títulos y cuerpo; IBM Plex Mono para nombres de
  fuente, licencias y etiquetas técnicas (en su caja, tamaño menor).
- Retícula sobria: título grande arriba, una frase de cuerpo debajo, mucho aire.
- Etiqueta mono en esquina: "INCENDIB · FUENTES".

Para las diapositivas de CAPAS, incluir en cada una una pequeña "ficha de fuente"
en tipografía mono, alineada a la izquierda, con el nombre y la licencia EXACTOS:
  - Satélite:   "NASA FIRMS · VIIRS / MODIS — dominio público"
  - Perímetros: "EFFIS / Copernicus EMS — © European Union · CC BY 4.0"
  - Operativo:  "fogos.pt / ANEPC · ICNF · INFORCYL · INFOCA · Bombers · AEMET/IPMA"
Presentar las tres capas con una idea visual de apilado/superposición (satélite →
perímetro → estado), pero SIN dibujar un mapa realista: basta con formas
geométricas simples y sobrias (un punto, un polígono de contorno, una etiqueta).

La diapositiva de CRÉDITOS lista las atribuciones en mono, tamaño pequeño, alto
contraste, con la línea final destacada en rojo: "Emergencias: 112".

Prohibido (evitar "AI slop"): gradientes morado/azul, destellos, luces de brillo,
neón, 3D, stock, mapas realistas de fondo, tipografías por defecto
(Arial/Helvetica), fondos abstractos. Sobrio, técnico, alto contraste, legible en
móvil.
```

---

## Notas de uso

- **No alterar atribuciones ni licencias.** Son las que exige cada organismo;
  cámbialas solo si cambian en `sources.ts`.
- Recalca siempre que **detección satelital ≠ incendio confirmado** (capa 1) y el
  disclaimer **112**.
- La destacada es **oscura** (sala de control), consistente con «Cómo funciona» y
  con el resto del set: mismo fondo, mismo rojo, mismo grosor de trazo en portada.
- Si quieres una sola diapositiva de fuentes en vez de tres de capas, fusiona 2–4
  en una tabla mono de tres filas (una por capa) — pero pierdes el hilo narrativo
  de «precisión creciente».
