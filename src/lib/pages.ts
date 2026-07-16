/**
 * Contenido de las páginas informativas «Acerca del proyecto» y «Metodología»
 * (enlazadas desde la pantalla Fuentes), por idioma. Texto sobrio y específico;
 * refleja el funcionamiento REAL del proyecto (ver docs/DATA-SOURCES.md y
 * src/lib/data). Sin lenguaje comercial. Lo renderiza `ContentScreen`.
 */

import type { Locale } from '@/lib/i18n/config';

export interface PageSection {
  heading: string;
  paragraphs: string[];
}

export interface PageContact {
  heading: string;
  owner: string;
  ownerLabel: string;
  email: string;
  note: string;
}

export interface PageContent {
  title: string;
  intro: string;
  updated: string;
  /** Aviso de estado del proyecto (desarrollo continuo, posibles fallos). */
  status: string;
  sections: PageSection[];
  /** Bloque de contacto destacado (solo «Acerca»). */
  contact?: PageContact;
  disclaimer: string;
}

const EMAIL = 'contacto@incendib.es';
const OWNER = 'David Moreno Romero';

const STATUS_ES =
  'Proyecto en desarrollo continuo desde el 10 de julio de 2026. Es un proyecto vivo: puede contener errores o datos incompletos.';
const STATUS_PT =
  'Projeto em desenvolvimento contínuo desde 10 de julho de 2026. É um projeto vivo: pode conter erros ou dados incompletos.';
const STATUS_EN =
  'A project under continuous development since 10 July 2026. It is a living project and may contain errors or incomplete data.';

const DISCLAIMER_ES = 'No sustituye a los canales oficiales de emergencia. Emergencias: 112.';
const DISCLAIMER_PT = 'Não substitui os canais oficiais de emergência. Emergências: 112.';
const DISCLAIMER_EN = 'This does not replace official emergency channels. Emergencies: 112.';

// ── Acerca del proyecto ───────────────────────────────────────────────────────

const aboutEs: PageContent = {
  title: 'Acerca del proyecto',
  intro:
    'Incendib es un visor web, gratuito y sin ánimo de lucro, de los incendios forestales activos en España y Portugal. Reúne en un mapa claro la información pública de fuentes oficiales y satelitales, pensado para el móvil y para consultarse de un vistazo.',
  updated: 'Actualizado: julio de 2026',
  status: STATUS_ES,
  sections: [
    {
      heading: 'Qué es',
      paragraphs: [
        'Muestra en tiempo casi real dónde hay incendios forestales en la península ibérica, con su estado, su superficie estimada y su evolución, combinando los datos de los servicios oficiales de emergencias con la detección por satélite.',
        'Es una PWA (aplicación web instalable): funciona en el navegador, puede añadirse a la pantalla de inicio y consultarse sin conexión con los últimos datos cacheados.',
      ],
    },
    {
      heading: 'Para qué',
      paragraphs: [
        'Nace para dar acceso claro, sobrio y accesible a una información que hoy está repartida entre muchos organismos y visores distintos, cada uno con su formato.',
        'No persigue audiencia ni ingresos: no hay publicidad, ni rastreo, ni venta de datos.',
      ],
    },
    {
      heading: 'Qué NO es',
      paragraphs: [
        'Incendib NO es un canal oficial de emergencias y no sustituye al 112. Ante peligro inmediato, llama al 112.',
        'La información se agrega con demora y la detección por satélite no equivale a un incendio confirmado. Para cualquier decisión crítica, consulta siempre las fuentes oficiales.',
      ],
    },
    {
      heading: 'Cómo funciona',
      paragraphs: [
        'Todos los datos proceden de fuentes públicas, oficiales o abiertas, con su atribución en la pantalla «Fuentes». El detalle de cómo se obtienen y presentan está en la «Metodología».',
        'El color y la forma de cada marcador codifican el estado del incendio; nunca decoran. Las cifras se muestran solo cuando son fiables: «sin dato» antes que una cifra inventada.',
      ],
    },
  ],
  contact: {
    heading: 'Contacto',
    ownerLabel: 'Responsable',
    owner: OWNER,
    email: EMAIL,
    note: 'Sugerencias, correcciones de datos o colaboración: escríbenos.',
  },
  disclaimer: DISCLAIMER_ES,
};

