"use client";

import { Flame, Layers, Loader2, Search } from "lucide-react";
import { useState } from "react";
import { fmtCompact, fmtPct, fmtPrice } from "@/lib/format";
import type { MemeMarket, PerpMarket } from "@/lib/sim/api-types";
import { CHAINS, CHAIN_LIST, type ChainId } from "@/lib/sim/chains";
import { cn } from "@/lib/utils";
import { panel, type Selected } from "./types";

type Tab = "perp" | "meme";

export function MarketPanel({
  perps, memes, memesLoaded, selected, onSelect, onLookup,
}: {
  perps: PerpMarket[];
  memes: MemeMarket[];
  memesLoaded: boolean;
  selected: Selected;
  onSelect: (s: Selected) => void;
  onLookup: (m: MemeMarket) => void;
}) {
  const [tab, setTab] = useState<Tab>(selected.kind);
  const [q, setQ] = useState("");
  const [chain, setChain] = useState<ChainId | "all">("all");
  const [lookup, setLookup] = useState<{ busy: boolean; error: string | null }>({ busy: false, error: null });

  const needle = q.trim().toLowerCase();
  const looksLikeAddress = /^[A-Za-z0-9]{28,64}$/.test(q.trim());

  const doLookup = async () => {
    const address = q.trim();
    setLookup({ busy: true, error: null });
    const chains = chain === "all" ? CHAIN_LIST.map((c) => c.id) : [chain];
    const found = await Promise.all(
      chains.map((c) =>
        fetch(`/api/memes/quote?chain=${c}&address=${encodeURIComponent(address)}`)
          .then((r) => (r.ok ? (r.json() as Promise<MemeMarket>) : null))
          .catch(() => null),
      ),
    );
    const hit = found.find(Boolean);
    if (!hit) return setLookup({ busy: false, error: "No tradable pool found for that address." });
    setLookup({ busy: false, error: null });
    setQ("");
    onLookup(hit);
    onSelect({ kind: "meme", chain: hit.chain, address: hit.address });
  };

  const perpRows = perps.filter((m) => !needle || m.label.toLowerCase().includes(needle));
  const memeRows = memes.filter(
    (m) => (chain === "all" || m.chain === chain) && (!needle || m.symbol.toLowerCase().includes(needle) || m.name.toLowerCase().includes(needle)),
  );

  return (
    <aside className={cn(panel, "flex min-h-0 flex-col overflow-hidden lg:max-h-[calc(100dvh-15rem)]")} aria-label="Markets">
      <div className="grid grid-cols-2 gap-1 p-2" role="tablist" aria-label="Market type">
        {([["perp", "Futures", Flame], ["meme", "Meme coins", Layers]] as const).map(([id, label, Icon]) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={cn("flex h-9 items-center justify-center gap-1.5 rounded-lg text-sm font-semibold transition-colors", tab === id ? "bg-night-3 text-paper" : "text-paper/55 hover:text-paper")}
          >
            <Icon className="size-4" aria-hidden /> {label}
          </button>
        ))}
      </div>

      <div className="px-2 pb-2">
        <label className="relative block">
          <span className="sr-only">{tab === "meme" ? "Search or paste a token address" : "Search markets"}</span>
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-paper/40" aria-hidden />
          <input
            value={q}
            onChange={(e) => { setQ(e.target.value); setLookup({ busy: false, error: null }); }}
            onKeyDown={(e) => e.key === "Enter" && tab === "meme" && looksLikeAddress && doLookup()}
            placeholder={tab === "meme" ? "Search or paste token address" : "Search markets"}
            className="h-9 w-full rounded-lg border border-paper/10 bg-night pr-3 pl-9 text-sm text-paper placeholder:text-paper/35 focus-visible:outline-gold"
          />
        </label>
        {tab === "meme" && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {(["all", ...CHAIN_LIST.map((c) => c.id)] as const).map((c) => (
              <button
                key={c}
                onClick={() => setChain(c)}
                aria-pressed={chain === c}
                className={cn("rounded-md px-2 py-1 text-xs font-medium transition-colors", chain === c ? "bg-gold text-night" : "bg-night-3 text-paper/70 hover:text-paper")}
              >
                {c === "all" ? "All" : CHAINS[c].label}
              </button>
            ))}
          </div>
        )}
        {tab === "meme" && looksLikeAddress && (
          <button onClick={doLookup} disabled={lookup.busy} className="mt-2 flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-night-3 text-sm font-semibold text-gold hover:bg-night-3/70">
            {lookup.busy && <Loader2 className="size-4 animate-spin" aria-hidden />} Look up this token
          </button>
        )}
        {lookup.error && <p role="alert" className="mt-2 text-xs text-loss">{lookup.error}</p>}
      </div>

      <ul className="min-h-0 flex-1 divide-y divide-paper/[0.06] overflow-y-auto">
        {tab === "perp" &&
          (perpRows.length === 0
            ? <li className="p-4 text-sm text-paper/50">{perps.length ? "No match." : "Loading futures markets"}</li>
            : perpRows.map((m) => {
                const active = selected.kind === "perp" && selected.coin === m.coin;
                return (
                  <li key={m.coin}>
                    <button onClick={() => onSelect({ kind: "perp", coin: m.coin })} aria-pressed={active}
                      className={cn("grid w-full grid-cols-[1fr_auto] items-center gap-x-3 px-4 py-2.5 text-left transition-colors hover:bg-night-3/60", active && "bg-night-3 shadow-[inset_3px_0_0_var(--gold)]")}>
                      <span className="font-display text-lg leading-tight font-semibold">{m.label}</span>
                      <span className="font-mono text-sm tabular-nums">${fmtPrice(m.price)}</span>
                      <span className="text-xs text-paper/45">Vol ${fmtCompact(m.volumeUsd)}</span>
                      <span className={cn("text-right font-mono text-xs tabular-nums", m.changePct >= 0 ? "text-gain" : "text-loss")}>{fmtPct(m.changePct)}</span>
                    </button>
                  </li>
                );
              }))}
        {tab === "meme" &&
          (memeRows.length === 0
            ? <li className="p-4 text-sm text-paper/50">{!memesLoaded ? "Loading trending tokens" : memes.length ? "No match on this chain." : "Trending tokens are unavailable. Paste a token address to trade it."}</li>
            : memeRows.map((m) => {
                const active = selected.kind === "meme" && selected.chain === m.chain && selected.address === m.address;
                return (
                  <li key={`${m.chain}:${m.address}`}>
                    <button onClick={() => onSelect({ kind: "meme", chain: m.chain, address: m.address })} aria-pressed={active}
                      className={cn("grid w-full grid-cols-[1fr_auto] items-center gap-x-3 px-4 py-2.5 text-left transition-colors hover:bg-night-3/60", active && "bg-night-3 shadow-[inset_3px_0_0_var(--gold)]")}>
                      <span className="flex items-center gap-2 truncate font-display text-lg leading-tight font-semibold">
                        {m.symbol}
                        <span className="rounded bg-paper/10 px-1.5 py-0.5 font-sans text-[0.6rem] font-medium tracking-wide text-paper/60">{CHAINS[m.chain].label}</span>
                      </span>
                      <span className="font-mono text-sm tabular-nums">${fmtPrice(m.priceUsd)}</span>
                      <span className="text-xs text-paper/45">Liq ${fmtCompact(m.liquidityUsd)}</span>
                      <span className={cn("text-right font-mono text-xs tabular-nums", (m.change24h ?? 0) >= 0 ? "text-gain" : "text-loss")}>{fmtPct(m.change24h)}</span>
                    </button>
                  </li>
                );
              }))}
      </ul>
    </aside>
  );
}
