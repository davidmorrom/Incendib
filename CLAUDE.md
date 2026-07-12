# CLAUDE.md — Incendib

Guía de trabajo para agentes en este repositorio.

> **Trabajo multiagente:** si hay varios agentes a la vez, revisa
> **`COORDINACION.md`** antes de empezar y antes de integrar en `main` (reglas
> de convivencia sobre el árbol compartido y log entre agentes).

## Qué es

Visor web (PWA mobile-first) de incendios forestales activos en España y
Portugal. Sin ánimo de lucro. Modo claro por defecto (oscuro "sala de control"
opt-in), con panel desktop.

## Documentos de referencia (leer antes de implementar)

- `docs/HANDOFF.md` — handoff de diseño **hifi**. Colores, tipografía,
  espaciados, copy y estados son **finales**: recrear píxel a píxel. Incluye la
  lista de pantallas canónicas por id.
- `docs/DATA-SOURCES.md` — arquitectura de fuentes de datos, taxonomía de
  filtros y aspectos legales. Endpoints en el anexo.
- `docs/ARCHITECTURE.md` — estructura del código.
- `docs/design/*.dc.html` — mocks de referencia (framework `DCLogic` de
  `support.js`). **No copiar tal cual**: recrear en React/Next. Los SVG de
  iconos están inline ahí; extraerlos de ahí.

## Comandos

```bash
npm run dev         # desarrollo
npm run build       # build de producción
npm run typecheck   # tsc --noEmit
npm run lint        # eslint (next)
npm test            # pruebas unitarias (Vitest)
npm run geo:gen     # regenera la máscara del mapa (ES+PT)
```

## Convenciones no negociables

- **El color codifica dato, nunca decora.** Marcadores = color + forma.
- Tokens: editar `src/lib/design/tokens.ts` **y** `src/app/globals.css` juntos.
  No hardcodear hex en componentes; usar utilidades Tailwind (`bg-state-activo`,
  `text-fg-secondary`, etc.). Para translucidez usar `color-mix` (ver
  `src/lib/design/color.ts`): el modificador de opacidad de Tailwind NO funciona
  sobre colores `var()`.
- Cifras/timestamps/coordenadas en **IBM Plex Mono**; miles con **espacio**
  (`formatNumber`). UI en IBM Plex Sans.
- Accesibilidad WCAG 2.2 AA obligatoria (ver `docs/ARCHITECTURE.md`).
- Copy sobrio y específico, en ES (con PT/EN vía diccionarios). Nada de lenguaje
  comercial. Vacío = buena noticia, nunca tono de error.
- Disclaimer 112 siempre presente donde corresponda.
- Detección satelital ≠ incendio confirmado: comunicarlo siempre en la UI.

## Control de versiones (OBLIGATORIO)

El agente **siempre** mantiene el repositorio bajo control de versiones:

- **Commit en cada cambio sustancial.** No acumular varios cambios grandes sin
  versionar. Un commit = una unidad de trabajo coherente.
- **Conventional Commits** en español, claros y atómicos
  (`feat:`, `fix:`, `docs:`, `chore:`, `refactor:`…).
- **Autoría exclusiva del propietario** (`David Moreno Romero
  <david.morrom.contact@gmail.com>`). **Nunca** añadir coautoría, «Co-Authored-By»,
  ni menciones a herramientas de IA en commits, PRs, tags o archivos. No crear
  `AGENT.md` ni ficheros marcadores de agente.
- **Ramas**: se puede trabajar en ramas de característica (`feat/…`, `fix/…`),
  pero **siempre** hay que integrar el resultado en `main` de forma limpia y
  dejar `main` estable, construible y sin ramas a medias ni trabajo sin
  fusionar. El propietario debe encontrar todo listo en `main` sin liarse.
- **Antes de integrar en `main`**: `typecheck`, `lint` y `build` deben pasar.
- **Versionado SemVer**: etiquetar releases (`vX.Y.Z`) y mantener
  `CHANGELOG.md` al día.