const aboutPt: PageContent = {
  title: 'Sobre o projeto',
  intro:
    'O Incendib é um visualizador web, gratuito e sem fins lucrativos, dos incêndios florestais ativos em Espanha e Portugal. Reúne num mapa claro a informação pública de fontes oficiais e de satélite, pensado para o telemóvel e para consultar num relance.',
  updated: 'Atualizado: julho de 2026',
  status: STATUS_PT,
  sections: [
    {
      heading: 'O que é',
      paragraphs: [
        'Mostra em tempo quase real onde há incêndios florestais na Península Ibérica, com o seu estado, a área estimada e a sua evolução, combinando os dados dos serviços oficiais de emergência com a deteção por satélite.',
        'É uma PWA (aplicação web instalável): funciona no navegador, pode adicionar-se ao ecrã inicial e consultar-se sem ligação com os últimos dados em cache.',
      ],
    },
    {
      heading: 'Para quê',
      paragraphs: [
        'Nasce para dar acesso claro, sóbrio e acessível a uma informação que hoje está repartida por muitos organismos e visualizadores diferentes, cada um com o seu formato.',
        'Não procura audiência nem receitas: não há publicidade, nem rastreio, nem venda de dados.',
      ],
    },
    {
      heading: 'O que NÃO é',
      paragraphs: [
        'O Incendib NÃO é um canal oficial de emergências e não substitui o 112. Perante perigo imediato, liga para o 112.',
        'A informação é agregada com atraso e a deteção por satélite não equivale a um incêndio confirmado. Para qualquer decisão crítica, consulta sempre as fontes oficiais.',
      ],
    },
    {
      heading: 'Como funciona',
      paragraphs: [
        'Todos os dados provêm de fontes públicas, oficiais ou abertas, com a sua atribuição no ecrã «Fontes». O detalhe de como se obtêm e apresentam está na «Metodologia».',
        'A cor e a forma de cada marcador codificam o estado do incêndio; nunca decoram. Os números mostram-se só quando são fiáveis: «sem dado» antes de um número inventado.',
      ],
    },
  ],
  contact: {
    heading: 'Contacto',
    ownerLabel: 'Responsável',
    owner: OWNER,
    email: EMAIL,
    note: 'Sugestões, correções de dados ou colaboração: escreve-nos.',
  },
  disclaimer: DISCLAIMER_PT,
};

const aboutEn: PageContent = {
  title: 'About the project',
  intro:
    'Incendib is a free, non-profit web viewer of active wildfires in Spain and Portugal. It brings together public data from official and satellite sources on one clear map, built for mobile and for checking at a glance.',
  updated: 'Updated: July 2026',
  status: STATUS_EN,
  sections: [
    {
      heading: 'What it is',
      paragraphs: [
        'It shows in near real time where wildfires are burning in the Iberian Peninsula, with their status, estimated area and evolution, combining official emergency-service data with satellite detection.',
        'It is a PWA (installable web app): it runs in the browser, can be added to the home screen and works offline with the latest cached data.',
      ],
    },
    {
      heading: 'Why',
      paragraphs: [
        'It exists to give clear, sober, accessible access to information that today is scattered across many agencies and viewers, each with its own format.',
        'It seeks no audience or revenue: there are no ads, no tracking and no data selling.',
      ],
    },
    {
      heading: 'What it is NOT',
      paragraphs: [
        'Incendib is NOT an official emergency channel and does not replace 112. In case of immediate danger, call 112.',
        'Information is aggregated with delay, and satellite detection does not equal a confirmed fire. For any critical decision, always check the official sources.',
      ],
    },
    {
      heading: 'How it works',
      paragraphs: [
        'All data comes from public, official or open sources, credited on the “Sources” screen. The detail of how it is gathered and presented is on the “Methodology” page.',
        'Each marker’s colour and shape encode the fire’s status; they never merely decorate. Figures are shown only when reliable: “no data” rather than an invented number.',
      ],
    },
  ],
  contact: {
    heading: 'Contact',
    ownerLabel: 'Owner',
    owner: OWNER,
    email: EMAIL,
    note: 'Suggestions, data corrections or collaboration: get in touch.',
  },
  disclaimer: DISCLAIMER_EN,
};

