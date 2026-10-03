import Link from "next/link";
import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils";

/** The mark is a tiny banknote with a gold seal. */
export function Wordmark({ tone = "ink", markOnly = false, className }: { tone?: "ink" | "paper"; markOnly?: boolean; className?: string }) {
  const dark = tone === "paper";
  return (
    <Link
      href="/"
      aria-label={`${BRAND.name} home`}
      className={cn(
        "inline-flex items-center gap-2 font-display text-[1.65rem] leading-none font-semibold tracking-tight",
        dark ? "text-paper" : "text-foreground",
        className,
      )}
    >
      <svg aria-hidden width="28" height="17" viewBox="0 0 28 17" className="shrink-0">
        <rect x="0.75" y="0.75" width="26.5" height="15.5" rx="2.5" fill={dark ? "var(--night-3)" : "var(--ink)"} stroke="var(--gold)" strokeWidth="1.2" />
        <circle cx="14" cy="8.5" r="4.4" fill="none" stroke="var(--gold)" strokeWidth="1.2" />
        <circle cx="14" cy="8.5" r="1.4" fill="var(--gold)" />
      </svg>
      {markOnly ? <span className="sr-only">{BRAND.name}</span> : BRAND.name}
    </Link>
  );
}
