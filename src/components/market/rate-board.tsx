"use client";

import { useEffect, useState } from "react";
import type { FeedState, FxStatus } from "@/hooks/use-live-markets";
import {
  INSTRUMENTS,
  formatChange,
  formatPrice,
  getInstrument,
  type Instrument,
  type Quote,
} from "@/lib/markets";
import { cn } from "@/lib/utils";
import { FlapPrice } from "./flap-price";

interface RateBoardProps {
  quotes: Record<string, Quote>;
  feed: FeedState;
  fx: FxStatus;
  /** Which markets to show, in order. Defaults to all. */
  ids?: readonly string[];
  selectedId?: string;
  onSelect?: (id: string) => void;
  /** Tighter rows, no group headings or footer. */
  compact?: boolean;
  className?: string;
}

/** How long the first-appearance stagger runs before ticks animate immediately. */
const INTRO_MS = 4_000;

export function RateBoard({
  quotes,
  feed,
  fx,
  ids,
  selectedId,
  onSelect,
  compact = false,
  className,
}: RateBoardProps) {
  const [intro, setIntro] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setIntro(false), INTRO_MS);
    return () => clearTimeout(t);
  }, []);

  const rows: Instrument[] = ids
    ? ids.map((id) => getInstrument(id)).filter((i): i is Instrument => !!i)
    : [...INSTRUMENTS];
  const groups = [
    { key: "fx", title: "Currencies", items: rows.filter((r) => r.cls === "fx") },
    { key: "crypto", title: "Crypto", items: rows.filter((r) => r.cls === "crypto") },
  ].filter((g) => g.items.length > 0);
  const showHeadings = !compact && groups.length > 1;

  let rowIndex = 0;
  return (
    <section
      aria-label="Live prices"
      className={cn(
        "overflow-hidden rounded-xl bg-board text-chalk shadow-[0_28px_48px_-28px_rgba(16,20,26,0.6)]",
        className,
      )}
    >
      <header className="flex flex-wrap items-center justify-between gap-x-5 gap-y-1.5 px-4 pt-4 pb-3">
        <h2 className="font-display text-xl font-semibold tracking-wide">Live prices</h2>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.8rem] text-chalk-dim">
          <CryptoStatus feed={feed} />
          <FxStatusLabel fx={fx} />
        </div>
      </header>

      {groups.map((group) => (
        <div key={group.key}>
          {showHeadings && (
            <h3 className="border-t border-white/[0.07] px-4 pt-3 pb-1 text-sm text-chalk-dim">
              {group.title}
            </h3>
          )}
          <ul>
            {group.items.map((inst) => {
              const index = rowIndex++;
              return (
                <RateRow
                  key={inst.id}
                  inst={inst}
                  quote={quotes[inst.id]}
                  introDelay={intro ? index * 55 : 0}
                  selected={selectedId === inst.id}
                  onSelect={onSelect}
                  compact={compact}
                />
              );
            })}
          </ul>
        </div>
      ))}

      {!compact && (
        <footer className="border-t border-white/[0.07] px-4 py-3 text-xs leading-relaxed text-chalk-dim">
          Crypto prices come from Coinbase. Currency rates come from{" "}
          {fx.source ?? "a quote provider"}. Prices are indicative and are not tradable quotes.
        </footer>
      )}
    </section>
  );
}

