'use client';

import { useDict } from '@/components/i18n/I18nProvider';
import { formatNumber } from '@/lib/utils/format';
import { interpolate } from '@/lib/i18n';
import type { AerialKind, GroundKind, Resources } from '@/types/fire';

type IconKind = 'plane' | 'heli' | 'drone' | 'people' | 'truck' | 'dozer' | 'shield';

const AERIAL_ICON: Record<AerialKind, IconKind> = {
  anfibio: 'plane',
  'avion-carga': 'plane',
  coordinacion: 'plane',
  helicoptero: 'heli',
  'helicoptero-coord': 'heli',
  dron: 'drone',
};

const GROUND_ICON: Record<GroundKind, IconKind> = {
  bomberos: 'people',
  brigada: 'people',
  autobomba: 'truck',
  maquinaria: 'dozer',
  ume: 'shield',
  gc: 'shield',
};

/** Iconos de línea (una sola familia) por tipo de medio. */
function KindIcon({ icon }: { icon: IconKind }) {
  const common = {
    width: 16,
    height: 16,
    viewBox: '0 0 18 18',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.3,
    strokeLinejoin: 'round' as const,
    strokeLinecap: 'round' as const,
    'aria-hidden': true,
  };
  switch (icon) {
    case 'plane':
      return (
        <svg {...common}>
          <path d="M9 2c.7 0 1 1 1 2v2.6l6 3.4v1.5l-6-1.7V14l1.9 1.3V16L9 15l-1.9 1v-.7L9 14v-2.7l-6 1.7v-1.5l6-3.4V4c0-1 .3-2 1-2Z" />
        </svg>
      );
    case 'heli':
      return (
        <svg {...common}>
          <path d="M2 4.5h14" />
          <path d="M9 4.5v2.3" />
          <rect x="5" y="7" width="8" height="5" rx="2.4" />
          <path d="M13 9.5h3.2" />
          <path d="M6.4 12l-1.2 3.2" />
        </svg>
      );
    case 'drone':
      return (
        <svg {...common}>
          <circle cx="5" cy="5" r="2" />
          <circle cx="13" cy="5" r="2" />
          <circle cx="5" cy="13" r="2" />
          <circle cx="13" cy="13" r="2" />
          <rect x="6.8" y="6.8" width="4.4" height="4.4" rx="1" />
          <path d="M6.6 6.6 7.6 7.6M11.4 6.6 10.4 7.6M6.6 11.4 7.6 10.4M11.4 11.4 10.4 10.4" />
        </svg>
      );
    case 'people':
      return (
        <svg {...common}>
          <circle cx="6.4" cy="6" r="2.2" />
          <path d="M2.8 15v-1a3.6 3.6 0 0 1 7.2 0v1" />
          <circle cx="12.4" cy="6.6" r="1.7" />
          <path d="M11.4 15v-1a3 3 0 0 1 4.4-2.6" />
        </svg>
      );
    case 'truck':
      return (
        <svg {...common}>
          <rect x="1.8" y="6" width="8" height="6" />
          <path d="M9.8 7.6h3.2l2.4 2.2V12H9.8z" />
          <circle cx="5" cy="13.2" r="1.4" />
          <circle cx="12.6" cy="13.2" r="1.4" />
        </svg>
      );
    case 'dozer':
      return (
        <svg {...common}>
          <path d="M2.4 13h9.6" />
          <path d="M2.4 13v-2.6" />
          <rect x="4.4" y="6.6" width="6" height="3.8" />
          <path d="M10.4 7.6h2.2v2.8h-2.2z" />
          <path d="M14 6 15.6 12" />
          <circle cx="5" cy="13.4" r="1" />
          <circle cx="9" cy="13.4" r="1" />
        </svg>
      );
    case 'shield':
      return (
        <svg {...common}>
          <path d="M9 2l5.5 2v4.2c0 4-3.2 6.2-5.5 7.3C6.7 14.4 3.5 12.2 3.5 8.2V4z" />
        </svg>
      );
  }
}

function Row({ icon, label, count }: { icon: IconKind; label: string; count: number }) {
  return (
    <li className="flex items-center gap-2 py-[3px]">
      <span className="flex-none text-fg-secondary">
        <KindIcon icon={icon} />
      </span>
      <span className="min-w-0 flex-1 truncate text-[11.5px] text-fg-body">{label}</span>
      <span className="flex-none font-mono text-[12.5px] font-semibold text-fg">
        {formatNumber(count)}
      </span>
    </li>
  );
}

function Group({
  title,
  total,
  children,
}: {
  title: string;
  total: number;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0 flex-1">
      <div className="flex items-baseline justify-between border-b border-subtle pb-1">
        <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.1em] text-fg-mute">
          {title}
        </span>
        <span className="font-mono text-[11px] font-semibold text-fg-secondary">
          {formatNumber(total)}
        </span>
      </div>
      <ul className="mt-1">{children}</ul>
    </div>
  );
}

const sum = (units: { count: number }[]) => units.reduce((n, u) => n + u.count, 0);

/**
 * Desglose de medios desplegados (aéreos por tipo, terrestres por tipo y medios
 * extranjeros). Se muestra en la ficha cuando la fuente aporta el detalle; si no
 * lo hay, no se renderiza (la ficha ya muestra el resumen agregado).
 */
export function ResourcesPanel({ resources }: { resources?: Resources }) {
  const d = useDict();
  const aerial = resources?.aerialUnits ?? [];
  const ground = resources?.groundUnits ?? [];
  const foreign = resources?.foreign ?? [];
  if (!aerial.length && !ground.length && !foreign.length) return null;

  return (
    <section aria-label={d.resources.heading} className="pb-1">
      <div className="mb-2 font-mono text-label font-semibold uppercase tracking-[0.12em] text-fg-mute">
        {d.resources.heading}
      </div>

      {(aerial.length > 0 || ground.length > 0) && (
        <div className="flex gap-4">
          {aerial.length > 0 && (
            <Group title={d.resources.aerial} total={sum(aerial)}>
              {aerial.map((u) => (
                <Row
                  key={u.kind}
                  icon={AERIAL_ICON[u.kind]}
                  label={d.resources.aerialKind[u.kind]}
                  count={u.count}
                />
              ))}
            </Group>
          )}
          {ground.length > 0 && (
            <Group title={d.resources.ground} total={sum(ground)}>
              {ground.map((u) => (
                <Row
                  key={u.kind}
                  icon={GROUND_ICON[u.kind]}
                  label={d.resources.groundKind[u.kind]}
                  count={u.count}
                />
              ))}
            </Group>
          )}
        </div>
      )}

      {foreign.length > 0 && (
        <div className="mt-2.5">
          <div className="font-mono text-[9px] font-semibold uppercase tracking-[0.1em] text-fg-mute">
            {d.resources.foreign}
          </div>
          <ul className="mt-1 flex flex-col gap-1">
            {foreign.map((f) => (
              <li
                key={f.country}
                className="flex items-start gap-2 rounded-[6px] border border-subtle px-2 py-1.5"
              >
                <span className="mt-px flex-none text-action-text">
                  <KindIcon icon="plane" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[11.5px] font-semibold text-fg">
                    {f.country}
                    {f.mechanism && (
                      <span className="ml-1 font-normal text-fg-mute">
                        {interpolate(d.resources.viaMechanism, { mechanism: f.mechanism })}
                      </span>
                    )}
                  </div>
                  {f.note && (
                    <div className="font-mono text-[10px] text-fg-secondary">{f.note}</div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