// ── Metodología ───────────────────────────────────────────────────────────────

const methodologyEs: PageContent = {
  title: 'Metodología',
  intro:
    'Cómo obtenemos, combinamos y presentamos los datos de incendios. El principio de fondo: no mostrar nunca un dato como más seguro de lo que es.',
  updated: 'Actualizado: julio de 2026',
  status: STATUS_ES,
  sections: [
    {
      heading: 'Fuentes de datos',
      paragraphs: [
        'Incidentes oficiales: fogos.pt / ANEPC (Portugal), INFORCYL / Junta de Castilla y León, INFOCA (Andalucía) y Bombers de la Generalitat (Cataluña). Son las regiones con API pública de incendios activos.',
        'Satélite: NASA FIRMS aporta los focos térmicos (detecciones de calor) y EFFIS / Copernicus los perímetros y el área quemada. En el resto de España, sin API oficial de activos, la información es solo satelital.',
        'Complementos: meteorología local por incendio (Open-Meteo) y titulares de prensa relacionados (Google News).',
      ],
    },
    {
      heading: 'Detección por satélite ≠ incendio confirmado',
      paragraphs: [
        'Un foco de FIRMS es una anomalía térmica detectada por satélite: puede ser un incendio, pero también una quema agrícola, una industria o un falso positivo. Se etiqueta siempre como «no confirmado».',
        'Su ausencia tampoco implica que no haya fuego: el satélite falla por nubes, por el tamaño del foco o por la hora de paso. Por eso el satélite complementa, no reemplaza, al dato oficial.',
      ],
    },
    {
      heading: 'Superficie afectada',
      paragraphs: [
        'Se muestra la cifra oficial de la fuente cuando existe (p. ej. INFORCYL). Donde no la hay, se ofrece una estimación de EFFIS marcada con «~» y la nota «estimación satélite». Si no hay ninguna, «sin dato».',
        'Nunca se inventa ni se interpola una superficie: preferimos «sin dato» a una cifra falsa.',
      ],
    },
    {
      heading: 'Capa de calidad (confirmación satelital)',
      paragraphs: [
        'Cuando un incendio oficial tiene un foco de FIRMS reciente muy cerca, se marca con 🛰 como «actividad térmica detectada». Es una señal positiva de confianza, no un filtro: su ausencia no descarta el incendio.',
      ],
    },
    {
      heading: 'Estados y niveles',
      paragraphs: [
        'Estados: activo, controlado, estabilizado y extinguido. Portugal conserva los suyos (em curso, em resolução, vigilância…). El nivel de gravedad (0–3) es específico de España.',
        'El color y la forma del marcador codifican el estado; el nivel se muestra como etiqueta aparte.',
      ],
    },
    {
      heading: 'Actualización y demora',
      paragraphs: [
        'Cada fuente tiene su propia cadencia y la agregación introduce demora: Incendib no es tiempo real estricto. La hora del último dato se indica en cada ficha.',
      ],
    },
    {
      heading: 'Histórico y permanencia',
      paragraphs: [
        'Cuando un incendio se extingue y sale de las fuentes en vivo, su ficha no desaparece: se conserva la última información conocida, marcada claramente como histórica (sin mostrar meteo ni actividad como si fueran actuales). Los incendios destacados en un boletín se archivan de forma permanente.',
      ],
    },
    {
      heading: 'Boletín semanal',
      paragraphs: [
        'Cada semana ISO cerrada se consolida una foto inmutable de la situación (detecciones, superficie, perímetros, ranking territorial e incendios destacados). Una vez publicada, la edición no se recalcula.',
      ],
    },
    {
      heading: 'Evolución (timeline de la ficha)',
      paragraphs: [
        'Combina los hitos oficiales de la fuente (declaración, cambios de estado), los cambios que deducimos por seguimiento propio —con hora aproximada— y los titulares de prensa relacionados, siempre etiquetados y enlazados para que los puedas verificar.',
      ],
    },
    {
      heading: 'Limitaciones conocidas',
      paragraphs: [
        'Las islas (Canarias, Azores, Madeira) quedan fuera del recorte satelital actual. Las evacuaciones y cortes de vía no se publican en vivo por las fuentes. Las comunidades sin API pública de activos se cubren solo con satélite.',
      ],
    },
  ],
  disclaimer: DISCLAIMER_ES,
};