function RateRow({
  inst,
  quote,
  introDelay,
  selected,
  onSelect,
  compact,
}: {
  inst: Instrument;
  quote: Quote | undefined;
  introDelay: number;
  selected: boolean;
  onSelect?: (id: string) => void;
  compact: boolean;
}) {
  const price = quote?.price ?? null;

  // Tint the price for a moment when it moves. Comparing during render (rather
  // than in an effect) keeps the tint in the same frame as the new digits.
  const [lastPrice, setLastPrice] = useState(price);
  const [tone, setTone] = useState<"idle" | "up" | "down">("idle");
  if (price !== lastPrice) {
    setLastPrice(price);
    if (price !== null && lastPrice !== null) setTone(price > lastPrice ? "up" : "down");
  }
  useEffect(() => {
    if (tone === "idle") return;
    const t = setTimeout(() => setTone("idle"), 900);
    return () => clearTimeout(t);
  }, [tone, price]);

  const change = quote?.changePct ?? null;
  const rowClass = cn(
    "grid w-full grid-cols-[minmax(0,1fr)_auto_4.6rem] items-center gap-3 border-t border-white/[0.07] px-4 text-left",
    compact ? "py-2.5" : "py-3.5",
    selected && "bg-flap shadow-[inset_3px_0_0_var(--signal)]",
    onSelect && !selected && "hover:bg-flap/60",
    onSelect && "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-signal",
  );

  const body = (
    <>
      <span className="min-w-0">
        <span className="block font-display text-xl font-semibold tracking-wide">{inst.label}</span>
        {!compact && (
          <span className="block truncate text-[0.8rem] text-chalk-dim">{inst.name}</span>
        )}
      </span>
      <FlapPrice
        text={price === null ? null : formatPrice(price, inst.decimals)}
        tone={tone}
        introDelay={introDelay}
        className={compact ? "text-[1.35rem]" : "text-[1.6rem] sm:text-[1.85rem]"}
      />
      <span
        className={cn(
          "text-right font-display text-lg font-medium tabular-nums",
          change === null || Math.abs(change) < 0.005
            ? "text-chalk-dim"
            : change > 0
              ? "text-up"
              : "text-down",
        )}
      >
        {formatChange(change)}
      </span>
    </>
  );

  return (
    <li>
      {onSelect ? (
        <button
          type="button"
          onClick={() => onSelect(inst.id)}
          aria-pressed={selected}
          aria-label={`${inst.label}, show chart`}
          className={rowClass}
        >
          {body}
        </button>
      ) : (
        <div className={rowClass}>{body}</div>
      )}
    </li>
  );
}

function StatusDot({ tone }: { tone: "up" | "wait" | "down" }) {
  return (
    <span
      aria-hidden
      className={cn(
        "mr-1.5 inline-block size-1.5 rounded-full align-middle",
        tone === "up" && "bg-up",
        tone === "wait" && "animate-pulse bg-signal",
        tone === "down" && "bg-down",
      )}
    />
  );
}

function CryptoStatus({ feed }: { feed: FeedState }) {
  return (
    <span>
      <StatusDot tone={feed === "live" ? "up" : "wait"} />
      {feed === "live"
        ? "Crypto streaming live"
        : feed === "connecting"
          ? "Crypto connecting"
          : "Crypto reconnecting"}
    </span>
  );
}

function FxStatusLabel({ fx }: { fx: FxStatus }) {
  if (fx.phase === "loading") {
    return (
      <span>
        <StatusDot tone="wait" />
        Currencies loading
      </span>
    );
  }
  if (fx.phase === "error" || fx.asOf === null) {
    return (
      <span>
        <StatusDot tone="down" />
        Currencies unavailable
      </span>
    );
  }
  if (fx.mode === "live") {
    return (
      <span>
        <StatusDot tone="up" />
        Currencies updated <Age ts={fx.asOf} />
      </span>
    );
  }
  const day = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(fx.asOf);
  return (
    <span>
      <StatusDot tone="wait" />
      Currencies at the daily reference rate, {day}
    </span>
  );
}

function Age({ ts }: { ts: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(t);
  }, []);

  const s = Math.max(0, Math.round((now - ts) / 1_000));
  if (s < 5) return <>just now</>;
  if (s < 60) return <>{s}s ago</>;
  if (s < 3_600) return <>{Math.floor(s / 60)}m ago</>;
  if (s < 86_400) return <>{Math.floor(s / 3_600)}h ago</>;
  return <>{Math.floor(s / 86_400)}d ago</>;
}
