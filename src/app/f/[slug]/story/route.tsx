import { ImageResponse } from 'next/og';
import { resolveFire } from '@/lib/fires/resolve';
import { dark } from '@/lib/design/tokens';
import { fireSurface } from '@/lib/fires/surface';
import { formatDateTime } from '@/lib/utils/format';
import {
  frameRings,
  frameCenter,
  ringToSvgPoints,
  type Bbox3857,
} from '@/lib/fires/story-frame';
import type { Fire } from '@/types/fire';

/**
 * Imagen VERTICAL 1080×1920 (9:16) de un incendio, para compartir en historias
 * (Instagram Stories, WhatsApp Estados…). La consume el botón «Historia de
 * Instagram» de la ficha (ShareMenu): hace `fetch` de esta ruta, envuelve el PNG
 * en un `File` y lo pasa a la Web Share API nivel 2 (o lo descarga en escritorio).
 *
 * Fondo (best-effort con timeout, con degradación limpia): cuando el incendio
 * tiene perímetro de área quemada, el lienzo se **encuadra a la cicatriz** y se
 * superpone ese perímetro real (EFFIS/Sentinel-2) resaltado —relleno translúcido
 * + trazo incandescente— para que la imagen muestre la ZONA QUEMADA, no solo el
 * paisaje. Las capas de fondo son:
 *   - **Mosaico Sentinel-2 cloudless (EOX)**: base keyless, terreno real del lugar
 *     (sin cicatriz en los píxeles, pero el perímetro superpuesto sí la marca).
 *   - **Sentinel-2 reciente en falso color SWIR** (Copernicus Data Space, si hay
 *     clave `SENTINEL_HUB_CLIENT_ID/SECRET`): la cicatriz se ve en los propios
 *     píxeles (marrón/naranja). Se pide DESDE el inicio del incendio hacia el
 *     presente (`mostRecent`) para captar la escena posterior al fuego, y se
 *     compone ENCIMA del mosaico EOX con transparencia (`dataMask`): donde no hay
 *     dato reciente (nubes, sin pasada aún) se ve el terreno EOX, nunca un
 *     recuadro negro. Requiere una clave gratuita de CDSE; sin ella, solo EOX.
 *   - Degradado de marca si no hay coordenadas o falla todo.
 * El texto (nombre, estado con su color, superficie, hora, crédito y disclaimer
 * 112) se compone siempre encima, sobre un velo oscuro para legibilidad.
 *
 * Respeta las zonas seguras de Stories: la UI de IG tapa ~250 px arriba (perfil)
 * y ~300 px abajo (barra de responder), así que lo importante va en la banda
 * central-baja. El perímetro va centrado (banda media), donde el velo es tenue.
 */

// resolveFire lee del sistema de ficheros (archivo git) y de Redis → Node, nunca
// edge. force-dynamic: el estado y el «actualizado» del dato en vivo se resuelven
// por request (no servir un PNG con estado congelado). La cabecera Cache-Control
// permite una caché muy breve (60 s) solo para no re-golpear las fuentes en reenvíos.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const STATE_COLOR: Record<string, string> = {
  activo: dark.state.activo.base,
  controlado: dark.state.controlado.base,
  estabilizado: dark.state.estabilizado.base,
  extinguido: dark.state.extinguido.base,
};

const SIZE = { width: 1080, height: 1920 } as const;
const ASPECT = SIZE.width / SIZE.height; // 9:16 = 0.5625