const methodologyPt: PageContent = {
  title: 'Metodologia',
  intro:
    'Como obtemos, combinamos e apresentamos os dados de incêndios. O princípio de fundo: nunca mostrar um dado como mais seguro do que é.',
  updated: 'Atualizado: julho de 2026',
  status: STATUS_PT,
  sections: [
    {
      heading: 'Fontes de dados',
      paragraphs: [
        'Incidentes oficiais: fogos.pt / ANEPC (Portugal), INFORCYL / Junta de Castilla y León, INFOCA (Andaluzia) e Bombers de la Generalitat (Catalunha). São as regiões com API pública de incêndios ativos.',
        'Satélite: a NASA FIRMS fornece os focos térmicos (deteções de calor) e o EFFIS / Copernicus os perímetros e a área ardida. No resto de Espanha, sem API oficial de ativos, a informação é apenas de satélite.',
        'Complementos: meteorologia local por incêndio (Open-Meteo) e manchetes de imprensa relacionadas (Google News).',
      ],
    },
    {
      heading: 'Deteção por satélite ≠ incêndio confirmado',
      paragraphs: [
        'Um foco do FIRMS é uma anomalia térmica detetada por satélite: pode ser um incêndio, mas também uma queima agrícola, uma indústria ou um falso positivo. É sempre etiquetado como «não confirmado».',
        'A sua ausência também não implica que não haja fogo: o satélite falha por nuvens, pelo tamanho do foco ou pela hora de passagem. Por isso o satélite complementa, não substitui, o dado oficial.',
      ],
    },
    {
      heading: 'Área afetada',
      paragraphs: [
        'Mostra-se o número oficial da fonte quando existe (p. ex. INFORCYL). Onde não há, oferece-se uma estimativa do EFFIS marcada com «~» e a nota «estimativa satélite». Se não houver nenhuma, «sem dado».',
        'Nunca se inventa nem se interpola uma área: preferimos «sem dado» a um número falso.',
      ],
    },
    {
      heading: 'Camada de qualidade (confirmação por satélite)',
      paragraphs: [
        'Quando um incêndio oficial tem um foco do FIRMS recente muito perto, marca-se com 🛰 como «atividade térmica detetada». É um sinal positivo de confiança, não um filtro: a sua ausência não descarta o incêndio.',
      ],
    },
    {
      heading: 'Estados e níveis',
      paragraphs: [
        'Estados: ativo, controlado, estabilizado e extinto. Portugal conserva os seus (em curso, em resolução, vigilância…). O nível de gravidade (0–3) é específico de Espanha.',
        'A cor e a forma do marcador codificam o estado; o nível mostra-se como etiqueta à parte.',
      ],
    },
    {
      heading: 'Atualização e atraso',
      paragraphs: [
        'Cada fonte tem a sua própria cadência e a agregação introduz atraso: o Incendib não é tempo real estrito. A hora do último dado é indicada em cada ficha.',
      ],
    },
    {
      heading: 'Histórico e permanência',
      paragraphs: [
        'Quando um incêndio se extingue e sai das fontes em direto, a sua ficha não desaparece: conserva-se a última informação conhecida, claramente marcada como histórica (sem mostrar meteo nem atividade como se fossem atuais). Os incêndios em destaque num boletim são arquivados de forma permanente.',
      ],
    },
    {
      heading: 'Boletim semanal',
      paragraphs: [
        'Em cada semana ISO fechada consolida-se um retrato imutável da situação (deteções, área, perímetros, ranking territorial e incêndios em destaque). Uma vez publicada, a edição não é recalculada.',
      ],
    },
    {
      heading: 'Evolução (cronologia da ficha)',
      paragraphs: [
        'Combina os marcos oficiais da fonte (declaração, mudanças de estado), as alterações que deduzimos por monitorização própria —com hora aproximada— e as manchetes de imprensa relacionadas, sempre etiquetadas e com ligação para que as possas verificar.',
      ],
    },
    {
      heading: 'Limitações conhecidas',
      paragraphs: [
        'As ilhas (Canárias, Açores, Madeira) ficam fora do recorte de satélite atual. As evacuações e cortes de via não são publicados em direto pelas fontes. As regiões sem API pública de ativos são cobertas apenas por satélite.',
      ],
    },
  ],
  disclaimer: DISCLAIMER_PT,
};

