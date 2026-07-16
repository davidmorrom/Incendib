'use client';

import { useMemo } from 'react';
import { StateGlyph } from '@/components/ui/StateGlyph';
import { FacetChecklist, type FacetOption } from './FacetChecklist';
import { FilterGroup, Segmented, ToggleChip, MONO_HEAD } from './controls';
import { useDict } from '@/components/i18n/I18nProvider';
import { interpolate } from '@/lib/i18n';
import { STATE_LABEL_KEY } from '@/lib/fires/style';
import { HA_MAX, type CountryFilter, type FireFilters, type MediaKey, type Period, type SatelliteFilter } from '@/lib/fires/filters';
import type { Facets } from '@/lib/fires/facets';
import { formatNumber } from '@/lib/utils/format';
import { V } from '@/lib/design/color';
import { cn } from '@/lib/utils/cn';
import type { FireState, FireType, SeverityLevel, SourceId } from '@/types/fire';

const MEDIA_ACCENT: Record<MediaKey, string> = {
  aereos: V.action,
  terrestres: V.action,
  internacional: V.action,
  evacuacion: V.activo,
};
const HA_MINS = [0, 10, 100, 1000] as const;
const HA_MAXES = [HA_MAX, 10000, 1000, 100] as const;
const PERSONNEL_MINS = [0, 20, 50, 100] as const;
const PERIODS: Exclude<Period, 'todos'>[] = ['24h', '48h', '72h', '7d'];

/**
 * Panel de filtros avanzado del Informe. Compone todos los grupos a partir de
 * las facetas (solo ofrece lo que existe, con recuentos). Se usa en la barra
 * lateral (desktop) y en el bottom-sheet (móvil). Estado controlado por el
 * padre; aquí solo se emiten `patch` parciales.
 */
