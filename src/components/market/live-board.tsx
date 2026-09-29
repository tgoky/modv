"use client";

import { useLiveMarkets } from "@/hooks/use-live-markets";
import { RateBoard } from "./rate-board";

/** A self-contained board for pages that only display prices (landing, sign-in). */
export function LiveBoard(props: { ids?: readonly string[]; compact?: boolean; className?: string }) {
  const markets = useLiveMarkets();
  return <RateBoard {...markets} {...props} />;
}
