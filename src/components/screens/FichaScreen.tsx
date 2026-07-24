'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { StateGlyph } from '@/components/ui/StateGlyph';
import { ScrollCarousel } from '@/components/ui/ScrollCarousel';
import { ResourcesPanel } from '@/components/fires/ResourcesPanel';
import { FireMiniMapClient } from '@/components/map/FireMiniMapClient';
import { useDict } from '@/components/i18n/I18nProvider';
import { useUIStore } from '@/lib/store';
import { useFollowStore } from '@/lib/follow';
import { formatNumber, formatClock, timeAgo } from '@/lib/utils/format';
import { useNow } from '@/components/time/NowProvider';
import { interpolate } from '@/lib/i18n';
import { STATE_LABEL_KEY, STATE_TEXT_CLASS } from '@/lib/fires/style';
import { PT_TEXT } from '@/lib/fires/labels';
import { SOURCES } from '@/lib/data/sources';
import { provinceSlug } from '@/lib/fires/place';
import { mix, V } from '@/lib/design/color';
import { cn } from '@/lib/utils/cn';
import type { Fire, FireState } from '@/types/fire';
import type { EpisodeLinks } from '@/lib/fires/reactivation';

const STAT_LABEL = 'font-sans text-[9px] font-semibold uppercase tracking-[0.1em] text-fg-mute';

function stateVar(s: FireState): string {
  return V[s];
}

