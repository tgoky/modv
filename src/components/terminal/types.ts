import type { ChainId } from "@/lib/sim/chains";

export type Selected = { kind: "perp"; coin: string } | { kind: "meme"; chain: ChainId; address: string };
export type View = "trade" | "account" | "history" | "rules";

export const panel = "rounded-xl border border-paper/10 bg-night-2";
