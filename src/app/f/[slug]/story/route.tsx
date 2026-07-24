import { ImageResponse } from 'next/og';
import { resolveFire } from '@/lib/fires/resolve';
import { dark } from '@/lib/design/tokens';
import { fireSurface } from '@/lib/fires/surface';
import { formatDateTime } from '@/lib/utils/format';

/**
 * Imagen VERTICAL 1080×1920 (9:16) de un incendio, para compartir en historias
 * (Instagram Stories, WhatsApp Estados…). La consume el botón «Historia de
 * Instagram» de la ficha (ShareMenu): hace `fetch` de esta ruta, envuelve el PNG
 * en un `File` y lo pasa a la Web Share API nivel 2 (o lo descarga en escritorio).
 *
 * Fondo: mosaico Sentinel-2 cloudless (EOX) del lugar del incendio, best-effort
 * con timeout; si falla o no hay coordenadas, un card de degradado con la paleta
 * oscura de marca (coherente con la imagen OG). El texto (nombre, estado con su
 * color, superficie, hora, crédito y disclaimer 112) se compone siempre encima.
 *
 * Respeta las zonas seguras de Stories: la UI de IG tapa ~250 px arriba (perfil)
 * y ~300 px abajo (barra de responder), así que lo importante va en la banda
 * central-baja, sobre un velo oscuro que garantiza legibilidad sobre el satélite.
 */

// resolveFire lee del sistema de ficheros (archivo git) y de Redis → Node, nunca
// edge. force-dynamic: el estado y el «actualizado» del dato en vivo se resuelven
// por request (no servir un PNG con estado congelado). La cabecera Cache-Control
// permite una caché muy breve (60 s) solo para no re-golpear EOX en reenvíos rápidos.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const STATE_COLOR: Record<string, string> = {
  activo: dark.state.activo.base,
  controlado: dark.state.controlado.base,
  estabilizado: dark.state.estabilizado.base,
  extinguido: dark.state.extinguido.base,
};

const SIZE = { width: 1080, height: 1920 } as const;

/** `#E5484D` + alfa → `rgba(229, 72, 77, a)` (Satori no admite color-mix). */
function rgba(hex: string, a: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

// lon/lat (WGS84) → EPSG:3857 (Web Mercator), R = radio ecuatorial.
const MERC_R = 6378137;
function mercator(lon: number, lat: number): [number, number] {
  const x = (MERC_R * lon * Math.PI) / 180;
  const y = MERC_R * Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 180 / 2));
  return [x, y];
}

/**
 * URL GetMap (WMS) de EOX centrada en el incendio, con el bbox en proporción
 * 9:16 para llenar el lienzo sin deformar el píxel. Capa `_3857` (nativa Web
 * Mercator; la variante sin sufijo es EPSG:4326 y devolvería un recorte vacío).
 */
function eoxUrl([lon, lat]: [number, number]): string {
  const [cx, cy] = mercator(lon, lat);
  const halfH = 9000; // metros proyectados (≈14 km de terreno a lat ~40)
  const halfW = (halfH * SIZE.width) / SIZE.height;
  const bbox = [cx - halfW, cy - halfH, cx + halfW, cy + halfH].map((n) => n.toFixed(2)).join(',');
  const p = new URLSearchParams({
    service: 'WMS',
    request: 'GetMap',
    version: '1.1.1',
    layers: 's2cloudless-2024_3857',
    srs: 'EPSG:3857',
    bbox,
    width: String(SIZE.width),
    height: String(SIZE.height),
    format: 'image/jpeg',
  });
  return `https://tiles.maps.eox.at/wms?${p.toString()}`;
}

// Timeout corto: una imagen de compartir debe salir aunque EOX (best-effort,
// sin SLA — se han visto de 2 s a 17 s) tarde o falle. Si EOX no llega a tiempo,
// se usa el card de degradado.
const SAT_TIMEOUT_MS = 3000;
// Caché en memoria del fondo ya descargado: el mosaico Sentinel-2 de un lugar es
// ESTÁTICO, así que un único acierto de EOX sirve a todas las comparticiones
// siguientes de ese incendio (y no re-golpea un servicio best-effort). Se pierde
// en cada arranque en frío de la función (aceptable: es una mejora oportunista).
const SAT_TTL_MS = 24 * 60 * 60 * 1000;
const satCache = new Map<string, { url: string; exp: number }>();

/** Descarga el fondo de satélite como data URL, best-effort y cacheado. */
async function satelliteBackdrop(coords: [number, number]): Promise<string | null> {
  const key = coords.map((n) => n.toFixed(3)).join(',');
  const hit = satCache.get(key);
  if (hit && hit.exp > Date.now()) return hit.url;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), SAT_TIMEOUT_MS);
  try {
    const res = await fetch(eoxUrl(coords), { signal: ctrl.signal });
    if (!res.ok) return null;
    const type = res.headers.get('content-type') ?? '';
    if (!type.startsWith('image/')) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength < 3000) return null; // recorte casi vacío → descartar
    const url = `data:${type};base64,${buf.toString('base64')}`;
    satCache.set(key, { url, exp: Date.now() + SAT_TTL_MS });
    return url;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const resolved = await resolveFire(slug);
  const fire = resolved?.fire ?? null;
  const historical = Boolean(resolved && resolved.origin !== 'live');
  const hasLocation = Boolean(resolved?.hasLocation);

  const backdrop = fire && hasLocation ? await satelliteBackdrop(fire.coordinates) : null;

  const stateColor = historical
    ? dark.text.mute
    : fire
      ? (STATE_COLOR[fire.state] ?? dark.text.primary)
      : dark.text.primary;

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
        {/* Fondo: satélite si lo hay; si no, degradado con la paleta de marca. */}
        {backdrop ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={backdrop}
            width={SIZE.width}
            height={SIZE.height}
            alt=""
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
          />
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

        {/* Marca de UBICACIÓN en el centro exacto (solo sobre satélite). Neutra
            (blanca), no en color de estado, y sin relleno: un localizador, para
            que no se lea como el perímetro/extensión del incendio (que no se dibuja). */}
        {backdrop && (
          <div
            style={{
              position: 'absolute',
              left: SIZE.width / 2 - 66,
              top: SIZE.height / 2 - 66,
              width: 132,
              height: 132,
              borderRadius: '50%',
              border: '4px solid rgba(255,255,255,0.92)',
              boxShadow: '0 0 0 3px rgba(8,12,18,0.6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                width: 18,
                height: 18,
                borderRadius: '50%',
                background: '#fff',
                boxShadow: '0 0 0 3px rgba(8,12,18,0.6)',
              }}
            />
          </div>
        )}

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
          {/* Cabecera de marca */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 26 }}>
            <div style={{ width: 64, height: 64, borderRadius: 16, background: dark.state.activo.base }} />
            <span style={{ fontSize: 46, fontWeight: 700, letterSpacing: '-0.01em' }}>Incendib</span>
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
            {backdrop && (
              <span style={{ fontSize: 21, color: dark.text.mute, marginTop: 14, lineHeight: 1.3 }}>
                Sentinel-2 cloudless 2024 © EOX IT Services GmbH · Contains modified Copernicus Sentinel data
              </span>
            )}
          </div>
        </div>
      </div>
    ),
    { ...SIZE, headers: { 'Cache-Control': 'public, max-age=60' } },
  );
}
