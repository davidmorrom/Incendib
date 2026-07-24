/**
 * Capa de OVERRIDES DE EMERGENCIA (editorial, temporal y versionada).
 *
 * Durante una emergencia en curso, el propietario necesita reflejar en el visor
 * información verificada en medios que las fuentes automáticas todavía no
 * publican (perímetro provisional, superficie estimada, evacuaciones,
 * confinamientos, cronología). Esta capa lo permite SIN tocar los adaptadores:
 *
 *  - Si el incendio YA existe en una fuente en vivo (p. ej. Burgohondo en
 *    INFORCYL), se localiza por PROXIMIDAD y se le FUSIONAN los campos de
 *    `patch` (queda marcado `edited` → sello «corregido a mano» en la UI).
 *  - Si NO existe en ninguna fuente (p. ej. focos de Madrid, sin API de
 *    incidentes), se AÑADE la ficha `standalone`, marcada `reconstructed` →
 *    «reconstruido a partir de prensa».
 *
 * Reglas de veracidad (CLAUDE.md): cada hito de la cronología va ATRIBUIDO a su
 * medio (con enlace) y las afirmaciones de fuente única o no confirmadas de
 * forma independiente se etiquetan como reportadas, nunca como parte oficial. El
 * perímetro se marca `perimeterProvisional` («no oficial ni definitivo») y la
 * superficie `hectaresApprox` («~», estimación).
 *
 * TEMPORAL: cada entrada lleva `expiresAt`. Pasada esa fecha queda INERTE (los
 * datos vuelven a salir tal cual de las fuentes). El propietario debe retirar
 * este fichero cuando la emergencia termine; el `expiresAt` es solo una red de
 * seguridad para que no quede colgado indefinidamente.
 */

import type { Fire, TimelineEntry } from '@/types/fire';
import { haversineKm } from './adapters';

/** Una corrección de emergencia sobre un incendio (por proximidad geográfica). */
export interface EmergencyOverride {
  /** Identificador legible (para pruebas y trazas). */
  id: string;
  /** Punto de referencia para localizar el incendio en las fuentes en vivo. */
  match: {
    /** [lon, lat] del foco. */
    coordinates: [number, number];
    /** Radio (km) dentro del cual se considera el mismo incendio. */
    radiusKm: number;
    /** Guarda opcional: el municipio/nombre del incendio en vivo debe contener
     * este texto (normalizado) para fusionar. Evita capturar un vecino cercano. */
    municipalityIncludes?: string;
  };
  /** Campos a FUSIONAR sobre el incendio en vivo que haga match. */
  patch: Partial<Fire>;
  /**
   * Superficie (ha) de reserva, aplicada SOLO si el incendio en vivo no trae
   * cifra (0/ausente): así se conserva la cifra oficial/EFFIS cuando existe y se
   * evita un «sin dato» durante la emergencia si la fuente satelital falla. Marca
   * `hectaresApprox`. NO pisa una cifra existente.
   */
  hectaresFallback?: number;
  /** Ficha completa a AÑADIR si NINGÚN incendio en vivo hace match. */
  standalone?: Fire;
  /** ISO 8601. Pasada esta fecha, la entrada queda inerte. */
  expiresAt: string;
}

const norm = (s: string): string =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();