export function FichaScreen({
  fire,
  origin = 'live',
  asOf,
  boletinId,
  hasLocation = true,
  related,
}: {
  fire: Fire;
  /** Procedencia del dato: en vivo, archivo o destacado del boletín. */
  origin?: 'live' | 'archive' | 'boletin';
  /** Fecha del último dato conocido (modo histórico). */
  asOf?: string;
  /** Edición del boletín de la que procede (origin='boletin'). */
  boletinId?: string;
  /** Hay coordenadas reales (si no, se oculta el mapa). */
  hasLocation?: boolean;
  /** Episodios del mismo paraje (reactivaciones), si los hay. */
  related?: EpisodeLinks;
}) {
  const d = useDict();
  const locale = useUIStore((s) => s.locale);
  const now = useNow();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const followedFires = useFollowStore((s) => s.fires);
  const toggleFollow = useFollowStore((s) => s.toggle);
  const following = mounted && followedFires.some((f) => f.slug === fire.slug);
  const [copied, setCopied] = useState(false);
  // Pestaña activa del detalle inferior. Por defecto «Evolución» en emergencia
  // (la cronología con evacuaciones/confinamientos), si hay; si no, «Medios».
  const [detailTab, setDetailTab] = useState<'medios' | 'evolucion' | 'episodios'>(
    fire.timeline && fire.timeline.length > 0 ? 'evolucion' : 'medios',
  );
  // Modo histórico: el incendio ya no está en las fuentes en vivo. Se muestra el
  // último dato conocido, sin señales de «ahora» (meteo, confirmación satelital,
  // avance 24 h) y con banner sobrio.
  const historical = origin !== 'live';

  // Reactivación: si este incendio se reactivó, apuntamos al incidente actual;
  // si es él mismo una reactivación, apuntamos al episodio anterior. (Excluyentes.)
  const reactCurrent = related?.current;
  const reactEarlier = !reactCurrent ? related?.prior?.[0] : undefined;
  const otherEpisodes = related?.related ?? [];
  const provSlug = fire.province && fire.province !== '—' ? provinceSlug(fire.province) : null;

  // Detalle en pestañas (Medios / Evolución / Episodios): en móvil, apilar todo
  // dejaba estas secciones en una ventana minúscula. Con pestañas cada una usa
  // toda la altura desplazable. Solo se muestran las que tienen contenido.
  const hasTimeline = Boolean(fire.timeline && fire.timeline.length > 0);
  const detailTabs: { id: 'medios' | 'evolucion' | 'episodios'; label: string }[] = [
    { id: 'medios', label: d.fire.resources },
    ...(hasTimeline ? [{ id: 'evolucion' as const, label: d.fire.evolution }] : []),
    ...(otherEpisodes.length > 0 ? [{ id: 'episodios' as const, label: d.fire.episodesShort }] : []),
  ];
  const activeDetailTab = detailTabs.some((t) => t.id === detailTab) ? detailTab : 'medios';
  // Fuente de los datos de medios (para mostrarla junto a ellos): la fuente
  // operativa principal del incendio, o «prensa» si la ficha es reconstruida.
  const mediosSource = fire.reconstructed
    ? d.fire.reconstructedSource
    : fire.sources[0]
      ? SOURCES[fire.sources[0]].label
      : undefined;

  const stateLabel =
    fire.country === 'PT' && fire.ptState ? PT_TEXT[fire.ptState] : d.states[STATE_LABEL_KEY[fire.state]];
  const dateFmt = (iso: string) => {
    const day = new Intl.DateTimeFormat(locale, {
      day: '2-digit',
      month: 'short',
      timeZone: 'Europe/Madrid',
    }).format(Date.parse(iso));
    // Sin reloj cuando el ISO es solo-fecha (p. ej. periodo del boletín): añadir
    // una hora sería fabricarla (medianoche UTC → «· 02:00»).
    return iso.includes('T') ? `${day} · ${formatClock(Date.parse(iso))}` : day;
  };

  const back = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) router.back();
    else router.push('/');
  };

  const share = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    const nav = typeof navigator !== 'undefined' ? navigator : undefined;
    if (nav?.share) {
      try {
        await nav.share({ title: interpolate(d.fire.incidentOf, { name: fire.name }), url });
        return;
      } catch {
        /* cancelado */
      }
    }
    try {
      await nav?.clipboard?.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* noop */
    }
  };

  return (
    <main
      id="contenido"
      className="flex h-dvh flex-col overflow-hidden bg-bg-base text-fg lg:grid lg:grid-cols-[440px_1fr] lg:grid-rows-1"
    >
      {/* Mapa enfocado (oculto si no hay coordenadas reales, p. ej. dato del boletín).
          En móvil, franja fija y modesta (h-[200px], no flex-1): solo da
          contexto de ubicación, el contenido principal es el detalle de abajo
          (ver sección siguiente). En escritorio pasa a columna derecha
          (lg:order-2) de alto completo: el panel de detalle sigue siendo el
          contenido principal y se lee primero, de izquierda a derecha. */}
      <div className="relative h-[200px] flex-none overflow-hidden bg-bg-map lg:order-2 lg:h-dvh">
        {hasLocation ? (
          <FireMiniMapClient fire={fire} />
        ) : (
          // Sin coordenadas (dato histórico del boletín): estado claro y sobrio en
          // vez de un mapa vacío o uno en una ubicación inventada.
          <div className="grid h-full place-items-center gap-1.5 px-6 text-center">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--text-mute)"
              strokeWidth="1.4"
              aria-hidden
            >
              <path d="M21 10c0 6-9 12-9 12s-9-6-9-12a9 9 0 0 1 18 0Z" />
              <line x1="3" y1="3" x2="21" y2="21" />
            </svg>
            <span className="text-[12px] font-medium text-fg-secondary">{d.fire.noLocation}</span>
            <span className="font-mono text-[10px] text-fg-mute">
              {fire.region.replace(/\s*\(PT\)/, '')}
            </span>
          </div>
        )}

        <div className="absolute left-3 right-3 top-3.5 z-[3] flex items-center gap-2">
          <button
            type="button"
            onClick={back}
            aria-label={d.a11y.back}
            className="if-overlay grid h-[38px] w-[38px] flex-none place-items-center rounded-btn text-fg-body"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M10 3 L5 8 L10 13" />
            </svg>
          </button>
          <div className="if-overlay flex h-[38px] flex-1 items-center gap-2 rounded-btn px-3">
            <svg width="14" height="14" viewBox="0 0 18 18" fill="none" stroke="var(--text-mute)" strokeWidth="1.6" className="flex-none">
              <circle cx="8" cy="8" r="5" />
              <path d="M12 12 L16 16" />
            </svg>
            <span className="flex-1 truncate text-[12.5px] text-fg-body">
              {fire.municipality}, {fire.province}
            </span>
          </div>
        </div>

        {!historical && fire.satelliteConfirmed && (
          <div
            className="if-overlay absolute left-3 top-[62px] z-[3] inline-flex items-center gap-1.5 rounded-[5px] px-[9px] py-[5px]"
            style={{ borderColor: mix(V.foco, 40) }}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-state-foco" aria-hidden />
            <span className="font-mono text-[9.5px] font-medium text-state-foco-text">
              {interpolate(d.fire.satelliteConfirmed, { km: fire.hotspotKm ?? 0 })}
            </span>
          </div>
        )}
      </div>

      {/* Hoja de detalle: en móvil, ocupa TODO el resto de la pantalla bajo la
          franja fija del mapa (flex-1, sin techo artificial) — es el
          contenido principal, no un "peek" que haya que expandir a mano. En
          escritorio (lg:order-1), columna fija a la izquierda de alto
          completo — el tirador (decorativo, solo sube visualmente sobre el
          mapa) se oculta, ya no hace falta. */}
      <section className="relative -mt-[14px] flex flex-1 flex-col overflow-hidden rounded-t-[14px] border-t bg-bg-card lg:order-1 lg:mt-0 lg:flex-none lg:h-dvh lg:rounded-none lg:border-r lg:border-t-0">
        <div
          className="mx-auto mt-2 h-1 w-9 flex-none rounded-full lg:hidden"
          style={{ background: 'var(--border-strong)' }}
          aria-hidden
        />

        {/* Evacuaciones/confinamientos: información más urgente de la ficha, va
            la primera y en tono de alerta. aria-live para lectores de pantalla.
            En histórico se oculta (dato operativo caduco). */}
        {!historical && fire.evacuation && (
          <div
            className="mx-4 mt-1.5 flex-none rounded-btn border px-3 py-2"
            style={{ borderColor: mix(V.activo, 55), background: mix(V.activo, 10) }}
            aria-live="polite"
          >
            <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-state-activo-text">
              {d.fire.evacuationNotice}
            </p>
            <p className="mt-0.5 text-[11.5px] font-medium leading-snug text-fg-body">{fire.evacuation}</p>
          </div>
        )}

        {/* Zona desplazable: procedencia + cabecera + cifras + pestañas
            (Medios/Evolución/Episodios). El mapa y el aviso de evacuación (arriba)
            y las acciones (abajo) quedan fijos; así el detalle dispone de toda la
            altura y no queda recortado en una ventana diminuta en móvil. */}
        <div className="min-h-0 flex-1 overflow-y-auto">
        {/* Procedencia: ficha reconstruida a partir de prensa (no oficial). Marca
            visible y sobria para no falsear el origen del dato. */}
        {fire.reconstructed && (
          <div
            className="mx-4 mt-1.5 flex-none rounded-btn border px-3 py-2"
            style={{ borderColor: mix(V.controlado, 55), background: mix(V.controlado, 10) }}
          >
            <p className="text-[11px] font-semibold leading-snug text-state-controlado-text">
              ⚠ {d.fire.reconstructed}
            </p>
          </div>
        )}

        {/* Extensión aproximada por focos FIRMS (sin perímetro oficial/EFFIS
            todavía): aviso visible, mismo tono que el resto de señales
            satelitales (`satelliteConfirmed`), para no leerse como un
            perímetro real. */}
        {fire.perimeterApprox && (
          <div
            className="mx-4 mt-1.5 flex-none rounded-btn border px-3 py-2"
            style={{ borderColor: mix(V.foco, 45), background: mix(V.foco, 8) }}
          >
            <p className="text-[11px] font-semibold leading-snug text-state-foco-text">
              ⚠ {d.fire.perimeterApprox}
            </p>
          </div>
        )}

        {/* Perímetro/extensión provisional dibujado a mano en una emergencia
            (prensa/seguimiento): mismo tono satelital, aviso propio para no
            leerse como un perímetro oficial ni definitivo. La extensión
            (`perimeterExtra`) se suma al perímetro satelital sin sustituirlo. */}
        {(fire.perimeterProvisional || fire.perimeterExtra) && (
          <div
            className="mx-4 mt-1.5 flex-none rounded-btn border px-3 py-2"
            style={{ borderColor: mix(V.foco, 45), background: mix(V.foco, 8) }}
          >
            <p className="text-[11px] font-semibold leading-snug text-state-foco-text">
              ⚠ {d.fire.perimeterProvisional}
            </p>
          </div>
        )}

        {/* Reactivación: enlaza este episodio con el incidente actual (si se
            reactivó) o con el anterior (si es él mismo una reactivación). */}
        {reactCurrent && (
          <div
            className="mx-4 mt-1.5 flex-none rounded-btn border px-3 py-2"
            style={{ borderColor: mix(V.activo, 45), background: mix(V.activo, 8) }}
          >
            <p className="text-[11px] font-semibold leading-snug text-fg">{d.fire.reactivationHistorical}</p>
            <Link
              href={`/f/${reactCurrent.slug}`}
              className="mt-0.5 inline-block font-mono text-[10px] font-semibold text-action-text"
            >
              {d.fire.viewCurrentIncident} ↗
            </Link>
          </div>
        )}
        {reactEarlier && (
          <div
            className="mx-4 mt-1.5 flex-none rounded-btn border px-3 py-2"
            style={{ borderColor: mix(V.foco, 45), background: mix(V.foco, 8) }}
          >
            <p className="text-[11px] font-semibold leading-snug text-fg">{d.fire.reactivationLive}</p>
            <Link
              href={`/f/${reactEarlier.slug}`}
              className="mt-0.5 inline-block font-mono text-[10px] font-semibold text-action-text"
            >
              {d.fire.viewEarlierIncident} ↗
            </Link>
          </div>
        )}

        {historical && (
          <div
            className="mx-4 mt-1.5 flex-none rounded-btn border px-3 py-2"
            style={{ borderColor: 'var(--border-default)', background: mix(V.foco, 8) }}
          >
            <p className="text-[11px] leading-snug text-fg-secondary">
              {d.fire.historicalNote}
              {asOf && (
                <span className="text-fg-mute"> {interpolate(d.fire.historicalAsOf, { date: dateFmt(asOf) })}</span>
              )}
            </p>
            {boletinId && (
              <a
                href={`/boletin/${boletinId}`}
                className="mt-0.5 inline-block font-mono text-[10px] font-semibold text-action-text"
              >
                {d.fire.historicalFromBoletin} ↗
              </a>
            )}
          </div>
        )}

        <div className="px-4 pt-1">
          <div className="flex items-center gap-1.5">
            {/* En histórico el chip va NEUTRO (gris): el color codifica dato (rojo =
                activo = ardiendo ahora) y no debe leerse como actividad en vivo. */}
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-chip border px-[9px] py-[3.5px] text-[10.5px] font-bold leading-none tracking-[0.04em]',
                historical ? 'border-strong text-fg-secondary' : STATE_TEXT_CLASS[fire.state],
              )}
              style={
                historical
                  ? undefined
                  : { backgroundColor: mix(stateVar(fire.state), 14), borderColor: mix(stateVar(fire.state), 45) }
              }
            >
              <StateGlyph state={fire.state} size={10} />
              {stateLabel.toUpperCase()}
            </span>
            {/* NIVEL es dato operativo caduco: se oculta en histórico. */}
            {!historical && fire.level != null && fire.level >= 1 && (
              <span
                className="rounded-chip border px-[9px] py-[3.5px] font-mono text-[10.5px] font-bold text-state-controlado-text"
                style={{ backgroundColor: mix(V.controlado, 12), borderColor: mix(V.controlado, 45) }}
              >
                {`NIVEL ${fire.level}`}
              </span>
            )}
            {/* Emergencia de interés nacional (Situación Operativa 3): escala del
                TERRITORIO, distinta del nivel de gravedad del incendio. Distintivo
                propio, en tono de máxima alerta. */}
            {!historical && fire.nationalInterest && (
              <span
                className="rounded-chip border px-[9px] py-[3.5px] font-mono text-[10.5px] font-bold text-state-activo-text"
                style={{ backgroundColor: mix(V.activo, 14), borderColor: mix(V.activo, 50) }}
                title={d.fire.nationalInterestFull}
              >
                {d.fire.nationalInterest}
              </span>
            )}
            {fire.fwi && (
              <span className="rounded-chip border border-strong px-[9px] py-[3.5px] font-mono text-[10.5px] font-medium text-fg-secondary">
                {interpolate(d.fire.fwi, { level: fire.fwi }).toUpperCase()}
              </span>
            )}
            <div className="flex-1" />
            <button type="button" onClick={share} aria-label={d.fire.share} className="text-action-text">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
                <circle cx="8" cy="3" r="1.6" />
                <circle cx="3" cy="9" r="1.6" />
                <circle cx="13" cy="9" r="1.6" />
                <path d="M8 4.5 L3.8 7.7 M8 4.5 L12.2 7.7" />
              </svg>
            </button>
          </div>

          <h1 className="mt-2.5 text-[18px] font-bold tracking-[-0.01em]">
            {interpolate(d.fire.incidentOf, { name: fire.name })}
          </h1>
          <p className="mt-px text-[12px] text-fg-secondary">
            {fire.municipality} · {fire.province} · {fire.region.replace(/\s*\(PT\)/, '')}
          </p>
          <p className="mt-1.5 font-mono text-[9.5px] text-fg-mute">
            {d.fire.source}:{' '}
            {fire.reconstructed ? d.fire.reconstructedSource : fire.sources.map((s) => SOURCES[s].label).join(' · ')} —{' '}
            {historical
              ? asOf
                ? interpolate(d.fire.historicalAsOf, { date: dateFmt(asOf) })
                : d.fire.historicalNote
              : interpolate(d.status.updatedAgo, { when: timeAgo(fire.updatedAt, now, locale) })}
          </p>
          {fire.edited && (
            <p className="mt-1 font-mono text-[9.5px] text-warn" title={fire.overriddenFields?.join(', ')}>
              ✎ {d.fire.editedManually}
            </p>
          )}
          {provSlug && (
            <Link
              href={`/p/${provSlug}`}
              className="mt-1.5 inline-block font-mono text-[10px] font-semibold text-action-text"
            >
              {interpolate(d.fire.viewProvince, { province: fire.province })} ↗
            </Link>
          )}
        </div>

        {/* Stats 2×2 */}
        <div
          className="mt-3 grid flex-none grid-cols-2 gap-px border-y"
          style={{ backgroundColor: 'var(--border-subtle)' }}
        >
          <div className="bg-bg-card px-4 py-2.5">
            <div className={STAT_LABEL}>{d.fire.surface}</div>
            {fire.hectares > 0 ? (
              <>
                <div className="whitespace-nowrap font-mono text-[20px] font-semibold">
                  {fire.hectaresApprox ? '~' : ''}
                  {formatNumber(fire.hectares)} <span className="text-[11px] text-fg-secondary">ha</span>
                </div>
                {(fire.hectaresApprox || !historical) && (
                  <div
                    className={cn(
                      'whitespace-nowrap font-mono text-[10px] font-medium',
                      fire.hectaresApprox || historical || !(fire.delta24h && fire.delta24h > 0)
                        ? 'text-fg-mute'
                        : 'text-state-activo-text',
                    )}
                  >
                    {fire.hectaresApprox
                      ? d.fire.approx
                      : fire.delta24h && fire.delta24h > 0
                        ? interpolate(d.fire.delta24h, { n: formatNumber(fire.delta24h) })
                        : d.fire.noProgress}
                  </div>
                )}
              </>
            ) : fire.hotspotHectares ? (
              <>
                <div className="whitespace-nowrap font-mono text-[20px] font-semibold">
                  ~{formatNumber(fire.hotspotHectares)}{' '}
                  <span className="text-[11px] text-fg-secondary">ha</span>
                </div>
                <div className="whitespace-nowrap font-mono text-[10px] font-medium text-fg-mute">
                  {d.fire.approxHotspot}
                </div>
              </>
            ) : (
              <div className="mt-1 whitespace-nowrap font-mono text-[13px] font-semibold text-fg-secondary">
                {d.kpis.noData}
              </div>
            )}
          </div>
          <div className="bg-bg-card px-4 py-2.5">
            <div className={STAT_LABEL}>{d.fire.start}</div>
            {/* origin='boletin' no conoce la ignición real (startedAt = lunes de la
                semana del boletín): «sin dato» antes que una fecha inventada. */}
            {origin === 'boletin' ? (
              <div className="mt-1 font-mono text-[15px] font-semibold text-fg-mute">{d.kpis.noData}</div>
            ) : (
              <>
                <div className="mt-1 font-mono text-[15px] font-semibold">{dateFmt(fire.startedAt)}</div>
                <div className="font-mono text-[9.5px] text-fg-mute">{timeAgo(fire.startedAt, now, locale)}</div>
              </>
            )}
          </div>
          <div className="bg-bg-card px-4 py-2.5">
            <div className={STAT_LABEL}>{d.fire.resources}</div>
            <div className="mt-1 font-mono text-[12.5px]">
              {fire.resources?.aerial != null || fire.resources?.ground != null
                ? `${fire.resources.aerial ?? 0} aér · ${fire.resources.ground ?? 0} terr`
                : (fire.resources?.raw ?? '—')}
            </div>
            {(fire.resources?.personnel != null || fire.resources?.note) && (
              <div className="font-mono text-[10px] text-fg-secondary">
                {fire.resources?.personnel != null && `${formatNumber(fire.resources.personnel)} efectivos`}
                {fire.resources?.personnel != null && fire.resources?.note && ' · '}
                {fire.resources?.note}
              </div>
            )}
            {/* Fuente de los datos de medios, junto a ellos (transparencia). */}
            {fire.resources && mediosSource && (
              <div className="truncate font-mono text-[9px] text-fg-mute" title={mediosSource}>
                {d.fire.source}: {mediosSource}
              </div>
            )}
          </div>
          <div className="bg-bg-card px-4 py-2.5">
            <div className={STAT_LABEL}>{d.fire.weather}</div>
            {fire.weather ? (
              <>
                <div className="mt-1 font-mono text-[12.5px]">
                  {fire.weather.tempC} °C · HR {fire.weather.humidity} %
                </div>
                <div className="font-mono text-[10px] text-fg-secondary">Viento {fire.weather.wind}</div>
              </>
            ) : (
              <div className="mt-1 font-mono text-[12.5px] text-fg-mute">—</div>
            )}
          </div>
        </div>

        {/* Detalle en pestañas. La barra queda pegada (sticky) al hacer scroll:
            Medios / Evolución / Episodios son accesibles de un toque y cada uno
            usa toda la altura disponible, en vez de apilarse en una ventana
            diminuta. Solo se muestra la barra si hay más de una pestaña. */}
        {detailTabs.length > 1 && (
          <div
            role="tablist"
            aria-label={d.fire.evolution}
            className="sticky top-0 z-[2] flex gap-5 border-b bg-bg-card px-4 pt-2.5"
          >
            {detailTabs.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={activeDetailTab === t.id}
                onClick={() => setDetailTab(t.id)}
                className={cn(
                  '-mb-px border-b-2 pb-2 text-[13px] font-semibold transition-colors',
                  activeDetailTab === t.id
                    ? 'border-action-text text-action-text'
                    : 'border-transparent text-fg-mute',
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}

        <div className="px-4 pb-5 pt-3">
          {activeDetailTab === 'medios' && <ResourcesPanel resources={fire.resources} source={mediosSource} />}

          {/* Carrusel horizontal (más reciente primero, a la izquierda): cada
              hito es una tarjeta con espacio propio. */}
          {activeDetailTab === 'evolucion' && hasTimeline && (
            <ScrollCarousel ariaLabel={d.fire.evolution} className="pb-1">
              {fire.timeline!.map((e, i) => {
                  const press = Boolean(e.url);
                  const dot = (
                    <span
                      className="inline-block h-2 w-2 flex-none rounded-full"
                      style={{ background: press ? V.action : e.state ? stateVar(e.state) : V.foco }}
                      aria-hidden
                    />
                  );
                  const body = (
                    <>
                      <div className="flex items-center gap-1.5">
                        {dot}
                        <span className="font-mono text-[10px] font-semibold text-fg-secondary">
                          {dateFmt(e.at)}
                        </span>
                      </div>
                      {press ? (
                        <>
                          <span className="mt-1.5 line-clamp-3 block text-[11.5px] leading-snug text-fg-body">
                            {e.label}
                          </span>
                          <span className="mt-1 block font-mono text-[9px] font-semibold text-action-text">
                            {e.source} · {d.fire.press} ↗
                          </span>
                        </>
                      ) : (
                        <div className="mt-1.5 line-clamp-3 text-[11.5px] leading-snug text-fg-body">
                          {e.label}
                          {e.detected && (
                            <span className="ml-1 font-mono text-[9px] font-normal text-fg-mute">
                              · {d.fire.tracked}
                            </span>
                          )}
                        </div>
                      )}
                    </>
                  );
                  const cardClass =
                    'w-[172px] flex-none snap-start rounded-btn border border-subtle bg-bg-card px-3 py-2.5';
                  return press ? (
                    <a
                      key={`${e.at}-${i}`}
                      href={e.url}
                      target="_blank"
                      rel="noreferrer"
                      className={cardClass}
                    >
                      {body}
                    </a>
                  ) : (
                    <div key={`${e.at}-${i}`} className={cardClass}>
                      {body}
                    </div>
                  );
                })}
              </ScrollCarousel>
          )}

          {activeDetailTab === 'episodios' && otherEpisodes.length > 0 && (
              <ul>
                {otherEpisodes.slice(0, 8).map((e) => (
                  <li key={e.slug}>
                    <Link href={`/f/${e.slug}`} className="flex items-center gap-2 py-1.5">
                      <StateGlyph state={e.state} size={11} className="flex-none" />
                      <span className="min-w-0 flex-1 truncate text-[11.5px] text-fg-body">{e.name}</span>
                      <span className="flex-none font-mono text-[9.5px] text-fg-mute">{dateFmt(e.startedAt)}</span>
                      <span className="flex-none font-mono text-[9px] uppercase tracking-[0.05em] text-fg-mute">
                        {e.historical ? d.fire.episodeHistorical : d.fire.episodeOngoing}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
          )}
        </div>
        </div>

        {/* Acciones */}
        <div className="flex flex-none gap-2 border-t px-4 py-2.5">
          {!historical && (
            <button
              type="button"
              onClick={() => toggleFollow({ slug: fire.slug, name: fire.name, region: fire.region })}
              aria-pressed={following}
              className={cn(
                'flex h-10 flex-1 items-center justify-center rounded-btn border text-[12.5px] font-semibold',
                following ? 'text-ok-text' : 'text-action-text',
              )}
              style={{
                backgroundColor: mix(following ? V.ok : V.action, 16),
                borderColor: mix(following ? V.ok : V.action, 55),
              }}
            >
              {following ? `✓ ${d.fire.following}` : d.fire.follow}
            </button>
          )}
          <button
            type="button"
            onClick={share}
            className={cn(
              'flex h-10 items-center justify-center rounded-btn border border-strong text-[12.5px] font-semibold text-fg-secondary',
              historical ? 'flex-1' : 'w-[120px]',
            )}
          >
            {copied ? d.fire.copied : d.fire.shareCta}
          </button>
        </div>

        <p className="flex-none px-4 pb-2.5 text-[9.5px] text-fg-mute">
          {d.disclaimer.short.split('112')[0]}
          <span className="font-semibold text-state-activo-text">112</span>
        </p>
      </section>
    </main>
  );
}
