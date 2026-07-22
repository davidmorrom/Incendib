# Banco de datos — Incendib

> Cifras, textos literales, nombres, glosario y FAQ para **citar sin inventar**.
> Si un dato no está aquí ni en el [briefing](00-briefing-proyecto.md), **no se
> publica**. Verificado contra el repositorio (jul 2026, v0.36.1).

---

## 1. Textos literales (copiar tal cual)

**Disclaimer 112** (nunca alterar):
> No sustituye a los canales oficiales de emergencia. Emergencias: 112.

**Estado vacío** (tono positivo):
> Sin incendios activos en tu zona.

**Aviso satelital** (siempre junto a focos FIRMS):
> Detección satelital — no confirmada.

**Atribución agregada** (`FULL_ATTRIBUTION`, nombres propios, no traducir):
> European Forest Fire Information System — EFFIS (© European Union, 1995–2026),
> CC BY 4.0 · LANCE FIRMS, NASA EOSDIS (dominio público) · fogos.pt / VOST
> Portugal · ICNF · AEMET · IPMA · Cartografía base © OpenStreetMap (ODbL) /
> OpenFreeMap

**Créditos:** © 2026 David Moreno Romero · `incendib.es` · `contacto@incendib.es`

---

## 2. Cifras verificables

| Dato | Valor | Nota |
|---|---|---|
| Versión actual | **v0.36.1** | 22 jul 2026 |
| Inicio del desarrollo | **10 jul 2026** | v0.1.0 |
| Tests | **282** | unitarios (Vitest) |
| Accesibilidad | **WCAG 2.2 AA** · Lighthouse Accessibility **100** | |
| Idiomas | **3** (ES / PT / EN) | |
| Latencia focos FIRMS | **~3 h** | detección satelital |
| Refinado de perímetros EFFIS | Sentinel-2 **~20 m**, hasta **8×/día** | |
| Refresco fogos.pt (respaldo PT) | **cada 2 min** | |
| Países cubiertos | **2** (España y Portugal, Península) | islas fuera de cobertura por ahora |
| CCAA con estado operativo en vivo | **3** (Castilla y León, Andalucía, Cataluña) | resto: solo FIRMS |

> **Prohibido inventar:** nº de usuarios, visitas, incendios detectados
> históricos, descargas, ranking o comparativas. **No existen datos públicos** de
> eso. Si hace falta una cifra que no está en esta tabla, se omite.

---

## 3. Nombres y licencias exactos

| Escribir así | No escribir |
|---|---|
| Incendib | IncendiB, Incendib.es (en cuerpo) |
| NASA FIRMS · VIIRS / MODIS | Nasa Firms, FIRM |
| EFFIS / Copernicus EMS | Effis, Copérnico |
| CC BY 4.0 | CC-BY, Creative Commons genérico |
| © European Union | © UE, © Europa |
| Sentinel-2 | Sentinel 2, Sentinel2 |
| fogos.pt / ANEPC | Fogos, ANPC |
| INFORCYL | Inforcyl, INFOCyL |
| INFOCA | Infoca, Plan Infoca (salvo referirse al plan) |
| Bombers de la Generalitat | Bomberos de Cataluña (usar nombre propio) |
| OpenStreetMap (ODbL) / OpenFreeMap | Open Street Map, OSM a secas en atribución |
| AEMET / IPMA | Aemet |

---

## 4. Glosario (para explicar sin tecnicismos vacíos)

- **Foco / hotspot:** anomalía térmica detectada por satélite. **No** es un
  incendio confirmado; puede ser una quema agrícola o industria.
- **VIIRS / MODIS:** sensores de los satélites que usa NASA FIRMS.
- **Perímetro de área quemada:** contorno de lo ya quemado, mapeado por analistas
  (EFFIS) y refinado con imágenes de Sentinel-2.
- **FWI (Fire Weather Index):** índice meteorológico de peligro de incendio.
- **Estado operativo:** activo / controlado / estabilizado / extinguido (ES); *em
  curso / em resolução / em conclusão / vigilância* (PT).
- **Nivel de gravedad (España):** 0, 1, 2, 3 (según la Directriz Básica; el 3 es
  emergencia de interés nacional).
- **PWA:** aplicación web que se comporta como app (offline, atajos) **sin pasar
  por tiendas**.
- **Color + forma:** cada estado tiene un color **y** una forma distinta, para que
  se lea con daltonismo.

---

## 5. FAQ (respuestas verificadas para posts, comentarios o notas)

**¿Es oficial?**
No. Incendib es un proyecto independiente, público y sin ánimo de lucro, que
**agrega** fuentes oficiales y satelitales y las **cita**. No sustituye a los
canales oficiales de emergencia; en caso de emergencia, 112.

**¿Los datos son en tiempo real?**
Casi. Los focos satelitales (FIRMS) llegan con ~3 h de latencia; los perímetros
(EFFIS) se actualizan hasta 8 veces al día; el estado operativo depende de cada
fuente. Cada pantalla muestra la antigüedad del dato.

**¿Cubre toda España?**
El estado operativo **oficial en vivo** está integrado en Castilla y León,
Andalucía y Cataluña. En el resto, la cobertura es satelital (FIRMS). Portugal
tiene estado operativo nacional (ANEPC/fogos.pt).

**¿Y las islas (Canarias, Baleares, Azores, Madeira)?**
Por ahora quedan fuera del área de cobertura satelital y de la máscara del mapa.

**¿Es de pago? ¿Tiene anuncios?**
No. Es gratuito y sin ánimo de lucro.

**¿Se instala?**
Es una PWA: se usa desde el navegador y puede añadirse a la pantalla de inicio.
No está en tiendas de aplicaciones.

**¿Quién lo hace?**
David Moreno Romero. Contacto: `contacto@incendib.es`.

**¿Por qué un foco no es un incendio?**
Un satélite detecta calor; ese calor puede ser una quema agrícola, una industria
o un incendio real. Por eso Incendib marca los focos como «detección satelital —
no confirmada» y solo confirma con fuentes operativas.

---

## 6. Enlaces útiles del repo (para quien amplíe el kit)

- `docs/DATA-SOURCES.md` — arquitectura de fuentes, endpoints y aspectos legales.
- `docs/ARCHITECTURE.md` — estructura del código y stack.
- `docs/HANDOFF.md` — diseño hifi (colores, tipografía, marcadores).
- `CHANGELOG.md` — historial de versiones e hitos.
- `docs/social/` — material ya producido para Instagram (reel + destacadas).
