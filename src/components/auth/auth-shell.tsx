import { Wordmark } from "@/components/brand/wordmark";
import { LiveBoard } from "@/components/market/live-board";

/** Split screen: the live board on the left (large screens), the form on the right. */
export function AuthShell({
  title,
  intro,
  children,
}: {
  title: string;
  intro: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <aside className="hidden flex-col justify-between gap-10 bg-board p-10 text-chalk lg:flex xl:p-14">
        <Wordmark tone="chalk" />
        <div className="grid gap-6">
          <p className="max-w-[16ch] font-display text-[3.4rem] leading-[0.95] font-semibold tracking-tight">
            The board keeps moving while you sign up.
          </p>
          <LiveBoard
            compact
            ids={["BTCUSD", "ETHUSD", "EURUSD", "GBPUSD", "USDJPY"]}
            className="ring-1 ring-white/10"
          />
        </div>
        <p className="text-sm text-chalk-dim">Test environment. Balances are virtual.</p>
      </aside>

      <main className="flex flex-col px-5 py-6 sm:px-10">
        <Wordmark className="lg:hidden" />
        <div className="m-auto w-full max-w-[26rem] py-10">
          <h1 className="font-display text-[2.6rem] leading-none font-semibold tracking-tight">{title}</h1>
          <p className="mt-3 mb-8 text-muted-foreground">{intro}</p>
          {children}
        </div>
      </main>
    </div>
  );
}
