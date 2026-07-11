# Investigación de referencia — mapasdeincendios.es

> Fecha: **11 jul 2026**. Autor: análisis interno Incendib.
> Fuente: navegación pública de `https://mapasdeincendios.es` (Inicio, Mapa,
> Incendios hoy, Estadísticas, Territorios, Prensa, Noticias, Fuentes, Quiénes
> somos, Contacto, Metodología).

## Espíritu de esta investigación

`mapasdeincendios.es` **no es competencia**: es un **proyecto hermano** sin
ánimo de lucro con la misma misión que Incendib —acercar información pública de
incendios a la gente y beneficiar a la comunidad—. Por eso aquí **inspirarnos,
adaptar e incluso replicar sus buenas ideas es legítimo y deseable**, siempre
que sirva como servicio público. Reconocemos y respetamos su trabajo; toda
función que tomemos de su ejemplo debe reforzar el bien común, no disputar
audiencia.

El propietario pidió inspirarse en su web, en especial en la sección **Prensa /
informe semanal**, para detectar **funcionalidades que nos falten y aporten
valor**. Nuestra premisa de diseño se mantiene: nuestra estética e interacción
son superiores; aquí buscamos **funcionalidad y utilidad pública**, no imitar su
apariencia.

## Índice de documentos

1. [`01-referencia-mapasdeincendios.md`](./01-referencia-mapasdeincendios.md)
   — Radiografía completa del proyecto de referencia: cada sección, qué muestra
   y cómo.
2. [`02-analisis-gaps.md`](./02-analisis-gaps.md)
   — Comparativa Incendib vs. referencia y **lista priorizada de mejoras** con
   esfuerzo estimado y valor. Es el documento accionable.
3. [`03-propuesta-informe-semanal.md`](./03-propuesta-informe-semanal.md)
   — Propuesta de producto detallada del **informe/boletín semanal** (la
   funcionalidad estrella que le gusta al propietario).
4. [`04-propuesta-mapa-capas-territorios.md`](./04-propuesta-mapa-capas-territorios.md)
   — Las dos ideas del propietario: **modo alternativo de capas** y
   **selección de provincias en el mapa**, más la sección **Territorios**.
5. [`05-propuesta-estadisticas.md`](./05-propuesta-estadisticas.md)
   — Página de **Estadísticas** (analítica histórica con gráficos).

## Resumen ejecutivo (TL;DR)

| Ellos ofrecen y nosotros no | Valor | Esfuerzo | Prioridad |
|---|---|---|---|
| **Informe/boletín semanal** archivable + descargable (PDF) | Alto (SEO, prensa, recurrencia) | Medio-alto | **P0** |
| **Territorios** (páginas por CCAA/provincia/municipio) | Alto (SEO masivo, navegación) | Alto | **P1** |
| **Estadísticas** (analítica histórica con gráficos) | Medio-alto | Medio | **P1** |
| **Incendios hoy** (ranking provincial 24 h) | Medio | Bajo | **P2** |
| Selección de provincia en el mapa | Medio (idea del propietario) | Medio | **P2** |
| Modo alternativo de capas / basemaps | Medio (idea del propietario) | Bajo-medio | **P2** |
| **Quiénes somos / Contacto / Metodología** | Bajo-medio (confianza) | Bajo | **P3** |

| Nosotros ofrecemos y ellos no | Nota |
|---|---|
| **Alertas Web Push** + ajustes | Función diferencial nuestra |
| **Datos en vivo España multi-fuente** (JCyL, Cataluña, INFOCA, PT) | Estado operativo real, no solo satélite |
| **Ficha de incendio** con timeline, medios, meteo, perímetro | Profundidad por incidente |
| **PWA instalable + offline** | Ellos parecen web clásica |
| **Modo claro/oscuro "sala de control"** y sistema de diseño hifi | Diseño superior |

Estas fortalezas nuestras y las suyas son **complementarias**: ambos proyectos
cubren huecos distintos del mismo problema público. Ver detalle y plan en
[`02-analisis-gaps.md`](./02-analisis-gaps.md).