/** `#E5484D` + alfa → `rgba(229, 72, 77, a)` (Satori/resvg no admiten color-mix). */
function rgba(hex: string, a: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

// ── Encuadre ────────────────────────────────────────────────────────────────
// La imagen de satélite se descarga a 486×864 (0,45× del lienzo, mismo 9:16): a
// tamaño completo el render WMS tarda ~17 s (inservible); a esta resolución ~2 s
// y basta porque va tras un velo y el texto. Se escala al lienzo.
const SAT_W = 486;
const SAT_H = 864;
// Semialturas del recuadro en METROS PROYECTADOS (Web Mercator; a lat ~40 se
// dividen por ~cos(40°)≈0,77 para pasar a metros de terreno).
const FRAME_MIN_HALF_H = 4500; // ~3,4 km de semialtura → ~6,9 km de alto mínimo
const FRAME_MAX_HALF_H = 32000; // ~24 km de semialtura → cicatriz enorme, aún reconocible
const FRAME_FALLBACK_HALF_H = 9000; // sin perímetro: encuadre fijo (como antes)
const FRAME_PADDING = 1.5;

// ── Fondo de satélite ─────────────────────────────────────────────────────────
type BackdropSource = 'sentinel' | 'eox';
interface Backdrop {
  /** Base keyless (mosaico EOX), si se pudo descargar. */
  eox?: string;
  /** Sentinel-2 falso color (con `dataMask` alfa), superpuesto sobre `eox`. */
  sentinel?: string;
  /** Fuente dominante para el crédito. */
  source: BackdropSource;
}

const EOX_TIMEOUT_MS = 5000;
const SH_TIMEOUT_MS = 8000;
const MIN_IMAGE_BYTES = 2000; // recorte casi vacío → descartar

/** EOX WMS GetMap del mosaico Sentinel-2 cloudless, recortado a `bbox` (EPSG:3857). */
function eoxUrl(bbox: Bbox3857): string {
  const p = new URLSearchParams({
    service: 'WMS',
    request: 'GetMap',
    version: '1.1.1',
    layers: 's2cloudless-2024_3857', // `_3857` (Web Mercator nativo); sin sufijo es EPSG:4326 y saldría vacío
    srs: 'EPSG:3857',
    bbox: bbox.map((n) => n.toFixed(2)).join(','),
    width: String(SAT_W),
    height: String(SAT_H),
    format: 'image/jpeg',
  });
  return `https://tiles.maps.eox.at/wms?${p.toString()}`;
}

/** Descarga una imagen como data URL (best-effort, con timeout). null si falla. */
async function fetchImageDataUrl(
  url: string,
  timeoutMs: number,
  init?: RequestInit,
): Promise<string | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal });
    if (!res.ok) return null;
    const type = res.headers.get('content-type') ?? '';
    if (!type.startsWith('image/')) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength < MIN_IMAGE_BYTES) return null;
    return `data:${type};base64,${buf.toString('base64')}`;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// ── Sentinel-2 falso color (Copernicus Data Space Ecosystem / Sentinel Hub) ────
// Opt-in: solo se intenta si hay credenciales. El propietario crea un cliente
// OAuth gratuito en CDSE (https://dataspace.copernicus.eu) y define las variables
// en Vercel. Sin ellas, esta función es un no-op y el fondo es solo EOX.
const SH_CLIENT_ID = process.env.SENTINEL_HUB_CLIENT_ID;
const SH_CLIENT_SECRET = process.env.SENTINEL_HUB_CLIENT_SECRET;
const SH_ENABLED = Boolean(SH_CLIENT_ID && SH_CLIENT_SECRET);
const SH_TOKEN_URL =
  'https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token';
const SH_PROCESS_URL = 'https://sh.dataspace.copernicus.eu/api/v1/process';
// Falso color SWIR: R=B12 (SWIR2), G=B08 (NIR), B=B04 (rojo). La vegetación sana
// sale verde intenso y las cicatrices de quemado, marrón/naranja vivo. El 4º
// canal es `dataMask` → alfa: donde no hay dato (nube/sin pasada) el píxel queda
// TRANSPARENTE (se ve el mosaico EOX debajo), nunca negro.
const SH_EVALSCRIPT = `//VERSION=3
function setup(){return{input:["B04","B08","B12","dataMask"],output:{bands:4}};}
function evaluatePixel(s){const g=2.5;return [g*s.B12,g*s.B08,g*s.B04,s.dataMask];}`;
const SH_MAX_LOOKBACK_MS = 120 * 24 * 3600e3; // tope de antigüedad de la escena

