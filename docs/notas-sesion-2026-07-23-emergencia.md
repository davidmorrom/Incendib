# Sesión 2026-07-23 — Modo emergencia (Sierra de Gredos / Valle del Alberche)

Encargo del propietario, en directo, durante tres incendios simultáneos en la
zona: **Burgohondo (Ávila)** —el prioritario—, **Almorox (Toledo→Madrid)** y
**San Martín de Valdeiglesias (Madrid)**. Objetivo: reflejar en el visor la
máxima información veraz encontrada en medios (perímetro, superficie,
evacuaciones/confinamientos, cronología).

## Qué se hizo

- **Investigación verificada** (workflow multiagente: búsqueda + verificación
  adversarial + síntesis) sobre los tres incendios. Resultado y fuentes en el
  propio `emergency.ts` (cronologías atribuidas).
- **Capa `src/lib/data/emergency.ts`** (overrides editoriales, temporales,
  versionados): fusiona datos sobre el incendio en vivo por proximidad+municipio,
  o añade ficha reconstruida si no hay fuente. `applyEmergencyOverrides` se aplica
  en `getFires` tras los overrides del panel. Cada entrada **caduca** el
  **2026-08-06** (`expiresAt`) — **red de seguridad; retirar el fichero cuando
  acabe la emergencia**.
- **Burgohondo:** se **conserva** el perímetro satelital (EFFIS, ~2 547 ha) y se
  **añade** `perimeterExtra` (extensión provisional discontinua) hasta La
  Rinconada y el camping del Valle de Iruelas. `hectaresFallback: 2547` por si
  EFFIS deja de adjuntar superficie en vivo.
- **Modelo/UI:** nuevo `perimeterExtra` (+`perimeterProvisional`), banner de
  evacuaciones (`aria-live`), banner de extensión provisional, encuadre del
  minimapa al perímetro, extensión discontinua en mapa y minimapa.
- **KPI principal:** la superficie total ahora suma también las estimaciones por
  focos (`hotspotHectares`) cuando no hay cifra oficial (decisión del
  propietario). Ranking/boletín sin cambios.

## Cautelas de veracidad (IMPORTANTE)

Verificado y **CONTRADICHO / de fuente única** — se muestra como **reportado**,
nunca como parte oficial (etiquetado «prensa» con enlace + perímetro marcado
«provisional, no oficial ni definitivo»):

- **Llegada del fuego a La Rinconada y al camping del Valle de Iruelas:** solo lo
  afirma el directo de COPE (~17:33) / Ávilared. El resto de fuentes fiables
  describen la Reserva de Iruelas como **amenazada, no alcanzada**. Se representa
  por indicación expresa del propietario, etiquetado como reportado.
- **Confinamiento por humo (ES-Alert) de El Tiemblo, Burgohondo y Navaluenga:**
  fuente única (Ávilared); eldiario.es señalaba a las 17:15 que no había orden
  oficial, solo un bando del Ayuntamiento de Navaluenga. Riesgo de confusión con
  los ES-Alert del incendio de **Almorox** (que sí pasó cerca de El Tiemblo).
- **Superficie de Burgohondo:** sin cifra oficial de la Junta. Se usa la
  estimación satelital EFFIS (~2 547 ha en prod) marcada «~».
- **Nivel 2 NO es el máximo** (el máximo del IGR es el 3, interés nacional).

## Pendiente / a revisar por el propietario

- Retirar `emergency.ts` (o dejar que caduque) cuando termine la emergencia.
- Si se confirma oficialmente la llegada a Iruelas o el confinamiento, reetiquetar
  esos hitos como oficiales.
- Ajustar la forma de la extensión o la superficie si se dispone de perimetración
  oficial.