## Modo de trabajo autónomo

El propietario ha autorizado **desarrollo autónomo** (puede estar ausente):

- **Avanza sin esperar aprobación** por la hoja de ruta (abajo). Elige la
  siguiente tarea pendiente, impleméntala, verifícala y ciérrala.
- **Commit + versión sobre la marcha**: una pantalla/feature = un commit (o
  pocos) + bump SemVer + entrada en `CHANGELOG.md` + tag + `git push` (Vercel
  despliega solo). No acumules trabajo sin versionar.
- **Producción es desechable** (proyecto personal): no te bloquees por miedo a
  romperla. Aun así, mantén `main` **construible** (typecheck + lint + build en
  verde antes de cada push) por higiene del historial.
- **Verifica** cada pantalla de forma real cuando sea posible (captura headless
  con el hook `?e2e`, revisando claro y oscuro).
- Trabaja de forma continua hasta agotar el presupuesto; deja siempre `main`
  estable para que el propietario lo revise a la vuelta.

### Modo nocturno continuo (temporal — mientras el propietario duerme)

- **No pares.** Trabaja toda la noche. Si una tarea se **bloquea** (falta una
  fuente de datos, una clave o una decisión del propietario), **déjala
  documentada y pasa a OTRA** de la hoja de ruta o de mejoras; nunca te detengas
  a esperar.
- **Documenta hitos y fallos** sobre la marcha en `docs/notas-sesion-<fecha>.md`
  para que el propietario lo revise por la mañana.
- **Multiagente:** puede haber otro agente a la vez. Lee y actualiza
  `COORDINACION.md`; árbol compartido → commits por **ruta explícita** (nunca
  `git add -A`/`-a`) y **rebase antes de push**.
- No introduzcas datos «probablemente erróneos» por rellenar huecos: mejor «sin
  dato» que una cifra falsa. Prefiere trabajo que puedas **verificar** (consulta
  real de la API/prod) frente a cambios de UI que no puedas comprobar.

### Hoja de ruta (orden sugerido)

1. Pantallas restantes: **Informe (2b)** → **Fuentes (3b)** → **Ficha (1c)** →
   **Noticias (3a)**.
2. Estados de la UI: carga/skeleton (4a), vacío (4b), error (4c), offline (4d),
   toast reconexión (5b), informe sin resultados (5a).
3. Datos en vivo (FIRMS/EFFIS/fogos.pt) con caché en backend (fase 0.4).
4. Web Push + ajustes de alertas (7a–7c), histórico (10a–10b).
5. Panel desktop (1d, 6a).

## Estado actual (v0.17.x)

- ✅ **Todas las pantallas** implementadas: Mapa (2a/1d), Informe (2b), Fuentes
  (3b), Ficha (1c), Noticias (3a/6a), Alertas (7a), Legal, Boletines +
  Boletín semanal (F1, edición w27 publicada), Histórico (10b).
- ✅ **Datos en vivo en producción** (`live` en Vercel, `mock` en local):
  - Incidentes: fogos.pt (PT), INFORCYL (CyL), INFOCA (Andalucía), Bombers (Cataluña).
  - Satélite: FIRMS (focos), EFFIS (perímetros + área quemada, recortado a ES+PT).
  - Superficie: oficial donde la hay (INFORCYL) + estimación EFFIS marcada «~»;
    «sin dato» si no hay ninguna. Meteo local por incendio (Open-Meteo).
  - Noticias reales (Google News RSS ES+PT).
- ✅ PWA (iconos, atajos), Web Push + alertas por zona (Upstash + QStash),
  i18n ES/PT/EN, SEO (`sitemap.xml` + `robots.txt`), 67 tests.
- ⏳ Pendiente (bloqueado por dato/decisión, ver `docs/notas-sesion-*.md`): más
  regiones en vivo (requiere inspección de red en navegador), evacuación en vivo,
  FWI, cámaras DGT reales, islas (fuera del bbox satelital).
