"use client";

import { useEffect, useState } from "react";
import type { CandlePayload } from "@/lib/sim/api-types";

type State = { url: string; status: "loading" } | { url: string; status: "error" } | { url: string; status: "ready"; data: CandlePayload };

/** Loads chart history for a URL. Changing the URL shows loading, never the previous chart. */
export function useCandles(url: string): State {
  const [state, setState] = useState<State>({ url, status: "loading" });

  useEffect(() => {
    let disposed = false;
    fetch(url)
      .then((r) => (r.ok ? (r.json() as Promise<CandlePayload>) : Promise.reject(new Error(String(r.status)))))
      .then((data) => !disposed && setState({ url, status: "ready", data }))
      .catch(() => !disposed && setState({ url, status: "error" }));
    return () => {
      disposed = true;
    };
  }, [url]);

  return state.url === url ? state : { url, status: "loading" };
}
