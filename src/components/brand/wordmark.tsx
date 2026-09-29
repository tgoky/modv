import Link from "next/link";
import { cn } from "@/lib/utils";

/** The mark is a single flap tile: a signal square split by the flap line. */
export function Wordmark({
  tone = "ink",
  className,
}: {
  tone?: "ink" | "chalk";
  className?: string;
}) {
  return (
    <Link
      href="/"
      aria-label="modv home"
      className={cn(
        "inline-flex items-center gap-2 font-display text-[1.7rem] font-bold leading-none tracking-tight",
        tone === "ink" ? "text-foreground" : "text-chalk",
        className,
      )}
    >
      <span
        aria-hidden
        className="relative block size-[1.05rem] rounded-[3px] bg-signal after:absolute after:inset-x-0 after:top-1/2 after:h-px after:bg-foreground/70"
      />
      modv
    </Link>
  );
}