const methodologyEn: PageContent = {
  title: 'Methodology',
  intro:
    'How we gather, combine and present wildfire data. The underlying principle: never present a figure as more certain than it is.',
  updated: 'Updated: July 2026',
  status: STATUS_EN,
  sections: [
    {
      heading: 'Data sources',
      paragraphs: [
        'Official incidents: fogos.pt / ANEPC (Portugal), INFORCYL / Junta de Castilla y León, INFOCA (Andalusia) and Bombers de la Generalitat (Catalonia). These are the regions with a public active-fire API.',
        'Satellite: NASA FIRMS provides thermal hotspots (heat detections) and EFFIS / Copernicus the perimeters and burned area. Across the rest of Spain, with no official active-fire API, the information is satellite-only.',
        'Extras: local per-fire weather (Open-Meteo) and related press headlines (Google News).',
      ],
    },
    {
      heading: 'Satellite detection ≠ confirmed fire',
      paragraphs: [
        'A FIRMS hotspot is a satellite-detected thermal anomaly: it may be a wildfire, but also an agricultural burn, an industrial source or a false positive. It is always labelled “unconfirmed”.',
        'Its absence does not mean there is no fire either: satellites miss fires due to clouds, small size or pass timing. That is why satellite data complements, not replaces, official data.',
      ],
    },
    {
      heading: 'Affected area',
      paragraphs: [
        'The official figure from the source is shown when it exists (e.g. INFORCYL). Where it does not, an EFFIS estimate is offered, marked with “~” and the note “satellite estimate”. If there is none, “no data”.',
        'An area is never invented or interpolated: we prefer “no data” to a false figure.',
      ],
    },
    {
      heading: 'Quality layer (satellite confirmation)',
      paragraphs: [
        'When an official fire has a recent FIRMS hotspot very close by, it is marked with 🛰 as “thermal activity detected”. It is a positive confidence signal, not a filter: its absence does not rule the fire out.',
      ],
    },
    {
      heading: 'Statuses and levels',
      paragraphs: [
        'Statuses: active, contained, stabilised and extinguished. Portugal keeps its own (em curso, em resolução, vigilância…). The severity level (0–3) is specific to Spain.',
        'Marker colour and shape encode the status; the level is shown as a separate tag.',
      ],
    },
    {
      heading: 'Updates and delay',
      paragraphs: [
        'Each source has its own cadence and aggregation adds delay: Incendib is not strict real time. The time of the latest data is shown on each fire page.',
      ],
    },
    {
      heading: 'History and permanence',
      paragraphs: [
        'When a fire is extinguished and drops out of the live sources, its page does not vanish: the last known information is kept, clearly marked as historical (without showing weather or activity as if current). Fires featured in a bulletin are archived permanently.',
      ],
    },
    {
      heading: 'Weekly bulletin',
      paragraphs: [
        'Each closed ISO week is consolidated into an immutable snapshot of the situation (detections, area, perimeters, territorial ranking and featured fires). Once published, the edition is not recomputed.',
      ],
    },
    {
      heading: 'Timeline (on the fire page)',
      paragraphs: [
        'It combines official milestones from the source (declaration, status changes), the changes we infer from our own tracking —with approximate times— and related press headlines, always labelled and linked so you can verify them.',
      ],
    },
    {
      heading: 'Known limitations',
      paragraphs: [
        'The islands (Canary Islands, Azores, Madeira) fall outside the current satellite clip. Evacuations and road closures are not published live by the sources. Regions with no public active-fire API are covered by satellite only.',
      ],
    },
  ],
  disclaimer: DISCLAIMER_EN,
};

export const ABOUT: Record<Locale, PageContent> = { es: aboutEs, pt: aboutPt, en: aboutEn };
export const METHODOLOGY: Record<Locale, PageContent> = {
  es: methodologyEs,
  pt: methodologyPt,
  en: methodologyEn,
};
