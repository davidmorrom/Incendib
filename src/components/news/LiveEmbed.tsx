'use client';

import { useState } from 'react';
import { useDict } from '@/components/i18n/I18nProvider';
import { LIVE_CHANNELS } from '@/lib/data/news';
import { mix, V } from '@/lib/design/color';
import { cn } from '@/lib/utils/cn';

/**
 * Canal de noticias 24 h. Póster con play que carga el iframe (nocookie) SOLO al
 * pulsar (privacidad + no bloquea el render, y sin autoplay: WCAG 1.4.2). Se
 * rotula con honestidad: es un canal genérico 24 h, no un directo verificado de
 * incendios; los canales sin `channelId` se declaran «sin directo verificado».
 */
export function LiveEmbed() {
  const d = useDict();
  const [channel, setChannel] = useState(LIVE_CHANNELS[0]!);
  const [playing, setPlaying] = useState(false);

  const embedUrl = channel.channelId
    ? `https://www.youtube-nocookie.com/embed/live_stream?channel=${channel.channelId}`
    : null;

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="font-mono text-label font-semibold uppercase tracking-[0.12em] text-fg-mute">
          {d.news.live}
        </span>
        <div className="flex gap-1.5">
          {LIVE_CHANNELS.map((c) => {
            const on = c.id === channel.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setChannel(c);
                  setPlaying(false);
                }}
                aria-pressed={on}
                className={cn(
                  'rounded-full border px-2 py-[3px] text-[10px] font-semibold',
                  on ? 'text-state-activo-text' : 'border-strong text-fg-secondary',
                )}
                style={on ? { backgroundColor: mix(V.activo, 15), borderColor: mix(V.activo, 50) } : undefined}
              >
                {c.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="relative aspect-video overflow-hidden rounded-card border bg-black">
        {playing && embedUrl ? (
          <iframe
            src={embedUrl}
            title={channel.title}
            allow="encrypted-media; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 h-full w-full"
          />
        ) : (
          <button
            type="button"
            onClick={() => embedUrl && setPlaying(true)}
            disabled={!embedUrl}
            aria-label={embedUrl ? d.news.playLive : d.news.notAvailable}
            className="absolute inset-0 grid place-items-center disabled:cursor-not-allowed"
          >
            <div
              className="absolute inset-0"
              style={{ background: 'repeating-linear-gradient(135deg,#0d1319 0 9px,#0a0f14 9px 18px)' }}
              aria-hidden
            />
            <div className="relative flex flex-col items-center gap-2">
              {embedUrl && (
                <span className="grid h-[46px] w-[46px] place-items-center rounded-full" style={{ background: mix(V.activo, 90) }}>
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="#fff" aria-hidden>
                    <path d="M5 3 L15 9 L5 15 Z" />
                  </svg>
                </span>
              )}
              <span className="font-mono text-[10px] text-fg-secondary">
                {embedUrl ? d.news.embedNote : d.news.notAvailable}
              </span>
            </div>
          </button>
        )}

        {!playing && (
          <div
            className="absolute inset-x-0 bottom-0 px-3 pb-2 pt-5 text-[11px] text-fg-body"
            style={{ background: 'linear-gradient(transparent,rgba(0,0,0,.72))' }}
          >
            {channel.title}
          </div>
        )}
      </div>

      <p className="mt-1.5 text-[10px] leading-relaxed text-fg-mute">{d.news.liveNote}</p>
    </div>
  );
}
