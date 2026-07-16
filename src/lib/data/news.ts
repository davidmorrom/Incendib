/**
 * Contenido de la pestaña Noticias (mock). En live: RSS de Google News/EFFIS
 * FireNews, imágenes de cámaras DGT (NAP) y perfiles oficiales. El texto de las
 * noticias está en su idioma de origen (no se traduce).
 */

export interface NewsItem {
  id: string;
  region: string;
  /** País de origen del feed (para filtrar por país sin adivinarlo del texto). */
  country: 'ES' | 'PT';
  /** Acento del tag de región. */
  tone: 'warn' | 'action';
  /** ISO 8601. Si `undated`, no es fiable (no se conoce la fecha real). */
  at: string;
  /** El feed no traía fecha válida: NO se debe presentar como reciente. */
  undated?: boolean;
  source: string;
  title: string;
  url: string;
}

/** Fecha centinela para titulares sin fecha: los ordena al final, nunca arriba. */
export const UNDATED_AT = '1970-01-01T00:00:00.000Z';

export interface TrafficCamera {
  id: string;
  name: string;
  /** Ubicación (carretera · km). */
  location: string;
  url?: string;
}

export interface OfficialAccount {
  handle: string;
  tone: 'action' | 'activo' | 'ok';
  url: string;
}

export interface LiveChannel {
  id: string;
  label: string;
  /** Canal de YouTube para el directo (vacío = sin embed verificado). */
  channelId: string;
  title: string;
}

export const LIVE_CHANNELS: LiveChannel[] = [
  {
    id: 'rtve',
    label: 'RTVE 24H',
    channelId: 'UC7QZIf0dta-XPXsp9Hv4dTw',
    title: 'Canal 24 Horas · especial incendios forestales',
  },
  { id: 'rtp3', label: 'RTP3', channelId: '', title: 'RTP3 · Notícias (Portugal)' },
];

export const MOCK_NEWS: NewsItem[] = [
  {
    id: 'n1',
    region: 'Extremadura',
    country: 'ES',
    tone: 'warn',
    at: '2026-07-10T14:14:00+02:00',
    source: 'RTVE',
    title: 'La UME refuerza el operativo en Las Hurdes ante el cambio de viento',
    url: '#',
  },
  {
    id: 'n1b',
    region: 'Extremadura',
    country: 'ES',
    tone: 'warn',
    at: '2026-07-10T14:02:00+02:00',
    source: 'EFE',
    title: 'La UME refuerza su despliegue en Las Hurdes por el giro del viento',
    url: '#',
  },
  {
    id: 'n2',
    region: 'Canarias',
    country: 'ES',
    tone: 'warn',
    at: '2026-07-10T13:51:00+02:00',
    source: 'Canarias7',
    title: 'Estabilizado el flanco norte del incendio de Tejeda; siguen las 900 evacuaciones',
    url: '#',
  },
  {
    id: 'n3',
    region: 'Portugal',
    country: 'PT',
    tone: 'action',
    at: '2026-07-10T13:32:00+01:00',
    source: 'RTP',
    title: 'Odemira: incêndio em curso mobiliza 240 operacionais no Alentejo',
    url: '#',
  },
];

export const MOCK_CAMERAS: TrafficCamera[] = [
  { id: 'c1', name: 'Caminomorisco N', location: 'EX-204 · km 12' },
  { id: 'c2', name: 'Plasencia', location: 'A-66 · km 480' },
  { id: 'c3', name: 'Béjar', location: 'N-630' },
];

export const MOCK_ACCOUNTS: OfficialAccount[] = [
  { handle: '@UMEgob', tone: 'action', url: 'https://twitter.com/UMEgob' },
  { handle: '@Plan_INFOCA', tone: 'action', url: 'https://twitter.com/Plan_INFOCA' },
  { handle: '112 Extremadura', tone: 'activo', url: 'https://twitter.com/112extremadura' },
  { handle: '@ProtecCivil', tone: 'ok', url: 'https://twitter.com/ProtecCivil' },
];
