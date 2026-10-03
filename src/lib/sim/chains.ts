export type ChainId = "solana" | "base" | "bsc" | "ethereum";

export interface Chain {
  id: ChainId;
  label: string;
  /** DexScreener chainId. */
  dexscreener: string;
  /** GeckoTerminal network id. */
  gecko: string;
  /**
   * Simulated cost of one swap in USD (network fee plus a priority tip), taken
   * from the virtual balance on every buy and every sell. These are rough
   * planning numbers, not live gas prices.
   */
  gasUsd: number;
  nativeSymbol: string;
}

export const CHAINS: Record<ChainId, Chain> = {
  solana: { id: "solana", label: "Solana", dexscreener: "solana", gecko: "solana", gasUsd: 0.05, nativeSymbol: "SOL" },
  base: { id: "base", label: "Base", dexscreener: "base", gecko: "base", gasUsd: 0.03, nativeSymbol: "ETH" },
  bsc: { id: "bsc", label: "BNB Chain", dexscreener: "bsc", gecko: "bsc", gasUsd: 0.08, nativeSymbol: "BNB" },
  ethereum: { id: "ethereum", label: "Ethereum", dexscreener: "ethereum", gecko: "eth", gasUsd: 3.5, nativeSymbol: "ETH" },
};

export const CHAIN_LIST = Object.values(CHAINS);

export function isChainId(v: string): v is ChainId {
  return v in CHAINS;
}

/** Chains where the real $1 entry fee can be paid without gas eating the fee. */
export const PAYMENT_CHAINS: { id: ChainId; asset: string; address: string }[] = [
  { id: "solana", asset: "USDC", address: "PrErich1111111111111111111111111111DemoAddr" },
  { id: "base", asset: "USDC", address: "0xPrErich00000000000000000000000000DemoAddr" },
  { id: "bsc", asset: "USDT", address: "0xPrErich00000000000000000000000000DemoAddr" },
];
