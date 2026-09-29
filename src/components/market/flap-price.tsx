import { cn } from "@/lib/utils";

interface FlapPriceProps {
  /** Formatted price, or null while waiting for the first quote. */
  text: string | null;
  tone: "idle" | "up" | "down";
  /** Stagger for the first appearance, in ms. Zero once the intro is over. */
  introDelay?: number;
  className?: string;
}

const PLACEHOLDER = "-------";

/**
 * A price drawn as split-flap tiles. Cells are keyed from the right so a tile
 * keeps its identity when the number grows a digit, and only tiles whose
 * character changed remount and play the drop animation.
 */
export function FlapPrice({ text, tone, introDelay = 0, className }: FlapPriceProps) {
  const chars = [...(text ?? PLACEHOLDER)];
  const waiting = text === null;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-[2px] font-display font-medium leading-none [perspective:400px]",
        "transition-colors duration-500",
        tone === "up" && "text-up",
        tone === "down" && "text-down",
        tone === "idle" && "text-chalk",
        waiting && "text-chalk-dim/40",
        className,
      )}
    >
      <span className="sr-only">{text ?? "Waiting for price"}</span>
      {chars.map((ch, i) => {
        const fromRight = chars.length - 1 - i;
        const separator = ch === "," || ch === ".";
        return (
          <span
            key={fromRight}
            aria-hidden
            className={cn(
              "relative inline-flex h-[1.5em] items-center justify-center",
              separator
                ? "w-[0.3em]"
                : "w-[0.66em] rounded-[3px] bg-flap shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]",
            )}
          >
            <span
              key={ch}
              className={cn(!waiting && "flap-char", separator && "translate-y-[0.14em]")}
              style={introDelay ? { animationDelay: `${introDelay + i * 16}ms` } : undefined}
            >
              {ch}
            </span>
            {!separator && (
              <span className="pointer-events-none absolute inset-x-0 top-1/2 h-px bg-flap-edge" />
            )}
          </span>
        );
      })}
    </span>
  );
}
