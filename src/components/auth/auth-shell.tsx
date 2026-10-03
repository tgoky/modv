import { Wordmark } from "@/components/brand/wordmark";
import { MiniTape } from "@/components/landing/mini-tape";
import { BRAND } from "@/lib/brand";

/** Split screen: a live tape on the left (large screens), the form on the right. */
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
      <aside className="hidden flex-col justify-between gap-10 bg-night p-10 text-paper lg:flex xl:p-14">
        <Wordmark tone="paper" />
        <div className="grid gap-8">
          <p className="max-w-[14ch] font-display text-[3.6rem] leading-[0.92] font-semibold tracking-tight">
            Start with <span className="text-gold">$1.</span> Trade with $100.
          </p>
          <MiniTape />
        </div>
        <p className="text-sm text-paper/55">Test environment. Capital is simulated. {BRAND.name} is not a licensed financial service.</p>
      </aside>

      <main className="flex flex-col px-5 py-6 sm:px-10">
        <Wordmark className="lg:hidden" />
        <div className="m-auto w-full max-w-[26rem] py-10">
          <h1 className="font-display text-[2.8rem] leading-none font-semibold tracking-tight">{title}</h1>
          <p className="mt-3 mb-8 text-muted-foreground">{intro}</p>
          {children}
        </div>
      </main>
    </div>
  );
}