// Token OAuth cacheado en memoria (se pierde en cada arranque en frío; aceptable).
let shToken: { value: string; exp: number } | null = null;
async function shAccessToken(signal: AbortSignal): Promise<string | null> {
  if (!SH_ENABLED) return null;
  if (shToken && shToken.exp > Date.now() + 30_000) return shToken.value;
  try {
    const res = await fetch(SH_TOKEN_URL, {
      method: 'POST',
      signal,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: SH_CLIENT_ID!,
        client_secret: SH_CLIENT_SECRET!,
      }),
    });
    if (!res.ok) return null;
    const j = (await res.json()) as { access_token?: string; expires_in?: number };
    if (!j.access_token) return null;
    shToken = { value: j.access_token, exp: Date.now() + (j.expires_in ?? 600) * 1000 };
    return shToken.value;
  } catch {
    return null;
  }
}

/**
 * Sentinel-2 reciente en falso color recortado a `bbox` (Process API). Ventana
 * temporal: desde el inicio del incendio (`startedAt`, acotado a 120 días) hasta
 * hoy, tomando la escena `mostRecent` (la más reciente POSTERIOR al fuego → la
 * que enseña la cicatriz), no la menos nubosa de un periodo cualquiera. Devuelve
 * un PNG con alfa (`dataMask`) para componer sobre EOX. null si falla.
 */
