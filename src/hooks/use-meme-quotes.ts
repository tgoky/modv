"use client";

import { useEffect, useState } from "react";
import type { MemeMarket } from "@/lib/sim/api-types";
import { memeKey } from "@/lib/sim/types";
import type { ChainId } from "@/lib/sim/chains";

const POLL_MS = 15_000;

/**
 * Fresh prices for the meme coins you hold or are looking at. DexScreener
 * caches for about 30 seconds upstream, so faster polling would not help.
 */
export function useMemeQuotes(refs: { chain: ChainId; address: string }[]) {
  const [state, setState] = useState<{ quotes: Record<string, MemeMarket>; updatedAt: number }>({
    quotes: {},
    updatedAt: 0,
  });
  const sig = [...new Set(refs.map((r) => memeKey(r.chain, r.address)))].sort().join("|");

  useEffect(() => {
    if (!sig) return;
    let disposed = false;
    let timer: ReturnType<typeof setTimeout>;
    const targets = sig.split("|").map((s) => {
      const [chain, ...rest] = s.split(":");
      return { chain, address: rest.join(":") };
    });
    const run = async () => {
      const results = await Promise.all(
        targets.map((t) =>
          fetch(`/api/memes/quote?chain=${t.chain}&address=${encodeURIComponent(t.address)}`, { cache: "no-store" })
            .then((r) => (r.ok ? (r.json() as Promise<MemeMarket>) : null))
            .catch(() => null),
        ),
      );
      if (disposed) return;
      const next: Record<string, MemeMarket> = {};
      results.forEach((m, i) => {
        if (m) next[memeKey(targets[i].chain as ChainId, targets[i].address)] = m;
      });
      setState((prev) => ({ quotes: { ...prev.quotes, ...next }, updatedAt: Date.now() }));
      timer = setTimeout(run, POLL_MS);
    };
    void run();
    return () => {
      disposed = true;
      clearTimeout(timer);
    };
  }, [sig]);

  return state;
}