/** Ordena de más reciente a más antiguo y quita duplicados por (at,label). Puro. */
function sortDedupeTimeline(entries: TimelineEntry[]): TimelineEntry[] {
  const seen = new Set<string>();
  const out: TimelineEntry[] = [];
  for (const e of entries) {
    const k = `${e.at}|${e.label}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(e);
  }
  return out.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
}

/**
 * Fusiona `patch` sobre un incendio en vivo. La cronología se COMBINA con la de
 * la fuente (no la pisa) y se reordena; el resto de campos se sobrescriben. Marca
 * `edited` con la lista de campos tocados (sello de transparencia). Puro.
 */
export function mergeEmergency(
  fire: Fire,
  patch: Partial<Fire>,
): Fire & { edited: true; overriddenFields: string[] } {
  const fields = Object.keys(patch);
  const timeline = patch.timeline
    ? sortDedupeTimeline([...(fire.timeline ?? []), ...patch.timeline])
    : fire.timeline;
  const prevFields = fire.overriddenFields ?? [];
  return {
    ...fire,
    ...patch,
    timeline,
    edited: true,
    overriddenFields: [...new Set([...prevFields, ...fields])],
  };
}

/**
 * Aplica las correcciones de emergencia vigentes. Por cada override activo (no
 * caducado): fusiona sobre el incendio en vivo más cercano dentro del radio (y,
 * si se pide, con el municipio coincidente); si no hay ninguno, añade la ficha
 * `standalone`. Nunca lanza; identidad si no hay overrides activos. Puro (recibe
 * `now`, así los tests son deterministas).
 */
export function applyEmergencyOverrides(
  fires: Fire[],
  overrides: EmergencyOverride[] = EMERGENCY_OVERRIDES,
  now: number = Date.now(),
): Fire[] {
  const active = overrides.filter((o) => Date.parse(o.expiresAt) > now);
  if (!active.length) return fires;

  const out = [...fires];
  for (const o of active) {
    // Índice del incendio en vivo más cercano dentro del radio (y municipio, si aplica).
    let bestIdx = -1;
    let bestKm = Infinity;
    for (let i = 0; i < out.length; i++) {
      const f = out[i]!;
      if (f.reconstructed) continue; // no fusionar contra otra ficha de emergencia
      const km = haversineKm(f.coordinates, o.match.coordinates);
      if (km > o.match.radiusKm) continue;
      if (o.match.municipalityIncludes) {
        const hay = `${norm(f.municipality)} ${norm(f.name)}`;
        if (!hay.includes(norm(o.match.municipalityIncludes))) continue;
      }
      if (km < bestKm) {
        bestKm = km;
        bestIdx = i;
      }
    }

    if (bestIdx >= 0) {
      let merged = mergeEmergency(out[bestIdx]!, o.patch);
      // Superficie de reserva: solo si no hay cifra en vivo (no pisa la oficial/EFFIS).
      if (o.hectaresFallback != null && !merged.hectares) {
        merged = {
          ...merged,
          hectares: o.hectaresFallback,
          hectaresApprox: true,
          overriddenFields: [...new Set([...merged.overriddenFields, 'hectares'])],
        };
      }
      out[bestIdx] = merged;
    } else if (o.standalone) {
      out.push(o.standalone);
    }
  }
  return out;
}

// ── DATOS DE LA EMERGENCIA (jul 2026) ─────────────────────────────────────────
// Fuentes verificadas en medios (23-jul-2026). Superficies y perímetro son
// ESTIMACIONES no oficiales, marcadas como tales. Ver cronología atribuida.

const EXPIRES = '2026-08-06T00:00:00+02:00'; // red de seguridad (2 semanas)

/**
 * EXTENSIÓN provisional de Burgohondo (anillo [lon,lat]). NO sustituye al
 * perímetro satelital (EFFIS) que INFORCYL/EFFIS ya adjuntan al incidente (área
 * quemada real, ~2 500 ha en torno a Burgohondo): se SUMA a él. Es el lóbulo
 * oriental hasta el que ha llegado el frente según la cartografía de Google Maps
 * («Área de incendios estimada») aportada por el propietario y la cobertura en
 * directo: solapa el borde este del área EFFIS (~-4,69) y crece al E/NE hasta el
 * Valle de Iruelas, La Rinconada y el camping (Las Cruceras). Línea discontinua,
 * provisional, no oficial. No se usa para `hectares` (esa cifra sigue siendo la
 * del perímetro satelital).
 */
// Nota: esta extensión editorial es solo un RESPALDO. En producción, con focos
// FIRMS disponibles, `upgradeExtraFromFirms` la sustituye por la envolvente real
// del cúmulo satelital (ver adapters). Aquí se dibuja el alcance del 23-24 jul:
// desde el área EFFIS (O) arrasando el Valle de Iruelas y llegando a El Tiemblo (E).
const BURGOHONDO_EXTENSION: [number, number][] = [
  [-4.7, 40.394], // solape con el borde este del área EFFIS
  [-4.66, 40.402],
  [-4.615, 40.408],
  [-4.575, 40.412], // borde N del valle (La Rinconada)
  [-4.54, 40.414],
  [-4.512, 40.412],
  [-4.497, 40.406], // El Tiemblo (extremo E)
  [-4.495, 40.392],
  [-4.508, 40.378],
  [-4.532, 40.366], // Valle de Iruelas sur
  [-4.56, 40.358],
  [-4.59, 40.354],
  [-4.618, 40.356],
  [-4.648, 40.36],
  [-4.675, 40.366],
  [-4.695, 40.372], // solape con el borde este del área EFFIS
];

/**
 * Cronología de Burgohondo. Los hitos oficiales (declaración, cambios de nivel)
 * van sin enlace; los reportados por prensa llevan `source` + `url` y se muestran
 * como «prensa» enlazada. Los de FUENTE ÚNICA / no confirmados de forma
 * independiente (llegada a La Rinconada/camping; confinamiento por humo) se
 * redactan como REPORTADOS, no como hecho oficial.
 */
const BURGOHONDO_TIMELINE: TimelineEntry[] = [
  { at: '2026-07-22T13:02:00+02:00', label: 'Declarado en el término de Burgohondo (Valle del Alberche).', state: 'activo' },
  { at: '2026-07-22T15:15:00+02:00', label: 'Se eleva a Nivel 1 del Índice de Gravedad Potencial (IGR).' },
  {
    at: '2026-07-22T21:30:00+02:00',
    label: 'Desalojo preventivo de un centenar de vecinos de la urbanización Puente Nueva y el barrio de Matalaceña (Burgohondo).',
    source: 'eldiario.es',
    url: 'https://www.eldiario.es/castilla-y-leon/desalojadas-100-personas-burgohondo-avila-incorporado-ume_1_13400627.html',
  },
  {
    at: '2026-07-22T22:30:00+02:00',
    label: 'Se eleva a Nivel 2 del IGR (no es el máximo; el máximo es el 3) por grave riesgo para población y bienes y superar las 300 ha de arbolado. Se activa el CECOPI.',
    state: 'activo',
    source: 'COPE',
    url: 'https://www.cope.es/emisoras/castilla-y-leon/avila-provincia/avila/noticias/incendio-forestal-burgohondo-alcanza-nivel-2-llega-navaluenga-20260723_3409267.html',
  },
  {
    at: '2026-07-23T04:00:00+02:00',
    label: 'La UME se incorpora al operativo y traza con maquinaria pesada una línea de contención para proteger Navaluenga e impedir que las llamas alcancen la Reserva del Valle de Iruelas.',
    source: 'eldiario.es',
    url: 'https://www.eldiario.es/castilla-y-leon/desalojadas-100-personas-burgohondo-avila-incorporado-ume_1_13400627.html',
  },
  {
    at: '2026-07-23T11:00:00+02:00',
    label: 'Comparecencia del delegado territorial de la Junta: el perímetro se describe como «estabilizado» tras la noche, pero el incendio sigue muy activo y complejo. Causa probable en investigación: uso de maquinaria (negligencia).',
    source: 'Ávilared',
    url: 'https://avilared.com/art/93344/incendio-de-burgohondo-el-operativo-concentra-los-esfuerzos-en-proteger-navaluenga-y-las-zonas-evacuadas',
  },
  {
    at: '2026-07-23T13:00:00+02:00',
    label: 'Operativo de ~34 medios (12–14 aéreos) y un centenar de efectivos, con la prioridad puesta en proteger Navaluenga (frente a ~1,5 km del casco). El alcalde de Navaluenga lo describe como «el peor incendio de los últimos 50 años».',
    source: 'COPE',
    url: 'https://www.cope.es/emisoras/castilla-y-leon/avila-provincia/avila/noticias/maquinaria-pudo-provocar-incendio-burgohondo-avila-mantiene-nivel-2-20260723_3409453.html',
  },
  {
    at: '2026-07-23T17:30:00+02:00',
    label: 'Cobertura en directo: el fuego alcanza el entorno de la Reserva del Valle de Iruelas y fuerza el desalojo de La Rinconada y del camping de Iruelas. Reportado en directo, sin confirmación oficial independiente (otras fuentes describen la reserva como amenazada).',
    source: 'Ávilared / COPE',
    url: 'https://avilared.com/art/93350/incendio-navaluenga-burgohondo-desalojo-refuerzos-avance-peligroso',
  },
  {
    at: '2026-07-23T17:45:00+02:00',
    label: 'ES-Alert de confinamiento preventivo por humo para El Tiemblo, Burgohondo y Navaluenga (Junta de Castilla y León, vía Red de Alerta Nacional). Se pide permanecer en los domicilios. Dato de fuente única, pendiente de confirmación independiente.',
    source: 'Ávilared',
    url: 'https://avilared.com/art/93357/alerta-esalert-confinamiento-el-tiemblo-burgohondo-navaluenga-incendio-forestal',
  },
  {
    at: '2026-07-23T18:50:00+02:00',
    label: 'Confinamiento de El Tiemblo por ES-Alert y evacuación de su urbanización La Atalaya (unos 1.200-1.300 residentes) ante el rápido avance del frente hacia la localidad.',
    state: 'activo',
  },
  {
    at: '2026-07-23T21:00:00+02:00',
    label: 'Fase más crítica: comportamiento convectivo, avance de ~3 km en 40 min, «prácticamente fuera de la capacidad de extinción». El fuego penetra en la Reserva Natural del Valle de Iruelas, «prácticamente arrasada» (delegado territorial de la Junta). Unas 1.500 personas evacuadas en total (camping El Burguillo, Las Cruceras y La Rinconada).',
    state: 'activo',
  },
  {
    at: '2026-07-24T00:35:00+02:00',
    label: 'El Ministro del Interior declara la EMERGENCIA DE INTERÉS NACIONAL (Situación Operativa 3, máximo del Sistema Nacional de Protección Civil) para la Comunidad de Madrid y la provincia de Ávila —primera vez en España por incendios forestales—, motivada por Burgohondo, Villa del Prado y San Martín de Valdeiglesias. El Estado asume la dirección; el mando operativo recae en la UME.',
    state: 'activo',
  },
  {
    at: '2026-07-24T08:00:00+02:00',
    label: 'Mañana del 24: el perímetro se describe estabilizado tras la noche, pero sin controlar. Sin cifra oficial de superficie: el humo impidió medir con fiabilidad. La extensión se estima por detección satelital (focos FIRMS).',
  },
];

/**
 * Campos a FUSIONAR sobre el incendio en vivo de Burgohondo (INFORCYL). Se
 * CONSERVA su perímetro satelital (EFFIS) y su superficie: solo se AÑADE el
 * lóbulo de extensión, la evacuación y la cronología (instrucción del
 * propietario: «el perímetro satelital no lo borres, solo añade este»).
 */
const BURGOHONDO_DATA: Partial<Fire> = {
  perimeterExtra: BURGOHONDO_EXTENSION,
  evacuation:
    'Unos 1.500 evacuados (según medios): Puente Nueva y Matalaceña (Burgohondo), camping El Burguillo, Las Cruceras y La Rinconada del Valle de Iruelas, y la urbanización La Atalaya (El Tiemblo). Confinamiento por humo (ES-Alert) en El Tiemblo, Navaluenga y Burgohondo. Emergencia de interés nacional (situación operativa 3) declarada para Madrid y Ávila.',
  timeline: BURGOHONDO_TIMELINE,
};

const SANMARTIN_TIMELINE: TimelineEntry[] = [
  {
    at: '2026-07-23T16:22:00+02:00',
    label: 'Declarado un incendio forestal al arder un coche en el km 57 de la M-501 («carretera de los pantanos») y propagarse las llamas al monte. Emergencias Comunidad de Madrid (112) moviliza 16 medios aéreos y terrestres.',
    state: 'activo',
    source: 'Telemadrid',
    url: 'https://www.telemadrid.es/noticias/madrid/Se-desata-un-incendio-forestal-en-San-Martin-de-Valdeiglesias-tras-arder-un-coche-en-la-M-501-0-2909709031--20260723042239.html',
  },
  {
    at: '2026-07-23T17:00:00+02:00',
    label: 'Confinada la residencia de mayores López Rumayor; ES-Alert a las urbanizaciones San Ramón y Jaracruz para permanecer en casa (Jaracruz llegó a desalojarse) y a Pelayos de la Presa para dirigirse al casco urbano.',
    source: 'Libertad Digital',
    url: 'https://www.libertaddigital.com/madrid/2026-07-23/incendio-forestal-en-san-martin-de-valdeiglesias-una-residencia-de-mayores-confinada-y-un-es-alert-a-dos-urbanizaciones-7440161/',
  },
  {
    at: '2026-07-23T17:15:00+02:00',
    label: 'El fuego avanza por el camino de las Navas en dirección a Pelayos de la Presa. En los últimos partes, el flanco sur queda extinguido y el norte sigue activo.',
    source: 'Telemadrid',
    url: 'https://www.telemadrid.es/noticias/madrid/Se-desata-un-incendio-forestal-en-San-Martin-de-Valdeiglesias-tras-arder-un-coche-en-la-M-501-0-2909709031--20260723042239.html',
  },
  {
    at: '2026-07-24T00:35:00+02:00',
    label: 'Incluido en la declaración de emergencia de interés nacional (situación operativa 3) para la Comunidad de Madrid y la provincia de Ávila, junto con Villa del Prado y Burgohondo. El Estado (Ministerio del Interior) asume la dirección.',
    state: 'activo',
  },
];

const ALMOROX_TIMELINE: TimelineEntry[] = [
  {
    at: '2026-07-22T16:52:00+02:00',
    label: 'Detectado por un vigía en la urbanización El Pinar (Almorox, Toledo); masa de espinar con fuego de copas activo.',
    state: 'activo',
    source: 'CLM24',
    url: 'https://www.clm24.es/articulo/toledo/incendio-almorox-alcanza-nivel-2-obliga-evacuar-pinar/20260722210752480139.html',
  },
  {
    at: '2026-07-22T20:00:00+02:00',
    label: 'Nivel 2 en Castilla-La Mancha (INFOCAM) y en Madrid (INFOMA) al cruzar el fuego a Villa del Prado y Aldea del Fresno. Se evacúan ~700 personas de El Encinar del Alberche y se confina Villa del Prado (ES-Alert). Cortadas la N-403, M-507 y M-540.',
    source: 'Comunidad de Madrid',
    url: 'https://www.comunidad.madrid/seguridad-emergencias-asem-112/incendio-forestal-villa-prado-madrid-almorox-toledo-julio-2026',
  },
  {
    at: '2026-07-23T00:45:00+02:00',
    label: 'Los vecinos evacuados pueden regresar, salvo los de la urbanización El Encinar del Alberche.',
    source: 'Comunidad de Madrid',
    url: 'https://www.comunidad.madrid/seguridad-emergencias-asem-112/incendio-forestal-villa-prado-madrid-almorox-toledo-julio-2026',
  },
  {
    at: '2026-07-23T11:00:00+02:00',
    label: 'Queda perimetrado (no extinguido) y baja a Nivel 1. Estimación de la jornada: ~1.000 ha (unas 600 en Madrid) y 26 viviendas afectadas total o parcialmente. Participa la UME.',
    state: 'controlado',
    source: 'Infobae',
    url: 'https://www.infobae.com/espana/2026/07/23/el-incendio-en-almorox-toledo-baja-a-nivel-1-tras-quedar-perimetrado-el-fuego-ha-quemado-1000-hectareas/',
  },
  {
    at: '2026-07-24T00:35:00+02:00',
    label: 'Su propagación a Villa del Prado (Madrid) queda incluida en la declaración de emergencia de interés nacional (situación operativa 3) para Madrid y la provincia de Ávila, junto con Burgohondo y San Martín de Valdeiglesias.',
  },
];

/**
 * Overrides de la emergencia. Burgohondo se FUSIONA con el registro de INFORCYL
 * (existe en vivo); Almorox se fusiona con INFOCAM si aparece o, si no, se añade
 * reconstruido; San Martín de Valdeiglesias se añade reconstruido (Madrid no
 * tiene API de incidentes activos).
 */
export const EMERGENCY_OVERRIDES: EmergencyOverride[] = [
  {
    id: 'burgohondo-2026-07',
    match: {
      coordinates: [-4.7376, 40.3577], // foco INFORCYL (UTM 30N 352454, 4468904)
      radiusKm: 6,
      municipalityIncludes: 'burgohondo',
    },
    patch: BURGOHONDO_DATA,
    // Respaldo de superficie si no hay focos FIRMS ni EFFIS en vivo. Normalmente
    // `upgradeExtraFromFirms` fija la cifra con la envolvente satelital real
    // (~9 000 ha el 24 jul, tras arrasar el Valle de Iruelas). Estimación.
    hectaresFallback: 9000,
    // Respaldo si el registro de INFORCYL/EFFIS desapareciera de la fuente en
    // vivo: sin perímetro satelital, se dibuja la extensión como perímetro
    // provisional (discontinuo) y se estima la superficie (~ EFFIS observada).
    standalone: {
      slug: 'cyl-burgohondo-emergencia-2026-07',
      name: 'Burgohondo',
      municipality: 'Burgohondo',
      province: 'Ávila',
      region: 'Castilla y León',
      country: 'ES',
      state: 'activo',
      level: 2,
      type: 'forestal',
      hectares: 9000,
      hectaresApprox: true,
      perimeter: BURGOHONDO_EXTENSION,
      perimeterProvisional: true,
      coordinates: [-4.7376, 40.3577],
      startedAt: '2026-07-22T13:02:00+02:00',
      updatedAt: '2026-07-23T17:45:00+02:00',
      sources: ['jcyl'],
      reconstructed: true,
      evacuation: BURGOHONDO_DATA.evacuation,
      timeline: BURGOHONDO_TIMELINE,
    },
    expiresAt: EXPIRES,
  },
  {
    id: 'almorox-2026-07',
    match: {
      coordinates: [-4.385, 40.234], // Almorox (Toledo)
      radiusKm: 10,
      municipalityIncludes: 'almorox',
    },
    patch: {
      hectares: 1000,
      hectaresApprox: true,
      level: 1,
      evacuation:
        'Urbanización El Pinar (Almorox) evacuada y El Romillo confinado. En Madrid: Villa del Prado confinada (ES-Alert) y El Encinar del Alberche evacuado (~700). Cortadas N-403, M-507 y M-540.',
      timeline: ALMOROX_TIMELINE,
    },
    standalone: {
      slug: 'clm-almorox-emergencia-2026-07',
      name: 'Almorox',
      municipality: 'Almorox',
      province: 'Toledo',
      region: 'Castilla-La Mancha',
      country: 'ES',
      state: 'controlado', // perimetrado, no extinguido; nivel rebajado a 1
      level: 1,
      type: 'urbano-forestal',
      hectares: 1000,
      hectaresApprox: true,
      coordinates: [-4.385, 40.234],
      startedAt: '2026-07-22T16:52:00+02:00',
      updatedAt: '2026-07-23T12:00:00+02:00',
      evacuation:
        'Urbanización El Pinar (Almorox) evacuada y El Romillo confinado. En Madrid: Villa del Prado confinada (ES-Alert) y El Encinar del Alberche evacuado (~700). Cortadas N-403, M-507 y M-540.',
      sources: ['infocam'],
      reconstructed: true,
      timeline: ALMOROX_TIMELINE,
    },
    expiresAt: EXPIRES,
  },
  {
    id: 'san-martin-valdeiglesias-2026-07',
    match: {
      coordinates: [-4.395, 40.352], // San Martín de Valdeiglesias (Madrid)
      radiusKm: 8,
      municipalityIncludes: 'valdeiglesias',
    },
    patch: {
      evacuation:
        'Confinada la residencia de mayores López Rumayor; ES-Alert a las urbanizaciones San Ramón y Jaracruz (Jaracruz desalojada) y a Pelayos de la Presa.',
      timeline: SANMARTIN_TIMELINE,
    },
    standalone: {
      slug: 'mad-san-martin-valdeiglesias-emergencia-2026-07',
      name: 'San Martín de Valdeiglesias',
      municipality: 'San Martín de Valdeiglesias',
      province: 'Madrid',
      region: 'Comunidad de Madrid',
      country: 'ES',
      state: 'activo',
      level: null,
      type: 'forestal',
      hectares: 0, // sin cifra de superficie publicada en medios
      coordinates: [-4.395, 40.352],
      startedAt: '2026-07-23T16:22:00+02:00',
      updatedAt: '2026-07-23T17:15:00+02:00',
      evacuation:
        'Confinada la residencia de mayores López Rumayor; ES-Alert a las urbanizaciones San Ramón y Jaracruz (Jaracruz desalojada) y a Pelayos de la Presa.',
      sources: ['nacional'],
      reconstructed: true,
      timeline: SANMARTIN_TIMELINE,
    },
    expiresAt: EXPIRES,
  },
];
