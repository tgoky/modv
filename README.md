# Prerich

A prop firm for crypto traders. Pay $1, get a $100 challenge account, trade real futures and meme coin prices, hit the target without breaking the loss limit.

The capital is simulated. The prices, fees and slippage are real. In this build the $1 entry payment is simulated too.

## Setup

```bash
pnpm install
cp .env.example .env.local   # set SESSION_SECRET (openssl rand -base64 32)
pnpm dev
```

## How it works

- **Rules** live in `src/lib/brand.ts`. The landing page, the terminal and the engine all read the same object.
- **Engine** (`src/lib/sim/engine.ts`) is pure functions: fills, fees, slippage, simulated gas, liquidation, equity, and the pass/fail rules. No network access, so it is easy to test.
- **Prices are always fetched by the server at trade time** (`src/lib/sim/prices.ts`), never trusted from the browser.
  - Futures: Hyperliquid public API (`allMids`, `metaAndAssetCtxs`, `candleSnapshot`), and the browser streams `allMids` and `l2Book` over WebSocket for live prices and the order book.
  - Meme coins: DexScreener (discovery and prices, cached about 30 seconds upstream) and GeckoTerminal (chart candles).
- **Simulated gas and slippage.** Every meme coin swap costs a per-chain gas amount from the virtual balance (`src/lib/sim/chains.ts`) plus a swap fee, and moves the price by your share of the pool's liquidity.
- **Accounts and challenges** are stored in JSON files under `.data/` for development. Replace `src/lib/auth/users.ts` and `src/lib/sim/store.ts` with your database before deploying.

## Before real users

- Verify real payments (on-chain transfer or a payment provider webhook) before `startChallenge` creates an account.
- Rules are enforced lazily, when an account is next loaded or traded. Add a background worker (for example Inngest) that checks open accounts against live prices, otherwise a position could cross its liquidation price and recover unseen while the trader is away.
- Replace the in-memory sign-in throttle with a shared store.
- A prop firm that charges fees and promises payouts can be regulated as a financial or gambling product depending on where you operate. Get legal advice before launch.
