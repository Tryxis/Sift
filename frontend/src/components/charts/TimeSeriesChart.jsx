import { useId, useState } from "react";
import { cn } from "@/lib/utils";

// Single-series monthly charts. One series means no legend box: the section title names it.
// Bars cap at 24px with a 4px rounded top and square base; lines are 2px. Gridlines are
// hairline and recessive, ticks are clean rounded numbers, and every point has a tooltip
// plus a visually hidden table for screen readers.

function niceMax(value) {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 2.5, 5, 10].find((multiple) => multiple * magnitude >= value);
  return step * magnitude;
}

const compact = (value) => (value >= 1000 ? `${Math.round(value / 100) / 10}K` : `${Math.round(value * 10) / 10}`);

function Tooltip({ point, index, count, format }) {
  const left = ((index + 0.5) / count) * 100;
  return (
    <div
      role="presentation"
      className="pointer-events-none absolute bottom-full z-10 mb-2 -translate-x-1/2 whitespace-nowrap rounded-well border border-border-strong bg-popover px-2.5 py-1.5 text-xs shadow-lg"
      style={{ left: `clamp(3.5rem, ${left}%, calc(100% - 3.5rem))` }}
    >
      <p className="text-muted-foreground">{point.title}</p>
      <p className="font-medium tabular-nums text-foreground">{format(point.value)}</p>
      {point.detail && <p className="mt-0.5 max-w-56 truncate text-muted-foreground">{point.detail}</p>}
    </div>
  );
}

/**
 * data: [{ key, label (short x-axis label), title (tooltip heading), value, detail? }]
 * kind: "bar" | "line"
 */
export function TimeSeriesChart({ data, kind = "bar", format = compact, colorVar = "--status-playing", height = 160, label, minValue = 0 }) {
  const [active, setActive] = useState(null);
  const tableId = useId();
  if (!data.length) return null;

  const values = data.map((point) => point.value);
  const top = niceMax(Math.max(...values));
  const bottom = kind === "line" ? Math.min(minValue, ...values) : 0;
  const range = top - bottom || 1;
  const ticks = [top, bottom + range / 2, bottom];
  const labelEvery = Math.ceil(data.length / 8);
  const color = `hsl(var(${colorVar}))`;
  const y = (value) => ((top - value) / range) * 100;

  return (
    <figure className="space-y-2">
      <div className="grid grid-cols-[2.5rem_1fr] gap-2">
        {/* Y axis ticks */}
        <div className="relative text-right text-[11px] tabular-nums text-muted-foreground" style={{ height }} aria-hidden="true">
          {ticks.map((tick, index) => (
            <span key={index} className="absolute right-0 -translate-y-1/2" style={{ top: `${(index / 2) * 100}%` }}>
              {compact(tick)}
            </span>
          ))}
        </div>

        <div className="relative" style={{ height }} onMouseLeave={() => setActive(null)}>
          {/* Hairline gridlines */}
          {ticks.map((_, index) => (
            <div key={index} className="absolute inset-x-0 border-t border-border" style={{ top: `${(index / 2) * 100}%` }} aria-hidden="true" />
          ))}

          {kind === "line" && (
            <svg className="absolute inset-0 h-full w-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              <polygon
                points={`${(0.5 / data.length) * 100},100 ${data.map((point, index) => `${((index + 0.5) / data.length) * 100},${y(point.value)}`).join(" ")} ${((data.length - 0.5) / data.length) * 100},100`}
                fill={color}
                opacity="0.1"
              />
              <polyline
                points={data.map((point, index) => `${((index + 0.5) / data.length) * 100},${y(point.value)}`).join(" ")}
                fill="none"
                stroke={color}
                strokeWidth="2"
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
          )}

          {/* One hit column per point: bigger than the mark, carries hover + focus. */}
          <div className="absolute inset-0 flex gap-[2px]">
            {data.map((point, index) => (
              <div
                key={point.key}
                tabIndex={0}
                role="img"
                aria-label={`${point.title}: ${format(point.value)}`}
                onMouseEnter={() => setActive(index)}
                onFocus={() => setActive(index)}
                onBlur={() => setActive(null)}
                className={cn("relative flex flex-1 items-end justify-center outline-none", active === index && "bg-foreground/[0.04]")}
              >
                {kind === "bar" && point.value > 0 && (
                  <div className="w-full max-w-6 rounded-t-[4px]" style={{ height: `${(point.value / top) * 100}%`, background: color }} />
                )}
                {kind === "line" && active === index && (
                  <div
                    className="absolute h-2.5 w-2.5 -translate-y-1/2 rounded-full ring-2 ring-card"
                    style={{ top: `${y(point.value)}%`, background: color }}
                  />
                )}
              </div>
            ))}
          </div>

          {active != null && <Tooltip point={data[active]} index={active} count={data.length} format={format} />}
        </div>
      </div>

      {/* X axis: a label every few points so they never collide. */}
      <div className="ml-[3rem] flex gap-[2px] text-[11px] text-muted-foreground" aria-hidden="true">
        {data.map((point, index) => (
          <span key={point.key} className="flex-1 truncate text-center">
            {index % labelEvery === 0 || index === data.length - 1 ? point.label : ""}
          </span>
        ))}
      </div>

      <table id={tableId} className="sr-only">
        <caption>{label}</caption>
        <tbody>
          {data.map((point) => (
            <tr key={point.key}>
              <th scope="row">{point.title}</th>
              <td>{format(point.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
