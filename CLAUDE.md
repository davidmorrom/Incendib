# CLAUDE.md — Iberfuego

Guía de trabajo para agentes en este repositorio.

## Qué es

Visor web (PWA mobile-first) de incendios forestales activos en España y
Portugal. Sin ánimo de lucro. Modo oscuro por defecto, con panel desktop.

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

## Estado actual

- ✅ Estructura, sistema de diseño, PWA, i18n y capa de datos (v0.1).
- ✅ Pantalla **Mapa** (home, 2a) con MapLibre, máscara, marcadores y filtros (v0.2).
- ⏳ Pendiente: Informe (2b), Noticias (3a), Fuentes (3b), ficha (1c), datos en
  vivo, Web Push, histórico y panel desktop.
- Datos en modo `mock` por defecto.