async function sentinelHubBackdrop(bbox: Bbox3857, startedAt?: string): Promise<string | null> {
  if (!SH_ENABLED) return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), SH_TIMEOUT_MS);
  try {
    const token = await shAccessToken(ctrl.signal);
    if (!token) return null;
    const now = Date.now();
    const started = startedAt ? Date.parse(startedAt) : NaN;
    // Desde el inicio del fuego (para captar la cicatriz), pero nunca más atrás
    // de 120 días; si no hay `startedAt`, ventana de 45 días.
    const fromMs = Number.isFinite(started)
      ? Math.min(Math.max(started, now - SH_MAX_LOOKBACK_MS), now)
      : now - 45 * 24 * 3600e3;
    const body = {
      input: {
        bounds: {
          bbox,
          properties: { crs: 'http://www.opengis.net/def/crs/EPSG/0/3857' },
        },
        data: [
          {
            type: 'sentinel-2-l2a',
            dataFilter: {
              timeRange: { from: new Date(fromMs).toISOString(), to: new Date(now).toISOString() },
              maxCloudCoverage: 40,
              mosaickingOrder: 'mostRecent', // la escena más reciente (posterior al fuego)
            },
          },
        ],
      },
      output: {
        width: SAT_W,
        height: SAT_H,
        responses: [{ identifier: 'default', format: { type: 'image/png' } }],
      },
      evalscript: SH_EVALSCRIPT,
    };
    const res = await fetch(SH_PROCESS_URL, {
      method: 'POST',
      signal: ctrl.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        Accept: 'image/png',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    const type = res.headers.get('content-type') ?? '';
    if (!type.startsWith('image/')) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength < MIN_IMAGE_BYTES) return null;
    return `data:${type};base64,${buf.toString('base64')}`;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// Caché en memoria del fondo ya descargado, por recuadro (el mosaico/escena de un
// lugar es estable). Un acierto sirve a las comparticiones siguientes. Acotada
// (FIFO) para no crecer sin límite en una instancia caliente. Se pierde en cada
// arranque en frío (mejora oportunista).
const SAT_TTL_MS = 24 * 60 * 60 * 1000;
const SAT_CACHE_MAX = 200;
const satCache = new Map<string, { val: Backdrop; exp: number }>();
function cachePut(key: string, val: Backdrop): void {
  if (satCache.size >= SAT_CACHE_MAX) {
    const oldest = satCache.keys().next().value; // Map conserva orden de inserción
    if (oldest !== undefined) satCache.delete(oldest);
  }
  satCache.set(key, { val, exp: Date.now() + SAT_TTL_MS });
}

/**
 * Fondo para `bbox`: mosaico EOX (base keyless) y, si hay clave, Sentinel-2 falso
 * color encima (transparente donde no hay dato). Cacheado. Con clave, ambas
 * peticiones van EN PARALELO (no se suman los timeouts).
 */
async function backdropFor(bbox: Bbox3857, startedAt?: string): Promise<Backdrop | null> {
  const key = bbox.map((n) => Math.round(n)).join(',') + (SH_ENABLED ? `|${startedAt ?? ''}` : '');
  const hit = satCache.get(key);
  if (hit && hit.exp > Date.now()) return hit.val;

  let val: Backdrop | null = null;
  if (SH_ENABLED) {
    const [eox, sentinel] = await Promise.all([
      fetchImageDataUrl(eoxUrl(bbox), EOX_TIMEOUT_MS),
      sentinelHubBackdrop(bbox, startedAt),
    ]);
    if (eox || sentinel) {
      val = {
        eox: eox ?? undefined,
        sentinel: sentinel ?? undefined,
        source: sentinel ? 'sentinel' : 'eox',
      };
    }
  } else {
    const eox = await fetchImageDataUrl(eoxUrl(bbox), EOX_TIMEOUT_MS);
    if (eox) val = { eox, source: 'eox' };
  }
  if (val) cachePut(key, val);
  return val;
}

// ── Perímetro / encuadre del incendio ──────────────────────────────────────────
/** Anillos de área quemada del incendio (perímetro + extensión provisional). */
function fireRings(fire: Fire): { perimeter: [number, number][] | null; extra: [number, number][] | null } {
  const perimeter = fire.perimeter && fire.perimeter.length >= 3 ? fire.perimeter : null;
  const extra = fire.perimeterExtra && fire.perimeterExtra.length >= 3 ? fire.perimeterExtra : null;
  return { perimeter, extra };
}

// Encuadre editorial de reserva (TEMPORAL, emergencia Gredos jul 2026): solo se
// usa cuando el incendio NO tiene perímetro que enmarcar. Burgohondo → embalse de
// El Burguillo (referencia del valle). Retirar cuando termine la emergencia.
const EL_BURGUILLO: [number, number] = [-4.5775, 40.4236];
function fallbackCenter(fire: Fire): [number, number] {
  if (fire.municipality?.toLowerCase() === 'burgohondo') return EL_BURGUILLO;
  return fire.coordinates;
}

/**
 * SVG del perímetro superpuesto (mismo lienzo/bbox que el fondo). Réplica del
 * estilo del mapa: relleno translúcido + casing claro + línea del color del
 * estado, SÓLIDO para perímetros reales y DISCONTINUO para estimados/extensión
 * («el color codifica dato, nunca decora»; discontinuo = «no oficial»). Se
 * devuelve como data URL para un `<img>` (resvg lo rasteriza; alineación exacta).
 */
function overlayDataUrl(opts: {
  perimeter: [number, number][] | null;
  extra: [number, number][] | null;
  bbox: Bbox3857;
  color: string;
  approx: boolean; // perímetro principal estimado/provisional
}): string | null {
  const { perimeter, extra, bbox, color, approx } = opts;
  const layers: string[] = [];

  // Extensión provisional (siempre discontinua, tenue): se dibuja debajo.
  if (extra) {
    const pts = ringToSvgPoints(extra, bbox, SIZE.width, SIZE.height);
    layers.push(
      `<polygon points="${pts}" fill="${rgba(color, 0.08)}" stroke="rgba(255,255,255,0.3)" stroke-width="7" stroke-linejoin="round"/>`,
      `<polygon points="${pts}" fill="none" stroke="${color}" stroke-width="4" stroke-dasharray="18 12" stroke-linejoin="round"/>`,
    );
  }

  // Perímetro principal (área quemada). Real → glow + casing + línea sólida.
  if (perimeter) {
    const pts = ringToSvgPoints(perimeter, bbox, SIZE.width, SIZE.height);
    if (approx) {
      layers.push(
        `<polygon points="${pts}" fill="${rgba(color, 0.12)}" stroke="rgba(255,255,255,0.4)" stroke-width="9" stroke-linejoin="round"/>`,
        `<polygon points="${pts}" fill="none" stroke="${color}" stroke-width="5" stroke-dasharray="20 14" stroke-linejoin="round"/>`,
      );
    } else {
      layers.push(
        `<polygon points="${pts}" fill="none" stroke="${rgba(color, 0.38)}" stroke-width="30" stroke-linejoin="round"/>`, // glow
        `<polygon points="${pts}" fill="${rgba(color, 0.22)}" stroke="rgba(255,255,255,0.55)" stroke-width="11" stroke-linejoin="round"/>`, // relleno + casing
        `<polygon points="${pts}" fill="none" stroke="${color}" stroke-width="5" stroke-linejoin="round"/>`, // línea
      );
    }
  }

  if (layers.length === 0) return null;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE.width}" height="${SIZE.height}" viewBox="0 0 ${SIZE.width} ${SIZE.height}">${layers.join('')}</svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

/** Crédito de la imagen base según las capas de fondo presentes. */
function backdropCredit(backdrop: Backdrop): string {
  if (backdrop.sentinel && backdrop.eox)
    return 'Sentinel-2 en falso color (Copernicus) sobre mosaico cloudless © EOX · Contains modified Copernicus Sentinel data';
  if (backdrop.sentinel)
    return 'Sentinel-2 en falso color · Contains modified Copernicus Sentinel data';
  return 'Sentinel-2 cloudless 2024 © EOX · Contains modified Copernicus Sentinel data';
}

/**
 * Crédito honesto del perímetro superpuesto. `EFFIS (Copernicus)` SOLO cuando el
 * perímetro proviene de un área EFFIS adjuntada (`perimeterSourceSlug`) — no se
 * asume EFFIS para perímetros propios de la fuente o sintéticos (mock). Estimado
 * / provisional / extensión → «no oficial».
 */
function perimeterCredit(fire: Fire, onlyExtra: boolean, approx: boolean): string {
  if (approx || onlyExtra) return 'Perímetro estimado (no oficial)';
  if (fire.perimeterSourceSlug) return 'Perímetro de área quemada: EFFIS (Copernicus)';
  return 'Perímetro de área quemada';
}

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const resolved = await resolveFire(slug);
  const fire = resolved?.fire ?? null;
  const historical = Boolean(resolved && resolved.origin !== 'live');
  const hasLocation = Boolean(resolved?.hasLocation);

  // Encuadre: a la cicatriz si hay perímetro/extensión; si no, al foco (fijo).
  const rings = fire ? fireRings(fire) : { perimeter: null, extra: null };
  const hasRings = Boolean(rings.perimeter || rings.extra);
  const bbox: Bbox3857 | null = fire
    ? hasRings
      ? frameRings([rings.perimeter, rings.extra].filter(Boolean) as [number, number][][], {
          aspect: ASPECT,
          padding: FRAME_PADDING,
          minHalfHeight: FRAME_MIN_HALF_H,
          maxHalfHeight: FRAME_MAX_HALF_H,
        })
      : hasLocation
        ? frameCenter(fallbackCenter(fire), ASPECT, FRAME_FALLBACK_HALF_H)
        : null
    : null;

  const backdrop = bbox ? await backdropFor(bbox, fire?.startedAt) : null;

  const stateColor = historical
    ? dark.text.mute
    : fire
      ? (STATE_COLOR[fire.state] ?? dark.text.primary)
      : dark.text.primary;

  // Perímetro superpuesto: solo si hay fondo (si no, el degradado no tiene
  // referencia geográfica y el trazo no significaría nada) y anillos que dibujar.
  const perimeterApprox = Boolean(fire?.perimeterApprox || fire?.perimeterProvisional);
  const onlyExtra = !rings.perimeter && Boolean(rings.extra);
  const overlay =
    backdrop && bbox && hasRings
      ? overlayDataUrl({
          perimeter: rings.perimeter,
          extra: rings.extra,
          bbox,
          color: stateColor,
          approx: perimeterApprox,
        })
      : null;

  // Capas de fondo en orden de pintado: mosaico EOX (base) y Sentinel-2 encima.
  const bgLayers = backdrop ? [backdrop.eox, backdrop.sentinel].filter(Boolean) : [];

  const surfaceLabel = fire ? fireSurface(fire).label : '';

  const place = fire
    ? [fire.municipality, fire.province].filter((x) => x && x !== '—').join(' · ') ||
      fire.region.replace(/\s*\(PT\)/, '')
    : 'Incendio';

  // Sello temporal HONESTO: la hora del último dato de la fuente (`updatedAt`),
  // no la hora de render, para no aparentar una confirmación más fresca de la real.
  const footer = fire
    ? `${historical ? 'Histórico' : `Actualizado ${formatDateTime(fire.updatedAt)}`} · No sustituye al 112`
    : 'No sustituye al 112';

  const credit = backdrop
    ? [backdropCredit(backdrop), overlay && fire ? perimeterCredit(fire, onlyExtra, perimeterApprox) : null]
        .filter(Boolean)
        .join(' · ')
    : null;

  return new ImageResponse(
    (
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          display: 'flex',
          background: dark.bg.base,
        }}
      >
        {/* Fondo: capas de satélite (EOX y, si hay clave, Sentinel-2 encima) si las
            hay; si no, degradado de marca. */}
        {bgLayers.length > 0 ? (
          bgLayers.map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={src as string}
              width={SIZE.width}
              height={SIZE.height}
              alt=""
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
            />
          ))
        ) : (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              background: `radial-gradient(70% 45% at 50% 34%, ${rgba(stateColor, 0.32)} 0%, ${rgba(stateColor, 0)} 70%), linear-gradient(180deg, ${dark.bg.raised} 0%, ${dark.bg.base} 55%, ${dark.bg.sunken} 100%)`,
            }}
          />
        )}

        {/* Perímetro de área quemada resaltado, alineado al fondo. */}
        {overlay && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={overlay}
            width={SIZE.width}
            height={SIZE.height}
            alt=""
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
          />
        )}

        {/* Velo oscuro: legibilidad del texto y protección de las zonas seguras. */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: backdrop
              ? 'linear-gradient(180deg, rgba(8,12,18,0.55) 0%, rgba(8,12,18,0.12) 26%, rgba(8,12,18,0.55) 66%, rgba(8,12,18,0.94) 100%)'
              : 'linear-gradient(180deg, rgba(8,12,18,0.4) 0%, rgba(8,12,18,0) 40%, rgba(8,12,18,0.55) 100%)',
          }}
        />

        {/* Contenido: marca arriba, bloque de datos abajo (zonas seguras de IG). */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            paddingTop: 210,
            paddingBottom: 300,
            paddingLeft: 88,
            paddingRight: 88,
            color: dark.text.primary,
          }}
        >
          {/* Cabecera de marca: logo (gota de retardante en negativo sobre cuadrado
              rojo) + wordmark «Incend» + «IB» en rojo. Réplica de Logo/Wordmark. */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 66,
                height: 66,
                borderRadius: 14,
                background: dark.state.activo.base,
              }}
            >
              <div
                style={{
                  width: 22,
                  height: 22,
                  background: dark.bg.base,
                  borderTopLeftRadius: '50%',
                  borderTopRightRadius: '50%',
                  borderBottomRightRadius: '50%',
                  borderBottomLeftRadius: 0,
                  transform: 'rotate(-45deg)',
                }}
              />
            </div>
            <div style={{ display: 'flex', fontSize: 46, fontWeight: 700, letterSpacing: '-0.01em' }}>
              <span style={{ color: dark.text.primary }}>Incend</span>
              <span style={{ color: dark.state.activo.base }}>IB</span>
            </div>
          </div>

          {/* Bloque de datos */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 42, color: dark.text.secondary, marginBottom: 22 }}>{place}</span>
            <span
              style={{
                fontSize: 100,
                fontWeight: 700,
                letterSpacing: '-0.02em',
                lineHeight: 1.04,
              }}
            >
              {fire ? `Incendio de ${fire.name}` : 'Incendio no encontrado'}
            </span>

            {fire && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 40, marginTop: 44 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 22, color: stateColor }}>
                  <div style={{ width: 30, height: 30, borderRadius: '50%', background: stateColor }} />
                  <span style={{ fontSize: 50, fontWeight: 600 }}>{fire.state.toUpperCase()}</span>
                </div>
                {surfaceLabel && (
                  <span style={{ fontSize: 50, fontWeight: 600, color: dark.text.body }}>{surfaceLabel}</span>
                )}
              </div>
            )}

            <span style={{ fontSize: 30, color: dark.text.mute, marginTop: 40 }}>{footer}</span>
            {credit && (
              <span style={{ fontSize: 21, color: dark.text.mute, marginTop: 14, lineHeight: 1.3 }}>
                {credit}
              </span>
            )}
          </div>
        </div>
      </div>
    ),
    { ...SIZE, headers: { 'Cache-Control': 'public, max-age=60' } },
  );
}
