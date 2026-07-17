'use client';

import { formatNumber } from '@/lib/utils/format';
import { cn } from '@/lib/utils/cn';

export interface ColumnPoint {
  /** Año (eje X). */
  year: number;
  /** Valor de la magnitud; `null` = sin dato fiable (columna vacía). */
  value: number | null;
  /** Dato de avance/provisional (se marca con trama diagonal). */
  provisional?: boolean;
}

export interface ColumnChartLabels {
  /** Texto para el resumen accesible (aria) del gráfico completo. */
  ariaSummary: string;
  /** Leyenda del carácter provisional. */
  provisional: string;
  /** Leyenda del carácter definitivo/consolidado. */
  definitive: string;
  /** Botón que despliega la tabla de datos. */
  tableToggle: string;
  /** Cabeceras de la tabla: [año, valor, carácter]. */
  tableHeaders: [string, string, string];
  /** Etiquetas de carácter en la tabla. */
  statusDefinitive: string;
  statusProvisional: string;
  /** Texto para «sin dato». */
  noData: string;
  /** Vacío total. */
  empty: string;
}

/** Redondea el techo del eje a un número «limpio» (1, 2, 2.5, 5, 10 ×10^n). */
function niceMax(max: number): number {
  if (max <= 0) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(max)));
  const n = max / pow;
  const nice = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return nice * pow;
}

/**
 * Gráfico de columnas para una serie temporal anual de UNA sola magnitud
 * (número de siniestros, superficie…). Sigue las reglas de `dataviz`:
 * un único tono (la magnitud, no decora), rejilla hairline recesiva, columnas
 * finas con extremo redondeado y base cuadrada, etiquetas selectivas (máximo +
 * último) y capa de datos accesible (tabla equivalente en `<details>`). Los
 * años provisionales (avance) se distinguen con TRAMA, no con otro color, y
 * también en la tabla — nunca se depende solo del color.
 */