export function FilterPanel({
  facets,
  filters,
  onChange,
  onReset,
  visible,
  total,
  activeCount,
  className,
}: {
  facets: Facets;
  filters: FireFilters;
  onChange: (patch: Partial<FireFilters>) => void;
  onReset: () => void;
  visible: number;
  total: number;
  activeCount: number;
  className?: string;
}) {
  const d = useDict();

  const toggleIn = <T,>(list: T[], v: T): T[] =>
    list.includes(v) ? list.filter((x) => x !== v) : [...list, v];

  const typeLabel: Record<FireType, string> = {
    forestal: d.panel.typeForestal,
    agricola: d.panel.typeAgricola,
    'urbano-forestal': d.panel.typeUrbano,
  };
  const mediaLabel: Record<MediaKey, string> = {
    aereos: d.panel.mediaAereos,
    terrestres: d.panel.mediaTerrestres,
    internacional: d.panel.mediaInternacional,
    evacuacion: d.panel.mediaEvacuacion,
  };

  // Opciones de CCAA y provincia (provincia se acota a las CCAA seleccionadas).
  const regionOptions: FacetOption[] = useMemo(
    () => facets.regions.map((r) => ({ value: r.value, label: r.value, count: r.count })),
    [facets.regions],
  );
  const provinceOptions: FacetOption[] = useMemo(() => {
    const pool = filters.regions.length
      ? facets.provinces.filter((p) => filters.regions.includes(p.region))
      : facets.provinces;
    return pool.map((p) => ({ value: p.value, label: p.value, count: p.count, sub: p.region }));
  }, [facets.provinces, filters.regions]);

  const showCountry = facets.countries.es > 0 && facets.countries.pt > 0;
  const areaActive = filters.minHa > 0 || filters.maxHa < HA_MAX;

  return (
    <div className={cn('flex flex-col', className)}>
      {/* Cabecera */}
      <div className="flex flex-none items-center justify-between px-3.5 pb-1.5 pt-3">
        <span className={MONO_HEAD}>{d.panel.filters}</span>
        <button
          type="button"
          onClick={onReset}
          disabled={activeCount === 0}
          className="text-[11px] font-semibold text-action-text disabled:opacity-40"
        >
          {d.panel.reset}
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3.5 pb-3">
        {/* Estado operativo */}
        {facets.states.length > 0 && (
          <FilterGroup title={d.panel.groupState} count={filters.states.length}>
            <div className="grid grid-cols-2 gap-1.5">
              {facets.states.map(({ value: s, count }) => (
                <ToggleChip
                  key={s}
                  label={
                    <span className="flex items-center gap-1.5">
                      <StateGlyph state={s} size={11} className="flex-none" />
                      <span className="truncate">{d.states[STATE_LABEL_KEY[s]]}</span>
                    </span>
                  }
                  active={filters.states.includes(s)}
                  onClick={() => onChange({ states: toggleIn(filters.states, s) as FireState[] })}
                  count={count}
                  accentColor={V[s]}
                  className="w-full justify-start"
                />
              ))}
            </div>
          </FilterGroup>
        )}

        {/* País */}
        {showCountry && (
          <FilterGroup title={d.panel.groupCountry} count={filters.country !== 'todos' ? 1 : 0}>
            <Segmented<CountryFilter>
              ariaLabel={d.panel.groupCountry}
              value={filters.country}
              onChange={(c) => onChange({ country: c })}
              options={[
                { value: 'todos', label: d.report.all },
                { value: 'es', label: `${d.report.spain} · ${formatNumber(facets.countries.es)}` },
                { value: 'pt', label: `${d.report.portugal} · ${formatNumber(facets.countries.pt)}` },
              ]}
            />
          </FilterGroup>
        )}

        {/* Territorio: CCAA + provincia */}
        {regionOptions.length > 0 && (
          <FilterGroup
            title={d.panel.groupTerritory}
            count={filters.regions.length + filters.provinces.length}
          >
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-fg-mute">{d.panel.groupCcaa}</p>
            <FacetChecklist
              groupLabel={d.panel.groupCcaa}
              options={regionOptions}
              selected={filters.regions}
              onToggle={(v) => onChange({ regions: toggleIn(filters.regions, v) })}
              searchable
            />
            {provinceOptions.length > 0 && (
              <>
                <p className="mb-1.5 mt-3 text-[10px] font-semibold uppercase tracking-wide text-fg-mute">{d.panel.groupProvince}</p>
                <FacetChecklist
                  groupLabel={d.panel.groupProvince}
                  options={provinceOptions}
                  selected={filters.provinces}
                  onToggle={(v) => onChange({ provinces: toggleIn(filters.provinces, v) })}
                  searchable
                />
              </>
            )}
          </FilterGroup>
        )}

        {/* Nivel de gravedad */}
        {facets.levels.length > 0 && (
          <FilterGroup title={d.panel.groupLevel} count={filters.levels.length} note={d.panel.groupLevelNote}>
            <div className="flex flex-wrap gap-1.5">
              {facets.levels.map(({ value: l, count }) => (
                <ToggleChip
                  key={l}
                  label={<span className="font-mono">{interpolate(d.panel.levelN, { n: l })}</span>}
                  active={filters.levels.includes(l)}
                  onClick={() =>
                    onChange({ levels: toggleIn(filters.levels, l) as Exclude<SeverityLevel, null>[] })
                  }
                  count={count}
                  accentColor={l >= 2 ? V.controlado : V.action}
                />
              ))}
            </div>
          </FilterGroup>
        )}

        {/* Tipo */}
        {facets.types.length > 0 && (
          <FilterGroup title={d.panel.groupType} count={filters.types.length} defaultOpen={false}>
            <div className="flex flex-wrap gap-1.5">
              {facets.types.map(({ value: t, count }) => (
                <ToggleChip
                  key={t}
                  label={typeLabel[t]}
                  active={filters.types.includes(t)}
                  onClick={() => onChange({ types: toggleIn(filters.types, t) as FireType[] })}
                  count={count}
                />
              ))}
            </div>
          </FilterGroup>
        )}

        {/* Medios y afección */}
        {facets.medios.length > 0 && (
          <FilterGroup
            title={d.panel.groupMedia}
            count={filters.medios.length + (filters.growing ? 1 : 0) + (filters.minPersonnel > 0 ? 1 : 0)}
            defaultOpen={false}
          >
            <div className="flex flex-wrap gap-1.5">
              {facets.medios.map(({ value: m, count }) => (
                <ToggleChip
                  key={m}
                  label={mediaLabel[m]}
                  active={filters.medios.includes(m)}
                  onClick={() => onChange({ medios: toggleIn(filters.medios, m) as MediaKey[] })}
                  count={count}
                  accentColor={MEDIA_ACCENT[m]}
                />
              ))}
            </div>
            {/* En expansión */}
            <div className="mt-2.5">
              <ToggleChip
                label={d.panel.growing}
                active={filters.growing}
                onClick={() => onChange({ growing: !filters.growing })}
                accentColor={V.activo}
              />
            </div>
            {/* Efectivos mínimos */}
            <p className="mb-1.5 mt-3 text-[10px] font-semibold uppercase tracking-wide text-fg-mute">{d.panel.groupPersonnel}</p>
            <div className="flex gap-1.5">
              {PERSONNEL_MINS.map((min) => (
                <ToggleChip
                  key={min}
                  label={<span className="font-mono">{min === 0 ? d.panel.any : `≥${min}`}</span>}
                  active={filters.minPersonnel === min}
                  onClick={() => onChange({ minPersonnel: min })}
                  className="flex-1 justify-center"
                />
              ))}
            </div>
          </FilterGroup>
        )}

        {/* Superficie */}
        <FilterGroup title={d.panel.groupArea} count={areaActive ? 1 : 0} defaultOpen={false} note={d.panel.areaNote}>
          <div className="flex items-center gap-1.5">
            <span className="w-8 font-mono text-[9.5px] text-fg-mute">mín</span>
            <div className="flex flex-1 gap-1">
              {HA_MINS.map((min) => (
                <ToggleChip
                  key={min}
                  label={<span className="font-mono">{min === 0 ? d.panel.any : `≥${formatNumber(min)}`}</span>}
                  active={filters.minHa === min}
                  onClick={() => onChange({ minHa: min })}
                  className="flex-1 justify-center"
                />
              ))}
            </div>
          </div>
          <div className="mt-1.5 flex items-center gap-1.5">
            <span className="w-8 font-mono text-[9.5px] text-fg-mute">máx</span>
            <div className="flex flex-1 gap-1">
              {HA_MAXES.map((max) => (
                <ToggleChip
                  key={max}
                  label={<span className="font-mono">{max >= HA_MAX ? d.panel.any : `≤${formatNumber(max)}`}</span>}
                  active={max >= HA_MAX ? filters.maxHa >= HA_MAX : filters.maxHa === max}
                  onClick={() => onChange({ maxHa: max })}
                  className="flex-1 justify-center"
                />
              ))}
            </div>
          </div>
        </FilterGroup>

        {/* Periodo */}
        <FilterGroup title={d.panel.groupPeriod} count={filters.period !== 'todos' ? 1 : 0} defaultOpen={false}>
          <Segmented<Period>
            ariaLabel={d.panel.groupPeriod}
            value={filters.period}
            onChange={(p) => onChange({ period: p })}
            options={[
              { value: 'todos', label: d.panel.any },
              ...PERIODS.map((p) => ({ value: p, label: p.replace('h', ' h').replace('d', ' d') })),
            ]}
          />
        </FilterGroup>

        {/* Confirmación satelital */}
        <FilterGroup title={d.panel.groupSatellite} count={filters.satellite !== 'todos' ? 1 : 0} defaultOpen={false}>
          <Segmented<SatelliteFilter>
            ariaLabel={d.panel.groupSatellite}
            value={filters.satellite}
            onChange={(s) => onChange({ satellite: s })}
            options={[
              { value: 'todos', label: d.panel.any },
              { value: 'si', label: `${d.panel.satelliteYes} · ${formatNumber(facets.satellite.si)}` },
              { value: 'no', label: d.panel.satelliteNo },
            ]}
          />
        </FilterGroup>

        {/* Fuente */}
        {facets.sources.length > 1 && (
          <FilterGroup title={d.panel.groupSource} count={filters.sources.length} defaultOpen={false}>
            <FacetChecklist
              groupLabel={d.panel.groupSource}
              options={facets.sources.map((s) => ({
                value: s.value,
                label: d.panel.sourceNames[s.value as SourceId] ?? s.value,
                count: s.count,
              }))}
              selected={filters.sources}
              onToggle={(v) => onChange({ sources: toggleIn(filters.sources, v as SourceId) })}
            />
          </FilterGroup>
        )}
      </div>

      {/* Pie: recuento en vivo */}
      <div className="flex-none border-t px-3.5 py-2.5 font-mono text-[10px] text-fg-mute" aria-live="polite">
        {interpolate(d.panel.resultsFires, { visible: formatNumber(visible), total: formatNumber(total) })}
      </div>
    </div>
  );
}
