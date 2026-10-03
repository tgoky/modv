import { ArrowRight, Gauge, ShieldCheck, Swords, Trophy, Zap } from "lucide-react";
import Link from "next/link";
import { Wordmark } from "@/components/brand/wordmark";
import { Marquee } from "@/components/landing/marquee";
import { MarketsPreview } from "@/components/landing/markets-preview";
import { NoteHero } from "@/components/landing/note-hero";
import { RiskCalculator } from "@/components/landing/risk-calculator";
import { BRAND, CHALLENGE, FLOOR_EQUITY, TARGET_EQUITY } from "@/lib/brand";
import { fmtUsd } from "@/lib/format";
import { cn } from "@/lib/utils";

const btn = "inline-flex h-12 items-center justify-center gap-2 rounded-lg px-6 text-base font-semibold transition-colors";
const btnGold = cn(btn, "bg-gold text-night hover:bg-gold/85");
const btnInk = cn(btn, "bg-ink text-paper hover:bg-ink/85");
const btnOutline = cn(btn, "border border-ink/30 bg-card text-foreground hover:bg-paper-2");

const steps = [
  { icon: Zap, title: "Pay $1", body: `One small entry fee opens a ${fmtUsd(CHALLENGE.startBalance, 0)} challenge account. Pay in crypto, PayPal or bank transfer.` },
  { icon: Swords, title: "Trade real markets", body: "Long or short futures up to 20x, or buy meme coins across Solana, Base, BNB Chain and Ethereum, all at live prices." },
  { icon: Trophy, title: "Hit the target", body: `Grow the account to ${fmtUsd(TARGET_EQUITY, 0)} and close your positions to pass. Stay above ${fmtUsd(FLOOR_EQUITY, 0)} or the challenge ends.` },
];

const rules: [string, string][] = [
  ["Entry fee", fmtUsd(CHALLENGE.entryFeeUsd, 0)],
  ["Account size", fmtUsd(CHALLENGE.startBalance, 0)],
  ["Profit target", `+${CHALLENGE.profitTargetPct}% (${fmtUsd(TARGET_EQUITY, 0)}), with all positions closed`],
  ["Loss limit", `${CHALLENGE.maxLossPct}% (${fmtUsd(FLOOR_EQUITY, 0)}), measured on live equity`],
  ["Futures leverage", `Up to ${CHALLENGE.maxLeverage}x, long or short`],
  ["Meme coins", "Buy and sell, no leverage"],
  ["Open positions", `${CHALLENGE.maxOpenPositions} at a time`],
  ["Fees", `Futures ${(CHALLENGE.perpTakerFeeBps / 100).toFixed(3)}% a side. Meme coins ${(CHALLENGE.memeSwapFeeBps / 100).toFixed(2)}% plus simulated gas`],
  ["Profit split when funded", `${CHALLENGE.profitSplitPct}% to you (planned, not paid in this test build)`],
];

const faqs = [
  { q: "What do I actually get for $1?", a: `A ${fmtUsd(CHALLENGE.startBalance, 0)} challenge account with simulated capital, plus live access to futures and meme coin markets. If you pass, you become a funded trader. If you fail, you can start another for $1.` },
  { q: "Is the trading money real?", a: "No. The capital is simulated, which is what lets us offer a $100 account for $1. The prices, fees and slippage are real, so the results are a fair test of how you trade." },
  { q: "Where do the prices come from?", a: "Futures are priced from Hyperliquid's public market and stream live. Meme coins are priced from on-chain pools through DexScreener, which refreshes about every 30 seconds, and their charts come from GeckoTerminal." },
  { q: "What is the gas about?", a: "Real meme coin trading costs a network fee on every swap. We charge a realistic simulated fee from your balance on every buy and sell, so a strategy that only works when gas is free will not pass here. The one real payment, the $1 entry fee, is taken on a cheap chain so gas never exceeds the fee." },
  { q: "Do I get paid if I pass?", a: `This is a test build, so nothing is paid out yet. The plan is a ${CHALLENGE.profitSplitPct}/${100 - CHALLENGE.profitSplitPct} profit split on funded accounts.` },
  { q: "Can I really lose the challenge quickly?", a: `Yes, on purpose. High leverage on volatile coins can move your equity ${fmtUsd(CHALLENGE.startBalance * CHALLENGE.maxLossPct / 100, 0)} in minutes. Try the calculator above before you start.` },
];

