"use client";

import { ChartCandlestick, History, LogOut, ScrollText, Trophy, Wifi, WifiOff } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { logout } from "@/app/actions/auth";
import { syncAction, type ActionResult } from "@/app/actions/trade";
import { Wordmark } from "@/components/brand/wordmark";
import { useMemeQuotes } from "@/hooks/use-meme-quotes";
import { useMemes } from "@/hooks/use-memes";
import { usePerps } from "@/hooks/use-perps";
import type { MemeMarket } from "@/lib/sim/api-types";
import { equity as computeEquity, settle } from "@/lib/sim/engine";
import type { ChallengeState } from "@/lib/sim/service";
import { memeKey, type PriceBook } from "@/lib/sim/types";
import { cn } from "@/lib/utils";
import { AccountView, HistoryView, RulesView } from "./account-views";
import { ChallengeBar } from "./challenge-bar";
import { ChartPanel } from "./chart-panel";
import { CheckoutDialog } from "./checkout-dialog";
import { MarketPanel } from "./market-panel";
import { OrderBook, PoolInfo } from "./order-book";
import { OrderTicket } from "./order-ticket";
import { PositionsTable } from "./positions-table";
import type { Selected, View } from "./types";

const NAV: { id: View; label: string; icon: typeof Trophy }[] = [
  { id: "trade", label: "Trade", icon: ChartCandlestick },
  { id: "account", label: "Account", icon: Trophy },
  { id: "history", label: "History", icon: History },
  { id: "rules", label: "Rules", icon: ScrollText },
];

