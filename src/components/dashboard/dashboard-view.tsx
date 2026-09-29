"use client";

import { useEffect, useState } from "react";
import { logout } from "@/app/actions/auth";
import { Wordmark } from "@/components/brand/wordmark";
import { PriceChart } from "@/components/market/price-chart";
import { RateBoard } from "@/components/market/rate-board";
import { Button } from "@/components/ui/button";
import { useLiveMarkets } from "@/hooks/use-live-markets";
import {
  INSTRUMENTS,
  formatChange,
  formatPrice,
  formatUsd,
  getInstrument,
  type HistoryPayload,
} from "@/lib/markets";
import { cn } from "@/lib/utils";

interface DashboardViewProps {
  name: string;
  accountNo: string;
  balanceCents: number;
}

type HistoryState =
  | { id: string; status: "loading" }
  | { id: string; status: "error" }
  | { id: string; status: "ready"; data: HistoryPayload };

function useHistory(id: string): HistoryState {
  const [state, setState] = useState<HistoryState>({ id, status: "loading" });

  useEffect(() => {
    let disposed = false;
    fetch(`/api/history?id=${encodeURIComponent(id)}`)
      .then((res) => (res.ok ? (res.json() as Promise<HistoryPayload>) : Promise.reject(new Error(String(res.status)))))
      .then((data) => !disposed && setState({ id, status: "ready", data }))
      .catch(() => !disposed && setState({ id, status: "error" }));
    return () => {
      disposed = true;
    };
  }, [id]);

  // While a newly selected market loads, show loading rather than the previous chart.
  return state.id === id ? state : { id, status: "loading" };
}

export function DashboardView({ name, accountNo, balanceCents }: DashboardViewProps) {
  const markets = useLiveMarkets();
  const [selectedId, setSelectedId] = useState("BTCUSD");
  const inst = getInstrument(selectedId) ?? INSTRUMENTS[0];
  const quote = markets.quotes[inst.id];
  const history = useHistory(inst.id);

  const change = quote?.changePct ?? null;
  const firstName = name.split(" ")[0];

  return (
    <div className="mx-auto w-full max-w-[1280px] px-5 pb-16 sm:px-8">
      <header className="flex items-center justify-between gap-4 py-5">
        <Wordmark />
        <div className="flex items-center gap-4">
          <div className="hidden text-right text-sm leading-tight sm:block">
            <div className="font-medium">{name}</div>
            <div className="text-muted-foreground tabular-nums">{accountNo}</div>
          </div>
          <form action={logout}>
            <Button type="submit" variant="outline" className="h-9 bg-card px-3.5">
              Log out
            </Button>
          </form>
        </div>
      </header>

      <section aria-labelledby="account-heading" className="border-t border-border pt-7 pb-8">
        <h1 id="account-heading" className="sr-only">
          {firstName}&apos;s account
        </h1>
        <dl className="grid gap-x-10 gap-y-6 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr]">
          <div className="sm:col-span-2 lg:col-span-1">
            <dt className="text-sm text-muted-foreground">Virtual balance</dt>
            <dd className="mt-1 font-display text-[3.4rem] leading-none font-semibold tracking-tight tabular-nums sm:text-[4.4rem]">
              {formatUsd(balanceCents)}
            </dd>
          </div>
          <Stat label="Equity" value={formatUsd(balanceCents)} />
          <Stat label="Open profit and loss" value={formatUsd(0)} />
          <Stat label="Open positions" value="0" />
        </dl>
      </section>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-10">
        <RateBoard
          {...markets}
          selectedId={inst.id}
          onSelect={setSelectedId}
          className="self-start"
        />

        <div className="min-w-0">
          <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2 border-t border-border pt-4">
            <div>
              <h2 className="font-display text-[2.2rem] leading-none font-semibold">{inst.label}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{inst.name}</p>
            </div>
            <div className="text-right">
              <div className="font-display text-[2.2rem] leading-none font-medium tabular-nums">
                {quote ? formatPrice(quote.price, inst.decimals) : "-"}
              </div>
              <div
                className={cn(
                  "mt-1 text-sm font-medium tabular-nums",
                  change === null || Math.abs(change) < 0.005
                    ? "text-muted-foreground"
                    : change > 0
                      ? "text-up-ink"
                      : "text-down-ink",
                )}
              >
                {formatChange(change)} {inst.cls === "crypto" ? "in 24 hours" : "since the last close"}
              </div>
            </div>
          </div>

          <div className="mt-5">
            {history.status === "ready" && history.data.points.length > 1 ? (
              <PriceChart
                key={inst.id}
                points={history.data.points}
                interval={history.data.interval}
                decimals={inst.decimals}
                label={inst.label}
                livePrice={quote?.price ?? null}
                liveTs={quote?.ts ?? null}
              />
            ) : (
              <div
                className="grid place-items-center rounded-lg border border-dashed border-border text-sm text-muted-foreground"
                style={{ height: 320 }}
              >
                {history.status === "error"
                  ? "We couldn't load the price history for this market. Live prices still update on the board."
                  : "Loading price history"}
              </div>
            )}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {inst.cls === "crypto"
              ? "Five-minute closes for the last 25 hours from Coinbase, extended live."
              : "Daily closes for the last six weeks from the European Central Bank."}{" "}
            Hover the chart to read a price.
          </p>

          <section aria-labelledby="positions-heading" className="mt-10 border-t border-border pt-4">
            <h2 id="positions-heading" className="font-display text-[1.6rem] leading-none font-semibold">
              Open positions
            </h2>
            <p className="mt-3 max-w-[52ch] text-muted-foreground">
              You have no open positions. Trading isn&apos;t switched on in this test build yet, so your
              balance stays where it is.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="lg:self-end">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-display text-[2rem] leading-none font-medium tabular-nums">{value}</dd>
    </div>
  );
}
