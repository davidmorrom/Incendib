'use client';

import { StateGlyph } from '@/components/ui/StateGlyph';
import { useDict } from '@/components/i18n/I18nProvider';
import { STATE_LABEL_KEY, STATE_TEXT_CLASS } from '@/lib/fires/style';
import { useEffectiveTheme } from '@/lib/hooks/useTheme';
import type { Fire } from '@/types/fire';

/**
 * Inset de territorios insulares (Canarias, Baleares, Azores, Madeira): quedan
 * fuera del encuadre peninsular, así que sus incendios se listan aquí
 * (abajo-izquierda) sin perderlos. Cada uno abre su ficha. Ref 2a.
 */
export function IslandInset({ fires, onSelect }: { fires: Fire[]; onSelect: (f: Fire) => void }) {
  const d = useDict();
  const theme = useEffectiveTheme();
  if (!fires.length) return null;

  const sameRegion = fires.every((f) => f.region === fires[0]!.region);
  const title = (sameRegion ? fires[0]!.region : d.map.islands).replace(/\(PT\)/, '').trim();

  return (
    <div
      className="absolute bottom-[10px] left-[10px] z-[3] rounded-card px-[9px] py-[6px]"
      style={{
        background: 'color-mix(in srgb, var(--bg-base) 88%, transparent)',
        border: '1px dashed var(--border-strong)',
      }}
    >
      <div className="font-mono text-[8.5px] font-semibold uppercase tracking-[0.1em] text-fg-mute">
        {title}
      </div>
      <ul className="mt-1 flex flex-col gap-1">
        {fires.map((f) => (
          <li key={f.slug}>
            <button
              type="button"
              onClick={() => onSelect(f)}
              className="flex items-center gap-1.5 font-mono text-[9px] text-fg-secondary"
            >
              <StateGlyph state={f.state} size={10} outline={theme === 'light'} />
              <span>
                {f.name}
                {f.level != null && ` · N${f.level}`} ·{' '}
                <span className={STATE_TEXT_CLASS[f.state]}>{d.states[STATE_LABEL_KEY[f.state]]}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