export function TerminalView({ initial, name, accountNo }: { initial: ChallengeState; name: string; accountNo: string }) {
  const [state, setState] = useState(initial);
  const [view, setView] = useState<View>("trade");
  const [selected, setSelected] = useState<Selected>({ kind: "perp", coin: "BTC" });
  const [extraMemes, setExtraMemes] = useState<MemeMarket[]>([]);
  const [checkout, setCheckout] = useState(false);

  const perps = usePerps();
  const trending = useMemes();
  const challenge = state.challenge;

  const refs = useMemo(() => {
    const held = (challenge?.positions ?? []).flatMap((p) => (p.kind === "meme" ? [{ chain: p.chain, address: p.address }] : []));
    return selected.kind === "meme" ? [...held, { chain: selected.chain, address: selected.address }] : held;
  }, [challenge, selected]);
  const memeQuotes = useMemeQuotes(refs);

  const allMemes = useMemo(() => [...extraMemes, ...trending.memes.filter((m) => !extraMemes.some((e) => e.address === m.address))], [extraMemes, trending.memes]);

  // Prices the browser can see right now, newest data winning over what the server sent.
  const liveBook = useMemo<PriceBook>(() => {
    const perpBook = { ...state.book.perps };
    for (const m of perps.markets) perpBook[m.coin] = m.price;
    const memeBook = { ...state.book.memes };
    for (const [k, q] of Object.entries(memeQuotes.quotes)) memeBook[k] = { price: q.priceUsd, liquidityUsd: q.liquidityUsd };
    return { perps: perpBook, memes: memeBook };
  }, [state.book, perps.markets, memeQuotes.quotes]);

  const equity = challenge ? computeEquity(challenge, liveBook) : 0;

  // If live prices say a rule was crossed, ask the server (the authority) to apply it.
  const stale = challenge?.status === "active" && settle(challenge, liveBook, 0) !== challenge;
  useEffect(() => {
    if (!stale) return;
    let cancelled = false;
    void syncAction().then((r) => !cancelled && r.ok && setState(r.state));
    return () => {
      cancelled = true;
    };
  }, [stale]);

  const apply = useCallback((r: ActionResult) => {
    if (r.ok) setState(r.state);
  }, []);

  const perp = selected.kind === "perp" ? perps.markets.find((m) => m.coin === selected.coin) : undefined;
  const meme = useMemo(() => {
    if (selected.kind !== "meme") return undefined;
    return memeQuotes.quotes[memeKey(selected.chain, selected.address)] ?? allMemes.find((m) => m.chain === selected.chain && m.address === selected.address);
  }, [selected, memeQuotes.quotes, allMemes]);

  const live = perps.socket === "live";

  return (
    <div className="flex min-h-dvh flex-col-reverse bg-night text-paper lg:flex-row">
      <nav aria-label="Main" className="sticky bottom-0 z-20 flex items-center justify-around border-t border-paper/10 bg-night-2 px-2 py-1.5 lg:static lg:w-[4.75rem] lg:flex-col lg:justify-start lg:gap-1 lg:border-t-0 lg:border-r lg:py-4">
        <div className="hidden pb-4 lg:block"><Wordmark tone="paper" markOnly /></div>
        {NAV.map((n) => (
          <button key={n.id} onClick={() => setView(n.id)} aria-current={view === n.id ? "page" : undefined}
            className={cn("flex w-full min-w-14 flex-col items-center gap-1 rounded-lg px-2 py-2 text-[0.7rem] font-medium transition-colors lg:py-3", view === n.id ? "bg-night-3 text-gold" : "text-paper/55 hover:text-paper")}>
            <n.icon className="size-5" aria-hidden /> {n.label}
          </button>
        ))}
        <form action={logout} className="w-full lg:mt-auto">
          <button type="submit" className="flex w-full min-w-14 flex-col items-center gap-1 rounded-lg px-2 py-2 text-[0.7rem] font-medium text-paper/55 hover:text-paper lg:py-3">
            <LogOut className="size-5" aria-hidden /> Log out
          </button>
        </form>
      </nav>

      <div className="min-w-0 flex-1 px-3 pb-6 sm:px-5 lg:px-6">
        <header className="flex flex-wrap items-center justify-between gap-3 py-4">
          <div className="lg:hidden"><Wordmark tone="paper" /></div>
          <h1 className="hidden font-display text-3xl font-semibold lg:block">{NAV.find((n) => n.id === view)?.label}</h1>
          <div className="flex items-center gap-4 text-sm">
            <span className={cn("inline-flex items-center gap-1.5", live ? "text-gain" : "text-paper/50")} role="status">
              {live ? <Wifi className="size-4" aria-hidden /> : <WifiOff className="size-4" aria-hidden />}
              {live ? "Futures live" : perps.socket === "connecting" ? "Connecting" : "Reconnecting"}
            </span>
            <span className="text-right leading-tight"><span className="block font-medium">{name}</span><span className="block font-mono text-xs text-paper/50">{accountNo}</span></span>
          </div>
        </header>

        <div className="grid gap-4">
          <ChallengeBar challenge={challenge} equity={equity} onStart={() => setCheckout(true)} />

          {view === "trade" && (
            <div className="grid gap-4 lg:grid-cols-[16.5rem_minmax(0,1fr)] xl:grid-cols-[17rem_minmax(0,1fr)_19.5rem]">
              <MarketPanel perps={perps.markets} memes={allMemes} memesLoaded={trending.loaded} selected={selected} onSelect={setSelected}
                onLookup={(m) => setExtraMemes((prev) => (prev.some((x) => x.address === m.address) ? prev : [m, ...prev]))} />
              <div className="grid min-w-0 content-start gap-4">
                <ChartPanel selected={selected} perp={perp} meme={meme} liveTs={selected.kind === "perp" ? perps.updatedAt : memeQuotes.updatedAt} />
                <PositionsTable challenge={challenge} book={liveBook} onResult={apply} />
              </div>
              <div className="grid content-start gap-4 lg:col-span-2 lg:grid-cols-2 xl:col-span-1 xl:grid-cols-1">
                <OrderTicket selected={selected} perp={perp} meme={meme} challenge={challenge} equity={equity} onResult={apply} onStart={() => setCheckout(true)} />
                {selected.kind === "perp" ? <OrderBook coin={selected.coin} /> : meme ? <PoolInfo m={meme} /> : null}
              </div>
            </div>
          )}
          {view === "account" && <AccountView challenge={challenge} equity={equity} onStart={() => setCheckout(true)} />}
          {view === "history" && <HistoryView trades={challenge?.trades ?? []} />}
          {view === "rules" && <RulesView />}
        </div>
      </div>

      {/* Mounted only while open, so every purchase starts from a clean state. */}
      {checkout && (
        <CheckoutDialog
          open
          onOpenChange={setCheckout}
          onStarted={(s) => {
            setState(s);
            setCheckout(false);
            setView("trade");
          }}
        />
      )}
    </div>
  );
}
