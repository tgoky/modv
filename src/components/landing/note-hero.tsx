"use client";

import { useEffect, useRef, useState } from "react";
import { BOTTOM_WAVES, LEFT_ROSETTE, RIGHT_ROSETTE, TOP_WAVES } from "@/lib/guilloche";
import { BRAND, CHALLENGE } from "@/lib/brand";

const COUNT_MS = 2600;

/**
 * The hero object: a banknote whose denomination climbs from the entry fee to
 * the account size, then gets stamped FUNDED. It tilts toward the pointer.
 */
export function NoteHero() {
  const [amount, setAmount] = useState<number>(CHALLENGE.entryFeeUsd);
  const wrap = useRef<HTMLDivElement>(null);
  const done = amount >= CHALLENGE.startBalance;

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const t = setTimeout(() => setAmount(CHALLENGE.startBalance), 0);
      return () => clearTimeout(t);
    }
    let raf = 0;
    let start = 0;
    const step = (now: number) => {
      start ||= now;
      const t = Math.min(1, (now - start) / COUNT_MS);
      const eased = 1 - Math.pow(1 - t, 4);
      setAmount(Math.round(CHALLENGE.entryFeeUsd + (CHALLENGE.startBalance - CHALLENGE.entryFeeUsd) * eased));
      if (t < 1) raf = requestAnimationFrame(step);
    };
    const delay = setTimeout(() => (raf = requestAnimationFrame(step)), 350);
    return () => {
      clearTimeout(delay);
      cancelAnimationFrame(raf);
    };
  }, []);

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = wrap.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.setProperty("--ry", `${x * 12}deg`);
    el.style.setProperty("--rx", `${-y * 10}deg`);
  };
  const onLeave = () => {
    wrap.current?.style.setProperty("--ry", "0deg");
    wrap.current?.style.setProperty("--rx", "0deg");
  };

  const value = String(amount);
  return (
    <div className="[perspective:1200px]" onPointerMove={onMove} onPointerLeave={onLeave}>
      <div
        ref={wrap}
        className="relative w-full transition-transform duration-200 ease-out [transform-style:preserve-3d] [transform:rotateX(var(--rx,0deg))_rotateY(var(--ry,0deg))]"
      >
        <svg
          viewBox="0 0 640 300"
          role="img"
          aria-label={`A banknote counting up from $${CHALLENGE.entryFeeUsd} to $${CHALLENGE.startBalance}, stamped funded`}
          className="w-full drop-shadow-[0_30px_40px_rgba(13,59,46,0.28)]"
        >
          <rect x="2" y="2" width="636" height="296" rx="14" fill="var(--paper-2)" stroke="var(--ink)" strokeWidth="3" />
          <rect x="14" y="14" width="612" height="272" rx="8" fill="none" stroke="var(--ink)" strokeWidth="1.2" />
          <g fill="none" stroke="var(--ink)" strokeWidth="0.55" opacity="0.5">
            {TOP_WAVES.map((d, i) => <path key={`t${i}`} d={d} />)}
            {BOTTOM_WAVES.map((d, i) => <path key={`b${i}`} d={d} />)}
          </g>
          <g fill="none" stroke="var(--ink)" strokeWidth="0.6" opacity="0.55">
            {LEFT_ROSETTE.map((d, i) => <path key={`l${i}`} d={d} />)}
            {RIGHT_ROSETTE.map((d, i) => <path key={`r${i}`} d={d} />)}
          </g>

          {/* central seal */}
          <circle cx="320" cy="150" r="78" fill="var(--paper)" stroke="var(--ink)" strokeWidth="2" />
          <circle cx="320" cy="150" r="70" fill="none" stroke="var(--gold)" strokeWidth="1.5" strokeDasharray="2 4" />
          <text x="320" y="146" textAnchor="middle" fontSize="34" fontWeight="700" fill="var(--ink)" style={{ fontFamily: "var(--font-display)" }}>
            {BRAND.name}
          </text>
          <text x="320" y="170" textAnchor="middle" fontSize="11" letterSpacing="3" fill="var(--ink)" style={{ fontFamily: "var(--font-sans)" }}>
            TRADING CAPITAL
          </text>

          {/* denominations */}
          <text x="36" y="86" fontSize="60" fontWeight="700" fill="var(--ink)" style={{ fontFamily: "var(--font-display)" }}>
            ${value}
          </text>
          <text x="604" y="262" textAnchor="end" fontSize="60" fontWeight="700" fill="var(--ink)" style={{ fontFamily: "var(--font-display)" }}>
            ${value}
          </text>
          <text x="36" y="268" fontSize="10.5" letterSpacing="2" fill="var(--ink)" style={{ fontFamily: "var(--font-geist-mono)" }}>
            PR 000{String(amount).padStart(5, "0")} A
          </text>
          <text x="604" y="58" textAnchor="end" fontSize="10.5" letterSpacing="2" fill="var(--ink)" style={{ fontFamily: "var(--font-geist-mono)" }}>
            NOT LEGAL TENDER
          </text>

          {done && (
            <g transform="translate(188 6)">
            <g className="stamp-in" style={{ transformOrigin: "320px 150px", transformBox: "view-box" }}>
              <rect x="222" y="118" width="196" height="64" rx="6" fill="none" stroke="var(--stamp)" strokeWidth="5" />
              <rect x="229" y="125" width="182" height="50" rx="3" fill="none" stroke="var(--stamp)" strokeWidth="1.5" />
              <text x="320" y="164" textAnchor="middle" fontSize="40" fontWeight="700" letterSpacing="4" fill="var(--stamp)" style={{ fontFamily: "var(--font-display)" }}>
                FUNDED
              </text>
            </g>
            </g>
          )}
        </svg>
      </div>
    </div>
  );
}
