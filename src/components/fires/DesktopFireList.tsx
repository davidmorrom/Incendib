'use client';

import { FireRow } from '@/components/fires/FireRow';
import { useDict } from '@/components/i18n/I18nProvider';
import { interpolate } from '@/lib/i18n';
import { cn } from '@/lib/utils/cn';
import type { Fire } from '@/types/fire';

/** Columna derecha del panel desktop (1d): lista de incendios por gravedad. */
export function DesktopFireList({
  className,
  fires,
  onSelect,
  onHover,
  hoveredSlug,
}: {
  className?: string;
  fires: Fire[];
  onSelect: (f: Fire) => void;
  onHover?: (slug: string | null) => void;
  hoveredSlug?: string | null;
}) {
  const d = useDict();
  return (
    <aside className={cn('flex-col overflow-hidden border-l bg-bg-raised', className)}>
      <div className="flex-none border-b px-4 py-2.5">
        <span className="text-[13px] font-semibold text-fg">
          {interpolate(d.map.firesCount, { n: fires.length })}
        </span>
        <span className="ml-1.5 text-[11px] font-normal text-fg-mute">· {d.map.bySeverity}</span>
      </div>
      <ul className="min-h-0 flex-1 overflow-y-auto">
        {fires.length === 0 ? (
          <li className="px-4 py-8 text-center text-body text-fg-secondary">{d.report.empty}</li>
        ) : (
          fires.map((f) => (
            <li key={f.slug}>
              <FireRow fire={f} highlighted={hoveredSlug === f.slug} onSelect={onSelect} onHover={onHover} />
            </li>
          ))
        )}
      </ul>
    </aside>
  );
}
