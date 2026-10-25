// The frame every chart sits in: a title, an optional legend, and a switch
// to a plain table of the same numbers, so no value is only readable by
// hovering or by telling colors apart.

import { useRef, useState } from 'react';
import type { CSSProperties, FocusEvent, PointerEvent, ReactNode } from 'react';
import { ChartIcon, TableIcon } from '../icons.tsx';

interface ChartCardProps {
  readonly title: string;
  readonly subtitle?: ReactNode;
  readonly legend?: ReactNode;
  readonly table: ReactNode;
  readonly children: ReactNode;
}

export function ChartCard({ title, subtitle, legend, table, children }: ChartCardProps) {
  const [asTable, setAsTable] = useState(false);
  return (
    <section className="card" aria-label={title}>
      <header className="card__header">
        <div>
          <h2 className="card__title">{title}</h2>
          {subtitle !== undefined && <p className="card__subtitle">{subtitle}</p>}
        </div>
        <div className="card__tools">
          <button
            type="button"
            className="icon-button icon-button--small"
            aria-pressed={asTable}
            aria-label={asTable ? 'Show as chart' : 'Show as table'}
            title={asTable ? 'Show as chart' : 'Show as table'}
            onClick={() => setAsTable(!asTable)}
          >
            {asTable ? <ChartIcon /> : <TableIcon />}
          </button>
        </div>
      </header>
      <div className="card__body">
        {legend !== undefined && !asTable && <div style={{ marginBottom: 14 }}>{legend}</div>}
        {asTable ? <div className="table-scroll">{table}</div> : children}
      </div>
    </section>
  );
}

export function LegendLine({ color, children }: { readonly color: string; readonly children: ReactNode }) {
  return (
    <span className="legend__item">
      <span className="legend__line" style={{ '--key': color } as CSSProperties} />
      {children}
    </span>
  );
}

export function LegendSwatch({ color, children }: { readonly color: string; readonly children: ReactNode }) {
  return (
    <span className="legend__item">
      <span className="legend__swatch" style={{ '--key': color } as CSSProperties} />
      {children}
    </span>
  );
}

/**
 * A tooltip positioned inside a container: at the pointer for pointer
 * events, above the focused element for keyboard focus.
 */
export function useTooltip() {
  const ref = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<{ x: number; y: number; content: ReactNode } | null>(null);

  const show = (event: PointerEvent<HTMLElement> | FocusEvent<HTMLElement>, content: ReactNode): void => {
    const box = ref.current?.getBoundingClientRect();
    if (box === undefined) {
      return;
    }
    let x: number;
    let y: number;
    if ('clientX' in event) {
      x = event.clientX - box.left;
      y = event.clientY - box.top;
    } else {
      const rect = event.currentTarget.getBoundingClientRect();
      x = rect.left + rect.width / 2 - box.left;
      y = rect.top - box.top;
    }
    setTip({ x: Math.max(96, Math.min(x, box.width - 96)), y, content });
  };

  const element =
    tip === null ? null : (
      <div className="tooltip" style={{ left: tip.x, top: tip.y }} role="status">
        {tip.content}
      </div>
    );

  return { ref, show, hide: () => setTip(null), element };
}

/** A round axis maximum and step for about four gridlines: 0, 50, 100, 150, 200. */
export function niceScale(max: number, ticks = 4): { readonly max: number; readonly step: number } {
  if (max <= 0) {
    return { max: ticks, step: 1 };
  }
  const rough = max / ticks;
  const power = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * power).find((s) => s >= rough) ?? 10 * power;
  return { max: step * Math.ceil(max / step), step };
}