export default function Home() {
  return (
    <>
      <div className="mx-auto w-full max-w-[1240px] px-5 sm:px-8">
        <header className="flex items-center justify-between py-5">
          <Wordmark />
          <nav aria-label="Sections" className="hidden items-center gap-7 text-[0.95rem] font-medium md:flex">
            <a href="#how" className="hover:underline underline-offset-4">How it works</a>
            <a href="#try" className="hover:underline underline-offset-4">Try the maths</a>
            <a href="#rules" className="hover:underline underline-offset-4">Rules</a>
            <a href="#faq" className="hover:underline underline-offset-4">FAQ</a>
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="/login" className="rounded-lg px-3 py-2 text-[0.95rem] font-medium hover:bg-paper-2">Log in</Link>
            <Link href="/signup" className={cn(btnInk, "h-10 px-4 text-[0.95rem]")}>Start for $1</Link>
          </div>
        </header>

        <section className="grid items-center gap-12 pt-8 pb-16 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-10 lg:pt-14 lg:pb-24">
          <div>
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-ink/25 bg-card px-3 py-1 text-sm font-medium">
              <span className="size-2 rounded-full bg-gain-ink" aria-hidden /> Prop firm for crypto traders
            </p>
            <h1 className="font-display text-[clamp(3.4rem,8.6vw,6.6rem)] leading-[0.9] font-semibold tracking-tight">
              Start with <span className="text-ink">$1.</span> Trade with $100.
            </h1>
            <p className="mt-6 max-w-[44ch] text-lg leading-relaxed text-muted-foreground">
              {BRAND.description} No spot boredom: this is futures and meme coins, where the moves are.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/signup" className={btnGold}>
                Start for $1 <ArrowRight className="size-5" aria-hidden />
              </Link>
              <a href="#try" className={btnOutline}>Try the maths first</a>
            </div>
            <p className="mt-5 text-sm text-muted-foreground">Test environment. Capital is simulated and nothing is paid out yet.</p>
          </div>
          <NoteHero />
        </section>
      </div>

      <section className="bg-night" aria-label="Live market tape">
        <Marquee />
      </section>

      <div className="mx-auto w-full max-w-[1240px] px-5 sm:px-8">
        <section id="how" className="scroll-mt-6 py-20 lg:py-28">
          <h2 className="font-display text-[clamp(2.4rem,5vw,3.8rem)] leading-none font-semibold tracking-tight">Three steps. One is a dollar.</h2>
          <ol className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-border bg-border md:grid-cols-3">
            {steps.map((s, i) => (
              <li key={s.title} className="bg-card p-7 sm:p-9">
                <div className="flex items-center justify-between">
                  <span className="font-display text-6xl leading-none font-semibold text-ink/25">{i + 1}</span>
                  <s.icon className="size-7 text-ink" aria-hidden />
                </div>
                <h3 className="mt-8 font-display text-3xl font-semibold">{s.title}</h3>
                <p className="mt-3 leading-relaxed text-muted-foreground">{s.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section id="try" className="scroll-mt-6 border-t border-border py-20 lg:py-28">
          <div className="mb-12 max-w-[60ch]">
            <p className="mb-3 flex items-center gap-2 text-sm font-medium text-ink"><Gauge className="size-4" aria-hidden /> Interactive</p>
            <h2 className="font-display text-[clamp(2.4rem,5vw,3.8rem)] leading-none font-semibold tracking-tight">See what one trade does to your challenge.</h2>
            <p className="mt-4 text-lg text-muted-foreground">The same fees and liquidation maths the platform uses. Drag the sliders and watch your equity against the loss limit and the target.</p>
          </div>
          <RiskCalculator />
        </section>

        <section className="border-t border-border py-20 lg:py-28">
          <h2 className="mb-12 font-display text-[clamp(2.4rem,5vw,3.8rem)] leading-none font-semibold tracking-tight">Only the volatile markets.</h2>
          <MarketsPreview />
        </section>

        <section id="rules" className="scroll-mt-6 border-t border-border py-20 lg:py-28">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,4fr)_minmax(0,7fr)] lg:gap-16">
            <div>
              <p className="mb-3 flex items-center gap-2 text-sm font-medium text-ink"><ShieldCheck className="size-4" aria-hidden /> No fine print</p>
              <h2 className="font-display text-[clamp(2.4rem,5vw,3.8rem)] leading-none font-semibold tracking-tight">The whole rulebook.</h2>
              <p className="mt-4 text-lg text-muted-foreground">These numbers are read from the same file that enforces them.</p>
            </div>
            <dl className="divide-y divide-border border-y border-border">
              {rules.map(([k, v]) => (
                <div key={k} className="grid gap-1 py-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] sm:gap-6">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="font-medium">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section id="faq" className="scroll-mt-6 border-t border-border py-20 lg:py-28">
          <h2 className="mb-10 font-display text-[clamp(2.4rem,5vw,3.8rem)] leading-none font-semibold tracking-tight">Straight answers.</h2>
          <div className="max-w-[820px] divide-y divide-border border-y border-border">
            {faqs.map((f) => (
              <details key={f.q} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 font-display text-2xl font-semibold [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <span aria-hidden className="text-3xl leading-none text-ink transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 max-w-[64ch] leading-relaxed text-muted-foreground">{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      </div>

      <section className="bg-ink text-paper">
        <div className="mx-auto flex w-full max-w-[1240px] flex-col items-start justify-between gap-8 px-5 py-16 sm:px-8 md:flex-row md:items-center">
          <h2 className="max-w-[16ch] font-display text-[clamp(2.6rem,5.4vw,4.2rem)] leading-[0.95] font-semibold tracking-tight">
            A dollar is all it takes to find out.
          </h2>
          <Link href="/signup" className={btnGold}>Start for $1 <ArrowRight className="size-5" aria-hidden /></Link>
        </div>
      </section>

      <footer className="mx-auto w-full max-w-[1240px] px-5 py-10 text-sm text-muted-foreground sm:px-8">
        <div className="flex flex-col justify-between gap-6 md:flex-row">
          <Wordmark />
          <p className="max-w-[66ch] leading-relaxed">
            {BRAND.name} is an experiment, not a licensed financial service. Challenge accounts use simulated capital. Prices are indicative. Trading leveraged futures and meme coins carries a high risk of loss, and most people who try it lose money.
          </p>
        </div>
      </footer>
    </>
  );
}
