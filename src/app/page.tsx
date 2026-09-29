import Link from "next/link";
import { Wordmark } from "@/components/brand/wordmark";
import { LiveBoard } from "@/components/market/live-board";
import { cn } from "@/lib/utils";

const button =
  "inline-flex h-12 items-center justify-center rounded-lg px-6 text-base font-semibold transition-colors";
const buttonSignal = cn(button, "bg-signal text-foreground hover:bg-signal/85");
const buttonInk = cn(button, "bg-foreground text-background hover:bg-foreground/85");
const buttonOutline = cn(button, "border border-foreground/25 bg-card text-foreground hover:bg-secondary");

const points = [
  {
    title: "Two markets, one board",
    body: "Six major currency pairs and four large cryptocurrencies sit side by side, so you can compare a move in the euro with a move in bitcoin without switching tabs.",
  },
  {
    title: "Every price shows its source",
    body: "Crypto streams from Coinbase as trades happen. Currency rates say where they come from and how old they are, so you always know what you're looking at.",
  },
  {
    title: "A dashboard from day one",
    body: "Open an account and you land on your balance, the live board, and a chart for any market you click.",
  },
];

export default function Home() {
  return (
    <>
      <div className="mx-auto w-full max-w-[1240px] px-5 sm:px-8">
        <header className="flex items-center justify-between py-5">
          <Wordmark />
          <nav aria-label="Account" className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/login"
              className="rounded-lg px-3 py-2 text-[0.95rem] font-medium hover:bg-secondary"
            >
              Log in
            </Link>
            <Link href="/signup" className={cn(buttonSignal, "h-10 px-4 text-[0.95rem]")}>
              Open account
            </Link>
          </nav>
        </header>

        <main>
          <section className="grid items-start gap-10 pt-8 pb-20 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-14 lg:pt-14 lg:pb-28">
            <div className="lg:sticky lg:top-10">
              <h1 className="font-display text-[clamp(3.4rem,8.4vw,6.4rem)] leading-[0.92] font-semibold tracking-tight">
                Currencies and crypto on one live board.
              </h1>
              <p className="mt-6 max-w-[40ch] text-lg leading-relaxed text-muted-foreground">
                Watch the euro, the yen, bitcoin and more move in real time, with every price labelled
                by where it comes from. Open an account to get your own dashboard.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/signup" className={buttonSignal}>
                  Open an account
                </Link>
                <Link href="/login" className={buttonOutline}>
                  Log in
                </Link>
              </div>
              <p className="mt-5 text-sm text-muted-foreground">
                This is a test environment. Balances are virtual and no real money moves.
              </p>
            </div>

            <LiveBoard />
          </section>

          <section aria-labelledby="why-heading" className="border-t border-border py-16 lg:py-20">
            <h2 id="why-heading" className="sr-only">
              What you get
            </h2>
            <dl className="divide-y divide-border border-y border-border">
              {points.map((p) => (
                <div
                  key={p.title}
                  className="grid gap-2 py-7 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:gap-14"
                >
                  <dt className="font-display text-[2rem] leading-[1.05] font-semibold">{p.title}</dt>
                  <dd className="max-w-[58ch] text-lg leading-relaxed text-muted-foreground">{p.body}</dd>
                </div>
              ))}
            </dl>
          </section>
        </main>
      </div>

      <section className="bg-signal">
        <div className="mx-auto flex w-full max-w-[1240px] flex-col items-start justify-between gap-6 px-5 py-14 sm:px-8 md:flex-row md:items-center">
          <h2 className="max-w-[18ch] font-display text-[clamp(2.4rem,5vw,3.6rem)] leading-[0.95] font-semibold tracking-tight">
            Your dashboard is one form away.
          </h2>
          <Link href="/signup" className={buttonInk}>
            Open an account
          </Link>
        </div>
      </section>

      <footer className="mx-auto w-full max-w-[1240px] px-5 py-10 text-sm text-muted-foreground sm:px-8">
        <div className="flex flex-col justify-between gap-6 md:flex-row">
          <Wordmark />
          <p className="max-w-[62ch] leading-relaxed">
            modv is an experiment, not a licensed broker. Prices are indicative and are not tradable
            quotes. Trading currencies and crypto carries a high risk of loss.
          </p>
        </div>
      </footer>
    </>
  );
}