export function ColumnChart({
  title,
  points,
  unit,
  color,
  provisionalFill,
  labels,
  className,
}: {
  title: string;
  points: ColumnPoint[];
  /** Unidad para las cifras (p. ej. "ha"); vacío para conteos. */
  unit?: string;
  /** Color CSS que codifica la magnitud (token/`color-mix`). */
  color: string;
  /** Fondo CSS para columnas provisionales (trama). Si falta, usa `color`. */
  provisionalFill?: string;
  labels: ColumnChartLabels;
  className?: string;
}) {
  const provFill = provisionalFill ?? color;
  const withData = points.filter((p) => p.value != null);
  const rawMax = withData.length ? Math.max(...withData.map((p) => p.value as number)) : 0;
  const top = niceMax(rawMax);
  const ticks = [1, 0.75, 0.5, 0.25, 0].map((f) => top * f);

  const fmt = (n: number) => (unit ? `${formatNumber(n)} ${unit}` : formatNumber(n));

  // Etiqueta directa solo el EXTREMO (máximo): dataviz recomienda rotular
  // selectivamente y evita que una etiqueta del último año choque con el borde
  // (el valor más reciente ya está en el KPI «Último año» y en la tabla).
  const maxPoint = withData.reduce<ColumnPoint | null>(
    (best, p) => (best == null || (p.value as number) > (best.value as number) ? p : best),
    null,
  );
  const labelledYears = new Set<number>();
  if (maxPoint) labelledYears.add(maxPoint.year);

  const anyProvisional = points.some((p) => p.provisional);

  if (!withData.length) {
    return (
      <figure className={cn('min-w-0', className)}>
        <figcaption className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-fg-mute">
          {title}
        </figcaption>
        <p className="text-[11px] text-fg-mute">{labels.empty}</p>
      </figure>
    );
  }

  return (
    <figure className={cn('min-w-0', className)}>
      <figcaption className="mb-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-fg-mute">
        {title}
      </figcaption>

      {/* Área de trazado: rejilla + columnas. El gráfico es apoyo visual
          (aria-hidden); la tabla de datos es el equivalente accesible. */}
      <div
        role="img"
        aria-label={labels.ariaSummary}
        className="relative flex h-[152px] items-stretch gap-[6px] pl-[42px]"
      >
        {/* Eje Y: rejilla hairline + marcas redondeadas */}
        <div className="pointer-events-none absolute inset-y-0 left-0 right-0" aria-hidden>
          {ticks.map((t, i) => (
            <div
              key={i}
              className="absolute left-0 right-0 flex items-center"
              style={{ top: `${(i / (ticks.length - 1)) * 100}%`, transform: 'translateY(-50%)' }}
            >
              <span className="w-[38px] flex-none pr-1.5 text-right font-mono text-[8.5px] tabular-nums text-fg-mute">
                {formatNumber(t)}
              </span>
              <span className={cn('h-px flex-1', i === ticks.length - 1 ? 'bg-border-default' : 'bg-border-subtle')} />
            </div>
          ))}
        </div>

        {/* Columnas */}
        {points.map((p, i) => {
          const h = p.value != null ? Math.max(2, (p.value / top) * 100) : 0;
          const labelled = p.value != null && labelledYears.has(p.year);
          // La etiqueta puede ser más ancha que su columna: se ancla al borde
          // en los extremos para no recortarse fuera del área de trazado.
          const align = i === points.length - 1 ? 'text-right' : i === 0 ? 'text-left' : 'text-center';
          return (
            <div key={p.year} className="relative z-[1] flex min-w-0 flex-1 flex-col justify-end" title={p.value != null ? `${p.year}: ${fmt(p.value)}` : `${p.year}: ${labels.noData}`}>
              {labelled && (
                <span className={cn('mb-0.5 whitespace-nowrap font-mono text-[8.5px] font-semibold tabular-nums leading-none text-fg-secondary', align)}>
                  {formatNumber(p.value as number)}
                </span>
              )}
              <span
                className="mx-auto w-full max-w-[24px] rounded-t-[4px]"
                style={{
                  height: `${h}%`,
                  minHeight: p.value != null ? 2 : 0,
                  background: p.provisional && p.value != null ? provFill : color,
                }}
              />
            </div>
          );
        })}
      </div>

      {/* Eje X: años (alineado con las columnas) */}
      <div className="mt-1 flex gap-[6px] pl-[42px]">
        {points.map((p) => (
          <span
            key={p.year}
            className={cn(
              'min-w-0 flex-1 text-center font-mono text-[8px] tabular-nums leading-none',
              labelledYears.has(p.year) ? 'font-semibold text-fg-secondary' : 'text-fg-mute',
            )}
          >
            {`'${String(p.year).slice(2)}`}
          </span>
        ))}
      </div>

      {/* Leyenda del carácter provisional (solo si aplica) */}
      {anyProvisional && (
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[9px] text-fg-mute">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-[2px]" style={{ background: color }} aria-hidden />
            {labels.definitive}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-[2px]" aria-hidden style={{ background: provFill }} />
            {labels.provisional}
          </span>
        </div>
      )}

      {/* Tabla de datos equivalente (accesibilidad + cifras exactas) */}
      <details className="mt-2 group">
        <summary className="cursor-pointer select-none font-mono text-[9.5px] font-semibold uppercase tracking-[0.08em] text-fg-mute hover:text-fg-secondary">
          {labels.tableToggle}
        </summary>
        <table className="mt-1.5 w-full border-collapse text-[11px]">
          <caption className="sr-only">{title}</caption>
          <thead>
            <tr className="border-b border-default text-left font-mono text-[9px] uppercase tracking-[0.08em] text-fg-mute">
              <th scope="col" className="py-1 pr-2 font-semibold">{labels.tableHeaders[0]}</th>
              <th scope="col" className="py-1 pr-2 text-right font-semibold">{labels.tableHeaders[1]}</th>
              <th scope="col" className="py-1 font-semibold">{labels.tableHeaders[2]}</th>
            </tr>
          </thead>
          <tbody>
            {points.map((p) => (
              <tr key={p.year} className="border-b border-subtle">
                <th scope="row" className="py-1 pr-2 text-left font-mono tabular-nums font-medium text-fg-secondary">{p.year}</th>
                <td className="py-1 pr-2 text-right font-mono tabular-nums text-fg">
                  {p.value != null ? fmt(p.value) : <span className="text-fg-mute">{labels.noData}</span>}
                </td>
                <td className="py-1 text-fg-secondary">
                  {p.provisional ? labels.statusProvisional : labels.statusDefinitive}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
