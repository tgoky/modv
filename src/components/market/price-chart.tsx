"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Point = [number, number];

interface PriceChartProps {
  /** Historical points, oldest first. */
  points: Point[];
  /** Axis label style: clock times for intraday charts, dates for daily ones. */
  timeStyle: "time" | "date";
  format: (value: number) => string;
  label: string;
  /** Latest live price and when it was struck. Appended to the history as it changes. */
  livePrice: number | null;
  liveTs: number | null;
}

const HEIGHT = 320;
const PAD = { top: 16, right: 72, bottom: 30 };
/** Live ticks closer together than this replace each other, to keep the tail light. */
const TAIL_GAP_MS = 3_000;
const TAIL_MAX = 600;

function appendTail(tail: Point[], point: Point): Point[] {
  const last = tail[tail.length - 1];
  const next =
    last && point[0] - last[0] < TAIL_GAP_MS ? [...tail.slice(0, -1), point] : [...tail, point];
  return next.length > TAIL_MAX ? next.slice(next.length - TAIL_MAX) : next;
}

export function PriceChart({ points, timeStyle, format, label, livePrice, liveTs }: PriceChartProps) {
  const [tail, setTail] = useState<Point[]>([]);
  const [seenTs, setSeenTs] = useState<number | null>(null);
  if (livePrice !== null && liveTs !== null && liveTs !== seenTs) {
    setSeenTs(liveTs);
    setTail((t) => appendTail(t, [liveTs, livePrice]));
  }

  const series = useMemo(() => {
    const lastHistory = points.length ? points[points.length - 1][0] : 0;
    return [...points, ...tail.filter((p) => p[0] > lastHistory)];
  }, [points, tail]);

  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const [hover, setHover] = useState<number | null>(null);

  const geometry = useMemo(() => {
    if (width <= 0 || series.length < 2) return null;
    const t0 = series[0][0];
    const t1 = series[series.length - 1][0];
    const plotW = width - PAD.right;
    const plotH = HEIGHT - PAD.top - PAD.bottom;

    let lo = Infinity;
    let hi = -Infinity;
    for (const [, v] of series) {
      if (v < lo) lo = v;
      if (v > hi) hi = v;
    }
    const span = hi - lo || hi * 0.001 || 1;
    lo -= span * 0.08;
    hi += span * 0.08;

    const x = (t: number) => ((t - t0) / (t1 - t0 || 1)) * plotW;
    const y = (v: number) => PAD.top + (1 - (v - lo) / (hi - lo)) * plotH;
    const xs = series.map(([t]) => x(t));
    const line = series.map(([t, v], i) => `${i ? "L" : "M"}${x(t).toFixed(1)} ${y(v).toFixed(1)}`).join("");
    const base = PAD.top + plotH;
    const area = `${line}L${plotW.toFixed(1)} ${base}L0 ${base}Z`;
    const grid = [0.2, 0.4, 0.6, 0.8].map((f) => {
      const v = lo + f * (hi - lo);
      return { y: y(v), v };
    });
    return { t0, t1, plotW, plotH, x, y, xs, line, area, grid, base };
  }, [width, series]);

  const timeFmt = useMemo(
    () =>
      new Intl.DateTimeFormat(
        undefined,
        timeStyle === "time"
          ? { hour: "2-digit", minute: "2-digit" }
          : { day: "numeric", month: "short" },
      ),
    [timeStyle],
  );
  const fullFmt = useMemo(
    () =>
      new Intl.DateTimeFormat(
        undefined,
        timeStyle === "time"
          ? { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }
          : { day: "numeric", month: "short", year: "numeric" },
      ),
    [timeStyle],
  );

  const rising = series.length > 1 && series[series.length - 1][1] >= series[0][1];
  const stroke = rising ? "var(--gain)" : "var(--loss)";

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!geometry) return;
    const px = e.clientX - e.currentTarget.getBoundingClientRect().left;
    if (px > geometry.plotW) return setHover(null);
    // Nearest point by x. A linear scan is fine for a few hundred points.
    let best = 0;
    let bestDist = Infinity;
    for (let i = 0; i < geometry.xs.length; i++) {
      const d = Math.abs(geometry.xs[i] - px);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    }
    setHover(best);
  };

  const hovered = hover !== null && geometry && series[hover] ? series[hover] : null;

  return (
    <div ref={wrapRef} className="relative w-full" style={{ height: HEIGHT }}>
      {geometry && (
        <svg
          width={width}
          height={HEIGHT}
          role="img"
          aria-label={`Price chart for ${label}`}
          className="touch-pan-y select-none"
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
        >
          {geometry.grid.map((g) => (
            <g key={g.y}>
              <line x1={0} x2={geometry.plotW} y1={g.y} y2={g.y} stroke="rgba(235,240,227,0.08)" strokeWidth={1} />
              <text x={geometry.plotW + 10} y={g.y + 4} fontSize={12} fill="rgba(235,240,227,0.55)" className="font-mono tabular-nums">
                {format(g.v)}
              </text>
            </g>
          ))}
          <path d={geometry.area} fill={stroke} opacity={0.07} />
          <path d={geometry.line} fill="none" stroke={stroke} strokeWidth={1.75} strokeLinejoin="round" />

          <text x={0} y={HEIGHT - 8} fontSize={12} fill="rgba(235,240,227,0.55)">
            {timeFmt.format(geometry.t0)}
          </text>
          <text x={geometry.plotW / 2} y={HEIGHT - 8} fontSize={12} textAnchor="middle" fill="rgba(235,240,227,0.55)">
            {timeFmt.format((geometry.t0 + geometry.t1) / 2)}
          </text>
          <text x={geometry.plotW} y={HEIGHT - 8} fontSize={12} textAnchor="end" fill="rgba(235,240,227,0.55)">
            {timeFmt.format(geometry.t1)}
          </text>

          {/* Latest price marker */}
          <circle
            cx={geometry.xs[geometry.xs.length - 1]}
            cy={geometry.y(series[series.length - 1][1])}
            r={4.5}
            fill="var(--gold)"
            stroke="var(--night)"
            strokeWidth={1.5}
          />

          {hovered && hover !== null && (
            <g pointerEvents="none">
              <line
                x1={geometry.xs[hover]}
                x2={geometry.xs[hover]}
                y1={PAD.top}
                y2={geometry.base}
                stroke="rgba(235,240,227,0.7)"
                strokeWidth={1}
                strokeDasharray="3 3"
              />
              <circle cx={geometry.xs[hover]} cy={geometry.y(hovered[1])} r={4} fill="var(--paper)" />
            </g>
          )}
        </svg>
      )}

      {hovered && hover !== null && geometry && (
        <div
          className="pointer-events-none absolute top-1 rounded-md bg-paper px-2.5 py-1.5 text-night shadow-md"
          style={{ left: Math.min(Math.max(geometry.xs[hover] + 10, 0), Math.max(geometry.plotW - 130, 0)) }}
        >
          <div className="font-display text-lg leading-none font-medium tabular-nums">
            {format(hovered[1])}
          </div>
          <div className="mt-1 text-xs leading-none opacity-70">{fullFmt.format(hovered[0])}</div>
        </div>
      )}
    </div>
  );
}
