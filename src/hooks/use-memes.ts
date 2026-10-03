"use client";

import { useEffect, useState } from "react";
import type { MemeMarket } from "@/lib/sim/api-types";

const REFRESH_MS = 60_000;

/** Trending meme coins across chains, refreshed every minute. */
export function useMemes(): { memes: MemeMarket[]; failed: boolean; loaded: boolean } {
  const [state, setState] = useState<{ memes: MemeMarket[]; failed: boolean; loaded: boolean }>({
    memes: [],
    failed: false,
    loaded: false,
  });

  useEffect(() => {
    let disposed = false;
    let timer: ReturnType<typeof setTimeout>;
    const load = async () => {
      try {
        const res = await fetch("/api/memes");
        if (!res.ok) throw new Error(String(res.status));
        const memes = (await res.json()) as MemeMarket[];
        if (!disposed) setState({ memes, failed: false, loaded: true });
      } catch {
        if (!disposed) setState((s) => ({ ...s, failed: true, loaded: true }));
      } finally {
        if (!disposed) timer = setTimeout(load, REFRESH_MS);
      }
    };
    void load();
    return () => {
      disposed = true;
      clearTimeout(timer);
    };
  }, []);

  return state;
}
