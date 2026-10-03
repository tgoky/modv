"use client";

import { ArrowLeft, Building2, Check, CheckCircle2, Copy, CreditCard, Loader2, Wallet } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { startChallengeAction } from "@/app/actions/trade";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BRAND, CHALLENGE } from "@/lib/brand";
import { fmtUsd } from "@/lib/format";
import { CHAINS, PAYMENT_CHAINS, type ChainId } from "@/lib/sim/chains";
import type { ChallengeState } from "@/lib/sim/service";
import type { PaymentMethod } from "@/lib/sim/types";
import { cn } from "@/lib/utils";
import { Qr } from "./qr";

type Step = "method" | "details" | "confirming";

const METHODS: { id: PaymentMethod; label: string; hint: string; icon: typeof Wallet }[] = [
  { id: "crypto", label: "Crypto wallet", hint: "USDC or USDT on a low-fee chain", icon: Wallet },
  { id: "paypal", label: "PayPal", hint: "Pay from your PayPal balance or card", icon: CreditCard },
  { id: "bank", label: "Bank transfer", hint: "Send from your bank app", icon: Building2 },
];

export function CheckoutDialog({
  open,
  onOpenChange,
  onStarted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStarted: (state: ChallengeState) => void;
}) {
  const [step, setStep] = useState<Step>("method");
  const [method, setMethod] = useState<PaymentMethod>("crypto");
  const [chain, setChain] = useState<ChainId>("solana");
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [copied, setCopied] = useState(false);

  const pay = PAYMENT_CHAINS.find((p) => p.id === chain)!;

  // Keep the latest callback without making the payment effect depend on its identity.
  // The parent re-renders on every price tick, and a changing dependency here would
  // restart the payment timers and could submit a second payment.
  const onStartedRef = useRef(onStarted);
  useEffect(() => {
    onStartedRef.current = onStarted;
  });

  // "Confirming" is a scripted wait: this build takes no real payment.
  useEffect(() => {
    if (step !== "confirming") return;
    let cancelled = false;
    const t1 = setTimeout(() => !cancelled && setConfirmed(true), 1600);
    const t2 = setTimeout(async () => {
      const result = await startChallengeAction(method, method === "crypto" ? chain : undefined);
      if (cancelled) return;
      if (result.ok) {
        onStartedRef.current(result.state);
      } else {
        setError(result.error);
        setConfirmed(false);
        setStep("details");
      }
    }, 2600);
    return () => {
      cancelled = true;
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [step, method, chain]);

  const reset = (next: boolean) => {
    onOpenChange(next);
    if (!next) {
      setStep("method");
      setError(null);
      setConfirmed(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(pay.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard can be blocked; the address is still selectable on screen */
    }
  };

  return (
    <Dialog open={open} onOpenChange={reset}>
      <DialogContent className="max-h-[92dvh] grid-cols-[minmax(0,1fr)] gap-0 overflow-x-hidden overflow-y-auto bg-card p-0 sm:max-w-[30rem]">
        <DialogHeader className="border-b border-border p-6 pr-12">
          <DialogTitle className="font-display text-3xl leading-none font-semibold">
            Start your {fmtUsd(CHALLENGE.startBalance, 0)} challenge
          </DialogTitle>
          <DialogDescription>
            Entry fee {fmtUsd(CHALLENGE.entryFeeUsd)}. <span className="font-medium text-foreground">Demo: no money moves in this build.</span>
          </DialogDescription>
        </DialogHeader>

        <div className="min-w-0 p-6">
          {error && <p role="alert" className="mb-4 rounded-lg bg-loss-ink/10 px-3 py-2.5 text-sm text-loss-ink">{error}</p>}

          {step === "method" && (
            <div className="grid grid-cols-[minmax(0,1fr)] gap-3">
              <p className="text-sm text-muted-foreground">How do you want to pay?</p>
              {METHODS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => { setMethod(m.id); setError(null); setStep("details"); }}
                  className="flex items-center gap-4 rounded-xl border border-border bg-background p-4 text-left transition-colors hover:border-ink hover:bg-paper-2"
                >
                  <span className="grid size-11 place-items-center rounded-lg bg-ink text-paper"><m.icon className="size-5" aria-hidden /></span>
                  <span>
                    <span className="block font-display text-xl leading-none font-semibold">{m.label}</span>
                    <span className="mt-1 block text-sm text-muted-foreground">{m.hint}</span>
                  </span>
                </button>
              ))}
            </div>
          )}

          {step === "details" && (
            <div className="grid grid-cols-[minmax(0,1fr)] gap-5">
              <button type="button" onClick={() => setStep("method")} className="-mt-1 inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
                <ArrowLeft className="size-4" aria-hidden /> Change method
              </button>

              {method === "crypto" && (
                <>
                  <div role="radiogroup" aria-label="Network" className="grid grid-cols-3 gap-2">
                    {PAYMENT_CHAINS.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        role="radio"
                        aria-checked={chain === p.id}
                        onClick={() => setChain(p.id)}
                        className={cn(
                          "rounded-lg border px-2 py-2.5 text-center transition-colors",
                          chain === p.id ? "border-ink bg-ink text-paper" : "border-border bg-background hover:bg-paper-2",
                        )}
                      >
                        <span className="block font-display text-lg leading-none font-semibold">{CHAINS[p.id].label}</span>
                        <span className="mt-1 block text-xs opacity-70">{p.asset}</span>
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-col items-center gap-4 sm:flex-row">
                    <Qr text={pay.address} className="size-40 shrink-0 rounded-lg border border-border" />
                    <div className="w-full min-w-0 text-sm sm:flex-1">
                      <p className="text-muted-foreground">Send exactly</p>
                      <p className="font-display text-3xl leading-tight font-semibold">{CHALLENGE.entryFeeUsd.toFixed(2)} {pay.asset}</p>
                      <p className="mt-2 text-muted-foreground">to this {CHAINS[chain].label} address</p>
                      <div className="mt-1 flex items-center gap-2">
                        <code className="min-w-0 flex-1 truncate rounded bg-paper-2 px-2 py-1.5 font-mono text-xs">{pay.address}</code>
                        <Button type="button" variant="outline" size="icon" onClick={copy} aria-label="Copy address" className="shrink-0">
                          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                        </Button>
                      </div>
                    </div>
                  </div>
                  <p className="rounded-lg bg-paper-2 px-3 py-2.5 text-sm text-muted-foreground">
                    You pay the network fee, about ${CHAINS[chain].gasUsd.toFixed(2)} on {CHAINS[chain].label}. Ethereum mainnet is not offered because its fee would be more than the {fmtUsd(CHALLENGE.entryFeeUsd, 0)} entry.
                  </p>
                </>
              )}

              {method === "paypal" && (
                <div className="rounded-xl border border-border bg-background p-5">
                  <p className="text-sm text-muted-foreground">You will approve</p>
                  <p className="font-display text-4xl leading-tight font-semibold">{fmtUsd(CHALLENGE.entryFeeUsd)}</p>
                  <p className="mt-1 text-sm text-muted-foreground">to {BRAND.name} for one {fmtUsd(CHALLENGE.startBalance, 0)} challenge.</p>
                </div>
              )}

              {method === "bank" && (
                <dl className="divide-y divide-border rounded-xl border border-border bg-background text-sm">
                  {[["Account name", `${BRAND.name} Demo Ltd`], ["IBAN", "GB00 DEMO 0000 0000 0000 00"], ["Amount", fmtUsd(CHALLENGE.entryFeeUsd)], ["Reference", "Issued when you confirm"]].map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-4 px-4 py-3"><dt className="text-muted-foreground">{k}</dt><dd className="font-medium">{v}</dd></div>
                  ))}
                </dl>
              )}

              <Button
                type="button"
                onClick={() => { setError(null); setStep("confirming"); }}
                className="h-12 bg-gold text-base font-semibold text-night hover:bg-gold/85"
              >
                {method === "crypto" ? "I've sent it" : method === "paypal" ? "Pay with PayPal" : "I've made the transfer"}
              </Button>
            </div>
          )}

          {step === "confirming" && (
            <div className="grid place-items-center gap-4 py-8 text-center" aria-live="polite">
              {confirmed ? <CheckCircle2 className="size-14 text-gain-ink" aria-hidden /> : <Loader2 className="size-14 animate-spin text-ink" aria-hidden />}
              <p className="font-display text-3xl leading-none font-semibold">{confirmed ? "Payment confirmed" : method === "crypto" ? "Waiting for confirmation" : "Processing payment"}</p>
              <p className="text-sm text-muted-foreground">{confirmed ? "Opening your account..." : method === "crypto" ? "0 of 1 confirmations" : "This takes a few seconds."}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
