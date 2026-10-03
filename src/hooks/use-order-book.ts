"use client";

import { useEffect, useState } from "react";
import { connectHyperliquid } from "@/lib/hl-socket";

export interface BookLevel {
  price: number;
  size: number;
}
export interface OrderBook {
  coin: string;
  bids: BookLevel[];
  asks: BookLevel[];
}

const DEPTH = 10;

/** Live level-2 order book for one perp. Resubscribes when the coin changes. */
export function useOrderBook(coin: string | null): OrderBook | null {
  const [book, setBook] = useState<OrderBook | null>(null);

  useEffect(() => {
    if (!coin) return;
    let last = 0;
    const stop = connectHyperliquid({
      subscriptions: [{ type: "l2Book", coin }],
      onState: () => {},
      onMessage: (channel, data) => {
        if (channel !== "l2Book") return;
        const d = data as { coin: string; levels: { px: string; sz: string }[][] };
        if (d.coin !== coin || Date.now() - last < 200) return; // 5 fps is plenty for a book
        last = Date.now();
        const level = (l: { px: string; sz: string }) => ({ price: Number(l.px), size: Number(l.sz) });
        setBook({ coin, bids: d.levels[0].slice(0, DEPTH).map(level), asks: d.levels[1].slice(0, DEPTH).map(level) });
      },
    });
    return stop;
  }, [coin]);

  // A book for a previous coin must never render under the new coin's header.
  return book && book.coin === coin ? book : null;
}
